import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { formatSecondsForDisplay } from '../quiz-generation-v5/utils/timestamp-converter.ts';

// Declare Deno global
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface InitSegmentedProcessingRequest {
  course_id: string;
  youtube_url: string;
  max_questions_per_segment?: number;
  segment_duration?: number; // Duration in seconds, default 300 (5 minutes)
  session_id?: string;
}

// Helper to extract video ID from YouTube URL
const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Parse ISO 8601 duration to seconds
const parseISO8601Duration = (duration: string): number => {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
};

// Get video duration from YouTube API
const getVideoDuration = async (videoId: string): Promise<number | null> => {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  
  if (!apiKey) {
    console.warn('⚠️ YOUTUBE_API_KEY not found, cannot determine video duration');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('❌ YouTube API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.error('❌ Video not found');
      return null;
    }
    
    const duration = data.items[0].contentDetails.duration;
    const durationInSeconds = parseISO8601Duration(duration);
    
    console.log(`📹 Video duration: ${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s`);
    
    return durationInSeconds;
  } catch (error) {
    console.error('❌ Failed to fetch video duration:', error);
    return null;
  }
};

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      course_id,
      youtube_url,
      max_questions_per_segment = 5,
      segment_duration = 300, // Default 5 minutes (reduced from 10)
      session_id
    }: InitSegmentedProcessingRequest = await req.json();

    console.log(`🎬 Initializing segmented processing for course ${course_id}`);
    console.log(`   📺 YouTube URL: ${youtube_url}`);
    console.log(`   ⏱️ Segment duration: ${segment_duration}s (${segment_duration / 60} minutes)`);
    console.log(`   ❓ Max questions per segment: ${max_questions_per_segment}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SECRET_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get video duration
    const videoId = extractVideoId(youtube_url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    const videoDuration = await getVideoDuration(videoId);
    
    // If we can't get duration, check if video is likely to be long (>10 minutes)
    // based on course metadata or use a default assumption
    let totalDuration = videoDuration || 1800; // Default to 30 minutes if unknown
    let shouldSegment = false;

    if (videoDuration) {
      shouldSegment = videoDuration > segment_duration;
    } else {
      // Ask user or make assumption based on course type
      console.warn('⚠️ Cannot determine video duration, assuming it needs segmentation');
      shouldSegment = true;
    }

    // Update course with segmentation info
    const { error: courseUpdateError } = await supabase
      .from('courses')
      .update({
        is_segmented: shouldSegment,
        total_segments: shouldSegment ? Math.ceil(totalDuration / segment_duration) : 1,
        segment_duration: segment_duration
      })
      .eq('id', course_id);

    if (courseUpdateError) {
      throw new Error(`Failed to update course: ${courseUpdateError.message}`);
    }

    if (!shouldSegment) {
      console.log('📝 Video is short enough to process in one go');
      
      // For short videos, just use the regular quiz generation pipeline
      const functionUrl = `${supabaseUrl}/functions/v1/quiz-generation-v5`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          course_id,
          youtube_url,
          max_questions: max_questions_per_segment,
          session_id
        })
      });

      const result = await response.json();
      
      // Update course as published if quiz generation was successful
      if (response.ok && result.success) {
        console.log('✅ Quiz generation successful, marking course as published');
        
        // Extract video title from the transcript if available
        let videoTitle = 'AI Generated Course';
        let videoDescription = 'Interactive course generated from YouTube video';
        
        // Check if we have transcript data with video metadata
        if (result.pipeline_results?.planning?.video_summary) {
          videoDescription = result.pipeline_results.planning.video_summary;
        }
        
        // Try to get a better title from the planning metadata
        if (result.pipeline_results?.planning?.planning_metadata?.content_coverage?.length > 0) {
          const mainTopics = result.pipeline_results.planning.planning_metadata.content_coverage
            .slice(0, 3)
            .map((topic: any) => topic.topic || topic)
            .join(', ');
          videoTitle = `Course: ${mainTopics}`;
        }
        
        const { error: publishError } = await supabase
          .from('courses')
          .update({ 
            published: true,
            title: videoTitle,
            description: videoDescription
          })
          .eq('id', course_id);
        
        if (publishError) {
          console.error('❌ Failed to update course:', publishError);
        } else {
          console.log('✅ Course updated with title:', videoTitle);
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          segmented: false,
          message: 'Video processed without segmentation',
          result
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Create segments
    const totalSegments = Math.ceil(totalDuration / segment_duration);
    console.log(`📊 Creating ${totalSegments} segments for video`);

    const segments = [];
    let totalExpectedQuestions = 0;
    
    // Calculate initial segments
    const rawSegments = [];
    for (let i = 0; i < totalSegments; i++) {
      const startTime = i * segment_duration;
      const endTime = Math.min((i + 1) * segment_duration, totalDuration);
      rawSegments.push({ startTime, endTime });
    }
    
    // Check if the last segment is less than 20 seconds
    if (rawSegments.length > 1) {
      const lastSegment = rawSegments[rawSegments.length - 1];
      const lastSegmentDuration = lastSegment.endTime - lastSegment.startTime;
      
      if (lastSegmentDuration < 20) {
        console.log(`⚡ Last segment is only ${lastSegmentDuration}s, merging with previous segment`);
        // Remove the last segment
        rawSegments.pop();
        // Extend the previous segment to include the last segment's time
        rawSegments[rawSegments.length - 1].endTime = totalDuration;
      }
    }
    
    // Create segment objects
    for (let i = 0; i < rawSegments.length; i++) {
      const { startTime, endTime } = rawSegments[i];
      const segmentDurationMinutes = Math.ceil((endTime - startTime) / 60);
      const expectedQuestions = Math.min(segmentDurationMinutes, max_questions_per_segment);
      totalExpectedQuestions += expectedQuestions;
      
      console.log(`   📌 Segment ${i + 1}: ${formatSecondsForDisplay(startTime)} - ${formatSecondsForDisplay(endTime)} (${segmentDurationMinutes} min) → ${expectedQuestions} questions`);
      
      segments.push({
        course_id,
        segment_index: i,
        start_time: startTime,
        end_time: endTime,
        title: `Part ${i + 1}: ${formatSecondsForDisplay(startTime)} - ${formatSecondsForDisplay(endTime)}`,
        status: 'pending'
      });
    }
    
    console.log(`📊 Final segment count: ${segments.length} (adjusted from ${totalSegments})`);

    // Insert segments into database
    const { data: createdSegments, error: segmentsError } = await supabase
      .from('course_segments')
      .insert(segments)
      .select();

    if (segmentsError) {
      throw new Error(`Failed to create segments: ${segmentsError.message}`);
    }

    console.log(`✅ Created ${createdSegments.length} segments`);
    console.log(`   📊 Total expected questions: ${totalExpectedQuestions} (1 per minute, max ${max_questions_per_segment} per segment)`);

    // Update course with actual segment count (after merging short segments)
    const { error: updateSegmentCountError } = await supabase
      .from('courses')
      .update({
        total_segments: createdSegments.length
      })
      .eq('id', course_id);

    if (updateSegmentCountError) {
      console.error('Failed to update segment count:', updateSegmentCountError);
    }

    // Initialize progress tracking
    if (session_id) {
      await supabase
        .from('quiz_generation_progress')
        .insert({
          course_id,
          session_id,
          stage: 'planning',
          current_step: 'Starting segmented processing',
          stage_progress: 0,
          overall_progress: 0,
          metadata: {
            total_segments: createdSegments.length,
            segment_duration,
            video_duration: totalDuration
          }
        });
    }

    // Trigger processing of the first segment
    const firstSegment = createdSegments[0];
    console.log(`🚀 Triggering processing for first segment`);

    const segmentFunctionUrl = `${supabaseUrl}/functions/v1/process-video-segment`;
    
    const segmentResponse = await fetch(segmentFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        course_id,
        segment_id: firstSegment.id,
        segment_index: 0,
        youtube_url,
        start_time: firstSegment.start_time,
        end_time: firstSegment.end_time,
        session_id,
        preferred_provider: 'gemini',
        max_questions: max_questions_per_segment,
        total_segments: createdSegments.length
      })
    });

    if (!segmentResponse.ok) {
      const errorText = await segmentResponse.text();
      console.error('❌ Error triggering first segment:', errorText);
      throw new Error(`Failed to trigger first segment: ${errorText}`);
    }

    console.log('✅ First segment processing triggered successfully');

    return new Response(
      JSON.stringify({
        success: true,
        segmented: true,
        total_segments: createdSegments.length,
        segment_duration,
        video_duration: totalDuration,
        message: `Video segmented into ${createdSegments.length} parts. Processing started.`,
        segments: createdSegments.map((s: any) => ({
          index: s.segment_index,
          start_time: s.start_time,
          end_time: s.end_time,
          title: s.title,
          status: s.status
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Segmented processing initialization error:', error);
    
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
 