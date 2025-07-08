import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, BookOpen, Clock, Users, CheckCircle, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import Header from '@/components/Header';

interface CourseData {
  title: string;
  description: string;
  duration: string;
  segments: Array<{
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
  }>;
}

interface DatabaseQuestion {
  id: string;
  course_id: string;
  timestamp: number;
  question: string;
  type: string;
  options: string | null;
  correct_answer: string;
  explanation: string;
  visual_context: string;
  accepted: boolean;
  created_at: string;
}

export default function Create() {
  const router = useRouter();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [databaseQuestions, setDatabaseQuestions] = useState<DatabaseQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [processingQuestions, setProcessingQuestions] = useState<Set<string>>(new Set());

  const fetchDatabaseQuestions = async (courseId: string) => {
    setIsLoadingQuestions(true);
    try {
      const response = await fetch(`/api/course/${courseId}/questions`);
      const data = await response.json();
      
      if (data.success) {
        setDatabaseQuestions(data.questions);
      } else {
        console.error('Failed to fetch questions:', data.error);
        toast.error('Failed to fetch questions');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Error fetching questions');
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleAcceptQuestion = async (questionId: string) => {
    setProcessingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      const response = await fetch(`/api/question/${questionId}/accept`, {
        method: 'POST',
      });
      
      if (response.ok) {
        // Update the question in the local state
        setDatabaseQuestions(prev => 
          prev.map(q => 
            q.id === questionId ? { ...q, accepted: true } : q
          )
        );
        toast.success('Question accepted!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept question');
      }
    } catch (error) {
      console.error('Error accepting question:', error);
      toast.error('Failed to accept question');
    } finally {
      setProcessingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const handleRejectQuestion = async (questionId: string) => {
    setProcessingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      const response = await fetch(`/api/question/${questionId}/reject`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the question from the local state
        setDatabaseQuestions(prev => prev.filter(q => q.id !== questionId));
        toast.success('Question rejected and deleted!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject question');
      }
    } catch (error) {
      console.error('Error rejecting question:', error);
      toast.error('Failed to reject question');
    } finally {
      setProcessingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    // Get data from router state
    if (router.query.data && router.query.youtubeUrl && router.query.course_id) {
      try {
        const parsedData = JSON.parse(router.query.data as string);
        setCourseData(parsedData);
        setYoutubeUrl(router.query.youtubeUrl as string);
        setCourseId(router.query.course_id as string);
        
        // Extract video ID from YouTube URL
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
        
        setVideoId(extractVideoId(router.query.youtubeUrl as string));
        
        // Fetch actual questions from database
        fetchDatabaseQuestions(router.query.course_id as string);
      } catch (error) {
        console.error('Error parsing course data:', error);
      }
    }
  }, [router.query]);

  const handleBackToHome = () => {
    router.push('/');
  };

  const parseQuestionOptions = (options: string | null): string[] => {
    if (!options) return [];
    
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error parsing question options:', error);
      return [];
    }
  };

  if (!courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert>
              <AlertDescription>
                No course data found. Please generate a course first.
              </AlertDescription>
            </Alert>
            <Button onClick={handleBackToHome} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
                  </div>
      </div>
      <Toaster />
    </div>
  );
}

  const totalQuestions = databaseQuestions.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={handleBackToHome}
            className="mb-4"
          >
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
              </CardContent>
            </Card>

            {/* Course Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Course Structure</CardTitle>
                <CardDescription>
                  Overview of generated questions and their status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingQuestions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Loading questions...</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <span>Total Questions: {databaseQuestions.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Accepted: {databaseQuestions.filter(q => q.accepted).length}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span>Pending: {databaseQuestions.filter(q => !q.accepted).length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>Question Types: {Array.from(new Set(databaseQuestions.map(q => q.type))).join(', ')}</span>
                        </div>
                      </div>
                    </div>
                    
                    {databaseQuestions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-3 text-sm">Question Timeline:</h4>
                          <div className="space-y-2">
                            {databaseQuestions
                              .sort((a, b) => a.timestamp - b.timestamp)
                              .map((question, index) => (
                                <div key={question.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {Math.floor(question.timestamp / 60)}:{(question.timestamp % 60).toString().padStart(2, '0')}
                                    </Badge>
                                    <span className="truncate max-w-xs">{question.question}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {question.accepted ? (
                                      <Badge variant="default" className="text-xs">
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Accepted
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        Pending
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Generated Questions</CardTitle>
              <CardDescription>
                Review and accept/reject the AI-generated questions for your course
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Loading questions...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {databaseQuestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No questions generated yet.
                    </div>
                  ) : (
                    databaseQuestions.map((question, index) => {
                      const options = parseQuestionOptions(question.options);
                      const correctIndex = parseInt(question.correct_answer, 10);
                      const isProcessing = processingQuestions.has(question.id);
                      
                      return (
                        <div key={question.id} className="p-4 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {question.type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {Math.floor(question.timestamp / 60)}:{(question.timestamp % 60).toString().padStart(2, '0')}
                              </Badge>
                              <span className="text-sm font-medium">
                                Question {index + 1}
                              </span>
                              {question.accepted && (
                                <Badge variant="default" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Accepted
                                </Badge>
                              )}
                            </div>
                            
                            {!question.accepted && (
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAcceptQuestion(question.id)}
                                  disabled={isProcessing}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectQuestion(question.id)}
                                  disabled={isProcessing}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <p className="text-sm mb-3">{question.question}</p>
                          
                          {options.length > 0 && (
                            <div className="space-y-1 mb-3">
                              {options.map((option, optionIndex) => (
                                <div 
                                  key={optionIndex} 
                                  className={`text-xs p-2 rounded ${
                                    optionIndex === correctIndex 
                                      ? 'bg-primary/10 border border-primary/20' 
                                      : 'bg-background'
                                  }`}
                                >
                                  {String.fromCharCode(65 + optionIndex)}. {option}
                                  {optionIndex === correctIndex && (
                                    <CheckCircle className="inline h-3 w-3 ml-2 text-primary" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {question.explanation && (
                            <div className="mb-3 text-xs text-muted-foreground">
                              <strong>Explanation:</strong> {question.explanation}
                            </div>
                          )}
                          
                          {question.visual_context && (
                            <div className="text-xs text-muted-foreground">
                              <strong>Visual Context:</strong> {question.visual_context}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button size="lg" className="px-8">
              <BookOpen className="mr-2 h-4 w-4" />
              Start Learning
            </Button>
            <Button variant="outline" size="lg" className="px-8">
              Export Course
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 