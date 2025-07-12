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
        
        // Transform the question for database storage
        let options = null;
        let correctAnswer: number | boolean = 0;
        let metadata: any = {};
        
        // Type-specific data preparation (matching quiz-generation-v5)
        const questionType = question.type === 'true_false' ? 'true-false' : question.type;
        
        switch (questionType) {
          case 'multiple-choice':
            options = JSON.stringify((question as any).options || []);
            correctAnswer = (question as any).correct_answer || 0;
            if ((question as any).misconception_analysis) {
              metadata.misconception_analysis = (question as any).misconception_analysis;
            }
            break;
            
          case 'true-false':
            // True/False questions don't have options in the database
            options = null;
            // Convert boolean to correct index for ['True', 'False'] options array
            // true -> 0 (index of 'True'), false -> 1 (index of 'False')
            const tfAnswer = (question as any).correct_answer;
            if (typeof tfAnswer === 'boolean') {
              correctAnswer = tfAnswer === true ? 0 : 1;
            } else if (typeof tfAnswer === 'string') {
              // Handle string "true"/"false" from older implementations
              correctAnswer = tfAnswer === 'true' ? 0 : 1;
            } else {
              // Default to the numeric value if already converted
              correctAnswer = tfAnswer || 0;
            }
            if ((question as any).concept_analysis) {
              metadata.concept_analysis = (question as any).concept_analysis;
            }
            if ((question as any).misconception_addressed) {
              metadata.misconception_addressed = (question as any).misconception_addressed;
            }
            break;
            
          case 'hotspot':
            options = null; // Hotspot questions don't have options
            correctAnswer = 1; // Hotspot questions use special handling
            metadata = {
              target_objects: (question as any).target_objects,
              frame_timestamp: (question as any).frame_timestamp,
              question_context: (question as any).question_context,
              visual_learning_objective: (question as any).visual_learning_objective,
              distractor_guidance: (question as any).distractor_guidance,
              video_overlay: true
            };
            
            // Add bounding box metadata if available
            if ((question as any).bounding_boxes) {
              metadata.detected_elements = (question as any).bounding_boxes;
              metadata.gemini_bounding_boxes = true;
              metadata.video_dimensions = (question as any).video_dimensions || { width: 1000, height: 1000 };
            }
            break;
            
          case 'matching':
            options = null; // Matching questions use metadata
            correctAnswer = 1; // Matching questions use special handling
            metadata = {
              matching_pairs: (question as any).matching_pairs,
              relationship_analysis: (question as any).relationship_analysis,
              relationship_type: (question as any).relationship_type,
              video_overlay: true
            };
            break;
            
          case 'sequencing':
            options = null; // Sequencing questions use metadata
            correctAnswer = 1; // Sequencing questions use special handling
            metadata = {
              sequence_items: (question as any).sequence_items,
              sequence_analysis: (question as any).sequence_analysis,
              sequence_type: (question as any).sequence_type,
              video_overlay: true
            };
            break;
            
          default:
            // For any other types, store options as JSON if array
            if (Array.isArray((question as any).options)) {
              options = JSON.stringify((question as any).options);
            } else {
              options = (question as any).options;
            }
            correctAnswer = (question as any).correct_answer || 0;
        }
        
        // Add common metadata fields
        metadata.bloom_level = question.bloom_level;
        metadata.educational_rationale = question.educational_rationale;
        metadata.misconception_analysis = question.misconception_analysis;
        metadata.misconception_addressed = question.misconception_addressed;
        metadata.plan_question_id = plan.question_id; // Store the original plan ID
        
        const dbQuestion = {
          course_id: course_id,
          segment_id: segment_id,
          segment_index: plan.segment_index,
          question: question.question,
          type: question.type === 'true_false' ? 'true-false' : question.type,
          timestamp: Math.round(plan.timestamp),
          options: options,
          correct_answer: correctAnswer,
          explanation: question.explanation,
          visual_context: (question as any).visual_context || null,
          frame_timestamp: question.type === 'hotspot' && (question as any).frame_timestamp ? Math.round((question as any).frame_timestamp) : null,
          has_visual_asset: ['hotspot', 'matching', 'sequencing'].includes(question.type) || (question as any).video_overlay,
          metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
          generation_status: 'completed',
          generated_at: new Date().toISOString()
        };

        // Save to database with bounding boxes if hotspot
        let insertedQuestionId: string | null = null;
        
        if (question.type === 'hotspot' && (question as any).bounding_boxes) {
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

          // Debug log to check bounding box structure
          console.log('🎯 Hotspot question bounding boxes:', {
            count: (question as any).bounding_boxes.length,
            sample: (question as any).bounding_boxes[0],
            correctAnswers: (question as any).bounding_boxes.filter((b: any) => b.is_correct_answer === true).length
          });

          // Insert bounding boxes using the generated question ID
          const boundingBoxes = (question as any).bounding_boxes.map((box: any) => ({
            question_id: insertedQuestion.id,
            label: box.label,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            is_correct_answer: box.is_correct_answer || false,
            confidence_score: box.confidence_score || 0.9
          }));

          const { error: boxError } = await supabase
            .from('bounding_boxes')
            .insert(boundingBoxes);

          if (boxError) {
            console.error('Failed to insert bounding boxes:', boxError);
            // Don't fail the entire question generation if bounding boxes fail
          }
        } else {
          // Insert regular question
          const { data: insertedQuestion, error: insertError } = await supabase
            .from('questions')
            .insert(dbQuestion)
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to insert question: ${insertError.message}`);
          }
          
          insertedQuestionId = insertedQuestion?.id || null;
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