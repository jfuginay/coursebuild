import React, { useEffect, useState } from 'react';
import { X, Lightbulb, ChevronRight, Brain, Zap, HelpCircle, Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InfoBiteCardProps {
  type: 'MICRO_LESSON' | 'ANALOGY' | 'APPLICATION' | 'CLARIFICATION' | 'DEEPER_DIVE';
  text: string;
  timestamp?: number;
  emphasis?: string;
  onDismiss: () => void;
  onTimestampClick?: (timestamp: number) => void;
  autoHideDuration?: number;
}

const typeConfig = {
  MICRO_LESSON: {
    icon: Lightbulb,
    title: 'InfoBite',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800'
  },
  ANALOGY: {
    icon: Brain,
    title: 'Helpful Analogy',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    borderColor: 'border-purple-200 dark:border-purple-800'
  },
  APPLICATION: {
    icon: Zap,
    title: 'Real-World Application',
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800'
  },
  CLARIFICATION: {
    icon: HelpCircle,
    title: 'Clarification',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    borderColor: 'border-orange-200 dark:border-orange-800'
  },
  DEEPER_DIVE: {
    icon: Search,
    title: 'Deeper Insight',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    borderColor: 'border-indigo-200 dark:border-indigo-800'
  }
};

export default function InfoBiteCard({
  type,
  text,
  timestamp,
  emphasis,
  onDismiss,
  onTimestampClick,
  autoHideDuration = 10000,
}: InfoBiteCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  
  const config = typeConfig[type] || typeConfig.MICRO_LESSON;
  const Icon = config.icon;

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

  // Parse text to extract emoji and content
  const emojiMatch = text.match(/^([\u{1F300}-\u{1F9FF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/u);
  const emoji = emojiMatch ? emojiMatch[0] : null;
  const content = emoji ? text.substring(emoji.length).trim() : text;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-4 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      )}
    >
      <Card className={cn(
        "max-w-md overflow-hidden shadow-lg",
        config.borderColor,
        config.bgColor
      )}>
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 dark:bg-gray-700">
          <div
            className={cn("h-full transition-all duration-50 ease-linear", {
              'bg-blue-500': type === 'MICRO_LESSON',
              'bg-purple-500': type === 'ANALOGY',
              'bg-green-500': type === 'APPLICATION',
              'bg-orange-500': type === 'CLARIFICATION',
              'bg-indigo-500': type === 'DEEPER_DIVE'
            })}
            style={{ width: `${progress}%` }}
          />
        </div>

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
                <Icon className={cn("h-5 w-5", config.color)} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {config.title}
                </h3>
                {emphasis && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {emphasis}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-8 w-8 -mt-1 -mr-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex gap-3">
            {emoji && (
              <span className="text-2xl flex-shrink-0 mt-0.5">{emoji}</span>
            )}
            <div className="flex-1">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {content}
              </p>
              
              {/* Timestamp link (optional) */}
              {timestamp !== undefined && onTimestampClick && (
                <button
                  onClick={handleTimestampClick}
                  className={cn(
                    "mt-3 flex items-center gap-1 text-xs transition-colors",
                    config.color,
                    "hover:underline"
                  )}
                >
                  <span>Jump to relevant section</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Visual hint for insight type */}
          <div className="mt-3 flex items-center gap-2">
            <Sparkles className={cn("h-3 w-3", config.color)} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {type === 'ANALOGY' && 'Making it relatable'}
              {type === 'APPLICATION' && 'See it in action'}
              {type === 'CLARIFICATION' && 'Breaking it down'}
              {type === 'DEEPER_DIVE' && 'Going deeper'}
              {type === 'MICRO_LESSON' && 'Key insight'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}