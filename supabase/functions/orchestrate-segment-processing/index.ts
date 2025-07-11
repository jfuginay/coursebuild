import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface OrchestrateRequest {
  course_id: string;
  check_only?: boolean; // If true, only check status without triggering
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { course_id, check_only = false }: OrchestrateRequest = await req.json();
    
    console.log(`🎼 Orchestrating segment processing for course ${course_id}`);
    console.log(`   📋 Mode: ${check_only ? 'Check only' : 'Process pending segments'}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      throw new Error(`Course not found: ${courseError?.message || 'Unknown error'}`);
    }

    // Get all segments for the course
    const { data: segments, error: segmentsError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', course_id)
      .order('segment_index', { ascending: true });

    if (segmentsError || !segments) {
      throw new Error(`Failed to fetch segments: ${segmentsError?.message || 'Unknown error'}`);
    }

    console.log(`📊 Found ${segments.length} segments for course`);

    // Analyze segment statuses
    const statusCounts = segments.reduce((acc, seg) => {
      acc[seg.status] = (acc[seg.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`   📈 Status breakdown:`, statusCounts);

    // Find stuck segments (processing for more than 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const stuckSegments = segments.filter(seg => 
      seg.status === 'processing' && 
      seg.processing_started_at &&
      seg.processing_started_at < fiveMinutesAgo
    );

    if (stuckSegments.length > 0) {
      console.log(`⚠️ Found ${stuckSegments.length} stuck segments, resetting them`);
      
      // Reset stuck segments
      const { error: resetError } = await supabase
        .from('course_segments')
        .update({
          status: 'failed',
          error_message: 'Processing timeout - exceeded 5 minutes',
          worker_id: null
        })
        .in('id', stuckSegments.map(s => s.id));

      if (resetError) {
        console.error('Failed to reset stuck segments:', resetError);
      }
    }

    // Check if all segments are completed
    const allCompleted = segments.every(seg => seg.status === 'completed');
    if (allCompleted) {
      console.log('✅ All segments completed!');
      
      // Mark course as published if not already
      if (!course.published) {
        const { error: publishError } = await supabase
          .from('courses')
          .update({ published: true })
          .eq('id', course_id);
          
        if (publishError) {
          console.error('Failed to publish course:', publishError);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          segments_total: segments.length,
          segments_completed: segments.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (check_only) {
      // Just return status without triggering
      const completedCount = segments.filter(s => s.status === 'completed').length;
      return new Response(
        JSON.stringify({
          success: true,
          status: 'in_progress',
          segments_total: segments.length,
          segments_completed: completedCount,
          status_breakdown: statusCounts
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the next segment to process
    // Rule: Process in order, ensuring previous segments are completed
    let nextSegmentToProcess = null;
    
    for (const segment of segments) {
      // Skip completed segments
      if (segment.status === 'completed') continue;
      
      // Check if previous segment is completed (for segments after the first)
      if (segment.segment_index > 0) {
        const previousSegment = segments.find(s => s.segment_index === segment.segment_index - 1);
        if (!previousSegment || previousSegment.status !== 'completed') {
          console.log(`⏸️ Segment ${segment.segment_index} waiting for previous segment to complete`);
          continue;
        }
      }
      
      // This segment is eligible for processing
      if (segment.status === 'pending' || segment.status === 'failed') {
        nextSegmentToProcess = segment;
        break;
      }
      
      // If it's processing, check if it's been too long
      if (segment.status === 'processing') {
        const processingTime = segment.processing_started_at 
          ? Date.now() - new Date(segment.processing_started_at).getTime()
          : 0;
          
        if (processingTime < 300000) { // Less than 5 minutes
          console.log(`⏳ Segment ${segment.segment_index} is currently processing (${Math.round(processingTime / 1000)}s)`);
          // Skip to next segment, this one is being handled
          continue;
        }
      }
    }

    if (!nextSegmentToProcess) {
      console.log('ℹ️ No segments ready for processing at this time');
      return new Response(
        JSON.stringify({
          success: true,
          status: 'waiting',
          message: 'No segments ready for processing',
          segments_total: segments.length,
          segments_completed: segments.filter(s => s.status === 'completed').length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🎯 Next segment to process: ${nextSegmentToProcess.segment_index}`);

    // Get previous segment context if needed
    let previousContext = null;
    if (nextSegmentToProcess.segment_index > 0) {
      const previousSegment = segments.find(s => s.segment_index === nextSegmentToProcess.segment_index - 1);
      if (previousSegment && previousSegment.cumulative_key_concepts) {
        previousContext = {
          keyConcepts: previousSegment.cumulative_key_concepts,
          lastTranscriptSegments: [],
          lastQuestions: [],
          segmentSummary: '',
          segmentIndex: previousSegment.segment_index,
          totalProcessedDuration: previousSegment.end_time
        };
      }
    }

    // Trigger processing for the next segment
    console.log(`🚀 Triggering processing for segment ${nextSegmentToProcess.segment_index}`);
    
    const segmentFunctionUrl = `${supabaseUrl}/functions/v1/process-video-segment`;
    const response = await fetch(segmentFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course_id: course_id,
        segment_id: nextSegmentToProcess.id,
        segment_index: nextSegmentToProcess.segment_index,
        youtube_url: course.youtube_url,
        start_time: nextSegmentToProcess.start_time,
        end_time: nextSegmentToProcess.end_time,
        session_id: null,
        previous_segment_context: previousContext,
        total_segments: segments.length,
        max_questions: 5
      })
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`❌ Failed to trigger segment processing:`, responseData);
      throw new Error(`Failed to trigger segment: ${responseData.error || response.status}`);
    }

    console.log(`✅ Successfully triggered segment ${nextSegmentToProcess.segment_index}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: 'processing',
        triggered_segment: nextSegmentToProcess.segment_index,
        segments_total: segments.length,
        segments_completed: segments.filter(s => s.status === 'completed').length,
        response: responseData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Orchestration error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 