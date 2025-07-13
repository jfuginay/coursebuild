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
  if (req.method !== 'GET') {
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

    console.log('📊 Fetching dashboard data for user:', user.id);

    // 1. Get user profile and calculate stats from actual tables
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // Calculate stats from actual data
    const dashboardStats = {
      user_id: user.id,
      email: user.email,
      display_name: profile.display_name,
      subscription_tier: 'free', // No subscription_tier in profiles schema
      bio: profile.bio,
      preferred_difficulty: profile.preferred_difficulty,
      created_at: profile.created_at,
      courses_enrolled: profile.total_courses_taken || 0,
      courses_completed: 0, // Will calculate below
      courses_created: 0, // Will calculate below
      total_correct_answers: profile.total_questions_correct || 0,
      total_questions_attempted: profile.total_questions_answered || 0,
      total_points: 0, // Will calculate from responses
      total_achievements: 0, // Will calculate below
      current_streak: profile.current_streak || 0,
      longest_streak: profile.longest_streak || 0
    };

    // 2. Get enrolled courses with progress (with fallback)
    let enrollments = [];
    try {
      const { data: enrollmentData, error: enrollmentsError } = await supabase
        .from('user_course_enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            youtube_url,
            created_at,
            published
          )
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      if (enrollmentsError) {
        console.log('Enrollments table not available:', enrollmentsError.message);
        enrollments = [];
      } else {
        enrollments = enrollmentData || [];
      }
    } catch (error) {
      console.log('Enrollments query failed, using empty array');
      enrollments = [];
    }

    // 3. Get recent question attempts (last 10) using actual table
    let recentAttempts = [];
    try {
      const { data: attemptData, error: attemptsError } = await supabase
        .from('user_question_responses')
        .select(`
          *,
          questions (
            id,
            question,
            type,
            timestamp,
            courses (
              id,
              title
            )
          )
        `)
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false })
        .limit(10);

      if (attemptsError) {
        console.log('Question responses table error:', attemptsError.message);
        recentAttempts = [];
      } else {
        recentAttempts = attemptData || [];
      }
    } catch (error) {
      console.log('Question responses query failed, using empty array');
      recentAttempts = [];
    }

    // 4. Calculate points and achievements from actual responses
    let totalPoints = 0;
    let totalAchievements = 0;
    let recentAchievements: any[] = [];
    
    // Calculate total points from user responses
    try {
      const { data: pointsData } = await supabase
        .from('user_question_responses')
        .select('points_earned')
        .eq('user_id', user.id);
      
      if (pointsData) {
        totalPoints = pointsData.reduce((sum, response) => sum + (response.points_earned || 0), 0);
      }
    } catch (error) {
      console.log('Points calculation failed, using 0');
    }

    // Update calculated values
    dashboardStats.total_points = totalPoints;
    dashboardStats.total_achievements = totalAchievements;

    // 5. Calculate streak and weekly data from user responses
    let currentStreak = dashboardStats.current_streak;
    let longestStreak = dashboardStats.longest_streak;
    let weeklyQuestions = 0;

    try {
      const { data: streakData, error: streakError } = await supabase
        .from('user_question_responses')
        .select('attempted_at, is_correct')
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false })
        .limit(30);

      if (!streakError && streakData && streakData.length > 0) {
        // Calculate weekly activity
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyData = streakData.filter(attempt => 
          new Date(attempt.attempted_at) >= oneWeekAgo
        );
        weeklyQuestions = weeklyData.length;
        
        // If profile streaks are 0, calculate them
        if (currentStreak === 0 && longestStreak === 0) {
          let tempStreak = 0;
          for (let i = 0; i < streakData.length; i++) {
            if (streakData[i].is_correct) {
              if (i === currentStreak) currentStreak++;
              tempStreak++;
            } else {
              if (tempStreak > longestStreak) longestStreak = tempStreak;
              tempStreak = 0;
            }
          }
          if (tempStreak > longestStreak) longestStreak = tempStreak;
        }
      }
    } catch (error) {
      console.log('Streak calculation failed, using profile defaults');
    }

    // 6. Calculate completion for each enrollment with detailed question progress
    const courseProgressDetails = [];
    let completedCourses = 0;
    
    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        if (enrollment.is_completed) {
          completedCourses++;
        }

        // Get detailed question responses for this enrollment
        let questionResponses = [];
        try {
          const { data: responseData, error: responseError } = await supabase
            .from('user_question_responses')
            .select(`
              *,
              questions (
                id,
                question,
                type,
                timestamp,
                explanation,
                options
              )
            `)
            .eq('user_id', user.id)
            .eq('enrollment_id', enrollment.id)
            .order('attempted_at', { ascending: false });

          if (!responseError && responseData) {
            questionResponses = responseData;
          }
        } catch (error) {
          console.log('Failed to fetch question responses for enrollment:', enrollment.id);
        }

        courseProgressDetails.push({
          ...enrollment,
          questionResponses,
          detailedStats: {
            totalQuestions: questionResponses.length,
            correctAnswers: questionResponses.filter(r => r.is_correct).length,
            incorrectAnswers: questionResponses.filter(r => !r.is_correct).length,
            accuracy: questionResponses.length > 0 
              ? Math.round((questionResponses.filter(r => r.is_correct).length / questionResponses.length) * 100)
              : 0
          }
        });
      }
    }
    
    // Update completed courses count
    dashboardStats.courses_completed = completedCourses;

    // 7. Get courses created by the user with enrollment statistics
    let createdCourses = [];
    try {
      const { data: createdCoursesData, error: createdCoursesError } = await supabase
        .from('user_course_creations')
        .select(`
          *,
          courses (
            id,
            title,
            description,
            youtube_url,
            created_at,
            published
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!createdCoursesError && createdCoursesData) {
        // Get enrollment statistics for each course
        for (const creation of createdCoursesData) {
          const courseId = creation.courses.id;
          
          // Get enrollment count
          const { data: enrollmentStats, error: enrollmentError } = await supabase
            .from('user_course_enrollments')
            .select('id, user_id, total_questions_answered, total_questions_correct')
            .eq('course_id', courseId);

          // Get total questions answered across all students
          const { data: questionStats, error: questionError } = await supabase
            .from('user_question_responses')
            .select('is_correct, user_id')
            .in('question_id', 
              await supabase
                .from('questions')
                .select('id')
                .eq('course_id', courseId)
                .then(result => result.data?.map(q => q.id) || [])
            );

          const enrollmentCount = enrollmentStats?.length || 0;
          const totalQuestionsAnswered = questionStats?.length || 0;
          const totalCorrectAnswers = questionStats?.filter(q => q.is_correct).length || 0;

          createdCourses.push({
            ...creation,
            enrollmentStats: {
              totalEnrolled: enrollmentCount,
              totalQuestionsAnswered,
              totalCorrectAnswers,
              averageAccuracy: totalQuestionsAnswered > 0 
                ? Math.round((totalCorrectAnswers / totalQuestionsAnswered) * 100)
                : 0
            }
          });
        }
      }
    } catch (error) {
      console.log('Failed to fetch created courses:', error);
      createdCourses = [];
    }

    // Update created courses count
    dashboardStats.courses_created = createdCourses.length;

    console.log('✅ Dashboard data fetched successfully');

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        ...dashboardStats
      },
      stats: {
        coursesEnrolled: dashboardStats?.courses_enrolled || 0,
        coursesCompleted: dashboardStats?.courses_completed || 0,
        coursesCreated: dashboardStats?.courses_created || 0,
        totalCorrectAnswers: dashboardStats?.total_correct_answers || 0,
        totalQuestionsAttempted: dashboardStats?.total_questions_attempted || 0,
        totalPoints: dashboardStats?.total_points || 0,
        totalAchievements: dashboardStats?.total_achievements || 0,
        currentStreak,
        longestStreak,
        weeklyQuestions,
        accuracyRate: dashboardStats?.total_questions_attempted > 0 
          ? Math.round((dashboardStats.total_correct_answers / dashboardStats.total_questions_attempted) * 100)
          : 0
      },
      enrollments: courseProgressDetails,
      createdCourses,
      recentActivity: {
        attempts: recentAttempts || [],
        achievements: recentAchievements || []
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}