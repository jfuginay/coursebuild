// pages/api/user-question-responses.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const {
    question_id,
    enrollment_id,
    course_id,
    selected_answer,
    selected_answers,
    response_text,
    response_data,
    is_correct,
    points_earned,
    max_points,
    response_time_ms,
    attempt_number,
    is_final_attempt,
    is_skipped,
    rating
  } = req.body;

  if (!question_id || (is_correct === undefined && is_skipped !== true)) {
    return res.status(400).json({
      error: 'question_id and either is_correct or is_skipped are required'
    });
  }

  const user_id = user.id;

  let finalEnrollmentId = enrollment_id;
  if (!enrollment_id && course_id) {
    try {
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('user_course_enrollments')
        .select('id')
        .eq('user_id', user_id)
        .eq('course_id', course_id)
        .single();

      if (enrollmentError) {
        console.error('Error finding enrollment:', enrollmentError);
        return res.status(400).json({ error: 'Could not find enrollment for this user and course' });
      }

      finalEnrollmentId = enrollment.id;
    } catch (error) {
      console.error('Error looking up enrollment:', error);
      return res.status(400).json({ error: 'Failed to lookup enrollment' });
    }
  }

  if (!finalEnrollmentId) {
    return res.status(400).json({ error: 'enrollment_id or course_id is required' });
  }

  try {
    const currentAttemptNumber = attempt_number || 1;
    const { data: existing, error: checkError } = await supabase
      .from('user_question_responses')
      .select('id, attempted_at')
      .eq('user_id', user_id)
      .eq('question_id', question_id)
      .eq('attempt_number', currentAttemptNumber)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing response:', checkError);
      return res.status(500).json({ error: 'Failed to check existing response' });
    }

    let processedSelectedAnswer = null;
    let processedResponseText = response_text || null;

    if (selected_answer !== null && selected_answer !== undefined) {
      if (typeof selected_answer === 'string') {
        processedResponseText = selected_answer;
        processedSelectedAnswer = null;
      } else if (typeof selected_answer === 'number' || !isNaN(Number(selected_answer))) {
        processedSelectedAnswer = Number(selected_answer);
      }
    }

    const responseData = {
      user_id,
      question_id,
      enrollment_id: finalEnrollmentId,
      selected_answer: processedSelectedAnswer,
      selected_answers: selected_answers || null,
      response_text: processedResponseText,
      response_data: response_data || null,
      is_correct: is_skipped ? false : is_correct,
      points_earned: is_skipped ? 0 : (points_earned || 0),
      max_points: max_points || 1,
      response_time_ms: response_time_ms || null,
      attempted_at: new Date().toISOString(),
      attempt_number: currentAttemptNumber,
      is_final_attempt: is_final_attempt !== undefined ? is_final_attempt : true,
      is_skipped: is_skipped ?? false,
      rating: typeof rating === 'number' ? rating : 0
    };

    if (existing) {
      const { data: response, error: updateError } = await supabase
        .from('user_question_responses')
        .update(responseData)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating question response:', updateError);
        return res.status(500).json({ error: 'Failed to update question response' });
      }

      return res.status(200).json({
        success: true,
        response_id: response.id,
        message: 'Question response updated successfully',
        was_existing: true
      });
    } else {
      const { data: response, error: createError } = await supabase
        .from('user_question_responses')
        .insert(responseData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating question response:', createError);
        return res.status(500).json({ error: 'Failed to create question response' });
      }

      return res.status(201).json({
        success: true,
        response_id: response.id,
        message: 'Question response recorded successfully',
        was_existing: false
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
