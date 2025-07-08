import { NextApiRequest, NextApiResponse } from 'next';
import { generateCourseFromVideo, isValidYouTubeUrl, CourseData } from '@/lib/gemini';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      return res.status(400).json({ error: 'Invalid YouTube URL format' });
    }

    // Generate course data using Gemini API
    const courseData: CourseData = await generateCourseFromVideo(youtubeUrl);

    return res.status(200).json({
      success: true,
      data: courseData
    });

  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error) {
      return res.status(500).json({ 
        error: 'Failed to analyze video',
        message: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}