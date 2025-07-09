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

    // 1. Get user profile - fallback to basic profile if view doesn't exist
    let dashboardStats = null;
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('user_dashboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError) {
        console.log('Dashboard stats view not available, falling back to basic profile');
        // Fallback: get basic profile data
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return res.status(500).json({ error: 'Failed to fetch user profile' });
        }

        // Create basic stats structure and calculate manually
        console.log('📊 Calculating stats manually from individual tables');
        
        // Get actual counts from individual tables
        const { data: enrollmentCount } = await supabase
          .from('user_course_enrollments')
          .select('id, completion_percentage')
          .eq('user_id', user.id);

        const { data: attemptCount } = await supabase
          .from('user_question_attempts')
          .select('id, is_correct')
          .eq('user_id', user.id);

        const { data: achievementCount } = await supabase
          .from('user_achievements')
          .select('id, points_awarded')
          .eq('user_id', user.id);

        dashboardStats = {
          user_id: user.id,
          email: profile.email,
          display_name: profile.display_name,
          subscription_tier: profile.subscription_tier || 'free',
          courses_enrolled: enrollmentCount?.length || 0,
          courses_completed: enrollmentCount?.filter(e => e.completion_percentage >= 80).length || 0,
          total_correct_answers: attemptCount?.filter(a => a.is_correct).length || 0,
          total_questions_attempted: attemptCount?.length || 0,
          total_points: achievementCount?.reduce((sum, a) => sum + (a.points_awarded || 0), 0) || 0,
          total_achievements: achievementCount?.length || 0
        };
      } else {
        dashboardStats = statsData;
      }
    } catch (error) {
      console.error('Error in dashboard stats fallback:', error);
      return res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }

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

    // 3. Get recent question attempts (last 10) (with fallback)
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

    // 4. Get recent achievements (last 5) (with fallback)
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

    // 5. Get learning streak data (with fallback)
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

        // 6. Calculate weekly activity
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

    // 7. Get course progress details for enrolled courses (with fallback)
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

    console.log('✅ Dashboard data fetched successfully');

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        ...dashboardStats
      },
      stats: {
        coursesEnrolled: dashboardStats?.courses_enrolled || 0,
        coursesCompleted: dashboardStats?.courses_completed || 0,
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