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
      // Fetch user's course enrollments
      const { data: enrollments, error } = await supabase
        .from('user_course_enrollments')
        .select('*')
        .eq('user_id', user_id)
        .order('enrolled_at', { ascending: false });

      if (error) {
        console.error('Error fetching course enrollments:', error);
        return res.status(500).json({ error: 'Failed to fetch course enrollments' });
      }

      return res.status(200).json({ 
        success: true,
        enrollments: enrollments || []
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

  const { user_id, course_id } = req.body;

  if (!user_id || !course_id) {
    return res.status(400).json({ error: 'user_id and course_id are required' });
  }

  try {
    // Check if user is already enrolled
    const { data: existing, error: checkError } = await supabase
      .from('user_course_enrollments')
      .select('id, enrolled_at')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking existing enrollment:', checkError);
      return res.status(500).json({ error: 'Failed to check existing enrollment' });
    }

    if (existing) {
      return res.status(200).json({ 
        success: true, 
        message: 'User already enrolled',
        enrollment_id: existing.id,
        enrolled_at: existing.enrolled_at,
        already_enrolled: true
      });
    }

    // Create new enrollment record
    const { data: enrollment, error: createError } = await supabase
      .from('user_course_enrollments')
      .insert({
        user_id,
        course_id,
        enrolled_at: new Date().toISOString(),
        completed_at: null,
        last_accessed_at: new Date().toISOString(),
        progress_percentage: 0,
        current_question_index: 0,
        total_questions_answered: 0,
        total_questions_correct: 0,
        is_completed: false,
        completion_score: null
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating enrollment:', createError);
      return res.status(500).json({ error: 'Failed to create enrollment record' });
    }

    return res.status(201).json({
      success: true,
      enrollment_id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      message: 'User enrolled successfully',
      already_enrolled: false
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 