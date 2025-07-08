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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    const { data: course, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .eq('published', true)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return res.status(404).json({ 
        error: 'Course not found',
        message: error.message 
      });
    }

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    return res.status(200).json({
      success: true,
      course
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 