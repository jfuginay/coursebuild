import { useState, useEffect } from 'react';
import { Course, Question } from '@/types/course';
import { parseOptionsWithTrueFalse, extractVideoId } from '@/utils/courseHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { SessionManager } from '@/utils/sessionManager';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface UseNextCourseProps {
  currentCourseId: string | undefined;
  currentCourse: Course | null;
  questions: Question[];
  questionResults: Record<string, boolean>;
  currentTime: number;
  duration: number;
}

interface UseNextCourseResult {
  nextCourse: Course | null;
  isLoadingNextCourse: boolean;
  showNextCourseModal: boolean;
  setShowNextCourseModal: (show: boolean) => void;
  fetchNextCourse: () => Promise<void>;
  error: string | null;
}

export function useNextCourse({
  currentCourseId,
  currentCourse,
  questions,
  questionResults,
  currentTime,
  duration
}: UseNextCourseProps): UseNextCourseResult {
  const { user } = useAuth();
  const [nextCourse, setNextCourse] = useState<Course | null>(null);
  const [isLoadingNextCourse, setIsLoadingNextCourse] = useState(false);
  const [showNextCourseModal, setShowNextCourseModal] = useState(false);
  const [autoGenerationTriggered, setAutoGenerationTriggered] = useState(false);
  const [nextCourseApiCalled, setNextCourseApiCalled] = useState(false);
  const [nextCourseModalShown, setNextCourseModalShown] = useState(false);
  const [error, setError] = useState<string | null>(null); // Added error state

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
      // Safeguard: Don't show modal if course is still processing or if duration seems too short
      // This prevents early modal appearance during processing with incorrect duration
      const isProcessing = currentCourse && !currentCourse.published;
      const durationTooShort = duration < 60; // Less than 1 minute seems suspicious
      
      if (isProcessing || durationTooShort) {
        console.log('⚠️ Skipping early modal trigger - course processing or duration too short:', {
          isProcessing,
          durationTooShort,
          duration,
          published: currentCourse?.published
        });
        return;
      }
      
      console.log('⏰ Showing next course modal 3 seconds before video ends');
      setNextCourseModalShown(true);
      setShowNextCourseModal(true);
    }
  }, [currentTime, duration, nextCourseModalShown, showNextCourseModal, currentCourse]);

  const fetchNextCourse = async () => {
    // Prevent multiple API calls - check if already loaded, loading, or already called
    if (nextCourse || isLoadingNextCourse || nextCourseApiCalled) {
      console.log('📚 Next course already loaded, loading, or API already called, skipping fetch');
      return;
    }
    
    console.log('📚 Starting next course generation...');
    setIsLoadingNextCourse(true);
    setNextCourseApiCalled(true); // Mark API as called
    setError(null); // Clear previous errors
    
    try {
      // Get session data for anonymous users
      const sessionData = !user ? SessionManager.getSessionData() : null;
      
      // Log session data if available
      if (sessionData) {
        console.log('📊 Anonymous session data:', {
          accuracy: sessionData.performance.accuracy,
          questionsAnswered: sessionData.performance.totalQuestionsAnswered,
          wrongQuestions: sessionData.performance.wrongQuestions.length,
          currentCourseId: sessionData.currentCourse?.id
        });
        
        // Log first few wrong questions to verify filtering
        if (sessionData.performance.wrongQuestions.length > 0) {
          console.log('📝 Sample wrong questions being sent:');
          sessionData.performance.wrongQuestions.slice(0, 3).forEach((wq, idx) => {
            console.log(`  ${idx + 1}. ${wq.type}: "${wq.question.substring(0, 50)}..."`);
            console.log(`     User: ${wq.userAnswer} | Correct: ${wq.correctAnswer}`);
            console.log(`     Course: ${wq.courseId}`);
          });
        }
      }
      
      // Get wrong answers from questionResults
      const wrongAnswers = Object.entries(questionResults)
        .filter(([questionId, isCorrect]) => !isCorrect)
        .map(([questionId, isCorrect]) => {
          const questionIndex = parseInt(questionId.split('-')[1]);
          return questions[questionIndex];
        })
        .filter(question => question); // Filter out any undefined questions

      console.log('📊 Sending wrong answers to next course API:', wrongAnswers);

      // Step 1: Get course suggestions (enhanced if user is logged in OR has session data)
      const suggestionsResponse = await fetch('/api/course/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: currentCourse?.youtube_url,
          userId: user?.id, // Pass user ID for enhanced recommendations
          courseId: currentCourseId as string, // Pass current course ID
          trigger: 'course_completion', // Indicate this is triggered by course completion
          sessionData: sessionData // Pass session data for anonymous users
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
        addresses_mistakes: firstTopic.addresses_mistakes,
        progression_type: firstTopic.progression_type
      });

      // Step 2: Check if a course already exists for this video
      // Sanitize the URL to ensure consistent format
      const videoId = extractVideoId(firstTopic.video);
      if (!videoId) {
        console.error('Invalid video URL:', firstTopic.video);
        throw new Error('Invalid video URL in recommendation');
      }
      const sanitizedUrl = `https://www.youtube.com/watch?v=${videoId}`;
      
      console.log('🔍 Checking for existing course with URL:', sanitizedUrl);
      
      // Check if this video has already been processed
      const { data: existingCourses, error: checkError } = await supabase
        .from('courses')
        .select('id, title, description, published, created_at')
        .eq('youtube_url', sanitizedUrl)
        .order('created_at', { ascending: false });

      if (!checkError && existingCourses && existingCourses.length > 0) {
        // Check each course for questions
        for (const existingCourse of existingCourses) {
          const { data: questions, error: questionsError } = await supabase
            .from('questions')
            .select('id')
            .eq('course_id', existingCourse.id)
            .limit(1);

          if (!questionsError && questions && questions.length > 0) {
            console.log('✅ Found existing course with questions:', existingCourse.id);
            console.log('   📚 Title:', existingCourse.title);
            console.log('   📊 Published:', existingCourse.published);
            
            // Show success message
            toast.success('Found existing course! Loading from cache...');
            
            // Return the existing course
            setNextCourse({
              id: existingCourse.id,
              title: existingCourse.title,
              description: existingCourse.description,
              youtube_url: sanitizedUrl,
              created_at: existingCourse.created_at,
              published: existingCourse.published,
              topic: firstTopic.topic,
              // Include enhanced recommendation data if available
              reasons: firstTopic.reasons,
              difficulty_match: firstTopic.difficulty_match,
              addresses_mistakes: firstTopic.addresses_mistakes,
              thumbnail_url: firstTopic.thumbnail_url,
              channel_name: firstTopic.channel_name,
              duration: firstTopic.duration,
              progression_type: firstTopic.progression_type
            });
            
            setShowNextCourseModal(true);
            return;
          }
        }
        
        // Check if any course is currently being processed (unpublished and recent)
        const processingCourse = existingCourses.find(course => {
          const createdAt = new Date(course.created_at);
          const minutesAgo = (Date.now() - createdAt.getTime()) / 1000 / 60;
          return !course.published && minutesAgo < 30; // Consider courses created in last 30 minutes as potentially processing
        });
        
        if (processingCourse) {
          console.log('⏳ Course is currently being processed:', processingCourse.id);
          toast.info('This video is currently being processed. Please try again in a few minutes.');
          setError('This video is currently being processed. Please try again in a few minutes.');
          return;
        }
        
        console.log('⚠️ Found courses but none have questions, will create new course');
      }

      // Step 3: Use analyze-video-smart for more robust processing (only if no existing course found)
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

      // Step 4: Fetch the generated course and questions
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
              toast.error('Failed to generate next course. Please try again.');
        setError('Failed to generate next course. Please try again.');
    } finally {
      setIsLoadingNextCourse(false);
    }
  };

  return {
    nextCourse,
    isLoadingNextCourse,
    showNextCourseModal,
    setShowNextCourseModal,
    fetchNextCourse,
    error
  };
} 