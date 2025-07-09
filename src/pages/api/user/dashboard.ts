import { NextApiRequest, NextApiResponse } from 'next';
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
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid authentication' });
    }

    console.log('📊 Fetching dashboard data for user:', user.id);

    // 1. Get user profile and basic stats - with fallback for missing tables
    let dashboardStats = null;
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('user_dashboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError) {
        console.log('📊 Dashboard stats view not available, calculating stats manually');
        // Create basic stats structure and calculate manually
        console.log('📊 Calculating stats manually from individual tables');
        
        // Get actual counts from individual tables
        const { data: enrollmentCount } = await supabase
          .from('user_course_enrollments')
          .select('id, completion_percentage')
          .eq('user_id', user.id);

        const { data: questionsCount } = await supabase
          .from('user_question_attempts')
          .select('id, is_correct')
          .eq('user_id', user.id);

        const totalEnrollments = enrollmentCount?.length || 0;
        const completedCourses = enrollmentCount?.filter(e => e.completion_percentage >= 100).length || 0;
        const totalQuestions = questionsCount?.length || 0;
        const correctAnswers = questionsCount?.filter(q => q.is_correct).length || 0;
        
        // Get basic profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        dashboardStats = {
          user_id: user.id,
          email: profile?.email || user.email,
          display_name: profile?.display_name || user.email?.split('@')[0],
          subscription_tier: profile?.subscription_tier || 'free',
          courses_enrolled: totalEnrollments,
          courses_completed: completedCourses,
          total_correct_answers: correctAnswers,
          total_questions_attempted: totalQuestions,
          total_points: correctAnswers * 10, // Simple points calculation
          total_achievements: 0
        };
      } else {
        dashboardStats = statsData;
      }
    } catch (error) {
      console.error('Error in dashboard stats fallback:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }

    // 2. Get enrolled courses with progress - with fallback
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

    // 3. Get recent question attempts (last 10) - with fallback
    let recentAttempts = [];
    try {
      const { data: attemptData, error: attemptsError } = await supabase
        .from('user_question_attempts')
        .select(`
          *,
          questions (
            id,
            question,
            type,
            timestamp
          ),
          courses (
            id,
            title
          )
        `)
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false })
        .limit(10);

      if (attemptsError) {
        console.log('Question attempts table not available:', attemptsError.message);
        recentAttempts = [];
      } else {
        recentAttempts = attemptData || [];
      }
    } catch (error) {
      console.log('Question attempts query failed, using empty array');
      recentAttempts = [];
    }

    // 4. Get recent achievements (last 5) - with fallback
    let recentAchievements = [];
    try {
      const { data: achievementData, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(5);

      if (achievementsError) {
        console.log('Achievements table not available:', achievementsError.message);
        recentAchievements = [];
      } else {
        recentAchievements = achievementData || [];
      }
    } catch (error) {
      console.log('Achievements query failed, using empty array');
      recentAchievements = [];
    }

    // 5. Get learning streak data - with fallback
    let currentStreak = 0;
    let longestStreak = 0;
    let weeklyQuestions = 0;
    
    try {
      const { data: streakData, error: streakError } = await supabase
        .from('user_question_attempts')
        .select('attempted_at, is_correct')
        .eq('user_id', user.id)
        .order('attempted_at', { ascending: false })
        .limit(30); // Last 30 attempts for streak calculation

      if (!streakError && streakData && streakData.length > 0) {
        let tempStreak = 0;
        // Calculate current streak (consecutive correct answers from most recent)
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

        // Calculate weekly activity
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const weeklyData = streakData.filter(attempt => 
          new Date(attempt.attempted_at) >= oneWeekAgo
        );
        weeklyQuestions = weeklyData.length;
      }
    } catch (error) {
      console.log('Streak calculation failed, using defaults');
    }

    // 7. Get course progress details for enrolled courses - with fallback
    const courseProgressDetails = [];
    if (enrollments && enrollments.length > 0) {
      for (const enrollment of enrollments) {
        try {
          const { data: courseProgress } = await supabase
            .from('user_course_progress')
            .select('*')
            .eq('user_id', user.id)
            .eq('course_id', enrollment.course_id);

          courseProgressDetails.push({
            ...enrollment,
            segmentProgress: courseProgress || []
          });
        } catch (error) {
          console.log('Course progress query failed for enrollment:', enrollment.id);
          courseProgressDetails.push({
            ...enrollment,
            segmentProgress: []
          });
        }
      }
    }

    // Build response with tab structure
    const response = {
      success: true,
      dashboardStats,
      tabs: {
        overview: {
          stats: dashboardStats,
          streaks: {
            current: currentStreak,
            longest: longestStreak,
            weeklyQuestions
          },
          recentActivity: recentAttempts.slice(0, 5),
          topCourses: courseProgressDetails.slice(0, 3)
        },
        courses: {
          enrolled: courseProgressDetails,
          totalEnrolled: enrollments.length,
          completed: courseProgressDetails.filter(c => c.completion_percentage >= 100).length
        },
        progress: {
          recentAttempts: recentAttempts,
          streakData: {
            current: currentStreak,
            longest: longestStreak,
            weeklyQuestions
          },
          achievements: recentAchievements
        },
        achievements: {
          recent: recentAchievements,
          total: dashboardStats.total_achievements,
          categories: {
            learning: recentAchievements.filter(a => a.category === 'learning').length,
            streak: recentAchievements.filter(a => a.category === 'streak').length,
            completion: recentAchievements.filter(a => a.category === 'completion').length
          }
        }
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}