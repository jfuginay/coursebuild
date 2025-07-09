import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  User, 
  BookOpen, 
  GraduationCap, 
  Trophy, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar,
  Award,
  BarChart3
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  preferred_difficulty: string;
  total_courses_taken: number;
  total_courses_created: number;
  total_questions_answered: number;
  total_questions_correct: number;
  current_streak: number;
  longest_streak: number;
}

interface CourseCreation {
  id: string;
  course_id: string;
  role: string;
  created_at: string;
}

interface CourseEnrollment {
  id: string;
  course_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress_percentage: number;
  is_completed: boolean;
  total_questions_answered: number;
  total_questions_correct: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

export default function ProfilesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courseCreations, setCourseCreations] = useState<CourseCreation[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<CourseEnrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?returnUrl=/profiles');
    }
  }, [user, authLoading, router]);

  // Fetch user profile data
  useEffect(() => {
    if (!user) return;

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        
        // Fetch user profile
        const profileResponse = await fetch(`/api/profiles/${user.id}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setProfile(profileData);
        }

        // Fetch course creations
        const creationsResponse = await fetch(`/api/user-course-creations?user_id=${user.id}`);
        let creationsData: any = { creations: [] };
        if (creationsResponse.ok) {
          creationsData = await creationsResponse.json();
          setCourseCreations(creationsData.creations || []);
        }

        // Fetch course enrollments
        const enrollmentsResponse = await fetch(`/api/user-course-enrollments?user_id=${user.id}`);
        let enrollmentsData: any = { enrollments: [] };
        if (enrollmentsResponse.ok) {
          enrollmentsData = await enrollmentsResponse.json();
          setCourseEnrollments(enrollmentsData.enrollments || []);
        }

        // Fetch course details for all courses
        const allCourseIds = new Set([
          ...creationsData.creations?.map((c: CourseCreation) => c.course_id) || [],
          ...enrollmentsData.enrollments?.map((e: CourseEnrollment) => e.course_id) || []
        ]);

        if (allCourseIds.size > 0) {
          const coursesResponse = await fetch(`/api/courses?ids=${Array.from(allCourseIds).join(',')}`);
          if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json();
            setCourses(coursesData.courses || []);
          }
        }

      } catch (err) {
        console.error('Error fetching profile data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null;
  }

  // Calculate stats
  const accuracyRate = profile?.total_questions_answered 
    ? Math.round((profile.total_questions_correct / profile.total_questions_answered) * 100)
    : 0;

  const completedCourses = courseEnrollments.filter(e => e.is_completed).length;
  const inProgressCourses = courseEnrollments.filter(e => !e.is_completed && e.progress_percentage > 0).length;

  // Helper function to get course title by ID
  const getCourseTitle = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    return course?.title || `Course ID: ${courseId}`;
  };

  return (
    <>
      <Head>
        <title>Profile - CourseBuilder</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Profile Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {profile?.display_name 
                    ? profile.display_name.charAt(0).toUpperCase()
                    : user.email?.charAt(0).toUpperCase() || 'U'
                  }
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {profile?.display_name || 'User Profile'}
                </h1>
                <p className="text-muted-foreground">{user.email}</p>
                <Badge variant="secondary" className="mt-2">
                  {profile?.preferred_difficulty || 'Medium'} Difficulty
                </Badge>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Stats Overview */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Courses Created
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile?.total_courses_created || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Total courses you've created
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Courses Taken
                  </CardTitle>
                  <GraduationCap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile?.total_courses_taken || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {completedCourses} completed, {inProgressCourses} in progress
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Questions Answered
                  </CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile?.total_questions_answered || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {accuracyRate}% accuracy rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Streak
                  </CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{profile?.current_streak || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Longest: {profile?.longest_streak || 0} days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Course Creation Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Course Creation Activity
                  </CardTitle>
                  <CardDescription>
                    Your course creation history and statistics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Courses Created</span>
                    <Badge variant="secondary">{profile?.total_courses_created || 0}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Creator Role</span>
                    <Badge variant="outline">
                      {courseCreations.filter(c => c.role === 'creator').length}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Collaborator Role</span>
                    <Badge variant="outline">
                      {courseCreations.filter(c => c.role === 'collaborator').length}
                    </Badge>
                  </div>

                  {courseCreations.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Recent Activity</p>
                      <div className="space-y-2">
                        {courseCreations.slice(0, 3).map((creation) => (
                          <div key={creation.id} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {new Date(creation.created_at).toLocaleDateString()}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {creation.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Learning Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Learning Progress
                  </CardTitle>
                  <CardDescription>
                    Your learning journey and achievements
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Completed Courses</span>
                    <Badge variant="secondary">{completedCourses}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">In Progress</span>
                    <Badge variant="outline">{inProgressCourses}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overall Accuracy</span>
                      <span className="text-sm text-muted-foreground">{accuracyRate}%</span>
                    </div>
                    <Progress value={accuracyRate} className="h-2" />
                  </div>

                  {courseEnrollments.length > 0 && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Recent Enrollments</p>
                      <div className="space-y-2">
                        {courseEnrollments.slice(0, 3).map((enrollment) => (
                          <div key={enrollment.id} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">
                              {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              <Progress value={enrollment.progress_percentage} className="h-1 w-16" />
                              <span className="text-xs">{enrollment.progress_percentage}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Courses Created */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Courses Created ({courseCreations.length})
                </CardTitle>
                <CardDescription>
                  Courses you've created and their performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {courseCreations.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No courses created yet</p>
                    <Button onClick={() => router.push('/')} className="mt-4">
                      Create Your First Course
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courseCreations.map((creation) => (
                      <div key={creation.id} className="border rounded-lg p-4">
                                                 <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <h3 className="font-medium">{getCourseTitle(creation.course_id)}</h3>
                             <Badge variant="outline" className="text-xs">
                               {creation.role}
                             </Badge>
                           </div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(creation.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary">
                              {courseEnrollments.filter(e => e.course_id === creation.course_id).length}
                            </div>
                            <div className="text-xs text-muted-foreground">Students</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {courseEnrollments
                                .filter(e => e.course_id === creation.course_id)
                                .reduce((sum, e) => sum + e.total_questions_correct, 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Correct Answers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              {courseEnrollments
                                .filter(e => e.course_id === creation.course_id)
                                .reduce((sum, e) => sum + (e.total_questions_answered - e.total_questions_correct), 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">Incorrect Answers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">
                              {Math.round(
                                courseEnrollments
                                  .filter(e => e.course_id === creation.course_id)
                                  .reduce((sum, e) => sum + e.progress_percentage, 0) /
                                Math.max(courseEnrollments.filter(e => e.course_id === creation.course_id).length, 1)
                              )}%
                            </div>
                            <div className="text-xs text-muted-foreground">Avg Progress</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Courses Taken */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Courses Taken ({courseEnrollments.length})
                </CardTitle>
                <CardDescription>
                  Courses you've enrolled in and your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {courseEnrollments.length === 0 ? (
                  <div className="text-center py-8">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No courses taken yet</p>
                    <Button onClick={() => router.push('/')} className="mt-4">
                      Find Courses to Take
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courseEnrollments.map((enrollment) => {
                      const accuracy = enrollment.total_questions_answered > 0 
                        ? Math.round((enrollment.total_questions_correct / enrollment.total_questions_answered) * 100)
                        : 0;
                      const incorrect = enrollment.total_questions_answered - enrollment.total_questions_correct;
                      
                      return (
                        <div key={enrollment.id} className="border rounded-lg p-4">
                                                     <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                               <h3 className="font-medium">{getCourseTitle(enrollment.course_id)}</h3>
                               <Badge variant={enrollment.is_completed ? "default" : "secondary"}>
                                 {enrollment.is_completed ? "Completed" : "In Progress"}
                               </Badge>
                             </div>
                            <div className="text-sm text-muted-foreground">
                              Enrolled {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                            <div className="text-center">
                              <div className="text-lg font-bold text-primary">
                                {enrollment.progress_percentage}%
                              </div>
                              <div className="text-xs text-muted-foreground">Progress</div>
                              <Progress value={enrollment.progress_percentage} className="h-1 mt-1" />
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">
                                {enrollment.total_questions_answered}
                              </div>
                              <div className="text-xs text-muted-foreground">Questions</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                {enrollment.total_questions_correct}
                              </div>
                              <div className="text-xs text-muted-foreground">Correct</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-red-600">
                                {incorrect}
                              </div>
                              <div className="text-xs text-muted-foreground">Incorrect</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">
                                {accuracy}%
                              </div>
                              <div className="text-xs text-muted-foreground">Accuracy</div>
                            </div>
                          </div>
                          
                          {enrollment.is_completed && enrollment.completed_at && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Trophy className="h-4 w-4" />
                                Completed on {new Date(enrollment.completed_at).toLocaleDateString()}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
} 