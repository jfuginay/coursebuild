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
  if (!context) return null;
  
  // Ensure all required properties exist with defaults
  const convertedContext = {
    lastTranscriptSegments: context.lastTranscriptSegments || [],
    keyConcepts: context.keyConcepts || [],
    lastQuestions: context.lastQuestions || [],
    segmentSummary: context.segmentSummary || '',
    segmentIndex: context.segmentIndex ?? -1,
    totalProcessedDuration: context.totalProcessedDuration || 0
  };
  
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
        first_mentioned: convertTimestamp(concept.first_mentioned || 0),
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
        : q.timestamp || 0
    }));
  }
  
  // Ensure lastTranscriptSegments have required structure
  if (convertedContext.lastTranscriptSegments && Array.isArray(convertedContext.lastTranscriptSegments)) {
    convertedContext.lastTranscriptSegments = convertedContext.lastTranscriptSegments.map((seg: any) => ({
      timestamp: seg.timestamp || 0,
      end_timestamp: seg.end_timestamp,
      text: seg.text || '',
      visual_description: seg.visual_description || '',
      is_salient_event: seg.is_salient_event ?? false,
      event_type: seg.event_type
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
    let validatedPreviousContext = validateAndConvertContextTimestamps(previous_segment_context);
    
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

    // ATOMIC SEGMENT CLAIMING: Prevent concurrent processing
    // Generate a unique worker ID for this execution
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔒 Attempting to claim segment with worker ID: ${workerId}`);
    
    // First, check current segment status
    const { data: currentSegment, error: fetchError } = await supabase
      .from('course_segments')
      .select('status, processing_started_at, worker_id, retry_count')
      .eq('id', segment_id)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch segment status: ${fetchError.message}`);
    }
    
    // Check if segment is already being processed
    if (currentSegment.status === 'processing') {
      const processingTime = currentSegment.processing_started_at 
        ? Date.now() - new Date(currentSegment.processing_started_at).getTime()
        : 0;
      
      // If it's been processing for less than 5 minutes, skip
      if (processingTime < 300000) { // 5 minutes
        console.log(`⚠️ Segment already being processed by ${currentSegment.worker_id || 'unknown worker'}`);
        console.log(`   ⏱️ Processing for ${Math.round(processingTime / 1000)}s`);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Segment already being processed',
            segment_index,
            worker_id: currentSegment.worker_id,
            processing_time_seconds: Math.round(processingTime / 1000)
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 409 // Conflict
          }
        );
      } else {
        console.log(`⚠️ Segment has been processing for ${Math.round(processingTime / 1000)}s, taking over`);
      }
    }
    
    // Check if segment is already completed
    if (currentSegment.status === 'completed') {
      console.log(`✅ Segment already completed, skipping`);
      
      // Still need to check for next segment
      const { data: nextSegment } = await supabase
        .from('course_segments')
        .select('*')
        .eq('course_id', course_id)
        .eq('segment_index', segment_index + 1)
        .single();
      
      return new Response(
        JSON.stringify({
          success: true,
          segment_index,
          status: 'already_completed',
          next_segment_exists: !!nextSegment
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }
    
    // Atomic update: Only proceed if status is 'pending' or 'failed'
    const { data: claimedSegment, error: claimError } = await supabase
      .from('course_segments')
      .update({ 
        status: 'processing',
        processing_started_at: new Date().toISOString(),
        worker_id: workerId,
        retry_count: currentSegment.status === 'failed' ? (currentSegment.retry_count || 0) + 1 : 0
      })
      .eq('id', segment_id)
      .in('status', ['pending', 'failed'])
      .select()
      .single();

    if (claimError || !claimedSegment) {
      console.log(`❌ Failed to claim segment: ${claimError?.message || 'No segment updated'}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to claim segment for processing',
          segment_index
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409
        }
      );
    }
    
    console.log(`✅ Successfully claimed segment for processing`);
    
    // DEPENDENCY CHECK: Ensure previous segments are completed
    if (segment_index > 0) {
      const { data: previousSegment, error: prevError } = await supabase
        .from('course_segments')
        .select('status, cumulative_key_concepts')
        .eq('course_id', course_id)
        .eq('segment_index', segment_index - 1)
        .single();
      
      if (prevError || !previousSegment) {
        console.error(`❌ Cannot find previous segment ${segment_index - 1}`);
        // Revert segment status
        await supabase
          .from('course_segments')
          .update({ status: 'pending', worker_id: null })
          .eq('id', segment_id);
        
        throw new Error(`Previous segment ${segment_index - 1} not found`);
      }
      
      if (previousSegment.status !== 'completed') {
        console.log(`⚠️ Previous segment ${segment_index - 1} not completed (status: ${previousSegment.status})`);
        // Revert segment status
        await supabase
          .from('course_segments')
          .update({ status: 'pending', worker_id: null })
          .eq('id', segment_id);
        
        return new Response(
          JSON.stringify({
            success: false,
            error: `Previous segment ${segment_index - 1} must complete first`,
            segment_index,
            previous_segment_status: previousSegment.status
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 425 // Too Early
          }
        );
      }
      
      // Use the context from the previous segment if not provided
      if (!previous_segment_context && previousSegment.cumulative_key_concepts) {
        console.log(`📋 Using context from previous segment ${segment_index - 1}`);
        validatedPreviousContext = {
          keyConcepts: previousSegment.cumulative_key_concepts,
          segmentIndex: segment_index - 1,
          lastTranscriptSegments: [],
          lastQuestions: [],
          segmentSummary: '',
          totalProcessedDuration: 0
        };
      }
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
        console.log(`🔄 Next segment ${nextSegment.segment_index + 1} is ready`);
        console.log(`   🎼 Triggering orchestrator to handle next segment`);
        
        const orchestratorUrl = `${supabaseUrl}/functions/v1/orchestrate-segment-processing`;
        
        // Trigger orchestrator to handle next segment
        try {
          const orchestratorResponse = await fetch(orchestratorUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              course_id,
              check_only: false
            })
          });
          
          if (!orchestratorResponse.ok) {
            const errorText = await orchestratorResponse.text();
            console.error(`❌ Failed to trigger orchestrator: ${errorText}`);
          } else {
            const result = await orchestratorResponse.json();
            console.log(`✅ Orchestrator triggered, status: ${result.status}`);
          }
        } catch (err) {
          console.error('Failed to trigger orchestrator:', err);
        }
      } else if (!nextSegment) {
        console.log(`✅ This was the LAST segment (${segment_index + 1}/${total_segments})! Finalizing course...`);
        
        // IMPORTANT: Verify questions exist before marking as published
        const { count: questionCount, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course_id);
        
        if (countError) {
          console.error('Failed to count questions:', countError);
        }
        
        console.log(`📊 Total questions in database for course: ${questionCount || 0}`);
        
        if (!questionCount || questionCount === 0) {
          console.warn(`⚠️ No questions found for course ${course_id}. Not marking as published.`);
          
          // Don't publish the course if no questions exist
          return new Response(
            JSON.stringify({
              success: true,
              segment_index,
              questions_generated: 0,
              generation_metadata: { skipped: true, reason: 'No transcript content' },
              context_for_next: validatedPreviousContext,
              next_segment_triggered: false,
              errors: [],
              warning: 'Course not published - no questions found in database'
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
        
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
          console.log(`✅ Course marked as published (${questionCount} questions verified)`);
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

    // Save quiz plans to database for individual processing
    console.log('💾 Saving quiz plans to database...');
    
    const savedPlans = await supabase
      .from('question_plans')
      .insert(plans.map(plan => ({
        course_id,
        segment_id,
        segment_index,
        question_id: plan.question_id,
        question_type: plan.question_type,
        timestamp: plan.timestamp,
        status: 'planned',
        plan_data: plan
      })))
      .select();
    
    if (savedPlans.error) {
      console.error('Failed to save question plans:', savedPlans.error);
      throw new Error(`Failed to save question plans: ${savedPlans.error.message}`);
    }
    
    console.log(`✅ Saved ${savedPlans.data?.length || 0} question plans`);
    
    // Update segment with plan count
    await supabase
      .from('course_segments')
      .update({
        planning_status: 'completed',
        question_plans_count: plans.length
      })
      .eq('id', segment_id);
    
    // Stage 2: Trigger individual question generation
    console.log('🚀 Triggering individual question generation...');
    
    const questionGenUrl = `${supabaseUrl}/functions/v1/generate-individual-questions`;
    const questionGenResponse = await fetch(questionGenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course_id,
        segment_id,
        youtube_url
      })
    });
    
    const questionGenResult = await questionGenResponse.json();
    console.log('📊 Question generation triggered:', questionGenResult);

    // Note: Questions are now being generated and stored individually by generate-individual-questions
    // We'll track progress through the question_plans table
    const questionsGenerated = questionGenResult.success ? questionGenResult.generated_count : 0;
    const errorCount = questionGenResult.error_count || 0;
    
    console.log(`📊 Initial question generation results:
    - Questions generated: ${questionsGenerated}
    - Errors: ${errorCount}
    - Segment complete: ${questionGenResult.segment_complete}`);
    
    // For backward compatibility, we'll need an array of generated questions for context extraction
    // In the future, we should fetch these from the database
    const generatedQuestions = [];

    // Extract context for next segment
    // TODO: In the future, fetch generated questions from the database
    const currentSegmentContext = extractSegmentContext(
      transcript,
      generatedQuestions, // Currently empty, will be fetched from DB in future
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
        questions_count: questionsGenerated,
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

    // Check if this is the last segment BEFORE triggering next segment or marking as published
    const isLastSegment = !nextSegment;
    
    if (nextSegment && nextSegment.status === 'pending') {
      console.log(`🔄 Next segment ${nextSegment.segment_index + 1} is ready`);
      console.log(`   🎼 Triggering orchestrator to handle next segment`);
      
      const orchestratorUrl = `${supabaseUrl}/functions/v1/orchestrate-segment-processing`;
      
      // Trigger orchestrator to handle next segment
      try {
        const orchestratorResponse = await fetch(orchestratorUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            course_id,
            check_only: false
          })
        });
        
        if (!orchestratorResponse.ok) {
          const errorText = await orchestratorResponse.text();
          console.error(`❌ Failed to trigger orchestrator: ${errorText}`);
        } else {
          const result = await orchestratorResponse.json();
          console.log(`✅ Orchestrator triggered, status: ${result.status}`);
        }
      } catch (err) {
        console.error('Failed to trigger orchestrator:', err);
      }
    } else if (isLastSegment) {
      console.log(`✅ This was the LAST segment (${segment_index + 1}/${total_segments})! Will finalize course after all DB operations complete...`);
      
      // IMPORTANT: Course publishing is now moved to AFTER all DB operations are complete
      // This prevents the race condition where the course page sees published=true before questions are inserted
    } else {
      console.log(`📝 Segment ${segment_index + 1} has a next segment but it's not pending (status: ${nextSegment?.status})`);
    }

    // If this is the last segment, publish the course AFTER all operations are complete
    if (isLastSegment) {
      console.log(`🏁 All database operations complete for last segment. Now finalizing course...`);
      
      // IMPORTANT: Verify questions exist before marking as published
      const { count: questionCount, error: countError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course_id);
      
      if (countError) {
        console.error('Failed to count questions:', countError);
      }
      
      console.log(`📊 Total questions in database for course: ${questionCount || 0}`);
      
      if (!questionCount || questionCount === 0) {
        console.warn(`⚠️ No questions found for course ${course_id}. Not marking as published yet.`);
        
        // Update segment status but don't publish the course
        return new Response(
          JSON.stringify({
            success: true,
            segment_index,
            questions_generated: questionsGenerated,
            generation_metadata: { 
              successful_generations: questionsGenerated,
              failed_generations: errorCount,
              segment_complete: questionGenResult.segment_complete 
            },
            context_for_next: cumulativeContext,
            next_segment_triggered: false,
            errors: [],
            warning: 'Course not published - no questions found in database'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        );
      }
      
      // Update course as fully processed
      // NOTE: We'll mark as published, but the frontend can still show questions incrementally
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
        console.log(`✅ Course marked as published (${questionCount} questions verified)`);
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
        - Questions generated: ${questionsGenerated}
        - Questions complete: ${questionGenResult.segment_complete}
        - Total questions in course: ${questionCount}
        - Course published: ${!courseUpdateError}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        segment_index,
        questions_generated: questionsGenerated,
        generation_metadata: { 
          successful_generations: questionsGenerated,
          failed_generations: errorCount,
          segment_complete: questionGenResult.segment_complete 
        },
        context_for_next: cumulativeContext,
        next_segment_triggered: !!nextSegment,
        errors: []
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
        // First fetch the current retry count
        const { data: currentSegment } = await supabase
          .from('course_segments')
          .select('retry_count')
          .eq('id', segment_id)
          .single();
        
        const currentRetryCount = currentSegment?.retry_count || 0;
        
        // Then update with incremented value
        await supabase
          .from('course_segments')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: currentRetryCount + 1
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