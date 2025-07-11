import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
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

    if (!courseId || segmentIndex === undefined) {
      return res.status(400).json({ error: 'Course ID and segment index are required' });
    }

    console.log('📊 Updating user progress:', {
      userId: user.id,
      courseId,
      segmentIndex,
      questionId: questionId ? questionId.substring(0, 8) + '...' : 'none'
    });

    // Start a transaction-like operation
    const operations = [];

    // 1. Ensure user is enrolled in the course
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('user_course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (enrollmentError && enrollmentError.code === 'PGRST116') {
      // User not enrolled, create enrollment
      console.log('🎓 Creating new course enrollment');
      const { error: createEnrollmentError } = await supabase
        .from('user_course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          enrollment_type: 'free'
        });

      if (createEnrollmentError) {
        console.error('Error creating enrollment:', createEnrollmentError);
        return res.status(500).json({ error: 'Failed to create enrollment' });
      }
    }

    // 2. If this is a question attempt, record it
    if (questionId && selectedAnswer !== undefined && isCorrect !== undefined) {
      console.log(`📝 Recording question attempt: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
      
      // Get the current attempt number for this question
      const { data: existingAttempts } = await supabase
        .from('user_question_attempts')
        .select('attempt_number')
        .eq('user_id', user.id)
        .eq('question_id', questionId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = existingAttempts && existingAttempts.length > 0 
        ? existingAttempts[0].attempt_number + 1 
        : 1;

      const { error: attemptError } = await supabase
        .from('user_question_attempts')
        .insert({
          user_id: user.id,
          question_id: questionId,
          course_id: courseId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          time_spent_seconds: timeSpent || 0,
          attempt_number: attemptNumber,
          hints_used: hintsUsed || 0,
          explanation_viewed: explanationViewed || false
        });

      if (attemptError) {
        console.error('Error recording question attempt:', attemptError);
        return res.status(500).json({ error: 'Failed to record question attempt' });
      }
    }

    // 3. Update or create segment progress
    console.log('📈 Updating segment progress');
    const { data: existingProgress } = await supabase
      .from('user_course_progress')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('segment_index', segmentIndex)
      .single();

    const progressData: any = {
      user_id: user.id,
      course_id: courseId,
      segment_index: segmentIndex,
      segment_title: segmentTitle || existingProgress?.segment_title,
      video_progress_seconds: Math.max(
        videoProgress || 0,
        existingProgress?.video_progress_seconds || 0
      )
    };

    // Calculate questions answered and correct for this segment
    const { data: segmentStats } = await supabase
      .from('user_question_attempts')
      .select('is_correct')
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (segmentStats) {
      const questionsAnswered = segmentStats.length;
      const questionsCorrect = segmentStats.filter(stat => stat.is_correct).length;
      
      progressData.questions_answered = questionsAnswered;
      progressData.questions_correct = questionsCorrect;
    }

    if (existingProgress) {
      // Update existing progress
      const { error: updateError } = await supabase
        .from('user_course_progress')
        .update(progressData)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('segment_index', segmentIndex);

      if (updateError) {
        console.error('Error updating progress:', updateError);
        return res.status(500).json({ error: 'Failed to update progress' });
      }
    } else {
      // Create new progress record
      const { error: insertError } = await supabase
        .from('user_course_progress')
        .insert(progressData);

      if (insertError) {
        console.error('Error creating progress:', insertError);
        return res.status(500).json({ error: 'Failed to create progress' });
      }
    }

    // 4. Calculate and update overall course completion
    console.log('🎯 Calculating course completion');
    const { data: completionResult, error: completionError } = await supabase
      .rpc('calculate_course_completion', {
        user_id_param: user.id,
        course_id_param: courseId
      });

    if (completionError) {
      console.error('Error calculating completion:', completionError);
    }

    // 5. Check for achievements
    if (isCorrect && questionId) {
      // Award achievement for first correct answer
      const { data: firstAnswer } = await supabase
        .from('user_question_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_correct', true)
        .limit(1);

      if (firstAnswer && firstAnswer.length === 1) {
        await supabase.rpc('award_achievement', {
          user_id_param: user.id,
          achievement_type_param: 'first_correct_answer',
          achievement_name_param: 'First Success!',
          description_param: 'Answered your first question correctly',
          icon_name_param: 'star',
          points_param: 10
        });
      }

      // Award achievement for 10 correct answers
      const { data: correctAnswers } = await supabase
        .from('user_question_attempts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_correct', true);

      if (correctAnswers && correctAnswers.length === 10) {
        await supabase.rpc('award_achievement', {
          user_id_param: user.id,
          achievement_type_param: 'ten_correct_answers',
          achievement_name_param: 'Knowledge Builder',
          description_param: 'Answered 10 questions correctly',
          icon_name_param: 'trophy',
          points_param: 50
        });
      }
    }

    // 6. Update enrollment last accessed
    await supabase
      .from('user_course_enrollments')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    console.log('✅ Progress update completed');

    return res.status(200).json({
      success: true,
      completionPercentage: completionResult || 0,
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