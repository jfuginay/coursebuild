import { useEffect } from 'react';
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
  fetchSegmentQuestions: () => Promise<void>;
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
        },
        (payload) => {
          console.log('📝 New question received via real-time:', payload);
          console.log('📝 Question details:', {
            courseId: payload.new.course_id,
            expectedCourseId: courseId,
            match: payload.new.course_id === courseId
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
  }, [courseId, isProcessing, totalSegments, coursePublished, isSegmented, questionCount]);

  // Additional polling for segmented courses to ensure UI updates
  useEffect(() => {
    if (!courseId || !isProcessing) return;
    
    // Smart polling for segment updates - only when we expect changes
    if (isSegmented) {
      console.log('🔄 Setting up smart segment polling (only while segments are processing)');
      
      // Poll every 5 seconds, but only while segments are still processing
      const pollInterval = setInterval(() => {
        console.log(`📊 Checking for new segment questions`);
        fetchSegmentQuestions();
      }, 5000); // Poll every 5 seconds
      
      return () => {
        console.log('🔌 Clearing segment polling interval');
        clearInterval(pollInterval);
      };
    }
  }, [courseId, isProcessing, isSegmented]);

  // Polling for questions during processing (fallback for real-time)
  useEffect(() => {
    if (!courseId || !isProcessing) return;
    
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
  }, [courseId, isProcessing, coursePublished]);
} 