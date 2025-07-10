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
import CourseCurriculumCard from '@/components/CourseCurriculumCard';
import VideoProgressBar from '@/components/VideoProgressBar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  courseId?: string;
  questionsGenerated?: boolean;
  questions?: Question[];
  videoId?: string;
}

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[]; // Always an array of strings
  correct: number; // Index for multiple choice, 1/0 for true/false (alias for correct_answer)
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
  const { user, session } = useAuth();
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
  const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isYTApiLoaded, setIsYTApiLoaded] = useState(false);
  const [questionResults, setQuestionResults] = useState<Record<string, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [nextCourse, setNextCourse] = useState<Course | null>(null);
  const [showNextCourseModal, setShowNextCourseModal] = useState(false);
  const [isLoadingNextCourse, setIsLoadingNextCourse] = useState(false);
  const [nextCourseApiCalled, setNextCourseApiCalled] = useState(false); // Track if API was called
  const [isEnrolled, setIsEnrolled] = useState(false); // Track enrollment status
  const [autoGenerationTriggered, setAutoGenerationTriggered] = useState(false); // Track if auto-generation was triggered
  const [nextCourseModalShown, setNextCourseModalShown] = useState(false); // Track if modal has been shown

  // Free questions limit
  const FREE_QUESTIONS_LIMIT = 2;

  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTime = useRef<number | null>(null); // Track when question was shown

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

  // Adjust question timestamps when video duration becomes available
  useEffect(() => {
    if (questions.length > 0 && duration > 0 && isVideoReady) {
      // Check if any questions need adjustment
      const hasEndOfVideoQuestions = questions.some(question => question.timestamp > duration - 5);
      
      if (hasEndOfVideoQuestions) {
        console.log(`🎬 Video duration: ${duration}s - checking for end-of-video questions...`);
        const adjustedQuestions = adjustEndOfVideoQuestions(questions, duration);
        
        // Only update if adjustments were made
        const questionsAdjusted = JSON.stringify(adjustedQuestions) !== JSON.stringify(questions);
        if (questionsAdjusted) {
          console.log('⏰ Applied timestamp adjustments for end-of-video questions');
          setQuestions(adjustedQuestions);
        }
      }
    }
  }, [questions, duration, isVideoReady]);

  // Auto-generate next course when user reaches halfway point
  useEffect(() => {
    if (
      duration > 0 && 
      currentTime >= duration / 2 && 
      !autoGenerationTriggered &&
      !nextCourse && 
      !isLoadingNextCourse && 
      !nextCourseApiCalled
    ) {
      console.log('🚀 Auto-triggering next course generation at halfway point');
      setAutoGenerationTriggered(true);
      fetchNextCourse();
    }
  }, [currentTime, duration, autoGenerationTriggered, nextCourse, isLoadingNextCourse, nextCourseApiCalled]);

  // Show next course modal 3 seconds before video ends
  useEffect(() => {
    if (
      duration > 0 && 
      currentTime >= duration - 3 && 
      !nextCourseModalShown &&
      !showNextCourseModal
    ) {
      console.log('⏰ Showing next course modal 3 seconds before video ends');
      setNextCourseModalShown(true);
      setShowNextCourseModal(true);
    }
  }, [currentTime, duration, nextCourseModalShown, showNextCourseModal]);

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
          correct: parseInt(q.correct_answer) || 0,
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

  // Helper function to track course enrollment for logged-in users
  const trackCourseEnrollment = async (courseId: string): Promise<boolean> => {
    if (!user || isEnrolled) return isEnrolled; // Only track for logged-in users and if not already enrolled
    
    try {
      const response = await fetch('/api/user-course-enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          course_id: courseId,
        }),
      });

      if (!response.ok) {
        console.error('Failed to track course enrollment:', await response.text());
        return false;
      } else {
        const result = await response.json();
        console.log('Course enrollment tracked successfully:', result);
        setIsEnrolled(true);
        return true;
      }
    } catch (error) {
      console.error('Error tracking course enrollment:', error);
      return false;
    }
  };

  // Helper function to track question responses for logged-in users
  const trackQuestionResponse = async (questionId: string, selectedAnswer: string, isCorrect: boolean, questionType: string, responseTimeMs?: number) => {
    if (!user || !session || !id) return; // Only track for logged-in users with valid session
    
    try {
      // Ensure enrollment exists before tracking response
      const enrollmentSuccess = await trackCourseEnrollment(id as string);
      if (!enrollmentSuccess) {
        console.error('Failed to create/verify enrollment, skipping question response tracking');
        return;
      }

      const response = await fetch('/api/user-question-responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question_id: questionId,
          course_id: id,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          response_time_ms: responseTimeMs,
          question_type: questionType,
          timestamp: currentTime,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to track question response:', errorText);
      } else {
        const result = await response.json();
        console.log('Question response tracked successfully:', result);
      }
    } catch (error) {
      console.error('Error tracking question response:', error);
    }
  };

  const fetchNextCourse = async () => {
    // Prevent multiple API calls - check if already loaded, loading, or already called
    if (nextCourse || isLoadingNextCourse || nextCourseApiCalled) {
      console.log('📚 Next course already loaded, loading, or API already called, skipping fetch');
      return;
    }
    
    console.log('📚 Starting next course generation...');
    setIsLoadingNextCourse(true);
    setNextCourseApiCalled(true); // Mark API as called
    
    try {
      // Get wrong answers from questionResults
      const wrongAnswers = Object.entries(questionResults)
        .filter(([questionId, isCorrect]) => !isCorrect)
        .map(([questionId, isCorrect]) => {
          const questionIndex = parseInt(questionId.split('-')[1]);
          return questions[questionIndex];
        })
        .filter(question => question); // Filter out any undefined questions

      console.log('📊 Sending wrong answers to next course API:', wrongAnswers);

      const response = await fetch(`/api/get-next-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentCourseId: id,
          videoUrl: course?.youtube_url,
          wrongQuestions: wrongAnswers
        })
      });
      
      const data = await response.json();

      if (data.success) {
        console.log('📚 Next course generated with questions:', {
          courseId: data.courseId,
          title: data.nextCourse.title,
          hasQuestions: !!data.courseId
        });
        
        // Now fetch the actual course and questions from Supabase using the courseId
        try {
          // Fetch course data from database
          const courseResponse = await fetch(`/api/course/${data.courseId}`);
          const courseData = await courseResponse.json();
          
          if (courseData.success) {
            // Fetch questions for the course
            const questionsResponse = await fetch(`/api/course/${data.courseId}/questions`);
            const questionsData = await questionsResponse.json();
            
            if (questionsData.success) {
              // Parse questions like in the main fetchQuestions function
              const parsedQuestions = questionsData.questions.map((q: any) => ({
                ...q,
                options: parseOptionsWithTrueFalse(q.options || [], q.type),
                correct: parseInt(q.correct_answer) || 0,
                correct_answer: parseInt(q.correct_answer) || 0
              }));
              
              // Store the next course with database-fetched data
              setNextCourse({
                ...courseData.course,
                courseId: data.courseId,
                questionsGenerated: true,
                questions: parsedQuestions, // Add questions to next course
                videoId: extractVideoId(courseData.course.youtube_url)
              });
              
              console.log('✅ Next course data fetched from database:', {
                courseId: data.courseId,
                title: courseData.course.title,
                questionsCount: parsedQuestions.length
              });
            } else {
              console.error('Failed to fetch questions for next course:', questionsData.error);
              // Still set course without questions
              setNextCourse({
                ...courseData.course,
                courseId: data.courseId,
                questionsGenerated: false,
                questions: [],
                videoId: extractVideoId(courseData.course.youtube_url)
              });
            }
          } else {
            console.error('Failed to fetch next course from database:', courseData.error);
            // Fallback to the original course data from API
            setNextCourse({
              ...data.nextCourse,
              courseId: data.courseId,
              questionsGenerated: !!data.courseId
            });
          }
        } catch (fetchError) {
          console.error('Error fetching next course from database:', fetchError);
          // Fallback to the original course data from API
          setNextCourse({
            ...data.nextCourse,
            courseId: data.courseId,
            questionsGenerated: !!data.courseId
          });
        }
      } else {
        console.error('Failed to fetch next course:', data.error);
        // Reset API called state on error so it can be retried
        setNextCourseApiCalled(false);
      }
    } catch (err) {
      console.error('Error fetching next course:', err);
      // Reset API called state on error so it can be retried
      setNextCourseApiCalled(false);
    } finally {
      setIsLoadingNextCourse(false);
    }
  };

  // Helper function for debugging player state
  const getPlayerStateName = (state: number) => {
    const states: Record<number, string> = {
      [-1]: 'UNSTARTED',
      [0]: 'ENDED',
      [1]: 'PLAYING',
      [2]: 'PAUSED',
      [3]: 'BUFFERING',
      [5]: 'CUED'
    };
    return states[state] || `UNKNOWN(${state})`;
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
        onStateChange: async (event: any) => {
          console.log('🎬 Player state changed:', {
            stateCode: event.data,
            stateName: getPlayerStateName(event.data),
            YT_ENDED: window.YT?.PlayerState?.ENDED,
            nextCourse: !!nextCourse,
            isLoadingNextCourse: isLoadingNextCourse,
            showNextCourseModal: showNextCourseModal
          });
          
          if (event.data === window.YT.PlayerState.PLAYING) {
            startTimeTracking();
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            stopTimeTracking();
                  } else if (event.data === window.YT.PlayerState.ENDED || event.data === 0) {
          console.log('🏁 Video ended - stopping time tracking');
          stopTimeTracking();
          
          // Modal should already be shown 3 seconds before the end
          // This is just a fallback in case the modal wasn't shown for some reason
          if (!nextCourseModalShown) {
            console.log('⚠️ Fallback: Showing next course modal at video end');
            setNextCourseModalShown(true);
            setShowNextCourseModal(true);
          }
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
      questionStartTime.current = Date.now(); // Track when question was shown
      // Don't pause video since question is now inline
      
      // Track enrollment when user first interacts with a question (fire and forget)
      if (id && typeof id === 'string') {
        trackCourseEnrollment(id).catch(error => {
          console.error('Error tracking enrollment in checkForQuestions:', error);
        });
      }
    }
  };

  const handleAnswer = (correct: boolean, selectedAnswer?: string) => {
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
    }
    
    // Track question results for curriculum card
    const questionId = `0-${currentQuestionIndex}`; // Using segment 0 since we're flattening
    setQuestionResults(prev => ({ ...prev, [questionId]: correct }));
    
    // Track question response for logged-in users
    if (questions[currentQuestionIndex] && id && typeof id === 'string') {
      const question = questions[currentQuestionIndex];
      const responseTimeMs = questionStartTime.current ? Date.now() - questionStartTime.current : undefined;
      const answer = selectedAnswer || (correct ? 'correct' : 'incorrect'); // Fallback if selectedAnswer not provided
      
      trackQuestionResponse(
        question.id,
        answer,
        correct,
        question.type,
        responseTimeMs
      );
    }
  };

  const handleContinueVideo = () => {
    setAnsweredQuestions(prev => new Set(prev).add(currentQuestionIndex));
    setShowQuestion(false);
    // No need to resume video since it wasn't paused
  };

  const handleVideoSeek = async (seekTime: number) => {
    if (!playerRef.current || !questions) return;

    // Find all questions between current time and seek time
    const questionsInRange = questions
      .map((question, index) => ({ ...question, index }))
      .filter(q => {
        if (seekTime > currentTime) {
          // Seeking forward - find unanswered questions we're skipping
          return q.timestamp > currentTime && q.timestamp <= seekTime && !answeredQuestions.has(q.index);
        } else {
          // Seeking backward - no need to mark questions
          return false;
        }
      });

    // Mark skipped questions
    if (questionsInRange.length > 0) {
      console.log(`⏩ Skipping ${questionsInRange.length} questions`);
      
      const newSkippedQuestions = new Set(skippedQuestions);
      for (const question of questionsInRange) {
        newSkippedQuestions.add(question.index);
        
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
                  segmentIndex: 0, // In this simpler structure, we don't have segments
                  segmentTitle: 'Main',
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

  // Adjust question timestamps that are too close to the video end
  const adjustEndOfVideoQuestions = (questions: Question[], videoDuration: number): Question[] => {
    const END_BUFFER_SECONDS = 5; // Move questions this many seconds before the end
    
    return questions.map(question => {
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
    });
  };

  const handleBackToHome = () => {
    router.push('/');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTimestamp = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert questions to courseData format for curriculum card
  const getCourseData = (): CourseData => {
    if (!course || questions.length === 0) {
      return {
        title: course?.title || '',
        description: course?.description || '',
        duration: duration > 0 ? formatTime(duration) : 'Variable',
        videoId: videoId,
        segments: []
      };
    }

    // Group questions into a single segment for simplicity
    const segment: Segment = {
      title: "Course Content",
      timestamp: "00:00",
      timestampSeconds: 0,
      concepts: [],
      questions: questions // Questions are already properly formatted from fetchQuestions
    };

    return {
      title: course.title,
      description: course.description,
      duration: duration > 0 ? formatTime(duration) : 'Variable',
      videoId: videoId,
      segments: [segment]
    };
  };

  // Convert answeredQuestions Set<number> to Set<string> format expected by curriculum card
  const getAnsweredQuestionsForCurriculum = (): Set<string> => {
    return new Set(Array.from(answeredQuestions).map(index => `0-${index}`));
  };

  const handleLoginRedirect = () => {
    // Save progress before redirecting
    localStorage.setItem('courseProgress', JSON.stringify({
      courseId: id,
      currentTime,
      answeredQuestions: Array.from(answeredQuestions),
      correctAnswers
    }));
    
    router.push(`/login?returnUrl=/course/${id}`);
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
                  
                  {/* Interactive Progress Bar */}
                  <VideoProgressBar
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleVideoSeek}
                    questions={questions.map((question, index) => ({
                      ...question,
                      id: `0-${index}` // Simple ID for single segment structure
                    }))}
                    answeredQuestions={new Set(
                      Array.from(answeredQuestions).map(index => `0-${index}`)
                    )}
                    formatTimestamp={formatTime}
                    className=""
                  />
                </div>
              )}

              {/* External Links */}
              <div className="flex justify-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(course.youtube_url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Watch on YouTube
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchNextCourse}
                  disabled={isLoadingNextCourse || !!nextCourse || nextCourseApiCalled}
                >
                  {isLoadingNextCourse ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  ) : (
                    <BookOpen className="mr-2 h-4 w-4" />
                  )}
                  {nextCourse ? 'Next Course Ready' : isLoadingNextCourse ? 'Generating...' : nextCourseApiCalled ? 'Generating...' : 'Generate Next Course'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Progress Summary or Question */}
          {questions.length > 0 && (
            <>
              {showQuestion && questions[currentQuestionIndex] ? (
                <QuestionOverlay
                  question={questions[currentQuestionIndex]}
                  onAnswer={handleAnswer}
                  onContinue={handleContinueVideo}
                  isVisible={showQuestion}
                  player={player}
                  courseId={id as string}
                  segmentIndex={0}
                  isInline={true}
                />
              ) : (
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
            </>
          )}

          {/* Course Curriculum Card */}
          <CourseCurriculumCard
            courseData={getCourseData()}
            answeredQuestions={getAnsweredQuestionsForCurriculum()}
            questionResults={questionResults}
            expandedExplanations={expandedExplanations}
            setExpandedExplanations={setExpandedExplanations}
            setShowLoginModal={setShowLoginModal}
            freeQuestionsLimit={FREE_QUESTIONS_LIMIT}
            formatTimestamp={formatTimestamp}
          />
        </div>
      </div>



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
              onClick={handleLoginRedirect}
              className="w-full"
              style={{ backgroundColor: '#8B5CF6' }}
            >
              Sign Up Free
            </Button>
            <Button 
              onClick={handleLoginRedirect}
              variant="outline"
              className="w-full"
            >
              I Already Have an Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next Course Modal */}
      <Dialog open={showNextCourseModal} onOpenChange={setShowNextCourseModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🎉 Course Complete!</DialogTitle>
            <DialogDescription>
              Great job finishing this course! Ready to continue learning?
            </DialogDescription>
          </DialogHeader>
          {nextCourse ? (
            <div className="space-y-4 my-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm mb-1">Up Next:</h3>
                <h4 className="font-medium">{nextCourse.title}</h4>
                <p className="text-sm text-muted-foreground mt-2">{nextCourse.description}</p>
                {nextCourse.questionsGenerated && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    Interactive questions generated
                  </div>
                )}
              </div>
            </div>
          ) : isLoadingNextCourse ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted-foreground">Generating next course...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <span className="text-muted-foreground">No next course available</span>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button 
              onClick={() => {
                if (nextCourse) {
                  console.log('📚 Navigating to next course:', {
                    courseId: nextCourse.id,
                    title: nextCourse.title,
                    questionsGenerated: nextCourse.questionsGenerated,
                    nextCourse: nextCourse
                  });
                  
                  // Close modal before navigation
                  setShowNextCourseModal(false);
                  
                  // Force full page reload to ensure fresh state
                  window.location.href = `/course/${nextCourse.id}`;
                }
              }}
              className="w-full"
              disabled={!nextCourse || isLoadingNextCourse}
              style={{ backgroundColor: '#8B5CF6' }}
            >
              {isLoadingNextCourse ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Course...
                </>
              ) : (
                'Start Next Course'
              )}
            </Button>
            <Button 
              onClick={() => setShowNextCourseModal(false)}
              variant="outline"
              className="w-full"
            >
              Stay Here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 