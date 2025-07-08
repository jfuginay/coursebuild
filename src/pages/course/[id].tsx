import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, BookOpen, Clock, Users, CheckCircle, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
}

interface CourseSegment {
  title: string;
  timestamp: string;
  concepts: string[];
  questions: Array<{
    type: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}

interface CourseData {
  title: string;
  description: string;
  duration: string;
  segments: CourseSegment[];
}

export default function CoursePage() {
  const router = useRouter();
  const { id } = router.query;
  const [course, setCourse] = useState<Course | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string>('');

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/course/${id}`);
      const data = await response.json();

      if (data.success) {
        setCourse(data.course);
        
        // Extract video ID from YouTube URL
        const extractedVideoId = extractVideoId(data.course.youtube_url);
        setVideoId(extractedVideoId);
        
        // For now, we'll generate mock course data since the structure isn't stored in the database
        // In a real implementation, this would be fetched from the database
        const mockCourseData: CourseData = {
          title: data.course.title,
          description: data.course.description,
          duration: "30 minutes",
          segments: [
            {
              title: "Introduction",
              timestamp: "00:00",
              concepts: ["Course overview", "Learning objectives", "Prerequisites"],
              questions: [
                {
                  type: "multiple_choice",
                  question: "What is the main topic of this course?",
                  options: ["Introduction to the topic", "Advanced concepts", "Practical applications", "Summary"],
                  correct: 0,
                  explanation: "This course starts with an introduction to familiarize you with the main topic."
                }
              ]
            },
            {
              title: "Core Concepts",
              timestamp: "05:00",
              concepts: ["Fundamental principles", "Key terminology", "Basic techniques"],
              questions: [
                {
                  type: "multiple_choice",
                  question: "Which concept is most fundamental to understanding this topic?",
                  options: ["Advanced theory", "Basic principles", "Complex applications", "Historical context"],
                  correct: 1,
                  explanation: "Basic principles form the foundation for understanding more advanced concepts."
                },
                {
                  type: "multiple_choice",
                  question: "What should you focus on first when learning this topic?",
                  options: ["Memorizing terminology", "Understanding core concepts", "Practicing advanced techniques", "Reading additional resources"],
                  correct: 1,
                  explanation: "Understanding core concepts provides the foundation for all other learning."
                }
              ]
            },
            {
              title: "Practical Applications",
              timestamp: "15:00",
              concepts: ["Real-world examples", "Use cases", "Best practices"],
              questions: [
                {
                  type: "multiple_choice",
                  question: "How can you apply these concepts in practice?",
                  options: ["Only in academic settings", "In real-world scenarios", "Only in controlled environments", "Never in practice"],
                  correct: 1,
                  explanation: "These concepts are designed to be applied in real-world scenarios to solve practical problems."
                }
              ]
            }
          ]
        };
        
        setCourseData(mockCourseData);
      } else {
        setError(data.error || 'Failed to fetch course');
      }
    } catch (err) {
      setError('Error loading course');
      console.error('Error fetching course:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const extractVideoId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return '';
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
              <div className="flex justify-center gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-video w-full" />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <Alert variant="destructive">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (!course || !courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <Alert>
              <AlertDescription>
                Course not found or not available.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = courseData.segments.reduce((total, segment) => total + segment.questions.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Button */}
          <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          {/* Course Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              {courseData.title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {courseData.description}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration: {courseData.duration}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {courseData.segments.length} Segments
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {totalQuestions} Questions
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              Created on {formatDate(course.created_at)}
            </Badge>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Video Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Original Video
                </CardTitle>
                <CardDescription>
                  Watch the source material that was used to generate this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                {videoId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Unable to load video</p>
                  </div>
                )}
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(course.youtube_url, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Watch on YouTube
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Course Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Course Structure</CardTitle>
                <CardDescription>
                  Interactive segments with questions and concepts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseData.segments.map((segment, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        Segment {index + 1}: {segment.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {segment.timestamp}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>
                        <strong>Concepts:</strong> {segment.concepts.length > 0 ? segment.concepts.join(', ') : 'None specified'}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {segment.questions.length} interactive question{segment.questions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    {index < courseData.segments.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>
                Detailed breakdown of each segment and its interactive elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {courseData.segments.map((segment, segmentIndex) => (
                  <div key={segmentIndex} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {segment.timestamp}
                      </Badge>
                      <h3 className="text-lg font-semibold">{segment.title}</h3>
                    </div>

                    {segment.concepts.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Key Concepts:</h4>
                        <div className="flex flex-wrap gap-2">
                          {segment.concepts.map((concept, conceptIndex) => (
                            <Badge key={conceptIndex} variant="secondary">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {segment.questions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-sm">Interactive Questions:</h4>
                        <div className="space-y-4">
                          {segment.questions.map((question, questionIndex) => (
                            <Card key={questionIndex} className="p-4">
                              <div className="space-y-3">
                                <p className="font-medium text-sm">{question.question}</p>
                                <div className="grid grid-cols-1 gap-2">
                                  {question.options.map((option, optionIndex) => (
                                    <div 
                                      key={optionIndex} 
                                      className={`p-2 rounded text-sm border ${
                                        optionIndex === question.correct 
                                          ? 'bg-green-50 border-green-200 text-green-800' 
                                          : 'bg-muted/50 border-border'
                                      }`}
                                    >
                                      {optionIndex === question.correct && (
                                        <CheckCircle className="inline h-3 w-3 mr-1" />
                                      )}
                                      {option}
                                    </div>
                                  ))}
                                </div>
                                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                  <strong>Explanation:</strong> {question.explanation}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {segmentIndex < courseData.segments.length - 1 && (
                      <Separator className="my-6" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 