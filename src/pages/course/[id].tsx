import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, BookOpen, Clock, Users, CheckCircle, ExternalLink, Pause } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import Header from '@/components/Header';
import QuestionOverlay from '@/components/QuestionOverlay';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
}

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[] | string; // Can be array or JSON string
  correct_answer: number; // Index for multiple choice, 1/0 for true/false
  explanation: string;
  timestamp: number;
  visual_context?: string;
  frame_timestamp?: number; // For video overlay timing
  bounding_boxes?: any[];
  detected_objects?: any[];
  matching_pairs?: any[];
  requires_video_overlay?: boolean;
  video_overlay?: boolean;
  bounding_box_count?: number;
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number) => void;
}

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

export default function CoursePage() {
  const router = useRouter();
  const { id } = router.query;
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string>('');
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isYTApiLoaded, setIsYTApiLoaded] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourse();
      fetchQuestions();
    }
  }, [id]);

  useEffect(() => {
    console.log('🔍 Checking YouTube API availability...');
    
    // Check if YT API is already loaded
    if (window.YT && window.YT.Player) {
      console.log('✅ YouTube API already loaded');
      setIsYTApiLoaded(true);
      return;
    }

    // Load YouTube iframe API if not already loaded
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      console.log('📥 Loading YouTube iframe API...');
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
    } else {
      console.log('📜 YouTube API script already exists');
    }

    // Set up the callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      console.log('✅ YouTube API loaded and ready');
      setIsYTApiLoaded(true);
    };

    // Fallback timeout in case API fails to load
    const timeout = setTimeout(() => {
      if (!isYTApiLoaded) {
        console.warn('⏰ YouTube API timeout - attempting fallback');
        // Check one more time if the API is actually available
        if (window.YT && window.YT.Player) {
          console.log('✅ YouTube API available after timeout check');
          setIsYTApiLoaded(true);
        } else {
          console.error('❌ YouTube API failed to load within timeout');
          setError('YouTube video player failed to load. Please try refreshing the page.');
        }
      }
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isYTApiLoaded]);

  useEffect(() => {
    console.log('🎯 Player initialization check:', {
      videoId: videoId,
      isYTApiLoaded: isYTApiLoaded,
      hasWindowYT: !!(window.YT && window.YT.Player),
      hasPlayer: !!player
    });
    
    if (videoId && isYTApiLoaded && window.YT && window.YT.Player && !player) {
      console.log('🚀 Attempting to initialize player...');
      // Add small delay to ensure DOM is ready
      const timer = setTimeout(() => {
      initializePlayer();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [videoId, isYTApiLoaded, player]);

  useEffect(() => {
    if (player && questions.length > 0) {
      checkForQuestions();
    }
  }, [currentTime, questions, currentQuestionIndex, answeredQuestions]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/course/${id}`);
      const data = await response.json();

      if (data.success) {
        setCourse(data.course);
        const extractedVideoId = extractVideoId(data.course.youtube_url);
        console.log('🎬 Course loaded:', {
          title: data.course.title,
          youtubeUrl: data.course.youtube_url,
          extractedVideoId: extractedVideoId
        });
        setVideoId(extractedVideoId);
      } else {
        setError(data.error || 'Failed to fetch course');
      }
    } catch (err) {
      setError('Error loading course');
      console.error('Error fetching course:', err);
    }
  };

  // Parse options - handle both array and JSON string formats
  const parseOptions = (options: string[] | string): string[] => {
    if (Array.isArray(options)) {
      return options;
    }
    
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        return Array.isArray(parsed) ? parsed : [options];
      } catch (e) {
        // If parsing fails, treat as a single option
        return [options];
      }
    }
    
    return [];
  };

  // Enhanced parseOptions function that handles true/false questions
  const parseOptionsWithTrueFalse = (options: string[] | string, questionType: string): string[] => {
    const parsedOptions = parseOptions(options);
    
    // For true/false questions, ensure we have the correct options
    if (parsedOptions.length === 0 && (questionType === 'true-false' || questionType === 'true_false')) {
      return ['True', 'False'];
    }
    
    return parsedOptions;
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/course/${id}/questions`);
      const data = await response.json();

      if (data.success) {
        // Parse options for each question to ensure they're arrays and correct_answer is a number
        const parsedQuestions = data.questions.map((q: any) => ({
          ...q,
          options: parseOptionsWithTrueFalse(q.options || [], q.type),
          correct_answer: parseInt(q.correct_answer) || 0
        }));
        
        console.log('📊 Questions fetched for course:', data.questions.length);
        console.log('🎯 Debug info:', data.debug);
        console.log('📝 Sample question data:', data.questions[0]);
        
        // Log visual questions specifically
        const visualQuestions = parsedQuestions.filter((q: Question) => q.type === 'hotspot' || q.type === 'matching' || q.requires_video_overlay);
        console.log('👁️ Visual questions found:', visualQuestions.length);
        if (visualQuestions.length > 0) {
          console.log('🖼️ First visual question:', visualQuestions[0]);
        }
        
        setQuestions(parsedQuestions);
      } else {
        console.error('Failed to fetch questions:', data.error);
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const initializePlayer = (retryCount = 0) => {
    console.log(`🎯 initializePlayer called (attempt ${retryCount + 1})`, {
      hasYT: !!window.YT,
      hasPlayer: !!(window.YT && window.YT.Player),
      videoId: videoId,
      domReady: document.readyState,
      elementExists: !!document.getElementById('youtube-player')
    });

    if (!window.YT || !window.YT.Player || !videoId) {
      console.warn('⚠️ YouTube API not ready or no video ID:', {
        hasYT: !!window.YT,
        hasPlayer: !!(window.YT && window.YT.Player),
        videoId: videoId
      });
      return;
    }

    // Check if the target element exists
    const targetElement = document.getElementById('youtube-player');
    if (!targetElement) {
      console.warn(`⚠️ YouTube player target element not found (attempt ${retryCount + 1})`);
      console.log('🔍 DOM elements check:', {
        bodyChildren: document.body.children.length,
        hasYouTubePlayer: !!document.getElementById('youtube-player'),
        allElementsWithId: Array.from(document.querySelectorAll('[id]')).map(el => el.id)
      });
      
      // Retry up to 5 times with increasing delays
      if (retryCount < 5) {
        setTimeout(() => {
          initializePlayer(retryCount + 1);
        }, 200 * (retryCount + 1)); // 200ms, 400ms, 600ms, 800ms, 1000ms
        return;
      } else {
        console.error('❌ YouTube player target element not found after 5 attempts');
        setError('Video player container not found after multiple attempts');
        return;
      }
    }

    try {
      console.log('🚀 Initializing YouTube player for video:', videoId);
      console.log('🎯 Target element found:', {
        id: targetElement.id,
        className: targetElement.className,
        clientWidth: targetElement.clientWidth,
        clientHeight: targetElement.clientHeight,
        style: targetElement.getAttribute('style')
      });

    const newPlayer = new window.YT.Player('youtube-player', {
      videoId: videoId,
        width: '100%',
        height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        disablekb: 0,
        enablejsapi: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
          origin: window.location.origin
      },
      events: {
        onReady: (event: any) => {
            console.log('✅ YouTube player ready');
          setPlayer(event.target);
          playerRef.current = event.target;
          setIsVideoReady(true);
          startTimeTracking();
        },
        onStateChange: (event: any) => {
            console.log('🎬 Player state changed:', event.data);
          if (event.data === window.YT.PlayerState.PLAYING) {
            startTimeTracking();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            stopTimeTracking();
          }
        },
          onError: (event: any) => {
            console.error('❌ YouTube player error:', event.data);
            const errorMessages = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video not allowed to be embedded',
              150: 'Video not allowed to be embedded'
            };
            const errorMessage = errorMessages[event.data as keyof typeof errorMessages] || 'Unknown video error';
            setError(`Video error: ${errorMessage}`);
          }
      },
    });
    } catch (error) {
      console.error('❌ Error initializing YouTube player:', error);
      setError('Failed to initialize video player');
    }
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
    if (showQuestion || questions.length === 0) return;

    const nextQuestion = questions.find((q, index) => {
      return !answeredQuestions.has(index) && currentTime >= q.timestamp;
    });

    if (nextQuestion) {
      const questionIndex = questions.indexOf(nextQuestion);
      setCurrentQuestionIndex(questionIndex);
      setShowQuestion(true);
      playerRef.current?.pauseVideo();
    }
  };

  const handleAnswer = (correct: boolean) => {
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }
  };

  const handleContinueVideo = () => {
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
    setShowQuestion(false);
    playerRef.current?.playVideo();
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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (isLoading) {
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

  if (error) {
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
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <Button variant="ghost" onClick={handleBackToHome} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            
            <Alert>
              <AlertDescription>Course not found or not available.</AlertDescription>
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
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              {course.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {course.description}
            </p>
            
            {/* Course Stats */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {questions.length} Questions
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {correctAnswers}/{questions.length} Correct
              </div>
              {duration > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {formatTime(duration)}
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
              <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                {!isYTApiLoaded && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading video player...</p>
                    </div>
                  </div>
                )}
                
                {/* Fallback iframe if API fails */}
                {error && videoId && (
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&enablejsapi=1&origin=${window.location.origin}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                  />
                )}
                
                {/* Main YouTube API player */}
                <div id="youtube-player" className="w-full h-full" style={{ display: error ? 'none' : 'block' }} />
              </div>
              
              {/* Progress Bar */}
              {isVideoReady && duration > 0 && (
                <div className="space-y-3 px-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  
                  {/* Progress bar with contained markers */}
                  <div className="relative">
                    <Progress value={progressPercentage} className="h-2" />
                    
                    {/* Question markers positioned relative to progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-2">
                      {questions.map((question, index) => {
                        const position = Math.min(Math.max((question.timestamp / duration) * 100, 0.5), 99.5);
                        const isAnswered = answeredQuestions.has(index);
                        return (
                          <div
                            key={index}
                            className={`absolute top-0 w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-0.5 border-2 border-background shadow-sm ${
                              isAnswered ? 'bg-green-500' : 'bg-primary'
                            }`}
                            style={{ left: `${position}%` }}
                            title={`Question at ${formatTime(question.timestamp)}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
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
          {questions.length > 0 && (
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
        </div>
      </div>

      {/* Question Overlay */}
      {showQuestion && questions[currentQuestionIndex] && (
        <QuestionOverlay
          question={questions[currentQuestionIndex]}
          onAnswer={handleAnswer}
          onContinue={handleContinueVideo}
          isVisible={showQuestion}
          player={player}
        />
      )}
    </div>
  );
} 