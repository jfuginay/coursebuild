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
    // First try to fetch courses with rating stats
    let coursesData;
    let error;
    
    try {
      const result = await supabase
        .from('courses')
        .select(`
          id, title, description, youtube_url, created_at, published,
          course_rating_stats(
            average_rating,
            total_ratings
          )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false });
      
      coursesData = result.data;
      error = result.error;
    } catch (ratingError) {
      console.log('Rating stats table not available, fetching courses without ratings');
      // Fallback to basic course query if rating stats table doesn't exist
      const result = await supabase
        .from('courses')
        .select('id, title, description, youtube_url, created_at, published')
        .eq('published', true)
        .order('created_at', { ascending: false });
      
      coursesData = result.data;
      error = result.error;
    }

    // Filter by IDs if provided
    if (ids && typeof ids === 'string') {
      const courseIds = ids.split(',').map(id => id.trim()).filter(id => id);
      
      if (courseIds.length === 0) {
        return res.status(200).json({ success: true, courses: [] });
      }

      if (coursesData) {
        coursesData = coursesData.filter(course => courseIds.includes(course.id));
      }
    }

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    // Transform the data to include rating information
    const courses = (coursesData || []).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      youtube_url: course.youtube_url,
      created_at: course.created_at,
      published: course.published,
      averageRating: course.course_rating_stats?.[0]?.average_rating || 0,
      totalRatings: course.course_rating_stats?.[0]?.total_ratings || 0
    }));

    return res.status(200).json({ 
      success: true,
      courses
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 