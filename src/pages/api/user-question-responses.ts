import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Verify the user's token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const {
      question_id,
      course_id,
      selected_answer,
      is_correct,
      response_time_ms,
      question_type,
      timestamp
    } = req.body;

    // Validate required fields
    if (!question_id || !course_id || selected_answer === undefined || is_correct === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user has enrollment (or create one)
    let enrollmentId: string;
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('user_course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', course_id)
      .single();

    if (enrollmentError && enrollmentError.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error checking enrollment:', enrollmentError);
      return res.status(500).json({ error: 'Failed to check enrollment' });
    }

    // Create enrollment if it doesn't exist
    if (!enrollment) {
      const { data: newEnrollment, error: createEnrollmentError } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id,
          enrollment_type: 'free'
        })
        .select('id')
        .single();

      if (createEnrollmentError || !newEnrollment) {
        console.error('Error creating enrollment:', createEnrollmentError);
        return res.status(500).json({ error: 'Failed to create enrollment' });
      }
      
      enrollmentId = newEnrollment.id;
    } else {
      enrollmentId = enrollment.id;
    }

    // Insert the question response
    const { data: response, error: responseError } = await supabase
      .from('user_question_responses')
      .insert({
        user_id: user.id,
        question_id,
        enrollment_id: enrollmentId,
        selected_answer: selected_answer.toString(),
        is_correct,
        response_time_ms,
        question_type,
        video_timestamp: timestamp ? Math.round(timestamp) : null
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error inserting question response:', responseError);
      return res.status(500).json({ error: 'Failed to save question response' });
    }

    // Log learner event for wrong answers
    if (!is_correct) {
      await supabase
        .from('learner_events')
        .insert({
          user_id: user.id,
          course_id,
          event_type: 'QUIZ_WRONG',
          video_timestamp: timestamp ? Math.round(timestamp) : null,
          metadata: {
            question_id,
            question_type,
            selected_answer: selected_answer.toString()
          }
        });
    }

    return res.status(200).json({ 
      success: true, 
      data: response,
      message: 'Question response tracked successfully' 
    });

  } catch (error) {
    console.error('Error in user-question-responses API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}