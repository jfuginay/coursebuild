import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { course_id } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`📝 Updating course summary for course: ${course_id}`);

    // First, check if the course has a generic description
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, description, youtube_url')
      .eq('id', course_id)
      .single();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if description is generic
    const isGenericDescription = course.description && (
      course.description.includes('Interactive course from') ||
      course.description.includes('AI-powered interactive course') ||
      course.description.includes('AI Generated Course')
    );

    if (!isGenericDescription) {
      console.log('Course already has a custom description, skipping update');
      return res.status(200).json({ 
        success: true,
        message: 'Course already has a custom description',
        description: course.description
      });
    }

    // Fetch the latest transcript for this course
    const { data: transcript, error: transcriptError } = await supabase
      .from('video_transcripts')
      .select('video_summary')
      .eq('course_id', course_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (transcriptError || !transcript || !transcript.video_summary) {
      console.log('No transcript or video summary found for course');
      return res.status(404).json({ 
        success: false,
        message: 'No video summary available yet',
        error: transcriptError?.message
      });
    }

    // Update the course with the AI-generated summary
    const { error: updateError } = await supabase
      .from('courses')
      .update({ 
        description: transcript.video_summary 
      })
      .eq('id', course_id);

    if (updateError) {
      console.error('Error updating course:', updateError);
      return res.status(500).json({ 
        error: 'Failed to update course description',
        details: updateError.message
      });
    }

    console.log(`✅ Course description updated with AI-generated summary`);

    return res.status(200).json({ 
      success: true,
      message: 'Course description updated successfully',
      description: transcript.video_summary
    });

  } catch (error) {
    console.error('Error in update-summary:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 