import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Question } from '@/types/course';
import { parseOptionsWithTrueFalse } from '@/utils/courseHelpers';
import { useToast } from '@/components/ui/use-toast';

interface UseRealTimeUpdatesProps {
  courseId: string | undefined;
  isProcessing: boolean;
  coursePublished: boolean | undefined;
  questionCount: number;
  isSegmented: boolean;
  totalSegments: number;
  fetchSegmentQuestions: (includeIncomplete?: boolean) => Promise<void>;
  fetchQuestions: () => Promise<void>;
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>;
  setSegmentQuestionCounts: React.Dispatch<React.SetStateAction<Record<number, { planned: number; generated: number }>>>;
  setCourse: React.Dispatch<React.SetStateAction<any>>;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useRealTimeUpdates({
  courseId,
  isProcessing,
  coursePublished,
  questionCount,
  isSegmented,
  totalSegments,
  fetchSegmentQuestions,
  fetchQuestions,
  setQuestions,
  setSegmentQuestionCounts,
  setCourse,
  setIsProcessing
}: UseRealTimeUpdatesProps) {
  const { toast } = useToast();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store functions in refs to avoid recreating debounced function
  const fetchSegmentQuestionsRef = useRef(fetchSegmentQuestions);
  const fetchQuestionsRef = useRef(fetchQuestions);
  
  // Update refs when functions change
  useEffect(() => {
    fetchSegmentQuestionsRef.current = fetchSegmentQuestions;
    fetchQuestionsRef.current = fetchQuestions;
  }, [fetchSegmentQuestions, fetchQuestions]);

  // Stable debounced fetch function
  const debouncedFetchQuestions = useCallback(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      console.log('📊 Debounced fetch: Checking for new questions');
      if (isSegmented) {
        fetchSegmentQuestionsRef.current(true); // Include incomplete segments
      } else {
        fetchQuestionsRef.current();
      }
    }, 1000); // Wait 1 second before making the API call
  }, [isSegmented]); // Only depend on isSegmented

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Subscribe to segment updates and individual question inserts for real-time updates
  useEffect(() => {
    // Keep subscription active while processing OR if we don't have questions yet
    const needsSubscription = isProcessing || (!coursePublished && questionCount === 0);
    
    console.log('🔍 Real-time subscription check:', {
      id: courseId,
      isProcessing,
      coursePublished,
      questionCount,
      needsSubscription
    });
    
    if (!courseId || !needsSubscription) {
      console.log('📡 Skipping real-time subscription setup');
      return;
    }

    console.log('🔄 Setting up real-time subscriptions for live question generation');
    
    // Subscribe to segment updates
    const segmentChannel = supabase
      .channel(`course_segments_${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'course_segments',
          filter: `course_id=eq.${courseId}`
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
            
            // Use debounced fetch to avoid multiple calls
            debouncedFetchQuestions();
            
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
                  body: JSON.stringify({ course_id: courseId })
                }).then(response => response.json())
                  .then(data => {
                    if (data.published) {
                      console.log('✅ Course has been published!');
                      setCourse((prev: any) => prev ? { ...prev, published: true } : null);
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
      .channel(`questions_${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions',
          filter: `course_id=eq.${courseId}`
        }, async (payload) => {
          if (!coursePublished) {
            console.log('📨 New question received via real-time update:', {
              id: payload.new.id,
              type: payload.new.type,
              timestamp: payload.new.timestamp,
              segment_id: payload.new.segment_id
            });
            
            // For multi-segment videos, use debounced fetch to avoid excessive calls
            if (isSegmented) {
              debouncedFetchQuestions();
            } else {
              // For single-segment videos, add the question directly
              const newQuestion = payload.new as Question;
              const parsedQuestion = {
                ...newQuestion,
                options: parseOptionsWithTrueFalse(newQuestion.options || [], newQuestion.type)
              };
              
              setQuestions(prev => {
                const exists = prev.some(q => q.id === parsedQuestion.id);
                if (!exists) {
                  const updated = [...prev, parsedQuestion].sort((a, b) => a.timestamp - b.timestamp);
                  toast({
                    title: "New question generated!",
                    description: `Question ${updated.length} of ${questionCount > 0 ? questionCount : '?'} ready`,
                  });
                  return updated;
                }
                return prev;
              });
            }
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
      .channel(`question_plans_${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'question_plans',
          filter: `course_id=eq.${courseId}`
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
  }, [courseId, isProcessing, totalSegments, coursePublished, isSegmented, questionCount, debouncedFetchQuestions, setQuestions, setSegmentQuestionCounts, setCourse, setIsProcessing, toast]);

  // Single consolidated polling mechanism for fallback (when real-time doesn't work)
  useEffect(() => {
    if (!courseId || !isProcessing) return;
    
    // Only use polling as a fallback - less frequent than real-time updates
    console.log('🔄 Setting up fallback polling (every 10 seconds)');
    
    const pollInterval = setInterval(() => {
      console.log('📊 Fallback poll: Checking for updates');
      if (isSegmented) {
        fetchSegmentQuestionsRef.current(true); // Include incomplete segments
      } else {
        fetchQuestionsRef.current();
      }
    }, 10000); // Poll every 10 seconds (reduced from 5 seconds)
    
    return () => {
      console.log('🔌 Clearing fallback polling interval');
      clearInterval(pollInterval);
    };
  }, [courseId, isProcessing, isSegmented]);

  // Check if course should be published (for async question generation)
  useEffect(() => {
    if (!courseId || !isProcessing || coursePublished) return;
    
    // For courses that were generated without a user on the page,
    // we need to periodically check if they've been published
    console.log('📡 Setting up periodic check for stuck courses');
    
    // Check immediately
    const checkPublishStatus = async () => {
      try {
        const response = await fetch(`/api/course/${courseId}`);
        const data = await response.json();
        
        if (data.success && data.course && data.course.published) {
          console.log('✅ Course has been published!');
          setCourse(data.course);
          setIsProcessing(false);
          
          // Fetch questions
          if (isSegmented) {
            await fetchSegmentQuestionsRef.current(false); // Only completed segments for published course
          } else {
            await fetchQuestionsRef.current();
          }
        }
      } catch (error) {
        console.error('Error checking course status:', error);
      }
    };
    
    // Check immediately
    checkPublishStatus();
    
    // Then check every 15 seconds (less frequent than before)
    const interval = setInterval(checkPublishStatus, 15000);
    
    return () => clearInterval(interval);
  }, [courseId, isProcessing, coursePublished, isSegmented, setCourse, setIsProcessing]);
} 