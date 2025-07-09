import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ApiResponse {
  success: boolean;
  data: any;
  course_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentCourseId, videoUrl, wrongQuestions } = req.body;

    if (!currentCourseId || typeof currentCourseId !== 'string') {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    if (!videoUrl || typeof videoUrl !== 'string') {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Call the Supabase edge function
    console.log('Calling course-suggestions edge function with:', {
      videoUrl: videoUrl,
      courseId: currentCourseId,
      wrongQuestions: wrongQuestions?.length || 0
    });

    const { data: suggestionsData, error: suggestionsError } = await supabase.functions.invoke('course-suggestions', {
      body: {
        videoUrl: videoUrl,
        courseId: currentCourseId,
        wrongQuestions: wrongQuestions || []
      }
    });

    if (suggestionsError) {
      console.error('Error calling course-suggestions function:', suggestionsError);
      return res.status(500).json({ error: 'Failed to get course suggestions' });
    }

    if (!suggestionsData || !suggestionsData.topics || !Array.isArray(suggestionsData.topics)) {
      console.error('Invalid response from course-suggestions function:', suggestionsData);
      return res.status(500).json({ error: 'Invalid suggestions response' });
    }

    // Get the first topic and its first video
    const firstTopic = suggestionsData.topics[0];
    if (!firstTopic || !firstTopic.video1) {
      return res.status(500).json({ error: 'No valid suggestions found' });
    }

    // Create a new course entry in the database
    // Generate questions for the new course
    try {
      // Build the full URL for the API call
      const origin = req.headers.origin || `http${req.headers['x-forwarded-proto'] === 'https' ? 's' : ''}://${req.headers.host}`;
      const analyzeVideoUrl = `${origin}/api/analyze-video`;

      console.log('Calling analyze-video with URL:', analyzeVideoUrl);

      const response = await fetch(analyzeVideoUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: firstTopic.video1,
          useEnhanced: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error generating course questions:', errorData);
        throw new Error(errorData.error || 'Failed to generate course questions');
      }

      const result: ApiResponse = await response.json();
      console.log('Course questions generated successfully:', result.success);
      console.log('Next course:', result.data);
      console.log("result.course_id", result.course_id);

      res.status(200).json({
        success: true,
        nextCourse: result.data,
        courseId: result.course_id,
        message: 'Next course generated successfully with questions'
      });
    } catch (analyzeError) {
      console.error('Error generating questions for new course:', analyzeError);
      
      // Return error if question generation fails
      res.status(500).json({
        success: false,
        error: 'Failed to generate questions for new course',
        message: analyzeError instanceof Error ? analyzeError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error getting next course:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get next course' 
    });
  }
} 