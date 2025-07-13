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

    // Call the Quiz Generation v5.0 edge function to analyze the video
    const edgeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/quiz-generation-v5`,
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
          difficulty_level: 'intermediate',
          enable_visual_questions: true
        })
      }
    );

    if (!edgeResponse.ok) {
      const errorText = await edgeResponse.text();
      console.error('❌ Quiz Generation v5.0 error:', errorText);
      return res.status(500).json({ 
        error: 'Failed to generate questions',
        details: errorText 
      });
    }

    const edgeData = await edgeResponse.json();
    console.log('✅ Questions generated:', edgeData.final_questions?.length || 0);
    console.log('✅ Average quality score:', edgeData.pipeline_results?.verification?.verification_metadata?.average_score || 0);

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
      message: 'Course re-analyzed successfully with Quiz Generation v4.0',
      questionsGenerated: edgeData.final_questions?.length || 0,
      averageQualityScore: edgeData.pipeline_results?.verification?.verification_metadata?.average_score || 0,
      visualQuestions: edgeData.final_questions?.filter((q: any) => q.has_visual_asset).length || 0,
      pipelineMetadata: edgeData.pipeline_metadata || {}
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Failed to re-analyze course',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 