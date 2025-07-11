import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Clock, BookOpen, HelpCircle, ArrowLeft, Lock, CheckCircle, XCircle, ChevronRight, Play, Pause, ExternalLink } from 'lucide-react';
import Header from '@/components/Header';
import QuestionOverlay from '@/components/QuestionOverlay';
import CourseCurriculumCard from '@/components/CourseCurriculumCard';
import VideoProgressBar from '@/components/VideoProgressBar';
import { useAuth } from '@/contexts/AuthContext';

// TypeScript interfaces
interface Question {
  id: string;
  question: string;
  type: string;
  options: string[];
  correct: number;
  correct_answer: number; // Index for multiple choice, 1/0 for true/false
  explanation: string;
  timestamp: number; // in seconds
  visual_context?: string;
  frame_timestamp?: number;
  bounding_boxes?: any[];
  detected_objects?: any[];
  target_objects?: any[];
  matching_pairs?: any[];
  sequence_items?: string[];
  requires_video_overlay?: boolean;
  video_overlay?: boolean;
  bounding_box_count?: number;
}

interface Segment {
  title: string;
  timestamp: string;
  timestampSeconds: number;
  concepts: string[];
  questions: Question[];
}

interface CourseData {
  title: string;
  description: string;
  duration: string;
  videoId: string;
  segments: Segment[];
}

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number) => void;
}

