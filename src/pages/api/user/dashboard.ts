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

    // 1. Get user profile and basic stats
    const { data: dashboardStats, error: statsError } = await supabase
      .from('user_dashboard_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError) {
      console.error('Error fetching dashboard stats:', statsError);
      return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }

    // 2. Get enrolled courses with progress
    const { data: enrollments, error: enrollmentsError } = await supabase
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
      console.error('Error fetching enrollments:', enrollmentsError);
      return res.status(500).json({ error: 'Failed to fetch enrollments' });
    }

    // 3. Get recent question attempts (last 10)
    const { data: recentAttempts, error: attemptsError } = await supabase
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
      console.error('Error fetching recent attempts:', attemptsError);
    }

    // 4. Get recent achievements (last 5)
    const { data: recentAchievements, error: achievementsError } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false })
      .limit(5);

    if (achievementsError) {
      console.error('Error fetching achievements:', achievementsError);
    }

    // 5. Get learning streak data
    const { data: streakData, error: streakError } = await supabase
      .from('user_question_attempts')
      .select('attempted_at, is_correct')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false })
      .limit(30); // Last 30 attempts for streak calculation

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (streakData && streakData.length > 0) {
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
    }

    // 6. Calculate weekly activity
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: weeklyActivity, error: weeklyError } = await supabase
      .from('user_question_attempts')
      .select('attempted_at')
      .eq('user_id', user.id)
      .gte('attempted_at', oneWeekAgo.toISOString());

    const weeklyQuestions = weeklyActivity?.length || 0;

    // 7. Get course progress details for enrolled courses
    const courseProgressDetails = [];
    if (enrollments) {
      for (const enrollment of enrollments) {
        const { data: courseProgress } = await supabase
          .from('user_course_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', enrollment.course_id);

        courseProgressDetails.push({
          ...enrollment,
          segmentProgress: courseProgress || []
        });
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