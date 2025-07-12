import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

interface CourseRatingsResponse {
  success: boolean;
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number; 2: number; 3: number; 4: number; 5: number;
  };
  userRating?: number;
  recentRatings?: Array<{
    rating: number;
    created_at: string;
    engagement_score: number;
    rating_context: string;
  }>;
  qualityMetrics?: {
    medianRating: number;
    fourPlusStarPercentage: number;
    avgEngagementScore: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CourseRatingsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      error: 'Method not allowed'
    });
  }

  const { id: courseId } = req.query;
  const { detailed = 'false' } = req.query;

  if (!courseId || typeof courseId !== 'string') {
    return res.status(400).json({
      success: false,
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      error: 'Course ID is required'
    });
  }

  try {
    // Verify course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({
        success: false,
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        error: 'Course not found'
      });
    }

    // Get aggregated rating statistics
    const { data: stats, error: statsError } = await supabase
      .from('course_rating_stats')
      .select('*')
      .eq('course_id', courseId)
      .single();

    // Default response structure
    let response: CourseRatingsResponse = {
      success: true,
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };

    // If we have stats, populate the response
    if (!statsError && stats) {
      response = {
        success: true,
        averageRating: Number(stats.average_rating) || 0,
        totalRatings: stats.total_ratings || 0,
        ratingDistribution: {
          1: stats.one_star_count || 0,
          2: stats.two_star_count || 0,
          3: stats.three_star_count || 0,
          4: stats.four_star_count || 0,
          5: stats.five_star_count || 0
        },
        qualityMetrics: {
          medianRating: Number(stats.median_rating) || 0,
          fourPlusStarPercentage: stats.total_ratings > 0 
            ? Math.round((stats.four_plus_star_count / stats.total_ratings) * 100)
            : 0,
          avgEngagementScore: Number(stats.avg_engagement_score) || 0
        }
      };
    }

    // Get user's rating if authenticated
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && user) {
          const { data: userRating, error: userRatingError } = await supabase
            .from('user_course_ratings')
            .select('rating')
            .eq('user_id', user.id)
            .eq('course_id', courseId)
            .single();

          if (!userRatingError && userRating) {
            response.userRating = userRating.rating;
          }
        }
      }
    } catch (error) {
      // Ignore auth errors for anonymous users
      console.warn('Auth check failed for ratings retrieval:', error);
    }

    // Include detailed information if requested
    if (detailed === 'true' && response.totalRatings > 0) {
      const { data: recentRatings, error: recentError } = await supabase
        .from('user_course_ratings')
        .select('rating, created_at, engagement_score, rating_context')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!recentError && recentRatings) {
        response.recentRatings = recentRatings;
      }
    }

    console.log(`📊 Rating stats retrieved for course ${courseId}: ${response.averageRating}/5 (${response.totalRatings} ratings)`);

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error retrieving course ratings:', error);
    return res.status(500).json({
      success: false,
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      error: 'Internal server error'
    });
  }
}