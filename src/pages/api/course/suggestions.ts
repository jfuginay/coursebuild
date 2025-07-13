import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { videoUrl, userId, courseId, trigger = 'course_completion' } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Check if we should use enhanced recommendations (when userId is provided)
    if (userId) {
      console.log('🎯 Using enhanced recommendations for user:', userId);
      
      // Call the enhanced recommendations edge function
      const { data, error } = await supabase.functions.invoke('enhanced-recommendations', {
        body: {
          userId,
          courseId,
          trigger,
          requestedCount: 5
        },
      });

      if (error) {
        console.error('Error calling enhanced recommendations:', error);
        // Fall back to basic suggestions
      } else if (data && data.recommendations && data.recommendations.length > 0) {
        // Transform enhanced recommendations to match expected format
        return res.status(200).json({
          topics: data.recommendations.map((rec: any) => ({
            topic: rec.title,
            video: rec.youtube_url,
            // Additional enhanced data
            description: rec.description,
            reasons: rec.reasons,
            difficulty_match: rec.difficulty_match,
            addresses_mistakes: rec.addresses_mistakes,
            thumbnail_url: rec.thumbnail_url,
            channel_name: rec.channel_name,
            duration: rec.duration,
            progression_type: rec.progression_type
          }))
        });
      }
    }

    // Fall back to original course-suggestions for users without profiles
    console.log('📚 Using basic course suggestions (no user profile)');
    const { data, error } = await supabase.functions.invoke('course-suggestions', {
      body: {
        videoUrl: videoUrl,
      },
    });

    if (error) {
      console.error('Error calling edge function:', error);
      return res.status(500).json({ error: 'Failed to generate suggestions' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error in suggestions API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 