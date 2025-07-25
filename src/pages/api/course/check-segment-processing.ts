import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for segments that have been processing for too long (>3 minutes)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    
    const { data: stuckSegments, error: checkError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', course_id)
      .eq('status', 'processing')
      .lt('processing_started_at', threeMinutesAgo);

    if (checkError) {
      throw new Error(`Failed to check segments: ${checkError.message}`);
    }

    // Mark stuck segments as failed
    if (stuckSegments && stuckSegments.length > 0) {
      console.log(`Found ${stuckSegments.length} stuck segments, marking as failed`);
      
      const { error: updateError } = await supabase
        .from('course_segments')
        .update({
          status: 'failed',
          error_message: 'Processing timeout - exceeded 150 seconds'
        })
        .in('id', stuckSegments.map(s => s.id));

      if (updateError) {
        console.error('Failed to update stuck segments:', updateError);
      }
    }

    // Find the next pending segment or first failed segment
    const { data: nextSegment, error: nextError } = await supabase
      .from('course_segments')
      .select('*')
      .eq('course_id', course_id)
      .in('status', ['pending', 'failed'])
      .order('segment_index', { ascending: true })
      .limit(1)
      .single();

    if (nextError && nextError.code !== 'PGRST116') {
      throw new Error(`Failed to find next segment: ${nextError.message}`);
    }

    if (!nextSegment) {
      // Check if all segments are completed
      const { data: allSegments } = await supabase
        .from('course_segments')
        .select('status')
        .eq('course_id', course_id);

      const allCompleted = allSegments?.every(s => s.status === 'completed');

      if (allCompleted) {
        // NOTE: Course publishing is handled by the segment processor
        // after verifying questions exist. We don't mark as published here.
        console.log('All segments completed - segment processor will handle publishing');

        return res.status(200).json({
          success: true,
          message: 'All segments completed',
          completed: true
        });
      }

      return res.status(200).json({
        success: true,
        message: 'No segments to process',
        completed: false
      });
    }

    // Get course details
    const { data: course } = await supabase
      .from('courses')
      .select('youtube_url')
      .eq('id', course_id)
      .single();

    if (!course) {
      throw new Error('Course not found');
    }

    // Get previous segment context if available
    let previousContext = null;
    if (nextSegment.segment_index > 0) {
      const { data: prevSegment } = await supabase
        .from('course_segments')
        .select('cumulative_key_concepts, previous_segment_context')
        .eq('course_id', course_id)
        .eq('segment_index', nextSegment.segment_index - 1)
        .single();

      if (prevSegment) {
        previousContext = {
          keyConcepts: prevSegment.cumulative_key_concepts || []
        };
      }
    }

    // Get total segments
    const { count: totalSegments } = await supabase
      .from('course_segments')
      .select('*', { count: 'exact' })
      .eq('course_id', course_id);

    console.log(`🔄 Found segment ${nextSegment.segment_index + 1} ready for processing, calling orchestrator`);

    // Use the orchestrator instead of direct segment processing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const orchestratorUrl = `${supabaseUrl}/functions/v1/orchestrate-segment-processing`;

    const response = await fetch(orchestratorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course_id,
        check_only: false // Actually process segments
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Orchestrator error: ${errorText}`);
      throw new Error(`Failed to call orchestrator: ${response.status}`);
    }
    
    const result = await response.json();

    return res.status(200).json({
      success: true,
      message: result.message || 'Orchestrator called successfully',
      status: result.status,
      processing_segments: result.processing_segments || [],
      completed: result.status === 'all_completed'
    });

  } catch (error) {
    console.error('Check segment processing error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 