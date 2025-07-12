import { useState, useEffect } from 'react';
import { Course, Question } from '@/types/course';
import { parseOptionsWithTrueFalse } from '@/utils/courseHelpers';

interface UseCourseDataProps {
  courseId: string | undefined;
}

interface UseCourseDataResult {
  course: Course | null;
  setCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  questions: Question[];
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  isLoading: boolean;
  error: string | null;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  isSegmented: boolean;
  setIsSegmented: React.Dispatch<React.SetStateAction<boolean>>;
  totalSegments: number;
  setTotalSegments: React.Dispatch<React.SetStateAction<number>>;
  completedSegments: number;
  setCompletedSegments: React.Dispatch<React.SetStateAction<number>>;
  segments: any[];
  setSegments: React.Dispatch<React.SetStateAction<any[]>>;
  segmentQuestionCounts: Record<number, { planned: number; generated: number }>;
  setSegmentQuestionCounts: React.Dispatch<React.SetStateAction<Record<number, { planned: number; generated: number }>>>;
  fetchCourse: () => Promise<void>;
  fetchQuestions: () => Promise<void>;
  fetchSegmentQuestions: () => Promise<void>;
}

export function useCourseData({ courseId }: UseCourseDataProps): UseCourseDataResult {
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Segment processing state
  const [segments, setSegments] = useState<any[]>([]);
  const [completedSegments, setCompletedSegments] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const [isSegmented, setIsSegmented] = useState(false);
  const [segmentQuestionCounts, setSegmentQuestionCounts] = useState<Record<number, { planned: number; generated: number }>>({});

  const fetchCourse = async () => {
    if (!courseId) return;
    
    try {
      const response = await fetch(`/api/course/${courseId}`);
      const data = await response.json();

      if (data.success) {
        setCourse(data.course);
        
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
    if (!courseId) return;
    
    try {
      const response = await fetch(`/api/course/${courseId}/questions`);
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

  const fetchSegmentQuestions = async () => {
    if (!courseId) return;
    
    try {
      const response = await fetch(`/api/course/${courseId}/segment-questions?completed_only=true`);
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

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  useEffect(() => {
    // Only fetch questions if course is loaded and published
    if (course && course.published && courseId) {
      fetchQuestions();
    }
    // For processing courses, fetch questions appropriately
    else if (course && !course.published && courseId) {
      if (isSegmented) {
        // For segmented courses, fetch questions from completed segments
        fetchSegmentQuestions();
      } else {
        // For non-segmented courses, fetch any existing questions
        fetchQuestions();
      }
    }
  }, [course, courseId, completedSegments]);

  return {
    course,
    setCourse,
    questions,
    setQuestions,
    isLoading,
    error,
    isProcessing,
    setIsProcessing,
    isSegmented,
    setIsSegmented,
    totalSegments,
    setTotalSegments,
    completedSegments,
    setCompletedSegments,
    segments,
    setSegments,
    segmentQuestionCounts,
    setSegmentQuestionCounts,
    fetchCourse,
    fetchQuestions,
    fetchSegmentQuestions
  };
} 