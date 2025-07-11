import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { generateQuestionPlansForSegment } from '../quiz-generation-v5/stages/planning.ts';
import { extractSegmentContext } from '../quiz-generation-v5/utils/segment-context.ts';
import { generateQuestionsFromPlans } from '../quiz-generation-v5/utils/question-generation.ts';
import { createProgressTracker } from '../quiz-generation-v5/utils/progress-tracker.ts';
import { formatSecondsForDisplay } from '../quiz-generation-v5/utils/timestamp-converter.ts';
import { convertBase60ToSeconds } from '../quiz-generation-v5/utils/timestamp-converter.ts';

// Import required types
import type { QuestionPlan, GeneratedQuestion, VideoTranscript } from '../quiz-generation-v5/types/interfaces.ts';

// Declare Deno global
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Helper function to ensure all timestamps in context are properly converted
// This fixes issues where timestamps from previous segments might still be in
// decimal minute format (e.g., 10.37 = 10m 37s) instead of seconds
function validateAndConvertContextTimestamps(context: any): any {
  if (!context) return context;
  
  const convertedContext = { ...context };
  
  // Convert key concepts timestamps
  if (convertedContext.keyConcepts && Array.isArray(convertedContext.keyConcepts)) {
    convertedContext.keyConcepts = convertedContext.keyConcepts.map((concept: any) => {
      // Check if timestamp looks like decimal minutes (e.g., 10.37)
      const convertTimestamp = (ts: number) => {
        // If it's a decimal < 20 and has decimals, it's likely in minute.second format
        if (ts < 20 && ts % 1 !== 0) {
          const minutes = Math.floor(ts);
          const seconds = Math.round((ts - minutes) * 100);
          const totalSeconds = minutes * 60 + seconds;
          console.log(`   🔄 Converting timestamp: ${ts} (decimal minutes) → ${totalSeconds}s`);
          return totalSeconds;
        }
        return ts;
      };
      
      return {
        ...concept,
        first_mentioned: convertTimestamp(concept.first_mentioned),
        explanation_timestamps: concept.explanation_timestamps?.map(convertTimestamp) || []
      };
    });
  }
  
  // Convert last questions timestamps
  if (convertedContext.lastQuestions && Array.isArray(convertedContext.lastQuestions)) {
    convertedContext.lastQuestions = convertedContext.lastQuestions.map((q: any) => ({
      ...q,
      timestamp: q.timestamp < 20 && q.timestamp % 1 !== 0 
        ? Math.floor(q.timestamp) * 60 + Math.round((q.timestamp % 1) * 100)
        : q.timestamp
    }));
  }
  
  return convertedContext;
}



interface SegmentProcessingRequest {
  course_id: string;
  segment_id: string;
  segment_index: number;
  youtube_url: string;
  start_time: number;
  end_time: number;
  session_id?: string;
  previous_segment_context?: any;
  total_segments: number;
  max_questions?: number;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let segment_id: string | undefined;
  
  try {
    const {
      course_id,
      segment_id: segmentId,
      segment_index,
      youtube_url,
      start_time,
      end_time,
      session_id,
      previous_segment_context,
      total_segments,
      max_questions = 5
    }: SegmentProcessingRequest = await req.json();
    
    segment_id = segmentId;
    
    // Debug logging
    console.log(`📊 Request body:`, {
      course_id,
      segment_id: segmentId,
      segment_index,
      total_segments,
      youtube_url: youtube_url?.substring(0, 50) + '...'
    });
    
    // Calculate segment duration and adjust max questions (1 per minute)
    const segmentDurationSeconds = end_time - start_time;
    const segmentDurationMinutes = Math.ceil(segmentDurationSeconds / 60);
    const adjustedMaxQuestions = Math.min(segmentDurationMinutes, max_questions);

    console.log(`🎬 Processing segment ${segment_index + 1}/${total_segments} for course ${course_id}`);
    console.log(`   📹 Time range: ${formatSecondsForDisplay(start_time)} - ${formatSecondsForDisplay(end_time)} (${segmentDurationMinutes} minutes)`);
    console.log(`   🎯 Max questions for this segment: ${adjustedMaxQuestions} (1 per minute)`);
    console.log(`   🔗 Has previous context: ${!!previous_segment_context}`);
    
    // Validate and convert timestamps in previous context
    const validatedPreviousContext = validateAndConvertContextTimestamps(previous_segment_context);
    
    // Debug previous context timestamps
    if (validatedPreviousContext && validatedPreviousContext.keyConcepts) {
      const suspectPrevTimestamps = validatedPreviousContext.keyConcepts.filter((c: any) => 
        c.first_mentioned < 100 && c.first_mentioned.toString().includes('.')
      );
      if (suspectPrevTimestamps.length > 0) {
        console.warn(`   ⚠️ Previous context still has ${suspectPrevTimestamps.length} concepts with decimal timestamps after validation`);
      }
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Detect if running locally
    const isLocal = supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1');
    console.log(`🌍 Environment: ${isLocal ? 'LOCAL' : 'PRODUCTION'} (URL: ${supabaseUrl})`);

    // Update segment status to processing
    const { error: updateError } = await supabase
      .from('course_segments')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString()
      })
      .eq('id', segment_id);

