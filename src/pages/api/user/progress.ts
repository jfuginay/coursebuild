import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ProgressUpdateRequest {
  courseId: string;
  segmentIndex: number;
  segmentTitle?: string;
  questionId?: string;
  selectedAnswer?: number;
  isCorrect?: boolean;
  timeSpent?: number;
  videoProgress?: number;
  hintsUsed?: number;
  explanationViewed?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract user from authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    const {
      courseId,
      segmentIndex,
      segmentTitle,
      questionId,
      selectedAnswer,
      isCorrect,
      timeSpent,
      videoProgress,
      hintsUsed,
      explanationViewed
    }: ProgressUpdateRequest = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    console.log('📊 Updating user progress:', {
      userId: user.id,
      courseId,
      segmentIndex,
      questionId: questionId ? questionId.substring(0, 8) + '...' : 'none'
    });

    // 1. Ensure user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('user_course_enrollments')
      .select('id, total_questions_answered, total_questions_correct')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    let enrollmentId: string;
    let currentAnswered = 0;
    let currentCorrect = 0;

    if (enrollmentError && enrollmentError.code === 'PGRST116') {
      // User not enrolled, create enrollment
      console.log('🎓 Creating new course enrollment');
      const { data: newEnrollment, error: createEnrollmentError } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId
        })
        .select()
        .single();

      if (createEnrollmentError || !newEnrollment) {
        console.error('Error creating enrollment:', createEnrollmentError);
        return res.status(500).json({ error: 'Failed to create enrollment' });
      }
      
      enrollmentId = newEnrollment.id;
    } else if (enrollment) {
      enrollmentId = enrollment.id;
      currentAnswered = enrollment.total_questions_answered || 0;
      currentCorrect = enrollment.total_questions_correct || 0;
    } else {
      return res.status(500).json({ error: 'Failed to get enrollment' });
    }

    // 2. If this is a question attempt, record it in user_question_responses
    if (questionId && selectedAnswer !== undefined && isCorrect !== undefined) {
      console.log(`📝 Recording question response: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      
      // Check if response already exists
      const { data: existingResponse } = await supabase
        .from('user_question_responses')
        .select('id')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .eq('enrollment_id', enrollmentId)
        .single();

      if (!existingResponse) {
        // Create new response
        const { error: responseError } = await supabase
          .from('user_question_responses')
          .insert({
            user_id: user.id,
            question_id: questionId,
            enrollment_id: enrollmentId,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
            points_earned: isCorrect ? 1 : 0,
            max_points: 1,
            response_time_ms: timeSpent ? timeSpent * 1000 : null,
            attempt_number: 1,
            is_final_attempt: true,
            is_skipped: false,
            rating: 0
          });

        if (responseError) {
          console.error('Error recording question response:', responseError);
          // Don't fail the whole request if this fails
        }

        // Update enrollment stats
        if (!responseError) {
          currentAnswered++;
          if (isCorrect) currentCorrect++;
        }
      }
    }

    // 3. Update enrollment statistics and progress
    const { data: allResponses } = await supabase
      .from('user_question_responses')
      .select('id, is_correct')
      .eq('user_id', user.id)
      .eq('enrollment_id', enrollmentId);

    const totalAnswered = allResponses?.length || 0;
    const totalCorrect = allResponses?.filter(r => r.is_correct).length || 0;

    // Get total questions for the course
    const { data: totalQuestions } = await supabase
      .from('questions')
      .select('id', { count: 'exact' })
      .eq('course_id', courseId);

    const questionCount = totalQuestions?.length || 0;
    const progressPercentage = questionCount > 0 ? Math.round((totalAnswered / questionCount) * 100) : 0;

    // Update enrollment
    const updateData: any = {
      last_accessed_at: new Date().toISOString(),
      total_questions_answered: totalAnswered,
      total_questions_correct: totalCorrect,
      progress_percentage: progressPercentage,
      current_question_index: segmentIndex || 0
    };

    // Check if course is completed
    if (progressPercentage === 100) {
      updateData.is_completed = true;
      updateData.completed_at = new Date().toISOString();
      updateData.completion_score = Math.round((totalCorrect / totalAnswered) * 100);
    }

    const { error: updateError } = await supabase
      .from('user_course_enrollments')
      .update(updateData)
      .eq('id', enrollmentId);

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      // Don't fail the whole request if this fails
    }

    // 4. Update user profile stats
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_questions_answered, total_questions_correct')
      .eq('id', user.id)
      .single();

    if (profile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          total_questions_answered: (profile.total_questions_answered || 0) + (totalAnswered - currentAnswered),
          total_questions_correct: (profile.total_questions_correct || 0) + (totalCorrect - currentCorrect),
          last_active_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }
    }

    console.log('✅ Progress update completed');

    return res.status(200).json({
      success: true,
      completionPercentage: progressPercentage,
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Failed to update progress',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}