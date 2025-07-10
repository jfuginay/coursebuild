import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Loader2, Brain, Eye, Zap } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface ProcessingProgress {
  id: string;
  stage: 'initialization' | 'planning' | 'generation' | 'quality_verification' | 'storage' | 'completed' | 'failed';
  stage_progress: number;
  overall_progress: number;
  current_step: string;
  details: Record<string, any>;
  updated_at: string;
}

interface QuestionProgress {
  id: string;
  question_id: string;
  question_type: string;
  status: 'planned' | 'generating' | 'completed' | 'failed' | 'validating';
  progress: number;
  reasoning?: string;
  provider_used?: string;
  processing_time_ms?: number;
  error_message?: string;
  metadata: Record<string, any>;
  updated_at: string;
}

interface ProgressTrackerProps {
  courseId: string;
  sessionId: string;
  onComplete?: (questions: any[]) => void;
  onError?: (error: string) => void;
}

// =============================================================================
// Progress Tracker Component
// =============================================================================

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  courseId,
  sessionId,
  onComplete,
  onError
}) => {
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress | null>(null);
  const [questionProgress, setQuestionProgress] = useState<QuestionProgress[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // =============================================================================
  // Real-time Subscriptions
  // =============================================================================

  useEffect(() => {
    console.log(`🔄 Setting up real-time progress tracking for session: ${sessionId}`);
    
    // Subscribe to processing progress updates
    const progressChannel = supabase
      .channel('processing-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'processing_progress',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📊 Processing progress update:', payload.new);
          setProcessingProgress(payload.new as ProcessingProgress);
          
          // Handle completion
          const progressData = payload.new as ProcessingProgress;
          if (progressData.stage === 'completed') {
            onComplete?.(questionProgress);
          } else if (progressData.stage === 'failed') {
            onError?.(progressData.details?.error_message || 'Processing failed');
          }
        }
      )
      .subscribe();

    // Subscribe to question progress updates
    const questionChannel = supabase
      .channel('question-progress')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'question_progress',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📝 Question progress update:', payload.new);
          const newQuestionProgress = payload.new as QuestionProgress;
          
          setQuestionProgress(prev => {
            const existing = prev.find(q => q.question_id === newQuestionProgress.question_id);
            if (existing) {
              return prev.map(q => 
                q.question_id === newQuestionProgress.question_id ? newQuestionProgress : q
              );
            } else {
              return [...prev, newQuestionProgress];
            }
          });
        }
      )
      .subscribe();

    setIsConnected(true);

    // Cleanup subscriptions
    return () => {
      console.log('🔌 Cleaning up progress tracking subscriptions');
      progressChannel.unsubscribe();
      questionChannel.unsubscribe();
    };
  }, [sessionId, supabase]);

  // =============================================================================
  // Timer Effect
  // =============================================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  // =============================================================================
  // Helper Functions
  // =============================================================================

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'initialization': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'planning': return <Brain className="w-4 h-4" />;
      case 'generation': return <Zap className="w-4 h-4" />;
      case 'quality_verification': return <Eye className="w-4 h-4" />;
      case 'storage': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getQuestionStatusIcon = (status: string) => {
    switch (status) {
      case 'planned': return <Clock className="w-3 h-3 text-blue-500" />;
      case 'generating': return <Loader2 className="w-3 h-3 animate-spin text-orange-500" />;
      case 'validating': return <Eye className="w-3 h-3 text-purple-500" />;
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-500" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getProviderBadgeColor = (provider: string) => {
    switch (provider) {
      case 'openai': return 'bg-green-100 text-green-800';
      case 'gemini': case 'gemini-vision': return 'bg-blue-100 text-blue-800';
      case 'direct-gemini-api': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // =============================================================================
  // Render
  // =============================================================================

  if (!isConnected) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting to progress tracking...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getStageIcon(processingProgress?.stage || 'initialization')}
              <span>Video Processing Progress</span>
            </div>
            <div className="text-sm font-normal text-gray-500">
              {formatTime(elapsedTime)}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{processingProgress?.current_step || 'Initializing...'}</span>
              <span>{Math.round((processingProgress?.overall_progress || 0) * 100)}%</span>
            </div>
            <Progress value={(processingProgress?.overall_progress || 0) * 100} className="w-full" />
          </div>
          
          {processingProgress?.stage && (
            <div className="text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="capitalize">
                  {processingProgress.stage.replace('_', ' ')}
                </Badge>
                <span>{Math.round((processingProgress.stage_progress || 0) * 100)}% complete</span>
              </div>
            </div>
          )}

          {processingProgress?.details && Object.keys(processingProgress.details).length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              {processingProgress.details.total_questions && (
                <div>Total Questions: {processingProgress.details.total_questions}</div>
              )}
              {processingProgress.details.successful_questions !== undefined && (
                <div>
                  Success Rate: {processingProgress.details.successful_questions}/
                  {processingProgress.details.successful_questions + (processingProgress.details.failed_questions || 0)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Question Progress */}
      {questionProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Question Generation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {questionProgress
                .sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
                .map((question) => (
                  <div 
                    key={question.question_id} 
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getQuestionStatusIcon(question.status)}
                        <span className="font-medium text-sm">
                          {question.question_id.replace(/^q\d+_/, '').replace(/_\d+$/, '')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {question.question_type}
                        </Badge>
                        {question.provider_used && (
                          <Badge className={`text-xs ${getProviderBadgeColor(question.provider_used)}`}>
                            {question.provider_used}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {question.processing_time_ms && `${question.processing_time_ms}ms`}
                      </div>
                    </div>

                    <Progress value={question.progress * 100} className="h-1" />

                    {question.reasoning && (
                      <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                        💭 {question.reasoning}
                      </div>
                    )}

                    {question.error_message && (
                      <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                        ❌ {question.error_message}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 