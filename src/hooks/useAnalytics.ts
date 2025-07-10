import { useCallback } from 'react';
import { track } from '@vercel/analytics';
import posthog from 'posthog-js';

interface RatingEvent {
  courseId: string;
  rating: number;
  context: 'completion' | 'mid_course' | 'question_success' | 'manual';
  timeToRate?: number; // milliseconds
  engagementScore?: number;
  platform: 'mobile' | 'desktop';
}

interface FilterEvent {
  filterType: 'rating' | 'category' | 'duration';
  filterValue: string | number;
  resultsCount: number;
  previousFilters?: string[];
}

interface CourseEvent {
  courseId: string;
  action: 'view' | 'start' | 'complete' | 'share' | 'bookmark';
  duration?: number;
  questionsAnswered?: number;
  completionPercentage?: number;
}

export function useAnalytics() {
  const trackRating = useCallback((event: RatingEvent) => {
    // Track with Vercel Analytics
    track('Course Rated', {
      courseId: event.courseId,
      rating: event.rating,
      context: event.context,
      timeToRate: event.timeToRate || undefined,
      platform: event.platform,
      engagementScore: event.engagementScore || undefined
    });

    // Track with PostHog for detailed analytics
    if (posthog.__loaded) {
      posthog.capture('course_rated', {
        course_id: event.courseId,
        rating: event.rating,
        rating_context: event.context,
        time_to_rate_ms: event.timeToRate,
        engagement_score: event.engagementScore,
        platform: event.platform,
        $set: {
          last_rating_date: new Date().toISOString()
        }
      });
    }

    console.log('📊 Rating tracked:', event);
  }, []);

  const trackFilter = useCallback((event: FilterEvent) => {
    // Track with Vercel Analytics
    track('Filter Applied', {
      filterType: event.filterType,
      filterValue: event.filterValue,
      resultsCount: event.resultsCount
    });

    // Track with PostHog
    if (posthog.__loaded) {
      posthog.capture('filter_applied', {
        filter_type: event.filterType,
        filter_value: event.filterValue,
        results_count: event.resultsCount,
        previous_filters: event.previousFilters,
        session_id: posthog.get_session_id()
      });
    }

    console.log('🔍 Filter tracked:', event);
  }, []);

  const trackCourse = useCallback((event: CourseEvent) => {
    // Track with Vercel Analytics
    track('Course Interaction', {
      courseId: event.courseId,
      action: event.action,
      duration: event.duration || undefined,
      completionPercentage: event.completionPercentage || undefined
    });

    // Track with PostHog
    if (posthog.__loaded) {
      posthog.capture(`course_${event.action}`, {
        course_id: event.courseId,
        duration_seconds: event.duration,
        questions_answered: event.questionsAnswered,
        completion_percentage: event.completionPercentage,
        timestamp: Date.now()
      });
    }

    console.log('🎓 Course interaction tracked:', event);
  }, []);

  const trackRatingModalShown = useCallback((courseId: string, trigger: string) => {
    track('Rating Modal Shown', {
      courseId,
      trigger
    });

    if (posthog.__loaded) {
      posthog.capture('rating_modal_shown', {
        course_id: courseId,
        trigger_type: trigger,
        timestamp: Date.now()
      });
    }
  }, []);

  const trackRatingModalDismissed = useCallback((courseId: string, reason: 'timeout' | 'manual' | 'completed') => {
    track('Rating Modal Dismissed', {
      courseId,
      reason
    });

    if (posthog.__loaded) {
      posthog.capture('rating_modal_dismissed', {
        course_id: courseId,
        dismiss_reason: reason,
        timestamp: Date.now()
      });
    }
  }, []);

  const trackEngagement = useCallback((courseId: string, event: {
    type: 'question_answered' | 'video_paused' | 'video_seeked' | 'transcript_clicked';
    value?: number;
    duration?: number;
  }) => {
    if (posthog.__loaded) {
      posthog.capture('course_engagement', {
        course_id: courseId,
        engagement_type: event.type,
        engagement_value: event.value,
        engagement_duration: event.duration,
        timestamp: Date.now()
      });
    }
  }, []);

  // Helper to detect platform
  const getPlatform = useCallback((): 'mobile' | 'desktop' => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 ? 'mobile' : 'desktop';
    }
    return 'desktop';
  }, []);

  return {
    trackRating,
    trackFilter,
    trackCourse,
    trackRatingModalShown,
    trackRatingModalDismissed,
    trackEngagement,
    getPlatform
  };
}