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
    credits?: number;
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

  useEffect(() => {
    // Check for payment success/failure in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const paymentSuccess = urlParams.get('payment_success');
    const paymentCancelled = urlParams.get('payment_cancelled');
    
    if (paymentSuccess === 'true') {
      // Show success message and refresh data
      setError(null);
      fetchDashboardData();
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentCancelled === 'true') {
      setError('Payment was cancelled');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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



  const handleViewQuestionDetails = (course: any) => {
    setSelectedCourse(course);
    setShowQuestionDetails(true);
  };

  const handleBuyCredits = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to purchase credits');
        return;
      }

      console.log('Session user:', session.user);
      console.log('Context user:', user);

      // Create a checkout session with user context
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: session.user.id, // Use session user ID directly
          userEmail: session.user.email,
          returnUrl: window.location.origin // Return to homepage instead of dashboard
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        });
        throw new Error(data.error || `API Error: ${response.status} ${response.statusText}`);
      }

      if (data.success && data.url) {
        console.log('Redirecting to:', data.url);
        setError(null); // Clear any previous errors
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        console.error('Checkout creation failed:', data);
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      if (err instanceof Error) {
        if (err.message.includes('404')) {
          setError('API route not found. Please restart the development server.');
        } else {
          setError(`Failed to start checkout process: ${err.message}`);
        }
      } else {
        setError('Failed to start checkout process');
      }
    }
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
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button 
                onClick={handleBuyCredits}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                size="sm"
              >
                <Star className="h-4 w-4 mr-2" />
                Buy Credits
              </Button>
            </div>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="courses">My Courses</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

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
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {userData.credits || 0} Credits
                          </Badge>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <span className="text-sm text-muted-foreground">This Week</span>
                        <span className="font-medium">{stats.weeklyQuestions} questions</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Created Courses</span>
                        <span className="font-medium">{stats.coursesCreated}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Star className="h-4 w-4 text-yellow-600" />
                        Credits
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Current Balance</span>
                        <span className="font-medium text-lg">{userData.credits || 0}</span>
                      </div>
                      <div className="pt-2">
                        <Button 
                          onClick={handleBuyCredits}
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Buy More Credits
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Use credits for premium features
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
                              <div className="flex gap-2">
                                {enrollment.detailedStats && enrollment.detailedStats.totalQuestions > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewQuestionDetails(enrollment)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    Details
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/course/${enrollment.course_id}`)}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Course
                                </Button>
                              </div>
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