import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

interface RatingRequest {
  rating: number;
  context?: 'completion' | 'mid_course' | 'question_success' | 'manual';
  engagementData?: {
    timeSpentMinutes: number;
    questionsAnswered: number;
    completionPercentage: number;
  };
}

interface RatingResponse {
  success: boolean;
  rating?: {
    id: string;
    rating: number;
    created_at: string;
    engagement_score: number;
  };
  courseStats?: {
    averageRating: number;
    totalRatings: number;
    ratingDistribution: {
      1: number; 2: number; 3: number; 4: number; 5: number;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RatingResponse>
) {
  const { id: courseId } = req.query;

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Course ID is required'
    });
  }

  // Handle POST - Submit Rating
  if (req.method === 'POST') {
    const { rating, context = 'manual', engagementData }: RatingRequest = req.body;

    // Validate rating value
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be an integer between 1 and 5'
      });
    }

    // Get user from session (if available)
    let userId: string | null = null;
    
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user) {
          userId = user.id;
        }
      }
    } catch (error) {
      console.warn('Auth check failed, allowing anonymous rating:', error);
    }

    // For anonymous users, create a temporary user ID based on IP + course
    if (!userId) {
      const clientIP = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      userId = `anon_${Buffer.from(`${clientIP}_${courseId}`).toString('base64').slice(0, 20)}`;
    }

    try {
      // Verify course exists
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        return res.status(404).json({
          success: false,
          error: 'Course not found'
        });
      }

      // Prepare rating data
      const ratingData = {
        user_id: userId,
        course_id: courseId,
        rating,
        rating_context: context,
        time_spent_minutes: engagementData?.timeSpentMinutes || 0,
        questions_answered: engagementData?.questionsAnswered || 0,
        completion_percentage: engagementData?.completionPercentage || 0
      };

      // Insert or update rating (upsert)
      const { data: insertedRating, error: insertError } = await supabase
        .from('course_ratings')
        .upsert(ratingData, {
          onConflict: 'user_id,course_id',
          ignoreDuplicates: false
        })
        .select('id, rating, created_at, engagement_score')
        .single();

      if (insertError) {
        console.error('Failed to insert rating:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to save rating'
        });
      }

      // Get updated course statistics
      const { data: stats, error: statsError } = await supabase
        .from('course_rating_stats')
        .select('*')
        .eq('course_id', courseId)
        .single();

      let courseStats;
      if (!statsError && stats) {
        courseStats = {
          averageRating: stats.average_rating,
          totalRatings: stats.total_ratings,
          ratingDistribution: {
            1: stats.one_star_count,
            2: stats.two_star_count,
            3: stats.three_star_count,
            4: stats.four_star_count,
            5: stats.five_star_count
          }
        };
      }

      console.log(`✅ Rating submitted: ${rating} stars for course ${courseId} by user ${userId}`);

      return res.status(200).json({
        success: true,
        rating: insertedRating,
        courseStats
      });

    } catch (error) {
      console.error('Error submitting rating:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Handle DELETE - Remove Rating
  if (req.method === 'DELETE') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to delete rating'
        });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication'
        });
      }

      const { error: deleteError } = await supabase
        .from('course_ratings')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (deleteError) {
        console.error('Failed to delete rating:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete rating'
        });
      }

      console.log(`🗑️ Rating deleted for course ${courseId} by user ${user.id}`);

      return res.status(200).json({
        success: true
      });

    } catch (error) {
      console.error('Error deleting rating:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}