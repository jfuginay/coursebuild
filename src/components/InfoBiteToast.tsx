import React, { useEffect, useState } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoBiteToastProps {
  text: string;
  timestamp?: number;
  onDismiss: () => void;
  onTimestampClick?: (timestamp: number) => void;
  autoHideDuration?: number; // milliseconds
}

export default function InfoBiteToast({
  text,
  timestamp,
  onDismiss,
  onTimestampClick,
  autoHideDuration = 10000,
}: InfoBiteToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar animation
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [autoHideDuration]);

  const handleTimestampClick = () => {
    if (timestamp !== undefined && onTimestampClick) {
      onTimestampClick(timestamp);
      onDismiss();
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-w-sm overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-50 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                InfoBite
              </span>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {text}
          </p>

          {/* Timestamp link (optional) */}
          {timestamp !== undefined && onTimestampClick && (
            <button
              onClick={handleTimestampClick}
              className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 transition-colors"
            >
              <span>Jump to relevant section</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}