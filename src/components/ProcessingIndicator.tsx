import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface ProcessingIndicatorProps {
  isSegmented: boolean;
  totalSegments: number;
  completedSegments: number;
  questionCount: number;
  segmentQuestionCounts?: Record<number, { planned: number; generated: number }>;
}

export default function ProcessingIndicator({
  isSegmented,
  totalSegments,
  completedSegments,
  questionCount,
  segmentQuestionCounts
}: ProcessingIndicatorProps) {
  const progressPercentage = totalSegments > 0 ? (completedSegments / totalSegments) * 100 : 0;
  
  // Calculate total generated questions across all segments
  const totalGeneratedQuestions = segmentQuestionCounts 
    ? Object.values(segmentQuestionCounts).reduce((sum, counts) => sum + counts.generated, 0)
    : questionCount;
    
  const totalPlannedQuestions = segmentQuestionCounts
    ? Object.values(segmentQuestionCounts).reduce((sum, counts) => sum + counts.planned, 0)
    : 0;

  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <strong>Questions are being generated...</strong>
            {isSegmented && (
              <span className="ml-2 text-sm">
                ({completedSegments}/{totalSegments} segments complete)
              </span>
            )}
          </AlertDescription>
        </div>
        
        {isSegmented && totalSegments > 1 && (
          <>
            <Progress value={progressPercentage} className="h-2" />
            
            <div className="flex flex-wrap gap-2 mt-1">
              {Array.from({ length: totalSegments }, (_, i) => {
                const segmentCounts = segmentQuestionCounts?.[i];
                const isComplete = i < completedSegments;
                const hasQuestions = segmentCounts && segmentCounts.generated > 0;
                const isProcessing = !isComplete && hasQuestions;
                
                return (
                  <Badge 
                    key={i} 
                    variant={isComplete ? "default" : isProcessing ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    Segment {i + 1}
                    {segmentCounts && (
                      <span className="ml-1">
                        ({segmentCounts.generated}
                        {segmentCounts.planned > 0 && `/${segmentCounts.planned}`})
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </>
        )}
        
        <div className="text-sm text-blue-600 dark:text-blue-400">
          {totalGeneratedQuestions > 0 ? (
            <>
              <strong>{totalGeneratedQuestions}</strong> questions generated
              {totalPlannedQuestions > 0 && totalPlannedQuestions !== totalGeneratedQuestions && (
                <span className="text-blue-500 dark:text-blue-500">
                  {' '}({totalPlannedQuestions} planned)
                </span>
              )}
              {isSegmented && completedSegments < totalSegments && (
                <span className="ml-2 text-blue-500 dark:text-blue-500 italic">
                  • New questions appearing in real-time
                </span>
              )}
            </>
          ) : (
            "Analyzing video content..."
          )}
        </div>
      </div>
    </Alert>
  );
} 