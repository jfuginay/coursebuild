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

    // Fetch questions for this course from the database
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', id)
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch questions',
        message: error.message 
      });
    }

    return res.status(200).json({
      success: true,
      questions: questions || []
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
} 