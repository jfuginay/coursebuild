import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { user_id } = req.query;

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'user_id is required' });
    }

    try {
      // Fetch user's course creations
      const { data: creations, error } = await supabase
        .from('user_course_creations')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching course creations:', error);
        return res.status(500).json({ error: 'Failed to fetch course creations' });
      }

      return res.status(200).json({ 
        success: true,
        creations: creations || []
      });

    } catch (error) {
      console.error('API error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, course_id, role = 'creator' } = req.body;

  if (!user_id || !course_id) {
    return res.status(400).json({ error: 'user_id and course_id are required' });
  }

  try {
    // Check if user creation record already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_course_creations')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing user course creation:', checkError);
      return res.status(500).json({ error: 'Failed to check existing records' });
    }

    if (existing) {
      return res.status(200).json({ 
        success: true, 
        message: 'User course creation already exists',
        creation_id: existing.id 
      });
    }

    // Create new user course creation record
    const { data: creation, error: createError } = await supabase
      .from('user_course_creations')
      .insert({
        user_id,
        course_id,
        role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user course creation:', createError);
      return res.status(500).json({ error: 'Failed to create user course creation record' });
    }

    return res.status(201).json({
      success: true,
      creation_id: creation.id,
      message: 'User course creation recorded successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 