import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  showCount?: boolean;
  totalRatings?: number;
  animated?: boolean;
  className?: string;
}

export default function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'medium',
  showValue = false,
  showCount = false,
  totalRatings = 0,
  animated = true,
  className
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = useCallback(async (rating: number) => {
    if (readonly || !onChange || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onChange(rating);
    } finally {
      setIsSubmitting(false);
    }
  }, [readonly, onChange, isSubmitting]);

  const handleMouseEnter = useCallback((star: number) => {
    if (!readonly && !isSubmitting) {
      setHoverValue(star);
    }
  }, [readonly, isSubmitting]);

  const handleMouseLeave = useCallback(() => {
    if (!readonly && !isSubmitting) {
      setHoverValue(0);
    }
  }, [readonly, isSubmitting]);

  const currentValue = hoverValue || value;

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-5 h-5',
    large: 'w-7 h-7 sm:w-6 sm:h-6' // Larger on mobile for better touch targets
  };

  const touchTargetClasses = {
    small: 'p-1',
    medium: 'p-1.5', 
    large: 'p-2' // Extra padding for touch targets
  };

  const gapClasses = {
    small: 'gap-0.5',
    medium: 'gap-1',
    large: 'gap-1.5'
  };

  return (
    <div className={cn('flex items-center', gapClasses[size], className)}>
      {/* Star Rating Container */}
      <div className={cn('flex items-center', gapClasses[size])}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= currentValue;
          const isPartiallyFilled = star - 0.5 <= currentValue && star > currentValue;
          
          return (
            <button
              key={star}
              type="button"
              className={cn(
                'relative transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded-sm touch-manipulation',
                touchTargetClasses[size],
                !readonly && !isSubmitting && 'hover:scale-110 cursor-pointer active:scale-95',
                readonly && 'cursor-default',
                isSubmitting && 'cursor-not-allowed opacity-50',
                animated && 'transform'
              )}
              onMouseEnter={() => handleMouseEnter(star)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleRate(star)}
              disabled={readonly || isSubmitting}
              aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-all duration-200 ease-out',
                  isFilled ? 'text-[#fdd686] fill-[#fdd686]' : 'text-gray-300',
                  !readonly && !isSubmitting && 'hover:text-[#fdd686]/80'
                )}
              />
              
              {/* Partial fill overlay for fractional ratings */}
              {isPartiallyFilled && (
                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star
                    className={cn(
                      sizeClasses[size],
                      'text-[#fdd686] fill-[#fdd686] transition-all duration-200 ease-out'
                    )}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Rating Value Display */}
      {showValue && value > 0 && (
        <span className="text-sm font-medium text-gray-700 ml-2">
          {value.toFixed(1)}
        </span>
      )}

      {/* Rating Count Display */}
      {showCount && totalRatings > 0 && (
        <span className="text-sm text-gray-500 ml-1">
          ({totalRatings.toLocaleString()})
        </span>
      )}
    </div>
  );
}

// Rating Modal Component for Overlay Display
interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: (rating: number) => void;
  courseTitle?: string;
  position?: 'center' | 'floating';
  autoHide?: number; // milliseconds
}

export function RatingModal({ 
  isOpen, 
  onClose, 
  onRate, 
  courseTitle,
  position = 'center',
  autoHide = 8000 
}: RatingModalProps) {
  const [selectedRating, setSelectedRating] = useState(0);

  React.useEffect(() => {
    if (isOpen && autoHide > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoHide, onClose]);

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    onRate(rating);
    // Close after short delay to show selection
    setTimeout(onClose, 500);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 max-w-sm mx-4 sm:mx-auto">
      <div className="text-center space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          🎉 Course Complete!
        </h3>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
          Please rate your experience
        </p>
        {courseTitle && (
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate px-2">
            {courseTitle}
          </p>
        )}
        
        <div className="flex justify-center py-2">
          <StarRating
            value={selectedRating}
            onChange={handleRate}
            size="large"
            animated={true}
            className="touch-manipulation" // Improves touch targets on mobile
          />
        </div>
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Click a star to rate this course (1-5 stars)
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Your feedback helps improve the learning experience
        </p>
      </div>
    </div>
  );

  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        position === 'floating' ? 'pointer-events-none' : 'bg-black bg-opacity-25'
      )}
      onClick={position === 'center' ? onClose : undefined}
    >
      <div 
        className={cn(
          'pointer-events-auto',
          position === 'floating' && 'mb-20' // Float above video controls
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {modalContent}
      </div>
    </div>
  );
}

// Compact Star Display for Course Cards
interface CompactStarRatingProps {
  rating: number;
  totalRatings?: number;
  className?: string;
  showRatingText?: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export function CompactStarRating({ 
  rating, 
  totalRatings, 
  className, 
  showRatingText = true,
  size = 'sm'
}: CompactStarRatingProps) {
  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-4 h-4'
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm'
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sizeClasses[size],
              star <= rating ? 'text-[#fdd686] fill-[#fdd686]' : 'text-gray-300'
            )}
          />
        ))}
      </div>
      {showRatingText && (
        <span className={cn(textSizeClasses[size], 'font-medium text-gray-700 dark:text-gray-300')}>
          {rating.toFixed(1)}
        </span>
      )}
      {totalRatings && totalRatings > 0 && (
        <span className={cn(textSizeClasses[size], 'text-gray-500 dark:text-gray-400')}>
          ({totalRatings})
        </span>
      )}
    </div>
  );
}

// Rating Trigger Hook for Smart Timing
export function useRatingTrigger(courseId: string) {
  const [shouldShowRating, setShouldShowRating] = useState(false);
  const [engagementScore, setEngagementScore] = useState(0);
  const [hasRated, setHasRated] = useState(false);

  const trackEngagement = useCallback((event: {
    type: 'correct_answer' | 'video_pause' | 'course_completion' | 'video_seek';
    value?: number;
    duration?: number;
  }) => {
    if (hasRated) return;

    setEngagementScore(prev => {
      let newScore = prev;
      
      switch (event.type) {
        case 'correct_answer':
          newScore += 10;
          break;
        case 'video_pause':
          if (event.duration && event.duration > 10000) { // 10+ seconds
            newScore += 5;
          }
          break;
        case 'course_completion':
          newScore += 20;
          setShouldShowRating(true);
          break;
        case 'video_seek':
          newScore += 2;
          break;
      }

      // Trigger micro-rating at high engagement
      if (newScore >= 30 && !shouldShowRating) {
        setShouldShowRating(true);
      }

      return Math.min(newScore, 100); // Cap at 100
    });
  }, [hasRated, shouldShowRating]);

  const dismissRating = useCallback(() => {
    setShouldShowRating(false);
  }, []);

  const markAsRated = useCallback(() => {
    setHasRated(true);
    setShouldShowRating(false);
  }, []);

  return {
    shouldShowRating,
    engagementScore,
    hasRated,
    trackEngagement,
    dismissRating,
    markAsRated
  };
}