    if (updateError) {
      throw new Error(`Failed to update segment status: ${updateError.message}`);
    }

    // Update progress tracking if session_id provided
    if (session_id) {
      await supabase
        .from('quiz_generation_progress')
        .update({
          stage: 'generation',
          current_step: `Processing segment ${segment_index + 1} of ${total_segments}`,
          stage_progress: segment_index / total_segments,
          overall_progress: 0.25 + (0.5 * (segment_index / total_segments)),
          updated_at: new Date().toISOString()
        })
        .eq('course_id', course_id)
        .eq('session_id', session_id);
    }

    // Stage 1: Generate transcript and question plans for this segment
    console.log('📝 Stage 1: Generating segment transcript and question plans...');
    
    const segmentInfo = {
      index: segment_index,
      startTime: start_time,
      endTime: end_time,
      totalSegments: total_segments
    };

    const { plans, transcript } = await generateQuestionPlansForSegment(
      youtube_url,
      segmentInfo,
      adjustedMaxQuestions,
      validatedPreviousContext,
      course_id,
      supabase
    );

    console.log(`✅ Generated ${plans.length} question plans for segment`);
    
    // Check if transcript is empty or has no meaningful content
    const hasTranscriptContent = transcript && 
      transcript.full_transcript && 
      transcript.full_transcript.length > 0 &&
      transcript.full_transcript.some((segment: any) => 
        segment.text && segment.text.trim().length > 0
      );
    
