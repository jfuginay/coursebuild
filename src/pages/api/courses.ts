import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
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
    // Get basic course data first (reliable baseline)
    let query = supabase
      .from('courses')
      .select('id, title, description, youtube_url, created_at, published')
      .eq('published', true)
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
    return res.status(200).json({ 
      success: true,
      courses: coursesData
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 