// YouTube Player API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: any) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function CoursePreviewPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, supabase } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video player state
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Question state
  const [showQuestion, setShowQuestion] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [skippedQuestions, setSkippedQuestions] = useState<Set<string>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState<number>(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [questionResults, setQuestionResults] = useState<Record<string, boolean>>({}); // Track right/wrong
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set()); // Track which explanations are shown
  
  // Free segments limit (first 2 segments with questions)
  const FREE_SEGMENTS_LIMIT = 2;
  const FREE_QUESTIONS_LIMIT = 3; // Total questions across free segments

  // Convert timestamp string to seconds
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  };

  const initializePlayer = () => {
    console.log('Initializing player - YT available:', !!window.YT, 'videoId:', courseData?.videoId);
    if (!window.YT || !courseData?.videoId) {
      console.log('Cannot initialize - missing YT or videoId');
      return;
    }

    // Check if the element exists
    const element = document.getElementById('youtube-player');
    if (!element) {
      console.error('YouTube player element not found');
      return;
    }

    console.log('Creating YouTube player with videoId:', courseData.videoId);
    const newPlayer = new window.YT.Player('youtube-player', {
      videoId: courseData.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 0,
        enablejsapi: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: (event: any) => {
          console.log('Player ready');
          setPlayer(event.target);
          playerRef.current = event.target;
          setIsVideoReady(true);
          setDuration(event.target.getDuration());
        },
        onStateChange: (event: any) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            startTimeTracking();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
            stopTimeTracking();
          }
        },
      },
    });
  };

  const startTimeTracking = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        const totalDuration = playerRef.current.getDuration();
        setCurrentTime(time);
        setDuration(totalDuration);
      }
    }, 100); // Check every 100ms for smooth question timing
  };

  const stopTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkForQuestions = () => {
    if (!courseData || showQuestion || !playerRef.current) return;

    // Don't show questions in the first 10 seconds to let the video start
    if (currentTime < 10) return;

    // Check each individual question's timestamp
    courseData.segments.forEach((segment, segmentIndex) => {
      segment.questions.forEach((question, questionIndex) => {
        // Create a unique identifier for this question
        const questionId = `${segmentIndex}-${questionIndex}`;
        
        // Check if we're within 0.5 seconds of this question's timestamp
        // and haven't answered it yet
        if (Math.abs(currentTime - question.timestamp) < 0.5 && !answeredQuestions.has(questionId)) {
          console.log('🎯 Triggering question:', {
            questionId,
            type: question.type,
            timestamp: question.timestamp,
            currentTime,
            hasVisualData: !!(question.bounding_boxes?.length || question.matching_pairs?.length),
            requiresVideoOverlay: question.requires_video_overlay
          });
          
          // Pause the video and show this specific question
          playerRef.current?.pauseVideo();
          setCurrentSegmentIndex(segmentIndex);
          setCurrentQuestionIndex(questionIndex);
          setShowQuestion(true);
        }
      });
    });
  };

  const fetchCourse = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Fetching course with id:', id);
      
      // Fetch course data
      const courseResponse = await fetch(`/api/course/${id}`);
      const courseData = await courseResponse.json();
      console.log('Course data:', courseData);

      if (!courseData.success) {
        setError(courseData.error || 'Failed to fetch course');
        return;
      }

      setCourse(courseData.course);
      const videoId = extractVideoId(courseData.course.youtube_url);

      // Fetch real questions from the API
      const questionsResponse = await fetch(`/api/course/${id}/questions`);
      const questionsData = await questionsResponse.json();
      console.log('Questions data:', questionsData);

      if (questionsData.success && questionsData.questions.length > 0) {
        // Filter out questions with null options (except visual questions)
        const validQuestions = questionsData.questions.filter((q: any) => 
          q.options !== null || q.type === 'hotspot' || q.type === 'matching' || q.type === 'sequencing'
        );
        
        // Enhanced function to handle true/false questions
        const processQuestionOptions = (question: any): any => {
          let options = question.options || [];
          
          // For true/false questions, ensure we have the correct options
          if ((!options || options.length === 0) && (question.type === 'true-false' || question.type === 'true_false')) {
            options = ['True', 'False'];
          }
          
          return {
            ...question,
            options: options
          };
        };
        
        // Group questions into segments based on timestamp ranges
        const segments: any[] = [];
        const sortedQuestions = validQuestions.sort((a: any, b: any) => a.timestamp - b.timestamp);
        
        let currentSegment: any = {
          title: "Introduction",
          timestamp: formatTimestamp(0),
          timestampSeconds: 0,
          concepts: [],
          questions: []
        };
        
        sortedQuestions.forEach((q: any, index: number) => {
          // Create new segment every 3-4 questions or significant time gap (> 5 minutes)
          if (index > 0 && (index % 3 === 0 || q.timestamp - sortedQuestions[index - 1].timestamp > 300)) {
            if (currentSegment.questions.length > 0) {
              segments.push(currentSegment);
            }
            currentSegment = {
              title: `Section ${segments.length + 1}`,
              timestamp: formatTimestamp(q.timestamp),
              timestampSeconds: q.timestamp,
              concepts: [],
              questions: []
            };
          }
          
          // Process question and add to current segment
          const processedQuestion = processQuestionOptions(q);
          currentSegment.questions.push({
            id: processedQuestion.id || `question-${index}`,
            question: processedQuestion.question,
            type: processedQuestion.type || 'multiple-choice',
            options: processedQuestion.options, // Now properly handled for true/false
            correct: parseInt(processedQuestion.correct_answer) || 0,
            correct_answer: parseInt(processedQuestion.correct_answer) || 0,
            explanation: processedQuestion.explanation,
            timestamp: processedQuestion.timestamp,
            visual_context: processedQuestion.visual_context,
            frame_timestamp: processedQuestion.frame_timestamp,
            bounding_boxes: processedQuestion.bounding_boxes || [],
            detected_objects: processedQuestion.detected_objects || [],
            target_objects: processedQuestion.target_objects || [],
            matching_pairs: processedQuestion.matching_pairs || [],
            sequence_items: processedQuestion.sequence_items || [],
            requires_video_overlay: processedQuestion.requires_video_overlay || false,
            video_overlay: processedQuestion.video_overlay || false,
            bounding_box_count: processedQuestion.bounding_box_count || 0
          });
          
          // Extract concepts from visual context if available
          if (processedQuestion.visual_context && currentSegment.concepts.length < 3) {
            const concept = processedQuestion.visual_context.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '').trim();
            if (concept && !currentSegment.concepts.includes(concept)) {
              currentSegment.concepts.push(concept);
            }
          }
        });
        
        // Add the last segment
        if (currentSegment.questions.length > 0) {
          segments.push(currentSegment);
        }
        
        // Update segment titles based on content
        segments.forEach((segment, index) => {
          if (index === 0) {
            segment.title = "Introduction to Vectors";
          } else if (segment.questions.some((q: any) => q.question.toLowerCase().includes('scalar'))) {
            segment.title = "Scalars vs Vectors";
          } else if (segment.questions.some((q: any) => q.question.toLowerCase().includes('coordinate'))) {
            segment.title = "Coordinate Systems";
          } else if (segment.questions.some((q: any) => q.question.toLowerCase().includes('tensor'))) {
            segment.title = "Tensors and Applications";
          }
        });
        
        // Debug visual questions
        const allProcessedQuestions = segments.flatMap(s => s.questions);
        const visualQuestions = allProcessedQuestions.filter(q => 
          q.type === 'hotspot' || q.type === 'matching' || q.type === 'sequencing' || q.requires_video_overlay
        );
        console.log('🎬 Preview page - processed visual questions:', visualQuestions.length);
        if (visualQuestions.length > 0) {
          console.log('🖼️ Sample visual question:', visualQuestions[0]);
        }
        
        setCourseData({
          title: courseData.course.title,
          description: courseData.course.description,
          duration: "Variable", // Duration depends on video
          videoId: videoId,
          segments: segments
        });
      } else {
        // Fallback if no questions found
        setCourseData({
          title: courseData.course.title,
          description: courseData.course.description,
          duration: "Variable",
          videoId: videoId,
          segments: []
        });
      }

    } catch (err) {
      setError('Error loading course');
      console.error('Error fetching course:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to format timestamp
  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Adjust question timestamps that are too close to the video end
  const adjustEndOfVideoQuestions = (courseData: CourseData, videoDuration: number): CourseData => {
    const END_BUFFER_SECONDS = 5; // Move questions this many seconds before the end
    const adjustedSegments = courseData.segments.map(segment => ({
      ...segment,
      questions: segment.questions.map(question => {
        // Check if question is within the last 5 seconds of the video
        if (question.timestamp > videoDuration - END_BUFFER_SECONDS) {
          const originalTimestamp = question.timestamp;
          const adjustedTimestamp = Math.max(
            videoDuration - END_BUFFER_SECONDS,
            question.timestamp - END_BUFFER_SECONDS
          );
          
          console.log(`⏰ Adjusting end-of-video question: ${originalTimestamp}s → ${adjustedTimestamp}s (video ends at ${videoDuration}s)`);
          
          return {
            ...question,
            timestamp: adjustedTimestamp,
            frame_timestamp: question.frame_timestamp && question.frame_timestamp > videoDuration - END_BUFFER_SECONDS 
              ? adjustedTimestamp - 2 
              : question.frame_timestamp
          };
        }
        return question;
      })
    }));

    return {
      ...courseData,
      segments: adjustedSegments
    };
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

  const handleContinue = () => {
    if (currentSegmentIndex === null || currentQuestionIndex === null) return;

    // Mark this specific question as answered
    const questionId = `${currentSegmentIndex}-${currentQuestionIndex}`;
    setAnsweredQuestions(new Set(Array.from(answeredQuestions).concat(questionId)));
    
    // Check if this is beyond the free limit
    const totalAnsweredQuestions = answeredQuestions.size + 1;
    if (totalAnsweredQuestions >= FREE_QUESTIONS_LIMIT) {
      setShowLoginModal(true);
      return;
    }
    
    // Reset question state
    setShowQuestion(false);
    
    // Resume video
    playerRef.current?.playVideo();
  };

  const handleLogin = () => {
    localStorage.setItem('courseProgress', JSON.stringify({
      courseId: id,
      currentTime,
      answeredQuestions: Array.from(answeredQuestions),
      correctAnswers
    }));
    
    router.push(`/login?returnUrl=/course/${id}`);
  };

  const handleSignup = () => {
    localStorage.setItem('courseProgress', JSON.stringify({
      courseId: id,
      currentTime,
      answeredQuestions: Array.from(answeredQuestions),
      correctAnswers
    }));
    
    router.push(`/signup?returnUrl=/course/${id}`);
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const handleVideoSeek = async (seekTime: number) => {
    if (!playerRef.current || !courseData) return;

    // Find all questions between current time and seek time
    const questionsInRange = courseData.segments.flatMap((segment, segmentIndex) =>
      segment.questions
        .map((question, questionIndex) => ({
          ...question,
          segmentIndex,
          questionIndex,
          questionId: `${segmentIndex}-${questionIndex}`
        }))
        .filter(q => {
          if (seekTime > currentTime) {
            // Seeking forward - find unanswered questions we're skipping
            return q.timestamp > currentTime && q.timestamp <= seekTime && !answeredQuestions.has(q.questionId);
          } else {
            // Seeking backward - no need to mark questions
            return false;
          }
        })
    );

    // Mark skipped questions
    if (questionsInRange.length > 0) {
      console.log(`⏩ Skipping ${questionsInRange.length} questions`);
      
      const newSkippedQuestions = new Set(skippedQuestions);
      for (const question of questionsInRange) {
        newSkippedQuestions.add(question.questionId);
        
        // Track as incorrect for progress if user is authenticated
        if (user && supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await fetch('/api/user/progress', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                  courseId: id,
                  segmentIndex: question.segmentIndex,
                  segmentTitle: `Segment ${question.segmentIndex + 1}`,
                  questionId: question.id,
                  selectedAnswer: -1, // Indicate skipped
                  isCorrect: false,
                  timeSpent: 0,
                  explanationViewed: false
                })
              });
            }
          } catch (error) {
            console.error('Failed to track skipped question:', error);
          }
        }
      }
      setSkippedQuestions(newSkippedQuestions);
    }

    // Seek the video
    playerRef.current.seekTo(seekTime);
    setCurrentTime(seekTime);
  };

  // useEffect hooks after all function definitions
  useEffect(() => {
    console.log('Preview page - id:', id, 'router ready:', router.isReady);
    if (id && router.isReady) {
      fetchCourse();
    }
  }, [id, router.isReady]);

  useEffect(() => {
    // Load YouTube iframe API
    if (!window.YT) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);

      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API loaded');
        // Try to initialize player if we already have video ID
        if (courseData?.videoId && !player) {
          setTimeout(() => {
            initializePlayer();
          }, 100);
        }
      };
    } else if (courseData?.videoId && !player) {
      // If YT API is already loaded, initialize immediately
      setTimeout(() => {
        initializePlayer();
      }, 100);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [courseData?.videoId]);

  useEffect(() => {
    if (player && courseData) {
      checkForQuestions();
    }
  }, [currentTime, courseData, answeredQuestions]);

  // Adjust question timestamps when video duration becomes available
  useEffect(() => {
    if (courseData && duration > 0 && isVideoReady) {
      // Check if any questions need adjustment
      const hasEndOfVideoQuestions = courseData.segments.some(segment =>
        segment.questions.some(question => question.timestamp > duration - 5)
      );
      
      if (hasEndOfVideoQuestions) {
        console.log(`🎬 Video duration: ${duration}s - checking for end-of-video questions...`);
        const adjustedCourseData = adjustEndOfVideoQuestions(courseData, duration);
        
        // Only update if adjustments were made
        const questionsAdjusted = JSON.stringify(adjustedCourseData) !== JSON.stringify(courseData);
        if (questionsAdjusted) {
          console.log('⏰ Applied timestamp adjustments for end-of-video questions');
          setCourseData(adjustedCourseData);
        }
      }
    }
  }, [courseData, duration, isVideoReady]);

  // Get all questions for progress calculation
  const getAllQuestions = () => {
    if (!courseData) return [];
    return courseData.segments.flatMap(segment => segment.questions);
  };

  const allQuestions = getAllQuestions();
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Show loading state while router is preparing or data is loading
  if (!router.isReady || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <div className="text-center space-y-4">
              <Skeleton className="h-12 w-3/4 mx-auto" />
              <Skeleton className="h-6 w-1/2 mx-auto" />
            </div>
            
            <Card>
              <CardContent className="p-6">
                <Skeleton className="aspect-video w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !course || !courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <Alert variant="destructive">
              <AlertDescription>{error || 'Course not found'}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Back Button */}
          <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          {/* Course Header */}
          <div className="text-center space-y-4">
            <Badge 
              className="mb-2"
              style={{ backgroundColor: '#F5F3FF', color: '#8B5CF6' }}
            >
              Free Preview - First {FREE_QUESTIONS_LIMIT} Interactive Questions
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              {courseData.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {courseData.description}
            </p>
            
            {/* Course Stats */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {allQuestions.length} Questions
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {correctAnswers}/{answeredQuestions.size} Correct
              </div>
              {duration > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTimestamp(duration)}
                </div>
              )}
            </div>
          </div>

          {/* Video Player */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Interactive Video Course
              </CardTitle>
              <CardDescription>
                Watch the video and answer questions as they appear
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <div id="youtube-player" className="w-full h-full" />
              </div>
              
              {/* Interactive Progress Bar */}
              {isVideoReady && duration > 0 && (
                <VideoProgressBar
                  currentTime={currentTime}
                  duration={duration}
                  onSeek={handleVideoSeek}
                  questions={courseData.segments.flatMap((segment, segmentIndex) => 
                    segment.questions.map((question, questionIndex) => ({
                      ...question,
                      id: `${segmentIndex}-${questionIndex}`
                    }))
                  )}
                  answeredQuestions={answeredQuestions}
                  formatTimestamp={formatTimestamp}
                  className="px-2"
                />
              )}

              {/* External Link */}
              <div className="flex justify-center">
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

          {/* Progress Summary */}
          {allQuestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Learning Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {answeredQuestions.size}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Questions Answered
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {correctAnswers}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Correct Answers
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {answeredQuestions.size > 0 ? Math.round((correctAnswers / answeredQuestions.size) * 100) : 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Accuracy
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Curriculum Card */}
          <CourseCurriculumCard
            courseData={courseData}
            answeredQuestions={answeredQuestions}
            questionResults={questionResults}
            expandedExplanations={expandedExplanations}
            setExpandedExplanations={setExpandedExplanations}
            setShowLoginModal={setShowLoginModal}
            freeQuestionsLimit={FREE_QUESTIONS_LIMIT}
            formatTimestamp={formatTimestamp}
          />
        </div>
      </div>

      {/* Question Overlay */}
      {showQuestion && currentSegmentIndex !== null && (
        <QuestionOverlay
          question={courseData.segments[currentSegmentIndex].questions[currentQuestionIndex]}
          onAnswer={(correct) => {
            const questionId = `${currentSegmentIndex}-${currentQuestionIndex}`;
            setQuestionResults(prev => ({ ...prev, [questionId]: correct }));
            if (correct) {
              setCorrectAnswers(correctAnswers + 1);
            }
          }}
          onContinue={handleContinue}
          isVisible={showQuestion}
          player={player}
          courseId={id as string}
          segmentIndex={currentSegmentIndex}
        />
      )}

      {/* Login Modal */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ready to Continue Learning?</DialogTitle>
            <DialogDescription>
              You've completed the free preview! Sign up or log in to:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 my-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Access all course segments</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Track your complete progress</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Get personalized recommendations</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Earn certificates</span>
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={handleSignup}
              className="w-full"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              Sign Up Free
            </Button>
            <Button 
              onClick={handleLogin}
              variant="outline"
              className="w-full"
            >
              I Already Have an Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}