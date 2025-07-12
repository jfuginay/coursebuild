import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header';
import QuestionOverlay from '@/components/QuestionOverlay';
import CourseCurriculumCard from '@/components/CourseCurriculumCard';
import TranscriptDisplay from '@/components/TranscriptDisplay';
import InteractiveVideoPlayer from '@/components/InteractiveVideoPlayer';
import ChatBubble from '@/components/ChatBubble';
import ProcessingIndicator from '@/components/ProcessingIndicator';
import { LoginModal, NextCourseModal, RatingModalWrapper } from '@/components/CourseModals';

// Hooks
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useCourseData } from '@/hooks/useCourseData';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { useYouTubePlayer } from '@/hooks/useYouTubePlayer';
import { useNextCourse } from '@/hooks/useNextCourse';
import { useGuidedTour } from '@/hooks/useGuidedTour';
import { learnerTourSteps } from '@/config/tours';
import { supabase } from '@/lib/supabase';

// Types and utilities
import { Course, CourseData, Segment, Question } from '@/types/course';
import { formatTime, adjustEndOfVideoQuestions, parseOptions } from '@/utils/courseHelpers';

export default function CoursePage() {
 const router = useRouter();
 const { id } = router.query;
 const { user, session } = useAuth();
 const { trackRating, trackCourse, trackRatingModalShown, trackRatingModalDismissed, trackEngagement, getPlatform } = useAnalytics();
  
  // Course data management
  const {
    course,
    setCourse,
    questions,
    setQuestions,
    isLoading,
    error,
    isProcessing,
    setIsProcessing,
    isSegmented,
    totalSegments,
    completedSegments,
    segmentQuestionCounts,
    setSegmentQuestionCounts,
    fetchQuestions,
    fetchSegmentQuestions
  } = useCourseData({ courseId: id as string | undefined });

  // Question state
 const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
 const [showQuestion, setShowQuestion] = useState(false);
 const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
 const [skippedQuestions, setSkippedQuestions] = useState<Set<number>>(new Set());
 const [correctAnswers, setCorrectAnswers] = useState(0);
 const [questionResults, setQuestionResults] = useState<Record<string, boolean>>({});
 const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
 const [showLoginModal, setShowLoginModal] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
 
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
  const questionStartTime = useRef<number | null>(null);

  // Video player callbacks
  const handlePlayerStateChange = (state: number) => {
    // Handle state changes if needed
  };

  const handleVideoEnd = () => {
    // Track course completion
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
  };

  // YouTube player setup
  const {
    player,
    playerRef,
    isVideoReady,
    isYTApiLoaded,
    videoId,
    currentTime,
    duration
  } = useYouTubePlayer({
    courseId: id as string | undefined,
    youtubeUrl: course?.youtube_url || '',
    onTimeUpdate: (time) => {
      // Time update handled internally
    },
    onDurationChange: (duration) => {
      // Duration update handled internally
    },
    onPlayerStateChange: handlePlayerStateChange,
    onVideoEnd: handleVideoEnd
  });

  // Next course management
  const {
    nextCourse,
    isLoadingNextCourse,
    showNextCourseModal,
    setShowNextCourseModal,
    fetchNextCourse
  } = useNextCourse({
    currentCourseId: id as string | undefined,
    currentCourse: course,
    questions,
    questionResults,
    currentTime,
    duration
  });

  // Real-time updates
  useRealTimeUpdates({
    courseId: id as string | undefined,
    isProcessing,
    coursePublished: course?.published,
    questionCount: questions.length,
    isSegmented,
    totalSegments,
    fetchSegmentQuestions,
    fetchQuestions,
    setQuestions,
    setSegmentQuestionCounts,
    setCourse,
    setIsProcessing
  });
 
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

  // Check for questions when video time updates
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
 };

 const handleBackToHome = () => {
   router.push('/');
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

    // For segmented courses, group questions by segment
    if (isSegmented) {
      const segmentMap = new Map<number, Question[]>();
      
      questions.forEach(q => {
        const segmentId = q.segment_index || 0;
        if (!segmentMap.has(segmentId)) {
          segmentMap.set(segmentId, []);
        }
        segmentMap.get(segmentId)!.push(q);
      });

      const segments: Segment[] = Array.from(segmentMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([segmentId, segmentQuestions]) => ({
          title: `Segment ${segmentId + 1}`,
          timestamp: formatTime(segmentQuestions[0]?.timestamp || 0),
          timestampSeconds: segmentQuestions[0]?.timestamp || 0,
          concepts: [],
          questions: segmentQuestions,
          isComplete: segmentId < completedSegments
        }));

      return {
        title: course.title,
        description: course.description,
        duration: duration > 0 ? formatTime(duration) : 'Variable',
        videoId: videoId,
        segments
      };
    }

    // For non-segmented courses, group all questions into a single segment
   const segment: Segment = {
     title: "Course Content",
     timestamp: "00:00",
     timestampSeconds: 0,
     concepts: [],
      questions: questions,
      isComplete: true
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

  const handleStartNextCourse = () => {
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
              <ProcessingIndicator
                isSegmented={isSegmented}
                totalSegments={totalSegments}
                completedSegments={completedSegments}
                questionCount={questions.length}
                segmentQuestionCounts={segmentQuestionCounts}
              />
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
            nextCourseApiCalled={false}
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
              formatTimestamp={formatTime}
              isProcessing={isProcessing}
              isSegmented={isSegmented}
           />
         )}
       </div>
     </div>

      {/* Modals */}
      <LoginModal 
        open={showLoginModal} 
        onOpenChange={setShowLoginModal}
        onLoginRedirect={handleLoginRedirect}
      />

      <NextCourseModal
        open={showNextCourseModal}
        onOpenChange={setShowNextCourseModal}
        nextCourse={nextCourse}
        isLoadingNextCourse={isLoadingNextCourse}
        onStartNextCourse={handleStartNextCourse}
      />

      <RatingModalWrapper
       isOpen={showRatingModal}
       onClose={handleRatingClose}
       onRate={handleRatingSubmit}
       courseTitle={course?.title}
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