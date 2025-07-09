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

  if (!ids || typeof ids !== 'string') {
    return res.status(400).json({ error: 'Course IDs parameter is required' });
  }

  try {
    const courseIds = ids.split(',').map(id => id.trim()).filter(id => id);
    
    if (courseIds.length === 0) {
      return res.status(200).json({ courses: [] });
    }

    // Fetch courses by IDs
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title, description, created_at')
      .in('id', courseIds);

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: 'Failed to fetch courses' });
    }

    return res.status(200).json({ 
      success: true,
      courses: courses || []
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 