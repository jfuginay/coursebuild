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
    let query = supabase
      .from('courses')
      .select('id, title, description, youtube_url, created_at, published')
      .order('created_at', { ascending: false });

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

    // Debug: Log final courses data
    const coursesWithRatingData = coursesWithRatings.filter(c => c.totalRatings > 0);
    console.log('📊 Courses API Debug:', {
      totalCourses: coursesWithRatings.length,
      coursesWithRatings: coursesWithRatingData.length,
      ratingData: coursesWithRatingData.map(c => ({
        title: c.title,
        averageRating: c.averageRating,
        totalRatings: c.totalRatings
      }))
    });

    return res.status(200).json({ 
      success: true,
      courses: coursesWithRatings
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 