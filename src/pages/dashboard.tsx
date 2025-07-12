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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  ExternalLink,
  GraduationCap,
  BarChart3,
  Mail,
  CheckCircle,
  XCircle,
  Eye,
  Users
} from 'lucide-react';
import Header from '@/components/Header';
import { useRouter } from 'next/router';

interface DashboardData {
  user: {
    id: string;
    email: string;
    display_name?: string;
    subscription_tier: string;
    created_at?: string;
    bio?: string;
    preferred_difficulty?: 'easy' | 'medium' | 'hard';
  };
  stats: {
    coursesEnrolled: number;
    coursesCompleted: number;
    coursesCreated: number;
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
  createdCourses: any[];
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
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showQuestionDetails, setShowQuestionDetails] = useState(false);

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

  const handleViewQuestionDetails = (course: any) => {
    setSelectedCourse(course);
    setShowQuestionDetails(true);
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

  const { user: userData, stats, enrollments, createdCourses, recentActivity } = dashboardData;

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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Enrolled</p>
                    <p className="text-xl font-bold">{stats.coursesEnrolled}</p>
                  </div>
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Completed</p>
                    <p className="text-xl font-bold">{stats.coursesCompleted}</p>
                  </div>
                  <Trophy className="h-4 w-4 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Created</p>
                    <p className="text-xl font-bold">{stats.coursesCreated}</p>
                  </div>
                  <GraduationCap className="h-4 w-4 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Questions</p>
                    <p className="text-xl font-bold">{stats.totalQuestionsAttempted}</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Accuracy</p>
                    <p className="text-xl font-bold">{stats.accuracyRate}%</p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Streak</p>
                    <p className={`text-xl font-bold ${getStreakColor(stats.currentStreak)}`}>
                      {stats.currentStreak}
                    </p>
                  </div>
                  <Target className="h-4 w-4 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Points</p>
                    <p className="text-xl font-bold">{stats.totalPoints}</p>
                  </div>
                  <Award className="h-4 w-4 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="profile">Profile</TabsTrigger>
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
                    <div className="text-center text-muted-foreground py-4">
                      <Star className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Achievement system coming soon!</p>
                      <p className="text-xs">Keep answering questions to build your progress.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="profile" className="space-y-6">
              <div className="space-y-6">
                {/* Profile Header */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-6">
                      <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                        {userData.display_name ? userData.display_name.charAt(0).toUpperCase() : userData.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <h2 className="text-2xl font-bold">
                            {userData.display_name || userData.email.split('@')[0]}
                          </h2>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <span>{userData.email}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 flex-wrap">
                          <Badge 
                            variant={userData.subscription_tier === 'premium' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {userData.subscription_tier} Plan
                          </Badge>
                          {userData.preferred_difficulty && (
                            <Badge variant="outline" className="capitalize">
                              {userData.preferred_difficulty} Difficulty
                            </Badge>
                          )}
                          <div className="text-sm text-muted-foreground">
                            Member since {formatDate(userData.created_at || new Date().toISOString())}
                          </div>
                        </div>
                        {userData.bio && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {userData.bio}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        Learning Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Courses Enrolled</span>
                        <span className="font-medium">{stats.coursesEnrolled}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Courses Completed</span>
                        <span className="font-medium">{stats.coursesCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Questions Answered</span>
                        <span className="font-medium">{stats.totalQuestionsAttempted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Correct Answers</span>
                        <span className="font-medium">{stats.totalCorrectAnswers}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Target className="h-4 w-4 text-orange-600" />
                        Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Accuracy Rate</span>
                        <span className="font-medium">{stats.accuracyRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Current Streak</span>
                        <span className={`font-medium ${getStreakColor(stats.currentStreak)}`}>
                          {stats.currentStreak}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Best Streak</span>
                        <span className="font-medium">{stats.longestStreak}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">This Week</span>
                        <span className="font-medium">{stats.weeklyQuestions} questions</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Award className="h-4 w-4 text-purple-600" />
                        Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Points</span>
                        <span className="font-medium">{stats.totalPoints}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Achievements</span>
                        <span className="font-medium">{stats.totalAchievements}</span>
                      </div>
                      <div className="pt-2">
                        <Progress value={Math.min((stats.totalPoints / 1000) * 100, 100)} className="h-2" />
                        <div className="text-xs text-muted-foreground mt-1">
                          {stats.totalPoints}/1000 points to next level
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Course Progress Summary */}
                {enrollments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Course Progress Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {enrollments.slice(0, 5).map((enrollment) => (
                          <div key={enrollment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{enrollment.courses.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                Started {formatDate(enrollment.enrolled_at)}
                              </p>
                              {enrollment.detailedStats && (
                                <div className="text-xs text-muted-foreground mt-1 flex gap-4">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    {enrollment.detailedStats.correctAnswers} correct
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <XCircle className="h-3 w-3 text-red-600" />
                                    {enrollment.detailedStats.incorrectAnswers} incorrect
                                  </span>
                                  <span>
                                    {enrollment.detailedStats.accuracy}% accuracy
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {Math.round(enrollment.progress_percentage || 0)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {enrollment.is_completed ? 'Completed' : 'In Progress'}
                                </div>
                              </div>
                              <Progress 
                                value={enrollment.progress_percentage || 0} 
                                className="h-2 w-24" 
                              />
                              {enrollment.detailedStats && enrollment.detailedStats.totalQuestions > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewQuestionDetails(enrollment)}
                                  className="ml-2"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                        {enrollments.length > 5 && (
                          <div className="text-center pt-2">
                            <Button variant="outline" size="sm" onClick={() => router.push('#courses')}>
                              View All {enrollments.length} Courses
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="courses" className="space-y-6">
              <Tabs defaultValue="enrolled" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="enrolled">Enrolled Courses</TabsTrigger>
                  <TabsTrigger value="created">Created Courses</TabsTrigger>
                </TabsList>

                <TabsContent value="enrolled" className="space-y-4">
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
                                <span>{Math.round(enrollment.progress_percentage || 0)}%</span>
                              </div>
                              <Progress value={enrollment.progress_percentage || 0} className="h-2" />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                              <Badge 
                                variant={enrollment.courses?.published ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {enrollment.courses?.published ? 'Published' : 'Draft'}
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
                          <h3 className="text-lg font-medium mb-2">No enrolled courses yet</h3>
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

                <TabsContent value="created" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {createdCourses?.map((creation) => (
                      <Card key={creation.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold line-clamp-2">{creation.courses.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {creation.courses.description}
                              </p>
                            </div>
                            
                            {creation.enrollmentStats && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    Students
                                  </span>
                                  <span className="font-medium">{creation.enrollmentStats.totalEnrolled}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Questions Answered</span>
                                  <span className="font-medium">{creation.enrollmentStats.totalQuestionsAnswered}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span>Student Accuracy</span>
                                  <span className="font-medium">{creation.enrollmentStats.averageAccuracy}%</span>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                              <Badge 
                                variant={creation.courses?.published ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {creation.courses?.published ? 'Published' : 'Draft'}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => router.push(`/course/${creation.courses.id}`)}
                              >
                                View Course
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {(!createdCourses || createdCourses.length === 0) && (
                      <Card className="col-span-full">
                        <CardContent className="p-12 text-center">
                          <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium mb-2">No created courses yet</h3>
                          <p className="text-muted-foreground mb-4">
                            Create your first course to share knowledge with others
                          </p>
                          <Button onClick={() => router.push('/create')}>
                            Create Course
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
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
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Achievement System Coming Soon</h3>
                    <p className="text-muted-foreground">
                      We're building an exciting achievement system to recognize your learning progress!
                    </p>
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>Current points: <span className="font-medium">{stats.totalPoints}</span></p>
                    </div>
                  </div>
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
                              {attempt.questions?.courses?.title} • {formatDate(attempt.attempted_at)}
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

      {/* Question Details Modal */}
      <Dialog open={showQuestionDetails} onOpenChange={setShowQuestionDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Question Details - {selectedCourse?.courses?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedCourse.detailedStats?.totalQuestions || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Questions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedCourse.detailedStats?.correctAnswers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedCourse.detailedStats?.incorrectAnswers || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Incorrect</div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Individual Question Results</h4>
                {selectedCourse.questionResponses?.map((response: any, index: number) => (
                  <div key={response.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        response.is_correct ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {response.is_correct ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Question {index + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={response.is_correct ? 'default' : 'destructive'}
                              className="text-xs"
                            >
                              {response.is_correct ? 'Correct' : 'Incorrect'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(response.attempted_at)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm line-clamp-2">{response.questions?.question}</p>
                        {response.questions?.explanation && (
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer hover:text-foreground">
                              Show explanation
                            </summary>
                            <div className="mt-2 p-2 bg-muted/50 rounded">
                              {response.questions.explanation}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!selectedCourse.questionResponses || selectedCourse.questionResponses.length === 0) && (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">
                      No question responses found for this course.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}