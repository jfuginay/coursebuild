import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface InfoBiteHint {
  type: 'MICRO_LESSON' | 'ANALOGY' | 'APPLICATION' | 'CLARIFICATION' | 'DEEPER_DIVE' | 'noop';
  text?: string;
  timestamp?: number;
  metadata?: {
    source?: string;
    confidence?: number;
    conceptsRelated?: string[];
    insightType?: string;
    emphasis?: string;
  };
}

interface UseInfoBiteOptions {
  courseId: string;
  autonomyLevel: number;
  getCurrentTime: () => number;
  isPlaying: boolean;
  pollingInterval?: number; // Default: 30 seconds
}

interface UseInfoBiteReturn {
  currentHint: InfoBiteHint | null;
  isLoading: boolean;
  error: Error | null;
  dismissHint: () => void;
  wrongAnswerStreak: number;
  reportWrongAnswer: () => void;
  reportCorrectAnswer: () => void;
}

export function useInfoBite({
  courseId,
  autonomyLevel,
  getCurrentTime,
  isPlaying,
  pollingInterval = 30000, // 30 seconds
}: UseInfoBiteOptions): UseInfoBiteReturn {
  const { user } = useAuth();
  const [currentHint, setCurrentHint] = useState<InfoBiteHint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [wrongAnswerStreak, setWrongAnswerStreak] = useState(0);
  
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPollTimeRef = useRef<number>(0);

  // Clean up function
  const cleanup = useCallback(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Dismiss current hint
  const dismissHint = useCallback(() => {
    setCurrentHint(null);
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, []);

  // Report wrong answer
  const reportWrongAnswer = useCallback(async () => {
    if (!user) return;

    const newStreak = wrongAnswerStreak + 1;
    setWrongAnswerStreak(newStreak);

    try {
      // Log wrong answer event
      await supabase
        .from('learner_events')
        .insert({
          user_id: user.id,
          course_id: courseId,
          event_type: 'QUIZ_WRONG',
          video_timestamp: Math.round(getCurrentTime()),
          metadata: { streak: newStreak }
        });

      // If autonomy level is 2 (Guide) and streak is 2+, request immediate hint
      if (autonomyLevel === 2 && newStreak >= 2) {
        console.log('🚨 High wrong answer streak, requesting immediate hint');
        fetchHint(newStreak);
      }
    } catch (err) {
      console.error('Failed to report wrong answer:', err);
    }
  }, [user, courseId, getCurrentTime, wrongAnswerStreak, autonomyLevel]);

  // Report correct answer (resets streak)
  const reportCorrectAnswer = useCallback(() => {
    setWrongAnswerStreak(0);
  }, []);

  // Fetch hint from edge function
  const fetchHint = useCallback(async (currentStreak?: number) => {
    if (!user || !isPlaying || autonomyLevel === 0) return;

    // Prevent too frequent requests
    const now = Date.now();
    if (now - lastPollTimeRef.current < 5000) { // 5 second minimum
      return;
    }
    lastPollTimeRef.current = now;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/inject-insight`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            'x-autonomy-level': autonomyLevel.toString(),
          },
          body: JSON.stringify({
            userId: user.id,
            courseId,
            currentTime: Math.round(getCurrentTime()),
            autonomyLevel,
            wrongAnswerStreak: currentStreak ?? wrongAnswerStreak,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch hint: ${response.statusText}`);
      }

      const hint: InfoBiteHint = await response.json();

      if (hint.type !== 'noop' && hint.text) {
        setCurrentHint(hint);

        // Auto-dismiss after 10-15 seconds depending on insight type
        if (hintTimeoutRef.current) {
          clearTimeout(hintTimeoutRef.current);
        }
        const dismissTime = hint.type === 'CLARIFICATION' ? 15000 : 10000;
        hintTimeoutRef.current = setTimeout(() => {
          dismissHint();
        }, dismissTime);
      }
    } catch (err) {
      console.error('Failed to fetch hint:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [user, isPlaying, autonomyLevel, courseId, getCurrentTime, wrongAnswerStreak, dismissHint]);

  // Set up polling interval
  useEffect(() => {
    if (!user || !isPlaying || autonomyLevel === 0) {
      cleanup();
      return;
    }

    // Initial fetch
    fetchHint();

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      fetchHint();
    }, pollingInterval);

    return cleanup;
  }, [user, isPlaying, autonomyLevel, pollingInterval, fetchHint, cleanup]);

  // Clean up on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    currentHint,
    isLoading,
    error,
    dismissHint,
    wrongAnswerStreak,
    reportWrongAnswer,
    reportCorrectAnswer,
  };
}