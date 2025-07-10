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
    console.log('🚀 Starting courses API request');
    
    // Simple, reliable query - just get the basic course data
    let query = supabase
      .from('courses')
      .select('id, title, description, youtube_url, created_at, published')
      .eq('published', true)
      .order('created_at', { ascending: false });

    // Filter by IDs if provided
    if (ids && typeof ids === 'string') {
      const courseIds = ids.split(',').map(id => id.trim()).filter(id => id);
      console.log('📋 Filtering by IDs:', courseIds);
      
      if (courseIds.length === 0) {
        console.log('✅ Empty ID list, returning empty array');
        return res.status(200).json({ success: true, courses: [] });
      }

      query = query.in('id', courseIds);
    }

    console.log('📡 Executing Supabase query...');
    const { data: coursesData, error } = await query;

    if (error) {
      console.error('❌ Supabase error:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch courses',
        details: error.message,
        code: error.code
      });
    }

    console.log(`✅ Successfully fetched ${coursesData?.length || 0} courses`);

    // Always return basic course data with default rating values
    const courses = (coursesData || []).map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      youtube_url: course.youtube_url,
      created_at: course.created_at,
      published: course.published,
      averageRating: 0, // Default to 0 for now
      totalRatings: 0   // Default to 0 for now
    }));

    console.log('🎯 Returning courses data');
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