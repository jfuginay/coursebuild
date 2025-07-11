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
  metadata?: Record<string, any>;
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

interface CourseSegment {
  id: string;
  course_id: string;
  segment_index: number;
  start_time: number;
  end_time: number;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  questions_count?: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  error_message?: string;
}

interface Question {
  id: string;
  course_id: string;
  segment_id?: string;
  segment_index?: number;
  timestamp: number;
  question: string;
  type: string;
  options?: string;
  correct_answer: number;
  explanation: string;
  has_visual_asset: boolean;
  frame_timestamp?: number;
  metadata?: string;
}

interface VideoTranscript {
  id: string;
  course_id: string;
  video_summary: string;
  total_duration: number;
  full_transcript: any[];
  key_concepts_timeline: any[];
  metadata?: any;
}

interface ProgressTrackerProps {
  courseId: string;
  sessionId: string;
  onComplete?: (questions: any[]) => void;
  onError?: (error: string) => void;
}

// =============================================================================
// Supabase Client (singleton to avoid recreating on each render)
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  const [segments, setSegments] = useState<CourseSegment[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [transcript, setTranscript] = useState<VideoTranscript | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  // =============================================================================
  // Real-time Subscriptions
  // =============================================================================

  useEffect(() => {
    console.log(`🔄 Setting up real-time progress tracking for session: ${sessionId}`);
    
    // Use unique channel names to avoid conflicts
    const channelPrefix = `${courseId}_${sessionId}`;
    
    // Subscribe to processing progress updates
    const progressChannel = supabase
      .channel(`${channelPrefix}_progress`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quiz_generation_progress',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('📊 Processing progress update:', payload.new);
          setProcessingProgress(payload.new as ProcessingProgress);
          
          // Handle completion
          const progressData = payload.new as ProcessingProgress;
          if (progressData.stage === 'completed') {
            // Fetch all questions for the course
            supabase
              .from('questions')
              .select('*')
              .eq('course_id', courseId)
              .order('timestamp', { ascending: true })
              .then(({ data: questions }) => {
                onComplete?.(questions || []);
              });
          } else if (progressData.stage === 'failed') {
            onError?.(progressData.metadata?.error_message || 'Processing failed');
          }
        }
      )
      .subscribe((status) => {
        console.log('Progress channel status:', status);
      });

    // Subscribe to segment updates if segmented processing
    const segmentChannel = supabase
      .channel(`${channelPrefix}_segments`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'course_segments',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('📊 Segment update:', payload.new);
          const newSegment = payload.new as CourseSegment;
          
          setSegments(prev => {
            const existing = prev.find(s => s.id === newSegment.id);
            if (existing) {
              return prev.map(s => s.id === newSegment.id ? newSegment : s);
            } else {
              return [...prev, newSegment].sort((a, b) => a.segment_index - b.segment_index);
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('Segments channel status:', status);
      });

    // Subscribe to new questions being added
    const questionsChannel = supabase
      .channel(`${channelPrefix}_questions`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'questions',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('❓ New question added:', payload.new);
          const newQuestion = payload.new as Question;
          
          setQuestions(prev => [...prev, newQuestion].sort((a, b) => a.timestamp - b.timestamp));
        }
      )
      .subscribe((status) => {
        console.log('Questions channel status:', status);
      });

    // Subscribe to transcript updates
    const transcriptChannel = supabase
      .channel(`${channelPrefix}_transcript`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_transcripts',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('📝 Transcript update:', payload.new);
          setTranscript(payload.new as VideoTranscript);
        }
      )
      .subscribe((status) => {
        console.log('Transcript channel status:', status);
      });

    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        // Fetch progress - don't use .single() as it might not exist yet
        const { data: progressData, error: progressError } = await supabase
          .from('quiz_generation_progress')
          .select('*')
          .eq('session_id', sessionId)
          .eq('course_id', courseId)
          .limit(1);
        
        if (progressError && progressError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('Error fetching progress:', progressError);
        } else if (progressData && progressData.length > 0) {
          console.log('✅ Initial progress data:', progressData[0]);
          setProcessingProgress(progressData[0]);
        } else {
          console.log('⏳ No progress data found yet, waiting for updates...');
        }

        // Fetch segments if segmented processing
        const { data: segmentData, error: segmentError } = await supabase
          .from('course_segments')
          .select('*')
          .eq('course_id', courseId)
          .order('segment_index', { ascending: true });
        
        if (segmentError && segmentError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('Error fetching segments:', segmentError);
        } else if (segmentData && segmentData.length > 0) {
          console.log('✅ Initial segments data:', segmentData);
          setSegments(segmentData);
        }

        // Fetch existing questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .eq('course_id', courseId)
          .order('timestamp', { ascending: true });
        
        if (questionsError && questionsError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('Error fetching questions:', questionsError);
        } else if (questionsData) {
          console.log('✅ Initial questions data:', questionsData);
          setQuestions(questionsData);
        }

        // Fetch transcript - don't use .single() as it might not exist yet
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('video_transcripts')
          .select('*')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (transcriptError && transcriptError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('Error fetching transcript:', transcriptError);
        } else if (transcriptData && transcriptData.length > 0) {
          console.log('✅ Initial transcript data:', transcriptData[0]);
          setTranscript(transcriptData[0]);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
    setIsConnected(true);

    // Cleanup subscriptions
    return () => {
      console.log('🔌 Cleaning up progress tracking subscriptions');
      progressChannel.unsubscribe();
      segmentChannel.unsubscribe();
      questionsChannel.unsubscribe();
      transcriptChannel.unsubscribe();
    };
  }, [sessionId, courseId, onComplete, onError]); // Fixed dependencies

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
  // Segment Recovery Check (for stuck segments)
  // =============================================================================

  useEffect(() => {
    // Skip if not segmented processing or already completed
    const isSegmentedProcessing = processingProgress?.metadata?.is_segmented || segments.length > 0;
    if (!isSegmentedProcessing || !courseId || processingProgress?.stage === 'completed') {
      return;
    }

    // Check for stuck segments every 30 seconds
    const checkInterval = setInterval(async () => {
      // Only check if we have segments and they're not all completed
      const hasIncompleteSegments = segments.some(s => 
        s.status === 'processing' || s.status === 'pending' || s.status === 'failed'
      );

      if (!hasIncompleteSegments) {
        return;
      }

      // Check if any segment has been processing for too long
      const stuckSegment = segments.find(s => {
        if (s.status !== 'processing' || !s.processing_started_at) {
          return false;
        }
        const processingTime = Date.now() - new Date(s.processing_started_at).getTime();
        return processingTime > 180000; // 3 minutes
      });

      if (stuckSegment) {
        console.log('🔄 Found stuck segment, attempting recovery...');
        
        try {
          const response = await fetch('/api/course/check-segment-processing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ course_id: courseId }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('✅ Recovery initiated:', result.message);
          }
        } catch (error) {
          console.error('Failed to check segment processing:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, [courseId, segments, processingProgress]);

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

  const isSegmented = processingProgress?.metadata?.is_segmented || segments.length > 0;

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

          {processingProgress?.metadata && Object.keys(processingProgress.metadata).length > 0 && (
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              {processingProgress.metadata.total_segments && (
                <div>Total Segments: {processingProgress.metadata.total_segments}</div>
              )}
              {processingProgress.metadata.video_duration && (
                <div>
                  Video Duration: {Math.floor(processingProgress.metadata.video_duration / 60)}m {processingProgress.metadata.video_duration % 60}s
                </div>
              )}
              {processingProgress.metadata.segment_duration && (
                <div>Segment Length: {processingProgress.metadata.segment_duration / 60} minutes</div>
              )}
              <div className="mt-1 font-medium">
                Questions Generated: {questions.length}
                {transcript && transcript.metadata?.segments_processed && (
                  <span className="ml-2">
                    | Transcript Progress: {transcript.metadata.segments_processed}/{processingProgress.metadata.total_segments}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segment Progress */}
      {isSegmented && segments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Segment Processing Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {segments.map((segment) => (
                <div 
                  key={segment.id} 
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {segment.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {segment.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      {segment.status === 'pending' && <Clock className="w-4 h-4 text-gray-400" />}
                      {segment.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500" />}
                      <span className="font-medium text-sm">{segment.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {segment.status}
                      </Badge>
                    </div>
                    {segment.questions_count !== undefined && (
                      <span className="text-xs text-gray-500">
                        {segment.questions_count} questions
                      </span>
                    )}
                  </div>
                  
                  {segment.error_message && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      ❌ {segment.error_message}
                    </div>
                  )}
                  
                  {segment.processing_started_at && segment.processing_completed_at && (
                    <div className="text-xs text-gray-500">
                      Processing time: {
                        Math.round((new Date(segment.processing_completed_at).getTime() - 
                                   new Date(segment.processing_started_at).getTime()) / 1000)
                      }s
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Questions List */}
      {questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {questions.map((q, index) => (
                <div key={q.id} className="border-b pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {q.type}
                      </Badge>
                      {q.segment_index !== undefined && (
                        <Badge variant="secondary" className="text-xs">
                          Segment {q.segment_index + 1}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {Math.floor(q.timestamp / 60)}:{(q.timestamp % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <p className="text-sm mt-1 line-clamp-2">{q.question}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transcript Status */}
      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Transcript Generation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Duration:</span>
                <span>{Math.floor(transcript.total_duration / 60)}m {transcript.total_duration % 60}s</span>
              </div>
              <div className="flex justify-between">
                <span>Transcript Segments:</span>
                <span>{transcript.full_transcript?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Key Concepts:</span>
                <span>{transcript.key_concepts_timeline?.length || 0}</span>
              </div>
              {transcript.metadata?.is_segmented && (
                <div className="flex justify-between">
                  <span>Processing Status:</span>
                  <span>
                    {transcript.metadata.segments_processed} of {transcript.metadata.total_segments} segments
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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