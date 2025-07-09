import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock, 
  Award,
  Star,
  Calendar,
  User,
  Settings,
  ExternalLink
} from 'lucide-react';
import Header from '@/components/Header';
import { useRouter } from 'next/router';

interface DashboardData {
  user: {
    id: string;
    email: string;
    display_name?: string;
    subscription_tier: string;
  };
  stats: {
    coursesEnrolled: number;
    coursesCompleted: number;
    totalCorrectAnswers: number;
    totalQuestionsAttempted: number;
    totalPoints: number;
    totalAchievements: number;
    currentStreak: number;
    longestStreak: number;
    weeklyQuestions: number;
    accuracyRate: number;
  };
  enrollments: any[];
  recentActivity: {
    attempts: any[];
    achievements: any[];
  };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { supabase } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && supabase) {
      fetchDashboardData();
    }
  }, [user, supabase]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No active session');
        return;
      }

      const response = await fetch('/api/user/dashboard', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      if (data.success) {
        setDashboardData(data);
      } else {
        setError(data.error || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-orange-600';
    if (streak >= 5) return 'text-yellow-600';
    if (streak >= 1) return 'text-green-600';
    return 'text-muted-foreground';
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert variant="destructive">
              <AlertDescription>
                {error || 'Failed to load dashboard data'}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  const { user: userData, stats, enrollments, recentActivity } = dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Welcome back, {userData.display_name || userData.email.split('@')[0]}!
              </h1>
              <p className="text-muted-foreground mt-2">
                Track your learning progress and achievements
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={userData.subscription_tier === 'premium' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {userData.subscription_tier} Plan
              </Badge>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Courses Enrolled</p>
                    <p className="text-2xl font-bold">{stats.coursesEnrolled}</p>
                  </div>
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Courses Completed</p>
                    <p className="text-2xl font-bold">{stats.coursesCompleted}</p>
                  </div>
                  <Trophy className="h-5 w-5 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Streak</p>
                    <p className={`text-2xl font-bold ${getStreakColor(stats.currentStreak)}`}>
                      {stats.currentStreak}
                    </p>
                  </div>
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Accuracy Rate</p>
                    <p className="text-2xl font-bold">{stats.accuracyRate}%</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="courses">My Courses</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Learning Progress */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Learning Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Questions Answered</span>
                        <span>{stats.totalCorrectAnswers}/{stats.totalQuestionsAttempted}</span>
                      </div>
                      <Progress value={stats.accuracyRate} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">{stats.weeklyQuestions}</p>
                        <p className="text-sm text-muted-foreground">This Week</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-purple-600">{stats.longestStreak}</p>
                        <p className="text-sm text-muted-foreground">Best Streak</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Achievements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Recent Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentActivity.achievements.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.achievements.slice(0, 3).map((achievement, index) => (
                          <div key={achievement.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Star className="h-4 w-4 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{achievement.achievement_name}</p>
                              <p className="text-xs text-muted-foreground">{achievement.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              +{achievement.points_awarded}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">
                        No achievements yet. Start learning to earn your first achievement!
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments.map((enrollment) => (
                  <Card key={enrollment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold line-clamp-2">{enrollment.courses.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {enrollment.courses.description}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{Math.round(enrollment.completion_percentage)}%</span>
                          </div>
                          <Progress value={enrollment.completion_percentage} className="h-2" />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <Badge 
                            variant={enrollment.enrollment_type === 'premium' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {enrollment.enrollment_type}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => router.push(`/course/${enrollment.course_id}`)}
                          >
                            Continue
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {enrollments.length === 0 && (
                  <Card className="col-span-full">
                    <CardContent className="p-12 text-center">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Explore our course catalog to start your learning journey
                      </p>
                      <Button onClick={() => router.push('/')}>
                        Browse Courses
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Achievements</CardTitle>
                  <CardDescription>
                    You've earned {stats.totalAchievements} achievements and {stats.totalPoints} points
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.achievements.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recentActivity.achievements.map((achievement) => (
                        <div key={achievement.id} className="p-4 border rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                              <Trophy className="h-5 w-5 text-yellow-600" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">{achievement.achievement_name}</h4>
                              <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary">+{achievement.points_awarded} points</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(achievement.earned_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No achievements yet</h3>
                      <p className="text-muted-foreground">
                        Start answering questions to earn your first achievement!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Question Attempts</CardTitle>
                  <CardDescription>Your latest learning activity</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentActivity.attempts.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.attempts.map((attempt) => (
                        <div key={attempt.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            attempt.is_correct ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {attempt.is_correct ? (
                              <Trophy className="h-4 w-4 text-green-600" />
                            ) : (
                              <Target className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm line-clamp-1">
                              {attempt.questions?.question || 'Question'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {attempt.courses?.title} • {formatDate(attempt.attempted_at)}
                            </p>
                          </div>
                          <Badge variant={attempt.is_correct ? 'default' : 'destructive'}>
                            {attempt.is_correct ? 'Correct' : 'Incorrect'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                      <p className="text-muted-foreground">
                        Start taking courses to see your activity here!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}