import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ids } = req.query;

  try {
    // Refresh the materialized view to ensure rating stats are up-to-date
    const { error: refreshError } = await supabase.rpc('refresh_course_rating_stats');
    if (refreshError) {
      console.error('Error refreshing course_rating_stats:', refreshError);
      // Decide if this should be a hard error or just a warning
      // For now, let's log it and continue, as courses can still be fetched
    }

    // Get basic course data first (reliable baseline)
    // Note: We'll sort by weighted rating score after fetching, not by creation date
    let query = supabase
      .from('courses')
      .select('id, title, description, youtube_url, created_at, published');

    // Filter by IDs if provided
    if (ids && typeof ids === 'string') {
      const courseIds = ids.split(',').map(id => id.trim()).filter(id => id);
      
      if (courseIds.length === 0) {
        return res.status(200).json({ success: true, courses: [] });
      }

      query = query.in('id', courseIds);
    }

    const { data: coursesData, error } = await query;

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch courses',
        details: error.message
      });
    }

    if (!coursesData || coursesData.length === 0) {
      return res.status(200).json({ 
        success: true,
        courses: []
      });
    }

    // Try to enhance with rating data and question counts (non-blocking)
    const coursesWithRatings = await Promise.all(
      coursesData.map(async (course) => {
        let averageRating = 0;
        let totalRatings = 0;
        let questionCount = 0;

        try {
          // Try to get rating stats for this course
          const { data: ratingStats, error: ratingError } = await supabase
            .from('course_rating_stats')
            .select('average_rating, total_ratings')
            .eq('course_id', course.id)
            .maybeSingle(); // Use maybeSingle to handle no results gracefully

          if (!ratingError && ratingStats) {
            averageRating = Number(ratingStats.average_rating) || 0;
            totalRatings = Number(ratingStats.total_ratings) || 0;
            
            // Debug: Log rating data for courses that have ratings
            if (totalRatings > 0) {
              console.log(`⭐ Course "${course.title}" has ratings:`, {
                averageRating,
                totalRatings,
                courseId: course.id
              });
            }
          } else if (ratingError) {
            console.warn(`❌ Rating error for course ${course.id}:`, ratingError);
          }
        } catch (ratingError) {
          console.warn(`❌ Rating fetch error for course ${course.id}:`, ratingError);
        }

        try {
          // Get question count for this course
          const { count, error: questionError } = await supabase
            .from('questions')
            .select('id', { count: 'exact' })
            .eq('course_id', course.id);

          if (!questionError && count !== null) {
            questionCount = count;
          } else if (questionError) {
            console.warn(`❌ Question count error for course ${course.id}:`, questionError);
          }
        } catch (questionError) {
          console.warn(`❌ Question count fetch error for course ${course.id}:`, questionError);
        }

        return {
          id: course.id,
          title: course.title,
          description: course.description,
          youtube_url: course.youtube_url,
          created_at: course.created_at,
          published: course.published,
          averageRating,
          totalRatings,
          questionCount
        };
      })
    );

    // Calculate weighted scores and sort courses by rating priority
    const coursesWithScores = coursesWithRatings.map(course => {
      // Calculate weighted score: rating * (1 + log base 10 of (ratings + 1))
      // This prioritizes both high ratings and courses with more rating data
      const weightedScore = course.averageRating > 0 
        ? course.averageRating * (1 + Math.log10(course.totalRatings + 1))
        : 0;
      
      return {
        ...course,
        weightedScore
      };
    });

    // Sort by weighted score (descending), then by creation date for tie-breaking
    const sortedCourses = coursesWithScores.sort((a, b) => {
      if (a.weightedScore !== b.weightedScore) {
        return b.weightedScore - a.weightedScore; // Higher score first
      }
      // Tie-breaker: newer courses first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Remove the temporary weightedScore property before returning
    const finalCourses = sortedCourses.map(({ weightedScore, ...course }) => course);

    // Debug: Log final courses data with scoring information
    const coursesWithRatingData = coursesWithScores.filter(c => c.totalRatings > 0);
    console.log('📊 Courses API Debug (Rating-Weighted):', {
      totalCourses: finalCourses.length,
      coursesWithRatings: coursesWithRatingData.length,
      topCourses: coursesWithScores.slice(0, 5).map(c => ({
        title: c.title,
        averageRating: c.averageRating,
        totalRatings: c.totalRatings,
        weightedScore: c.weightedScore.toFixed(2)
      }))
    });

    return res.status(200).json({ 
      success: true,
      courses: finalCourses
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 