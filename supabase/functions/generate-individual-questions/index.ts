import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface GenerateQuestionsRequest {
  course_id: string;
  segment_id: string;
  youtube_url: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { course_id, segment_id, youtube_url }: GenerateQuestionsRequest = await req.json();
    
    console.log(`🎯 Generating individual questions for segment ${segment_id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all planned questions for this segment
    const { data: plans, error: plansError } = await supabase
      .from('question_plans')
      .select('*')
      .eq('segment_id', segment_id)
      .eq('status', 'planned')
      .order('timestamp', { ascending: true });

    if (plansError || !plans) {
      throw new Error(`Failed to fetch question plans: ${plansError?.message || 'Unknown error'}`);
    }

    console.log(`📋 Found ${plans.length} questions to generate`);

    if (plans.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No questions to generate',
          generated_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transcript for this course (if available)
    const { data: transcript } = await supabase
      .from('video_transcripts')
      .select('*')
      .eq('course_id', course_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Import necessary functions from quiz-generation-v5
    const { generateQuestionByType } = await import('../quiz-generation-v5/utils/question-generation.ts');
    const { createProgressTracker } = await import('../quiz-generation-v5/utils/progress-tracker.ts');
    const { transformQuestionForDatabase, extractBoundingBoxes, debugQuestionTransformation } = await import('../quiz-generation-v5/utils/question-storage.ts');

    // Create a lightweight progress tracker
    const tracker = await createProgressTracker(supabase, course_id, `individual_${segment_id}`);

    console.log(`🚀 Starting PARALLEL generation of ${plans.length} questions`);

    // Update all plans to 'generating' status at once
    const planIds = plans.map((p: any) => p.id);
    await supabase
      .from('question_plans')
      .update({ 
        status: 'generating',
        updated_at: new Date().toISOString()
      })
      .in('id', planIds);

    // Process all questions in parallel
    const questionPromises = plans.map(async (plan: any) => {
      try {
        console.log(`🔄 Starting generation for question ${plan.question_id} (${plan.question_type})`);
        
        // Generate the question using the existing processor
        const question = await generateQuestionByType(
          plan.plan_data,
          youtube_url,
          tracker,
          transcript
        );
        
        // Debug transformation for true/false questions
        if (question.type === 'true-false' || (question.type as string) === 'true_false') {
          debugQuestionTransformation(question, {}, 'Segmented before transform');
        }
        
        // Transform the question for database storage using unified utility
        const dbQuestion = transformQuestionForDatabase(
          question,
          {
            courseId: course_id,
            segmentId: segment_id,
            segmentIndex: plan.segment_index,
            includeGenerationStatus: true
          }
        );
            
        // Add visual context if available (not handled by unified utility)
        if ((question as any).visual_context) {
          dbQuestion.visual_context = (question as any).visual_context;
        }
        
        // Store the original plan ID in metadata
        const existingMetadata = dbQuestion.metadata ? JSON.parse(dbQuestion.metadata) : {};
        existingMetadata.plan_question_id = plan.question_id;
        dbQuestion.metadata = JSON.stringify(existingMetadata);
        
        // Debug after transformation
        if (question.type === 'true-false' || (question.type as string) === 'true_false') {
          debugQuestionTransformation(question, dbQuestion, 'Segmented after transform');
        }

        // Save to database with bounding boxes if hotspot
        let insertedQuestionId: string | null = null;
        
          // Insert question first
          const { data: insertedQuestion, error: insertError } = await supabase
            .from('questions')
            .insert(dbQuestion)
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to insert question: ${insertError.message}`);
          }

          insertedQuestionId = insertedQuestion.id;

        // Handle bounding boxes using unified utility
        const boundingBoxes = extractBoundingBoxes(question, insertedQuestion.id);
        
        if (boundingBoxes) {
          console.log('🎯 Hotspot question bounding boxes:', {
            count: boundingBoxes.length,
            sample: boundingBoxes[0],
            correctAnswers: boundingBoxes.filter((b: any) => b.is_correct_answer === true).length
          });

          const { error: boxError } = await supabase
            .from('bounding_boxes')
            .insert(boundingBoxes);

          if (boxError) {
            console.error('Failed to insert bounding boxes:', boxError);
            // Don't fail the entire question generation if bounding boxes fail
          }
        }
        
        console.log(`✅ Question ${plan.question_id} generated and saved successfully`);
        
        return {
          success: true,
          planId: plan.id,
          questionId: insertedQuestionId,
          questionType: question.type
        };
        
      } catch (error) {
        console.error(`❌ Failed to generate question ${plan.question_id}:`, error);
        return {
          success: false,
          planId: plan.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    // Wait for all questions to complete
    console.log(`⏳ Waiting for all ${plans.length} question generations to complete...`);
    const results = await Promise.allSettled(questionPromises);
    
    // Process results
    let successCount = 0;
    let errorCount = 0;
    const successfulPlanIds: string[] = [];
    const failedPlans: { id: string; error: string }[] = [];
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
        successfulPlanIds.push(result.value.planId);
      } else {
        errorCount++;
        const error = result.status === 'rejected' 
          ? result.reason?.message || 'Unknown error' 
          : result.value.error;
        const planId = result.status === 'fulfilled' ? result.value.planId : null;
        
        if (planId) {
          failedPlans.push({ id: planId, error });
        }
      }
    });

    console.log(`📊 Generation summary:
      - Successful: ${successCount}
      - Failed: ${errorCount}
      - Total plans: ${plans.length}`);

    // Update successful plans to completed status in bulk
    if (successfulPlanIds.length > 0) {
      await supabase
        .from('question_plans')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .in('id', successfulPlanIds);
    }
    
    // Update failed plans with error messages
    for (const failedPlan of failedPlans) {
      await supabase
        .from('question_plans')
        .update({ 
          status: 'failed',
          error_message: failedPlan.error,
          updated_at: new Date().toISOString()
        })
        .eq('id', failedPlan.id);
    }
      
    // Update segment with actual question count
    const { error: updateError } = await supabase
      .from('course_segments')
      .update({
        questions_count: successCount,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', segment_id);
      
    if (updateError) {
      console.error('Failed to update segment status:', updateError);
    }
    
    // Check if this segment completes all questions for the course
    console.log('🔍 Checking if course is ready to publish...');
    
    // Get all segments for this course
    const { data: allSegments, error: segmentsError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', course_id)
      .order('segment_index', { ascending: true });
      
    if (!segmentsError && allSegments) {
      const allComplete = allSegments.every(s => s.status === 'completed');
      const totalPlannedQuestions = allSegments.reduce((sum, s) => sum + (s.planned_questions_count || 0), 0);
      const totalGeneratedQuestions = allSegments.reduce((sum, s) => sum + (s.questions_count || 0), 0);
      
      console.log(`📊 Course progress:
        - Segments completed: ${allSegments.filter(s => s.status === 'completed').length}/${allSegments.length}
        - Questions generated: ${totalGeneratedQuestions}/${totalPlannedQuestions}
        - All complete: ${allComplete}`);
      
      // If all segments are completed and we have questions, trigger publish check
      if (allComplete && totalGeneratedQuestions > 0) {
        console.log('✅ All segments complete! Triggering publish check...');
        
        // Call check-and-publish-course edge function
        const publishUrl = `${supabaseUrl}/functions/v1/check-and-publish-course`;
        const publishResponse = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ course_id })
        });
        
        if (publishResponse.ok) {
          const publishResult = await publishResponse.json();
          console.log('📊 Publish check result:', publishResult);
          
          if (publishResult.published) {
            console.log('🎉 Course has been published!');
          }
        } else {
          console.error('Failed to check course publish status:', await publishResponse.text());
        }
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        generated_count: successCount,
        error_count: errorCount,
        segment_complete: true,
        message: `Generated ${successCount} out of ${plans.length} questions in parallel`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Question generation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 