    if (!hasTranscriptContent) {
      console.warn(`⚠️ Segment ${segment_index + 1} has no transcript content, skipping question generation`);
      
      // Update segment with completion status but no questions
      const { error: completeError } = await supabase
        .from('course_segments')
        .update({
          status: 'completed',
          processing_completed_at: new Date().toISOString(),
          questions_count: 0,
          cumulative_key_concepts: validatedPreviousContext?.keyConcepts || [],
          previous_segment_context: validatedPreviousContext || null,
          error_message: 'No transcript content available for this segment'
        })
        .eq('id', segment_id);

      if (completeError) {
        console.error('Failed to update segment completion:', completeError);
      }
      
      // Check if there's a next segment to process
      const { data: nextSegment, error: nextSegmentError } = await supabase
        .from('course_segments')
        .select('*')
        .eq('course_id', course_id)
        .eq('segment_index', segment_index + 1)
        .single();
      
      if (nextSegmentError && nextSegmentError.code !== 'PGRST116') {
        console.error('Error checking for next segment:', nextSegmentError);
      }

      if (nextSegment && nextSegment.status === 'pending') {
        console.log(`🔄 Triggering processing for next segment ${nextSegment.segment_index + 1}`);
        console.log(`   📌 Next segment ID: ${nextSegment.id}`);
        console.log(`   ⏱️ Time range: ${nextSegment.start_time}s - ${nextSegment.end_time}s`);
        
        const functionUrl = `${supabaseUrl}/functions/v1/process-video-segment`;
        
        // Trigger next segment synchronously before returning response
        try {
          const requestBody = {
            course_id,
            segment_id: nextSegment.id,
            segment_index: nextSegment.segment_index,
            youtube_url,
            start_time: nextSegment.start_time,
            end_time: nextSegment.end_time,
            session_id,
            previous_segment_context: validatedPreviousContext, // Pass validated context
            total_segments,
            max_questions
          };
          
          console.log('📤 Triggering next segment with body:', requestBody);
          
          const nextSegmentResponse = await fetch(functionUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          
          if (!nextSegmentResponse.ok) {
            const errorText = await nextSegmentResponse.text();
            console.error(`❌ Failed to trigger next segment: ${errorText}`);
          } else {
            console.log(`✅ Successfully triggered next segment ${nextSegment.segment_index + 1}`);
          }
        } catch (err) {
          console.error('Failed to trigger next segment processing:', err);
        }
      } else if (!nextSegment) {
        console.log(`✅ This was the LAST segment (${segment_index + 1}/${total_segments})! Finalizing course...`);
        
        // Update course as fully processed
        const { error: courseUpdateError } = await supabase
          .from('courses')
          .update({ 
            published: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', course_id);
          
        if (courseUpdateError) {
          console.error('Failed to update course status:', courseUpdateError);
        }

        // Update progress to completed
        if (session_id) {
          await supabase
            .from('quiz_generation_progress')
            .update({
              stage: 'completed',
              current_step: 'All segments processed successfully',
              stage_progress: 1.0,
              overall_progress: 1.0,
              updated_at: new Date().toISOString()
            })
            .eq('course_id', course_id)
            .eq('session_id', session_id);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          segment_index,
          questions_generated: 0,
          generation_metadata: { skipped: true, reason: 'No transcript content' },
          context_for_next: validatedPreviousContext,
          next_segment_triggered: !!nextSegment,
          errors: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Stage 2: Generate actual questions from plans using the existing implementation
    console.log('❓ Stage 2: Generating questions from plans...');
    
    // Create progress tracker
    const tracker = await createProgressTracker(supabase, course_id, session_id || '');
    
    // Use the existing generateQuestionsFromPlans function
    const generationResult = await generateQuestionsFromPlans(
      plans,
      youtube_url,
      tracker,
      transcript
    );

    console.log(`✅ Generated ${generationResult.generated_questions.length} questions for segment`);

    // Store questions in database with segment reference
    const questionsToInsert = generationResult.generated_questions.map(q => ({
      course_id,
      segment_id,
      segment_index,
      timestamp: Math.round(q.timestamp),
      question: q.question,
      type: q.type,
      options: q.type === 'multiple-choice' ? JSON.stringify((q as any).options || []) : null,
      correct_answer: q.type === 'multiple-choice' ? (q as any).correct_answer : 
                      q.type === 'true-false' ? ((q as any).correct_answer === true ? 0 : 1) : 1,
      explanation: q.explanation,
      has_visual_asset: ['hotspot', 'matching', 'sequencing'].includes(q.type),
      frame_timestamp: q.type === 'hotspot' ? Math.round((q as any).frame_timestamp || 0) : null,
      metadata: JSON.stringify({
        ...(q.type === 'hotspot' && {
          target_objects: (q as any).target_objects,
          question_context: (q as any).question_context,
          visual_learning_objective: (q as any).visual_learning_objective,
          video_overlay: true
        }),
        ...(q.type === 'matching' && {
          matching_pairs: (q as any).matching_pairs,
          relationship_analysis: (q as any).relationship_analysis,
          relationship_type: (q as any).relationship_type,
          video_overlay: true
        }),
        ...(q.type === 'sequencing' && {
          sequence_items: (q as any).sequence_items,
          sequence_analysis: (q as any).sequence_analysis,
          sequence_type: (q as any).sequence_type,
          video_overlay: true
        })
      })
    }));

    let insertedQuestions: any[] = [];
    
    if (questionsToInsert.length > 0) {
      console.log(`💾 Inserting ${questionsToInsert.length} questions for segment ${segment_index + 1}...`);
      
      const { data, error: insertError } = await supabase
        .from('questions')
        .insert(questionsToInsert)
        .select();

      if (insertError) {
        console.error('Failed to insert questions:', insertError);
        throw new Error(`Failed to store questions: ${insertError.message}`);
      }
      
      insertedQuestions = data || [];
      console.log(`✅ Successfully inserted ${insertedQuestions.length} questions for segment ${segment_index + 1}`);
    } else {
      console.warn(`⚠️ No questions to insert for segment ${segment_index + 1}`);
    }

    // Extract context for next segment
    const currentSegmentContext = extractSegmentContext(
      transcript,
      generationResult.generated_questions,
      segment_index,
      end_time
    );
    
    // Debug log: Check for timestamp issues
    console.log(`🔍 Context extraction for segment ${segment_index + 1}:`);
    console.log(`   Key concepts: ${currentSegmentContext.keyConcepts.length}`);
    
    // Check for decimal timestamps
    const suspectTimestamps = currentSegmentContext.keyConcepts.filter(c => 
      c.first_mentioned < 100 && c.first_mentioned.toString().includes('.')
    );
    if (suspectTimestamps.length > 0) {
      console.warn(`   ⚠️ Found ${suspectTimestamps.length} concepts with decimal timestamps:`, 
        suspectTimestamps.map(c => `${c.concept} at ${c.first_mentioned}`)
      );
    }

    // Merge with previous context to maintain cumulative knowledge
    const cumulativeContext = validatedPreviousContext ? {
      ...currentSegmentContext,
      keyConcepts: [
        ...validatedPreviousContext.keyConcepts,
        ...currentSegmentContext.keyConcepts.filter((c: any) => 
          !validatedPreviousContext.keyConcepts.find((pc: any) => pc.concept === c.concept)
        )
      ]
    } : currentSegmentContext;

    // Update segment with completion status and context
    const { error: completeError } = await supabase
      .from('course_segments')
      .update({
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        // Remove transcript_data - it's now properly managed in video_transcripts table
        questions_count: generationResult.generated_questions.length,
        cumulative_key_concepts: cumulativeContext.keyConcepts,
        previous_segment_context: validatedPreviousContext || null
      })
      .eq('id', segment_id);

    if (completeError) {
      console.error('Failed to update segment completion:', completeError);
    }

    // Check if there's a next segment to process
    const { data: nextSegment, error: nextSegmentError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', course_id)
      .eq('segment_index', segment_index + 1)
      .single();
    
    if (nextSegmentError && nextSegmentError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is expected for the last segment
      console.error('Error checking for next segment:', nextSegmentError);
    }

    if (nextSegment && nextSegment.status === 'pending') {
      console.log(`🔄 Triggering processing for next segment ${nextSegment.segment_index + 1}`);
      console.log(`   📌 Next segment ID: ${nextSegment.id}`);
      console.log(`   ⏱️ Time range: ${nextSegment.start_time}s - ${nextSegment.end_time}s`);
      
      const functionUrl = `${supabaseUrl}/functions/v1/process-video-segment`;
      
      // Trigger next segment synchronously before returning response
      try {
        const requestBody = {
          course_id,
          segment_id: nextSegment.id,
          segment_index: nextSegment.segment_index,
          youtube_url,
          start_time: nextSegment.start_time,
          end_time: nextSegment.end_time,
          session_id,
          previous_segment_context: cumulativeContext,
          total_segments,
          max_questions
        };
        
        console.log('📤 Triggering next segment with body:', requestBody);
        
        const nextSegmentResponse = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!nextSegmentResponse.ok) {
          const errorText = await nextSegmentResponse.text();
          console.error(`❌ Failed to trigger next segment: ${errorText}`);
        } else {
          console.log(`✅ Successfully triggered next segment ${nextSegment.segment_index + 1}`);
        }
      } catch (err) {
        console.error('Failed to trigger next segment processing:', err);
      }
    } else if (!nextSegment) {
      console.log(`✅ This was the LAST segment (${segment_index + 1}/${total_segments})! Finalizing course...`);
      
      // Update course as fully processed
      const { error: courseUpdateError } = await supabase
        .from('courses')
        .update({ 
          published: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', course_id);
        
      if (courseUpdateError) {
        console.error('Failed to update course status:', courseUpdateError);
      } else {
        console.log('✅ Course marked as published');
      }

      // Update progress to completed
      if (session_id) {
        const { error: progressError } = await supabase
          .from('quiz_generation_progress')
          .update({
            stage: 'completed',
            current_step: 'All segments processed successfully',
            stage_progress: 1.0,
            overall_progress: 1.0,
            updated_at: new Date().toISOString()
          })
          .eq('course_id', course_id)
          .eq('session_id', session_id);
          
        if (progressError) {
          console.error('Failed to update progress status:', progressError);
        } else {
          console.log('✅ Progress marked as completed');
        }
      }
      
      console.log(`📊 Final segment summary:
        - Segment: ${segment_index + 1}/${total_segments}
        - Questions generated: ${generationResult.generated_questions.length}
        - Questions inserted: ${insertedQuestions.length}
        - Course published: ${!courseUpdateError}`);
    } else {
      console.log(`📝 Segment ${segment_index + 1} has a next segment but it's not pending (status: ${nextSegment?.status})`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        segment_index,
        questions_generated: generationResult.generated_questions.length,
        generation_metadata: generationResult.generation_metadata,
        context_for_next: cumulativeContext,
        next_segment_triggered: !!nextSegment,
        errors: generationResult.errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Segment processing error:', error);
    
    // Update segment status to failed
    try {
      // Use segment_id from the already parsed request body
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      
      // segment_id is already available from the destructured request at the top
      if (segment_id) {
        await supabase
          .from('course_segments')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: supabase.raw('retry_count + 1')
          })
          .eq('id', segment_id);
      }
    } catch (updateError) {
      console.error('Failed to update segment status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 