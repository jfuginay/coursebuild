import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    // Fetch the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    console.log('🔄 Re-analyzing course:', course.id);
    console.log('📹 YouTube URL:', course.youtube_url);

    // Call the Gemini edge function to analyze the video
    const edgeResponse = await fetch(
      'https://nkqehqwbxkxrgecmgzuq.supabase.co/functions/v1/gemini-quiz-service',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          course_id: course.id,
          youtube_url: course.youtube_url,
          max_questions: 10,
          difficulty_level: 'medium',
          focus_topics: []
        })
      }
    );

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('❌ Edge function error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to generate questions',
        details: errorText 
      });
    }

    const edgeData = await edgeResponse.json();
    console.log('✅ Questions generated:', edgeData.questions?.length || 0);

    // Update course to mark as analyzed
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', course.id);

    if (updateError) {
      console.error('Course update error:', updateError);
    }

    return res.status(200).json({
      success: true,
      message: 'Course re-analyzed successfully',
      questionsGenerated: edgeData.questions?.length || 0
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to re-analyze course',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 