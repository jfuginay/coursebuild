import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch courses',
        message: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      courses: courses || []
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 