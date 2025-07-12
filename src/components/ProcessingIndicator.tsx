import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface ProcessingIndicatorProps {
  isSegmented: boolean;
  totalSegments: number;
  completedSegments: number;
  questionCount: number;
}

export default function ProcessingIndicator({
  isSegmented,
  totalSegments,
  completedSegments,
  questionCount
}: ProcessingIndicatorProps) {
  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            <strong>Questions are being generated!</strong> You can start watching the video now - questions will appear automatically when ready.
          </AlertDescription>
        </div>
        
        {/* Segment Progress */}
        {isSegmented && totalSegments > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700 dark:text-blue-300">
                {totalSegments === 1 ? 'Processing Status' : `Segment Progress: ${completedSegments} of ${totalSegments} completed`}
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                {Math.round((completedSegments / totalSegments) * 100)}%
              </span>
            </div>
            <Progress value={(completedSegments / totalSegments) * 100} className="h-2" />
            
            {questionCount > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {questionCount} question{questionCount !== 1 ? 's' : ''} ready to answer!
              </p>
            )}
          </div>
        )}
      </div>
    </Alert>
  );
} 