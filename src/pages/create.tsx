import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, BookOpen, Clock, Users, CheckCircle, Check, X } from 'lucide-react';
import Header from '@/components/Header';

interface CourseData {
  title: string;
  description: string;
  duration: string;
  video_summary?: string;
  enhanced_features?: {
    visual_questions_enabled: boolean;
    visual_questions_count: number;
    frame_capture_available: boolean;
  };
  segments: Array<{
    title: string;
    timestamp: string;
    concepts: string[];
    questions: Array<{
      id?: string;
      type: string;
      question: string;
      options?: string[];
      correct?: number;
      explanation: string;
      has_visual_asset?: boolean;
      visual_question_type?: string;
      timestamp?: number;
    }>;
    visual_moments?: Array<{
      timestamp: number;
      description: string;
      visual_complexity: string;
      educational_value: string;
    }>;
  }>;
}

export default function Create() {
  const router = useRouter();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, 'accepted' | 'rejected' | 'pending'>>({});
  const [processingQuestions, setProcessingQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Get data from router state
    if (router.query.data && router.query.youtubeUrl) {
      try {
        const parsedData = JSON.parse(router.query.data as string);
        setCourseData(parsedData);
        setYoutubeUrl(router.query.youtubeUrl as string);
        
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
      } catch (error) {
        console.error('Error parsing course data:', error);
      }
    }
  }, [router.query]);

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleAcceptQuestion = async (questionId: string) => {
    if (!questionId) return;
    
    setProcessingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      const response = await fetch(`/api/course/question/${questionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to accept question');
      }

      setQuestionStatuses(prev => ({
        ...prev,
        [questionId]: 'accepted'
      }));
    } catch (error) {
      console.error('Error accepting question:', error);
      // You might want to show a toast notification here
    } finally {
      setProcessingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const handleRejectQuestion = async (questionId: string) => {
    if (!questionId) return;
    
    setProcessingQuestions(prev => new Set(prev).add(questionId));
    
    try {
      const response = await fetch(`/api/course/question/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reject question');
      }

      setQuestionStatuses(prev => ({
        ...prev,
        [questionId]: 'rejected'
      }));
    } catch (error) {
      console.error('Error rejecting question:', error);
      // You might want to show a toast notification here
    } finally {
      setProcessingQuestions(prev => {
        const newSet = new Set(prev);
        newSet.delete(questionId);
        return newSet;
      });
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
              {courseData.enhanced_features?.visual_questions_count && courseData.enhanced_features.visual_questions_count > 0 && (
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-blue-600" />
                  {courseData.enhanced_features.visual_questions_count} Visual Interactive
                </div>
              )}
            </div>
            
            {/* Enhanced Features Badge */}
            {courseData.enhanced_features?.visual_questions_enabled && (
              <div className="flex justify-center">
                <Badge variant="outline" className="px-4 py-2 text-blue-600 border-blue-200 bg-blue-50">
                  ✨ Enhanced with AI Visual Questions • Gemini Vision API • Interactive Elements
                </Badge>
              </div>
            )}
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
                        <h4 className="font-medium mb-3 text-sm">
                          Interactive Questions ({segment.questions.length}):
                        </h4>
                        <div className="space-y-3">
                          {segment.questions.map((question, questionIndex) => {
                            const questionId = question.id || `${segmentIndex}-${questionIndex}`;
                            const questionStatus = questionStatuses[questionId] || 'pending';
                            const isProcessing = processingQuestions.has(questionId);
                            
                            // Don't render rejected questions
                            if (questionStatus === 'rejected') {
                              return null;
                            }
                            
                            return (
                            <div key={questionIndex} className="p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {question.type}
                                </Badge>
                                <span className="text-sm font-medium">
                                  Question {questionIndex + 1}
                                </span>
                                    {question.visual_question_type && (
                                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                        {question.visual_question_type}
                                      </Badge>
                                    )}
                                    {question.has_visual_asset && (
                                      <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800">
                                        Interactive
                                      </Badge>
                                    )}
                                    {questionStatus === 'accepted' && (
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                        Accepted
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {questionStatus === 'pending' && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleAcceptQuestion(questionId)}
                                        disabled={isProcessing}
                                        className="h-8 px-3 text-xs bg-green-50 border-green-200 hover:bg-green-100 text-green-700"
                                      >
                                        <Check className="h-3 w-3 mr-1" />
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectQuestion(questionId)}
                                        disabled={isProcessing}
                                        className="h-8 px-3 text-xs bg-red-50 border-red-200 hover:bg-red-100 text-red-700"
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  )}
                              </div>
                              <p className="text-sm mb-2">{question.question}</p>
                                {question.options && question.options.length > 0 && (
                                <div className="space-y-1">
                                  {question.options.map((option, optionIndex) => (
                                    <div 
                                      key={optionIndex} 
                                      className={`text-xs p-2 rounded ${
                                          question.correct !== undefined && optionIndex === question.correct 
                                          ? 'bg-primary/10 border border-primary/20' 
                                          : 'bg-background'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optionIndex)}. {option}
                                        {question.correct !== undefined && optionIndex === question.correct && (
                                        <CheckCircle className="inline h-3 w-3 ml-2 text-primary" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                                {question.visual_question_type && (
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <strong>Visual Type:</strong> {question.visual_question_type}
                                    {question.has_visual_asset && ' (Interactive)'}
                                  </div>
                                )}
                              {question.explanation && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <strong>Explanation:</strong> {question.explanation}
                                </div>
                              )}
                            </div>
                            );
                          })}
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