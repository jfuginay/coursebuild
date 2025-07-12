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

    let successCount = 0;
    let errorCount = 0;

    // Process each question individually
    for (const plan of plans) {
      console.log(`\n🔄 Processing question ${plan.question_id} (${plan.question_type})`);
      
      // Update status to generating
      await supabase
        .from('question_plans')
        .update({ 
          status: 'generating',
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);

      try {
        // Generate the question using the existing processor
        const question = await generateQuestionByType(
          plan.plan_data,
          youtube_url,
          tracker,
          transcript
        );
        
        // Transform the question for database storage
        const dbQuestion = {
          id: plan.question_id,
          course_id: course_id,
          segment_id: segment_id,
          segment_index: plan.segment_index,
          question: question.question,
          type: question.type,
          options: Array.isArray(question.options) ? question.options : JSON.stringify(question.options || []),
          correct_answer: question.correct_answer !== undefined ? question.correct_answer : 0,
          explanation: question.explanation,
          timestamp: question.timestamp,
          visual_context: question.visual_context,
          frame_timestamp: question.frame_timestamp,
          has_visual_asset: question.type === 'hotspot' || question.video_overlay,
          metadata: {
            bloom_level: question.bloom_level,
            educational_rationale: question.educational_rationale,
            misconception_analysis: question.misconception_analysis,
            misconception_addressed: question.misconception_addressed,
            bounding_boxes: question.bounding_boxes,
            detected_elements: question.detected_elements,
            matching_pairs: question.matching_pairs,
            sequence_items: question.sequence_items,
            distractor_guidance: question.distractor_guidance
          },
          generation_status: 'completed',
          generated_at: new Date().toISOString()
        };

        // Save to database with bounding boxes if hotspot
        if (question.type === 'hotspot' && question.bounding_boxes) {
          // Insert question first
          const { data: insertedQuestion, error: insertError } = await supabase
            .from('questions')
            .insert(dbQuestion)
            .select()
            .single();

          if (insertError) {
            throw new Error(`Failed to insert question: ${insertError.message}`);
          }

          // Insert bounding boxes
          const boundingBoxes = question.bounding_boxes.map((box: any) => ({
            question_id: plan.question_id,
            label: box.label,
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            is_correct_answer: box.isCorrectAnswer || false,
            confidence_score: box.confidenceScore || 0.9
          }));

          const { error: boxError } = await supabase
            .from('bounding_boxes')
            .insert(boundingBoxes);

          if (boxError) {
            console.error('Failed to insert bounding boxes:', boxError);
          }
        } else {
          // Insert regular question
          const { error: insertError } = await supabase
            .from('questions')
            .insert(dbQuestion);

          if (insertError) {
            throw new Error(`Failed to insert question: ${insertError.message}`);
          }
        }
        
        // Update plan status to completed
        await supabase
          .from('question_plans')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', plan.id);
          
        successCount++;
        console.log(`✅ Question ${plan.question_id} generated and saved successfully`);
        
        // Add a small delay between questions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to generate question ${plan.question_id}:`, error);
        
        // Update plan status to failed
        await supabase
          .from('question_plans')
          .update({ 
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          })
          .eq('id', plan.id);
      }
    }

    // Check if all questions for the segment are complete
    const { data: remainingPlans } = await supabase
      .from('question_plans')
      .select('id', { count: 'exact' })
      .eq('segment_id', segment_id)
      .in('status', ['planned', 'generating']);

    const allComplete = !remainingPlans || remainingPlans.length === 0;

    console.log(`\n📊 Question generation complete:
    - Success: ${successCount}
    - Failed: ${errorCount}
    - Segment complete: ${allComplete}`);

    return new Response(
      JSON.stringify({
        success: true,
        generated_count: successCount,
        error_count: errorCount,
        segment_complete: allComplete,
        message: `Generated ${successCount} questions successfully`
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