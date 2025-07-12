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
import TranscriptDisplay from '@/components/TranscriptDisplay';
import InteractiveVideoPlayer from '@/components/InteractiveVideoPlayer';
import { RatingModal, CompactStarRating } from '@/components/StarRating';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { supabase } from '@/lib/supabase';
import { useGuidedTour } from '@/hooks/useGuidedTour';
import { learnerTourSteps } from '@/config/tours';
import ChatBubble from '@/components/ChatBubble';
import { useToast } from '@/components/ui/use-toast';

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
 averageRating?: number;
 totalRatings?: number;
 topic?: string;
 // Segmentation fields
 is_segmented?: boolean;
 total_segments?: number;
 segment_duration?: number;
 // Enhanced recommendation fields
 reasons?: string[];
 difficulty_match?: 'too_easy' | 'perfect' | 'challenging' | 'too_hard';
 addresses_mistakes?: string[];
 thumbnail_url?: string;
 channel_name?: string;
 duration?: string;
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
 segment_index?: number; // Which segment this question belongs to
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

export default function CoursePage() {
 const router = useRouter();
 const { id } = router.query;
 const { user, session } = useAuth();
 const { trackRating, trackCourse, trackRatingModalShown, trackRatingModalDismissed, trackEngagement, getPlatform } = useAnalytics();
 const { toast } = useToast();
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
 const [isProcessing, setIsProcessing] = useState(false); // Track if course is still processing
 
 // Segment processing state
 const [segments, setSegments] = useState<any[]>([]);
 const [completedSegments, setCompletedSegments] = useState(0);
 const [totalSegments, setTotalSegments] = useState(0);
 const [isSegmented, setIsSegmented] = useState(false);
 const [segmentQuestionCounts, setSegmentQuestionCounts] = useState<Record<number, { planned: number; generated: number }>>({});
 
 // Rating state
 const [showRatingModal, setShowRatingModal] = useState(false);
 const [hasRated, setHasRated] = useState(false);
 const [engagementScore, setEngagementScore] = useState(0);
 const [courseStartTime] = useState(Date.now());
 
 // Guided tour state
 const [shouldRunTour, setShouldRunTour] = useState(false);
 const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);

 // Free questions limit
 const FREE_QUESTIONS_LIMIT = 2;

 const playerRef = useRef<YTPlayer | null>(null);
 const intervalRef = useRef<NodeJS.Timeout | null>(null);
 const questionStartTime = useRef<number | null>(null); // Track when question was shown

 useEffect(() => {
   if (id) {
     fetchCourse();
   }
 }, [id]);
 
 // Check if user has completed onboarding and show tour if needed
 useEffect(() => {
   const checkOnboarding = async () => {
     if (!user || hasCheckedOnboarding || !isVideoReady) return;
     
     try {
       const response = await fetch(`/api/user/check-onboarding?user_id=${user.id}`);
       const data = await response.json();
       
       if (!data.onboarding_completed) {
         setShouldRunTour(true);
       }
       setHasCheckedOnboarding(true);
     } catch (error) {
       console.error('Error checking onboarding status:', error);
       setHasCheckedOnboarding(true);
     }
   };
   
   checkOnboarding();
 }, [user, hasCheckedOnboarding, isVideoReady]);
 
 // Initialize guided tour for learner journey
 useGuidedTour('learner', learnerTourSteps, shouldRunTour, {
   delay: 2000, // Wait for video to load
   onComplete: async () => {
     setShouldRunTour(false);
     // Update onboarding status in database
     if (user) {
       try {
         await fetch('/api/user/update-onboarding', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             user_id: user.id,
             onboarding_completed: true
           }),
         });
       } catch (error) {
         console.error('Error updating onboarding status:', error);
       }
     }
   }
 });

 // Subscribe to segment updates and individual question inserts for real-time updates
 useEffect(() => {
   // Keep subscription active while processing OR if we don't have questions yet
   const needsSubscription = isProcessing || (course && !course.published && questions.length === 0);
  
   console.log('🔍 Real-time subscription check:', {
     id,
     isProcessing,
     coursePublished: course?.published,
     questionCount: questions.length,
     needsSubscription
   });
  
   if (!id || !needsSubscription) {
     console.log('📡 Skipping real-time subscription setup');
     return;
   }

   console.log('🔄 Setting up real-time subscriptions for live question generation');
   
   // Immediately fetch current segment status when subscription is set up
   if (isSegmented) {
     console.log('📋 Fetching initial segment questions');
     fetchSegmentQuestions();
   } else {
     console.log('📋 Fetching initial questions for non-segmented course');
     fetchQuestions();
   }
   
   // Subscribe to segment updates
   const segmentChannel = supabase
     .channel(`course_segments_${id}`)
     .on(
       'postgres_changes',
       {
         event: 'UPDATE',
         schema: 'public',
         table: 'course_segments',
         filter: `course_id=eq.${id}`
       },
       (payload) => {
         console.log('📊 Segment update received:', payload);
         const updatedSegment = payload.new as any;
         
         // Update segment question counts
         if (updatedSegment.planned_questions_count > 0) {
           setSegmentQuestionCounts(prev => ({
             ...prev,
             [updatedSegment.segment_index]: {
               planned: updatedSegment.planned_questions_count || 0,
               generated: updatedSegment.questions_count || 0
             }
           }));
         }
         
         if (updatedSegment.status === 'completed' || updatedSegment.status === 'planning_complete') {
           console.log(`✅ Segment ${updatedSegment.segment_index + 1} planning complete with ${updatedSegment.planned_questions_count} questions planned`);
           
           // Fetch updated questions from completed segments
           fetchSegmentQuestions();
          
          // Check if all segments are completed
          if (updatedSegment.segment_index === totalSegments - 1 && updatedSegment.status === 'completed') {
            console.log('🎉 All segments completed! Course should be published soon.');
            // The backend will automatically publish the course
            // We'll receive the update via the check-and-publish edge function
            setTimeout(() => {
              // Call check-and-publish once to trigger the backend check
              fetch('/api/course/check-and-publish', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ course_id: id })
              }).then(response => response.json())
                .then(data => {
                  if (data.published) {
                    console.log('✅ Course has been published!');
                    setCourse(prev => prev ? { ...prev, published: true } : null);
                    setIsProcessing(false);
                  }
                }).catch(error => {
                  console.error('Error checking course publish status:', error);
                });
            }, 5000); // Wait 5 seconds to ensure all questions are saved
          }
         } else if (updatedSegment.status === 'processing') {
           console.log(`⏳ Segment ${updatedSegment.segment_index + 1} is processing`);
         } else if (updatedSegment.status === 'failed') {
           console.log(`❌ Segment ${updatedSegment.segment_index + 1} failed: ${updatedSegment.error_message}`);
         }
       }
     );
     
   // Subscribe to individual question insertions for live updates
   const questionChannel = supabase
     .channel(`questions_${id}`)
     .on(
       'postgres_changes',
       {
         event: 'INSERT',
         schema: 'public',
         table: 'questions',
         filter: `course_id=eq.${id}`
       },
       (payload) => {
         console.log('📝 New question received via real-time:', payload);
         console.log('📝 Question details:', {
           courseId: payload.new.course_id,
           expectedCourseId: id,
           match: payload.new.course_id === id
         });
         const newQuestion = payload.new as any;
         
         // Parse and add the new question immediately
         const parsedQuestion = {
           ...newQuestion,
           options: parseOptionsWithTrueFalse(newQuestion.options || [], newQuestion.type),
           correct: parseInt(newQuestion.correct_answer) || 0,
           correct_answer: parseInt(newQuestion.correct_answer) || 0
         };
         
         setQuestions(prev => {
           // Check if question already exists
           if (prev.find(q => q.id === newQuestion.id)) {
             console.log('Question already exists, skipping');
             return prev;
           }
           
           console.log(`✅ Adding new question to UI: ${parsedQuestion.question.substring(0, 50)}...`);
           
           // Add new question and sort by timestamp
           const updated = [...prev, parsedQuestion];
           
           // Show toast notification for new question
           toast({
             title: "New question ready! 🎯",
             description: `Segment ${(newQuestion.segment_index || 0) + 1}: "${parsedQuestion.question.substring(0, 50)}..."`,
             duration: 3000,
           });
           
           return updated.sort((a, b) => a.timestamp - b.timestamp);
         });
         
         // Update segment question counts
         if (newQuestion.segment_index !== undefined) {
           setSegmentQuestionCounts(prev => ({
             ...prev,
             [newQuestion.segment_index]: {
               planned: prev[newQuestion.segment_index]?.planned || 0,
               generated: (prev[newQuestion.segment_index]?.generated || 0) + 1
             }
           }));
         }
       }
     )
     .subscribe((status) => {
       console.log('📡 Question channel subscription status:', status);
       if (status === 'SUBSCRIBED') {
         console.log('✅ Successfully subscribed to question updates');
       } else if (status === 'CHANNEL_ERROR') {
         console.error('❌ Error subscribing to question updates');
       } else if (status === 'TIMED_OUT') {
         console.error('⏰ Subscription timed out');
       }
     });
     
   // Subscribe to question plans table for tracking planned questions
   const questionPlanChannel = supabase
     .channel(`question_plans_${id}`)
     .on(
       'postgres_changes',
       {
         event: 'INSERT',
         schema: 'public',
         table: 'question_plans',
         filter: `course_id=eq.${id}`
       },
       (payload) => {
         console.log('📋 New question plan received:', payload);
         const plan = payload.new as any;
         
         // Update planned question counts
         if (plan.segment_index !== undefined) {
           setSegmentQuestionCounts(prev => ({
             ...prev,
             [plan.segment_index]: {
               planned: (prev[plan.segment_index]?.planned || 0) + 1,
               generated: prev[plan.segment_index]?.generated || 0
             }
           }));
         }
       }
     );
     
   // Subscribe to all channels
   segmentChannel.subscribe((status) => {
     console.log('📡 Segment channel subscription status:', status);
   });
   questionPlanChannel.subscribe((status) => {
     console.log('📡 Question plan channel subscription status:', status);
   });

   return () => {
     console.log('🔌 Unsubscribing from real-time updates');
     supabase.removeChannel(segmentChannel);
     supabase.removeChannel(questionChannel);
     supabase.removeChannel(questionPlanChannel);
   };
 }, [id, isProcessing, totalSegments, course, isSegmented]);

 // Additional polling for segmented courses to ensure UI updates
 useEffect(() => {
   if (!id || !isProcessing) return;
   
   // Smart polling for segment updates - only when we expect changes
   if (isSegmented && completedSegments < totalSegments) {
     console.log('🔄 Setting up smart segment polling (only while segments are processing)');
     
     // Poll every 5 seconds, but only while segments are still processing
     const pollInterval = setInterval(() => {
       // Only fetch if we're still expecting more segments
       if (completedSegments < totalSegments) {
         console.log(`📊 Checking for new segment questions (${completedSegments}/${totalSegments} complete)`);
         fetchSegmentQuestions();
       } else {
         console.log('✅ All segments complete, stopping polling');
         clearInterval(pollInterval);
       }
     }, 5000); // Poll every 5 seconds instead of 3
     
     return () => {
       console.log('🔌 Clearing segment polling interval');
       clearInterval(pollInterval);
     };
   }
 }, [id, isProcessing, totalSegments, course, isSegmented]);

 // Polling for questions during processing (fallback for real-time)
 useEffect(() => {
   if (!id || !isProcessing) return;
   
   // Fallback polling for when real-time doesn't work
   console.log('🔄 Setting up fallback question polling');
   
   // Poll every 5 seconds for new questions during processing
   const pollInterval = setInterval(() => {
     console.log('📊 Fallback poll: Checking for new questions');
     if (isSegmented) {
       fetchSegmentQuestions();
     } else {
       fetchQuestions();
     }
   }, 5000);
   
   return () => {
     console.log('🔌 Clearing fallback polling interval');
     clearInterval(pollInterval);
   };
 }, [id, isProcessing, isSegmented]);

 // Check if course should be published (for async question generation)
 useEffect(() => {
   if (!id || !isProcessing || course?.published) return;
   
   // For courses that were generated without a user on the page,
   // we need to periodically check if they've been published
   console.log('📡 Setting up periodic check for stuck courses');
   
   // Check immediately
   const checkPublishStatus = async () => {
     try {
       const response = await fetch(`/api/course/${id}`);
       const data = await response.json();
       
       if (data.success && data.course && data.course.published) {
         console.log('✅ Course has been published!');
         setCourse(data.course);
         setIsProcessing(false);
         
         // Fetch questions
         fetchQuestions();
       }
     } catch (error) {
       console.error('Error checking course status:', error);
     }
   };
   
   // Check immediately
   checkPublishStatus();
   
   // Then check every 10 seconds (less frequent than before)
   const interval = setInterval(checkPublishStatus, 10000);
   
   return () => clearInterval(interval);
 }, [id, isProcessing, course?.published]);

 useEffect(() => {
   // Only fetch questions if course is loaded and published
   if (course && course.published && id) {
     fetchQuestions();
   }
   // For processing courses, fetch questions appropriately
   else if (course && !course.published && id) {
     if (isSegmented) {
       // For segmented courses, fetch questions from completed segments
       fetchSegmentQuestions();
     } else {
       // For non-segmented courses, fetch any existing questions
       fetchQuestions();
     }
   }
 }, [course, id, completedSegments]);

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
     console.log('�� YouTube API script already exists');
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

  // Initialize YouTube player when API is ready and video ID is available
  useEffect(() => {
    console.log('🎬 YouTube Player useEffect triggered:', {
      videoId: videoId,
      isYTApiLoaded: isYTApiLoaded,
      hasWindowYT: !!(window.YT && window.YT.Player),
      hasPlayer: !!player,
      isProcessing: isProcessing
    });
    
    // Reset player if transitioning from processing to published
    if (!isProcessing && player && !document.getElementById('youtube-player')) {
      console.log('🔄 Resetting player due to state transition');
      setPlayer(null);
      playerRef.current = null;
    }
    
    // Initialize player when all conditions are met
    if (videoId && isYTApiLoaded && window.YT && window.YT.Player) {
      // If we already have a player but no DOM element, reset it
      if (player && !document.getElementById('youtube-player')) {
        console.log('🔄 Player exists but DOM element missing - resetting');
        setPlayer(null);
        playerRef.current = null;
        return;
      }
      
      // Only initialize if we don't have a player
      if (!player) {
        console.log('🚀 Attempting to initialize player...');
        // Add small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          initializePlayer();
        }, 200); // Increased delay for better DOM readiness
        
        return () => clearTimeout(timer);
      }
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
       
       // Extract video ID immediately, regardless of processing state
       const extractedVideoId = extractVideoId(data.course.youtube_url);
       console.log('🎬 Course loaded:', {
         title: data.course.title,
         youtubeUrl: data.course.youtube_url,
         extractedVideoId: extractedVideoId,
         published: data.course.published
       });
       setVideoId(extractedVideoId);
       
       // Check if course is processing
       if (data.course && !data.course.published) {
         console.log('Course is still processing');
         setIsProcessing(true);
         
         // Check if course is segmented
         if (data.course.is_segmented) {
           console.log(`📊 Course is segmented: ${data.course.total_segments} segments`);
           setIsSegmented(true);
           setTotalSegments(data.course.total_segments || 0);
           
           // Fetch initial segment status
           fetchSegmentQuestions();
         }
         
         // Check if the course has a generic description that needs updating
         const hasGenericDescription = data.course.description && (
           data.course.description.includes('Interactive course from') ||
           data.course.description.includes('AI-powered interactive course') ||
           data.course.description.includes('AI Generated Course')
         );
         
         if (hasGenericDescription) {
           // Try to update the description with AI-generated summary
           try {
             const updateResponse = await fetch('/api/course/update-summary', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ course_id: data.course.id })
             });
             
             if (updateResponse.ok) {
               const updateResult = await updateResponse.json();
               if (updateResult.success && updateResult.description) {
                 // Update local state with the new description
                 setCourse(prev => prev ? { ...prev, description: updateResult.description } : null);
                 console.log('✅ Course description updated with AI-generated summary');
               }
             }
           } catch (error) {
             console.log('Could not update course description:', error);
           }
         }
         
         // Set up progress tracking
         if (typeof window !== 'undefined') {
           // With live question generation, we don't need the legacy polling
           // Questions will arrive via real-time subscriptions
           console.log('📡 Course is processing - questions will arrive via real-time updates');
         }
       }
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
         console.log('🖼️ First visual q:', visualQuestions[0]);
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

 const fetchSegmentQuestions = async () => {
   try {
     const response = await fetch(`/api/course/${id}/segment-questions?completed_only=true`);
     const data = await response.json();

     if (data.success) {
       // Parse options for each question
       const parsedQuestions = data.questions.map((q: any) => ({
         ...q,
         options: parseOptionsWithTrueFalse(q.options || [], q.type),
         correct: parseInt(q.correct_answer) || 0,
         correct_answer: parseInt(q.correct_answer) || 0
       }));
       
       console.log('📊 Segment questions fetched:', parsedQuestions.length);
       console.log(`📈 Progress: ${data.completed_segments}/${data.total_segments} segments completed`);
       
       setQuestions(parsedQuestions);
       setSegments(data.segments || []);
       setCompletedSegments(data.completed_segments || 0);
       setTotalSegments(data.total_segments || 0);
       
       // Update segment question counts from API data
       if (data.segments && data.segments.length > 0) {
         const counts: Record<number, { planned: number; generated: number }> = {};
         data.segments.forEach((segment: any) => {
           if (segment.planned_questions_count > 0 || segment.questions_count > 0) {
             counts[segment.segment_index] = {
               planned: segment.planned_questions_count || 0,
               generated: segment.questions_count || 0
             };
           }
         });
         setSegmentQuestionCounts(counts);
       }
       
       // If all segments are completed but course isn't published yet, it will be soon
       if (data.completed_segments === data.total_segments && data.total_segments > 0) {
         console.log('✅ All segments completed, course should be published soon');
       }
     } else {
       console.error('Failed to fetch segment questions:', data.error);
     }
   } catch (err) {
     console.error('Error fetching segment questions:', err);
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

     // Step 1: Get course suggestions (enhanced if user is logged in)
     const suggestionsResponse = await fetch('/api/course/suggestions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         videoUrl: course?.youtube_url,
         userId: user?.id, // Pass user ID for enhanced recommendations
         courseId: id as string, // Pass current course ID
         trigger: 'course_completion' // Indicate this is triggered by course completion
       })
     });
     
     if (!suggestionsResponse.ok) {
       throw new Error('Failed to get course suggestions');
     }
     
     const suggestionsData = await suggestionsResponse.json();
     
     if (!suggestionsData.topics || !Array.isArray(suggestionsData.topics) || suggestionsData.topics.length === 0) {
       throw new Error('No course suggestions found');
     }
     
     const firstTopic = suggestionsData.topics[0];
     if (!firstTopic || !firstTopic.video) {
       throw new Error('Invalid course suggestion');
     }
     
     console.log('🎯 Got course suggestion:', {
       topic: firstTopic.topic,
       video: firstTopic.video,
       // Log additional enhanced data if available
       reasons: firstTopic.reasons,
       difficulty_match: firstTopic.difficulty_match,
       addresses_mistakes: firstTopic.addresses_mistakes
     });

     // Step 2: Use analyze-video-smart for more robust processing
     const sessionId = `next-course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
     
     const smartAnalysisResponse = await fetch('/api/course/analyze-video-smart', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         youtube_url: firstTopic.video,
         session_id: sessionId,
         max_questions: 5,
         enable_quality_verification: true,
         segment_duration: 300, // 5 minutes
         useCache: true,
         useEnhanced: true
       })
     });
     
     if (!smartAnalysisResponse.ok) {
       const errorText = await smartAnalysisResponse.text();
       console.error('Smart analysis failed:', errorText);
       
       // Parse error response to check if it's a video duration error
       let errorObj;
       try {
         errorObj = JSON.parse(errorText);
       } catch {
         errorObj = { error: errorText };
       }
       
       // Check if it's a video duration error
       if (errorObj.video_duration && errorObj.max_duration) {
         const videoDurationMinutes = Math.floor(errorObj.video_duration / 60);
         const maxDurationMinutes = Math.floor(errorObj.max_duration / 60);
         throw new Error(`The suggested video is ${videoDurationMinutes} minutes long. Maximum allowed duration is ${maxDurationMinutes} minutes. We'll find a shorter alternative.`);
       }
       
       throw new Error(`Smart analysis failed: ${errorText}`);
     }
     
     const smartAnalysisData = await smartAnalysisResponse.json();
     
     if (!smartAnalysisData.success) {
       throw new Error(smartAnalysisData.error || 'Smart analysis failed');
     }
     
     console.log('✅ Smart analysis completed:', {
       courseId: smartAnalysisData.course_id,
       segmented: smartAnalysisData.segmented,
       cached: smartAnalysisData.cached,
       backgroundProcessing: smartAnalysisData.background_processing
     });

     // Step 3: Fetch the generated course and questions
     try {
       // Fetch course data from database
       const courseResponse = await fetch(`/api/course/${smartAnalysisData.course_id}`);
       const courseData = await courseResponse.json();
       
       if (courseData.success) {
         // Fetch questions for the course
         const questionsResponse = await fetch(`/api/course/${smartAnalysisData.course_id}/questions`);
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
             courseId: smartAnalysisData.course_id,
             questionsGenerated: true,
             questions: parsedQuestions,
             videoId: extractVideoId(courseData.course.youtube_url),
             topic: firstTopic.topic,
             // Enhanced fields from API response
             reasons: firstTopic.reasons,
             difficulty_match: firstTopic.difficulty_match,
             addresses_mistakes: firstTopic.addresses_mistakes,
             thumbnail_url: firstTopic.thumbnail_url,
             channel_name: firstTopic.channel_name,
             duration: firstTopic.duration
           });
           
           console.log('✅ Next course data fetched from database:', {
             courseId: smartAnalysisData.course_id,
             title: courseData.course.title,
             questionsCount: parsedQuestions.length,
             topic: firstTopic.topic,
             hasEnhancedData: !!firstTopic.reasons
           });
         } else {
           console.error('Failed to fetch questions for next course:', questionsData.error);
           // Still set course without questions
           setNextCourse({
             ...courseData.course,
             courseId: smartAnalysisData.course_id,
             questionsGenerated: false,
             questions: [],
             videoId: extractVideoId(courseData.course.youtube_url),
             topic: firstTopic.topic,
             // Enhanced fields from API response
             reasons: firstTopic.reasons,
             difficulty_match: firstTopic.difficulty_match,
             addresses_mistakes: firstTopic.addresses_mistakes,
             thumbnail_url: firstTopic.thumbnail_url,
             channel_name: firstTopic.channel_name,
             duration: firstTopic.duration
           });
         }
       } else {
         console.error('Failed to fetch next course from database:', courseData.error);
         // Fallback to basic course data
         setNextCourse({
           id: smartAnalysisData.course_id,
           title: firstTopic.topic,
           description: firstTopic.description || `AI Generated Course about ${firstTopic.topic}`,
           youtube_url: firstTopic.video,
           created_at: new Date().toISOString(),
           published: true,
           courseId: smartAnalysisData.course_id,
           questionsGenerated: smartAnalysisData.segmented || smartAnalysisData.cached || !smartAnalysisData.background_processing,
           questions: [],
           videoId: extractVideoId(firstTopic.video),
           topic: firstTopic.topic,
           // Enhanced fields from API response
           reasons: firstTopic.reasons,
           difficulty_match: firstTopic.difficulty_match,
           addresses_mistakes: firstTopic.addresses_mistakes,
           thumbnail_url: firstTopic.thumbnail_url,
           channel_name: firstTopic.channel_name,
           duration: firstTopic.duration
         });
       }
     } catch (fetchError) {
       console.error('Error fetching next course from database:', fetchError);
       // Fallback to basic course data
       setNextCourse({
         id: smartAnalysisData.course_id,
         title: firstTopic.topic,
         description: firstTopic.description || `AI Generated Course about ${firstTopic.topic}`,
         youtube_url: firstTopic.video,
         created_at: new Date().toISOString(),
         published: true,
         courseId: smartAnalysisData.course_id,
         questionsGenerated: smartAnalysisData.segmented || smartAnalysisData.cached || !smartAnalysisData.background_processing,
         questions: [],
         videoId: extractVideoId(firstTopic.video),
         topic: firstTopic.topic,
         // Enhanced fields from API response
         reasons: firstTopic.reasons,
         difficulty_match: firstTopic.difficulty_match,
         addresses_mistakes: firstTopic.addresses_mistakes,
         thumbnail_url: firstTopic.thumbnail_url,
         channel_name: firstTopic.channel_name,
         duration: firstTopic.duration
       });
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
       controls: 0,
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
           // Track pause engagement with error handling
           try {
             trackEngagement(id as string, { type: 'video_paused' });
           } catch (error) {
             console.warn('Failed to track pause engagement:', error);
           }
         } else if (event.data === window.YT.PlayerState.ENDED || event.data === 0) {
           console.log('🏁 Video ended - stopping time tracking');
           stopTimeTracking();
           
           // Track course completion with error handling
           if (id && typeof id === 'string') {
             try {
               trackCourse({
                 courseId: id,
                 action: 'complete',
                 duration: Math.round(duration),
                 questionsAnswered: answeredQuestions.size,
                 completionPercentage: 100
               });
             } catch (error) {
               console.warn('Failed to track course completion:', error);
             }
             
             // Trigger rating modal on completion
             triggerRatingModal();
           }
           
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
     playerRef.current?.pauseVideo(); // Auto-pause video when question appears
     
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
     
     // Track engagement score but don't trigger rating modal during course
     setEngagementScore(prev => prev + 10);
   }
   
   // Track question answered engagement with error handling
   if (id && typeof id === 'string') {
     try {
       trackEngagement(id, { type: 'question_answered', value: correct ? 1 : 0 });
     } catch (error) {
       console.warn('Failed to track question engagement:', error);
     }
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
   
   // For hotspot questions, seek back to the original question timestamp
   const currentQuestion = questions[currentQuestionIndex];
   if (currentQuestion && currentQuestion.type === 'hotspot' && currentQuestion.frame_timestamp && playerRef.current) {
     // The video is currently at frame_timestamp, need to go back to the original timestamp
     console.log('🎯 Returning to question timestamp from frame timestamp:', {
       originalTimestamp: currentQuestion.timestamp,
       frameTimestamp: currentQuestion.frame_timestamp
     });
     playerRef.current.seekTo(currentQuestion.timestamp);
   }
   
   playerRef.current?.playVideo(); // Resume video when continuing
 };

 // Rating trigger logic
 const triggerRatingModal = () => {
   if (hasRated || showRatingModal) return;
   
   console.log(`⭐ Triggering rating modal on course completion`);
   setShowRatingModal(true);
   
   if (id && typeof id === 'string') {
     try {
       trackRatingModalShown(id, 'completion');
     } catch (error) {
       console.warn('Failed to track rating modal shown:', error);
     }
   }
 };

 const handleRatingSubmit = async (rating: number) => {
   if (!id || typeof id !== 'string') return;
   
   const timeSpentMinutes = Math.round((Date.now() - courseStartTime) / 60000);
   const completionPercentage = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
   
   try {
     const response = await fetch(`/api/courses/${id}/rating`, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
       },
       body: JSON.stringify({
         rating,
         context: 'completion', // Always completion since modal only shows at end
         engagementData: {
           timeSpentMinutes,
           questionsAnswered: answeredQuestions.size,
           completionPercentage
         }
       })
     });

     if (response.ok) {
       const data = await response.json();
       console.log('✅ Rating submitted:', data);
       
       // Track rating analytics with error handling
       try {
         trackRating({
           courseId: id,
           rating,
           context: 'completion', // Always completion since modal only shows at end
           timeToRate: Date.now() - courseStartTime,
           engagementScore,
           platform: getPlatform()
         });
       } catch (error) {
         console.warn('Failed to track rating analytics:', error);
       }
       
       setHasRated(true);
       setShowRatingModal(false);
     } else {
       console.error('Failed to submit rating');
     }
   } catch (error) {
     console.error('Error submitting rating:', error);
   }
 };

 const handleRatingClose = () => {
   setShowRatingModal(false);
   
   if (id && typeof id === 'string') {
     try {
       trackRatingModalDismissed(id, 'manual');
     } catch (error) {
       console.warn('Failed to track rating modal dismissed:', error);
     }
   }
 };

 const handleVideoSeek = async (seekTime: number) => {
   if (!playerRef.current || !questions) return;
   
   // Track video seek engagement with error handling
   if (id && typeof id === 'string') {
     try {
       trackEngagement(id, { type: 'video_seeked', value: seekTime });
     } catch (error) {
       console.warn('Failed to track video seek engagement:', error);
     }
   }

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

 // Get active question data for chat bubble
 const getActiveQuestion = () => {
   if (!showQuestion || !questions[currentQuestionIndex]) {
     return null;
   }

   const question = questions[currentQuestionIndex];
   
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
         return [options];
       }
     }
     
     return [];
   };

   const parsedOptions = parseOptions(question.options || []);
   const finalOptions = parsedOptions.length === 0 && (question.type === 'true-false' || question.type === 'true_false') 
     ? ['True', 'False'] 
     : parsedOptions;

   return {
     question: question.question,
     type: question.type,
     options: finalOptions
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
           
           {/* Processing Indicator */}
           {isProcessing && (
             <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
               <div className="flex flex-col gap-3">
                 <div className="flex items-center gap-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <AlertDescription className="text-blue-700 dark:text-blue-300">
                     <strong>Questions are being generated!</strong> You can start watching the video now - questions will appear automatically when ready.
                   </AlertDescription>
                 </div>
                 
                 {/* Segment Progress */}
                 {isSegmented && totalSegments > 0 && (
                   <div className="space-y-2">
                     <div className="flex items-center justify-between text-sm">
                       <span className="text-blue-700 dark:text-blue-300">
                         {totalSegments === 1 ? 'Processing Status' : `Segment Progress: ${completedSegments} of ${totalSegments} completed`}
                       </span>
                       <span className="text-blue-700 dark:text-blue-300">
                         {Math.round((completedSegments / totalSegments) * 100)}%
                       </span>
                     </div>
                     <Progress value={(completedSegments / totalSegments) * 100} className="h-2" />
                     
                     {questions.length > 0 && (
                       <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                         <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                         {questions.length} question{questions.length !== 1 ? 's' : ''} ready to answer!
                       </p>
                     )}
                   </div>
                 )}
               </div>
             </Alert>
           )}
         </div>

         {/* Video Player */}
         <InteractiveVideoPlayer
           key={`video-player-${videoId}`}
           videoId={videoId}
           youtubeUrl={course.youtube_url}
           isYTApiLoaded={isYTApiLoaded}
           error={null}
           isVideoReady={isVideoReady}
           currentTime={currentTime}
           duration={duration}
           questions={questions}
           answeredQuestions={answeredQuestions}
           onVideoSeek={handleVideoSeek}
           formatTime={formatTime}
           onFetchNextCourse={fetchNextCourse}
           isLoadingNextCourse={isLoadingNextCourse}
           nextCourse={nextCourse}
           nextCourseApiCalled={nextCourseApiCalled}
         />

         {/* Question or Transcript Display */}
         {(!isProcessing || (isProcessing && questions.length > 0)) && (
           showQuestion && questions[currentQuestionIndex] ? (
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
             <TranscriptDisplay
               courseId={id as string}
               currentTime={currentTime}
               onSeek={handleVideoSeek}
               formatTimestamp={formatTime}
             />
           )
         )}

         {/* Course Curriculum Card */}
         {questions.length > 0 && (
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
         )}
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
               
               {/* Enhanced: Why this course? */}
               {nextCourse.reasons && nextCourse.reasons.length > 0 && (
                 <div className="mt-4 space-y-2">
                   <h5 className="text-sm font-semibold">Why this course?</h5>
                   <ul className="text-xs space-y-1">
                     {nextCourse.reasons.map((reason, i) => (
                       <li key={i} className="flex items-start gap-2">
                         <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                         <span>{reason}</span>
                       </li>
                     ))}
                   </ul>
                 </div>
               )}
               
               {/* Enhanced: Addresses mistakes */}
               {nextCourse.addresses_mistakes && nextCourse.addresses_mistakes.length > 0 && (
                 <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-xs">
                   <span className="font-semibold text-orange-700 dark:text-orange-400">Helps with: </span>
                   <span className="text-orange-600 dark:text-orange-300">{nextCourse.addresses_mistakes.join(', ')}</span>
                 </div>
               )}
               
               {/* Enhanced: Video metadata */}
               <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                 {nextCourse.channel_name && (
                   <>
                     <span>{nextCourse.channel_name}</span>
                     <span>•</span>
                   </>
                 )}
                 {nextCourse.duration && <span>{nextCourse.duration}</span>}
                 {nextCourse.difficulty_match && (
                   <>
                     <span>•</span>
                     <Badge variant={
                       nextCourse.difficulty_match === 'perfect' ? 'default' :
                       nextCourse.difficulty_match === 'challenging' ? 'secondary' :
                       'outline'
                     } className="text-xs">
                       {nextCourse.difficulty_match === 'perfect' ? '✓ Perfect match' :
                        nextCourse.difficulty_match === 'challenging' ? 'Challenging' :
                        nextCourse.difficulty_match === 'too_easy' ? 'Review' :
                        'Advanced'}
                     </Badge>
                   </>
                 )}
               </div>
               
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

     {/* Rating Modal */}
     <RatingModal
       isOpen={showRatingModal}
       onClose={handleRatingClose}
       onRate={handleRatingSubmit}
       courseTitle={course?.title}
       position="center"
       autoHide={8000}
     />

     {/* Chat Bubble */}
     <ChatBubble 
       courseId={id as string}
       currentVideoTime={currentTime}
       activeQuestion={getActiveQuestion()}
     />
   </div>
 );
}