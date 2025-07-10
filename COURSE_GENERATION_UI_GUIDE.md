# Course Generation UI Implementation Guide

## Overview

This guide provides a complete implementation strategy for incorporating real-time course generation updates into the CourseForge AI user interface. The system uses Supabase Realtime for live progress tracking, allowing users to monitor AI-powered course generation in real-time.

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Next.js API   │    │ Supabase Edge   │
│                 │    │                 │    │   Functions     │
│ ProgressTracker │◄──►│ analyze-video-  │◄──►│ quiz-generation │
│   Component     │    │  with-progress  │    │      -v4       │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Supabase        │    │ Supabase        │    │ Progress        │
│ Realtime        │    │ Database        │    │ Tracking        │
│ Subscriptions   │    │ Tables          │    │ Utility         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Flow

1. **User Initiates**: User submits YouTube URL via frontend
2. **API Coordination**: Next.js API creates course record and session
3. **Pipeline Trigger**: API calls Supabase Edge Function with progress tracking
4. **Real-time Updates**: Edge Function updates progress via database triggers
5. **UI Updates**: Frontend receives updates via Supabase Realtime subscriptions

## Backend Implementation

### 1. Database Schema

The progress tracking system uses three main tables:

```sql
-- Main progress tracking table
CREATE TABLE processing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('initialization', 'planning', 'generation', 'quality_verification', 'storage', 'completed', 'failed')),
    stage_progress FLOAT NOT NULL DEFAULT 0.0 CHECK (stage_progress >= 0.0 AND stage_progress <= 1.0),
    overall_progress FLOAT NOT NULL DEFAULT 0.0 CHECK (overall_progress >= 0.0 AND overall_progress <= 1.0),
    current_step TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual question progress tracking
CREATE TABLE question_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'generating', 'completed', 'failed', 'validating')),
    progress FLOAT NOT NULL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0),
    reasoning TEXT,
    provider_used TEXT,
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline stage definitions
CREATE TABLE pipeline_stages (
    stage TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_duration_seconds INTEGER NOT NULL,
    weight FLOAT NOT NULL CHECK (weight >= 0.0),
    order_index INTEGER NOT NULL
);
```

### 2. Progress Tracking Utility

Create a robust progress tracking utility (`supabase/functions/quiz-generation-v4/utils/progress-tracker.ts`):

```typescript
export class ProgressTracker {
  private supabaseClient: any;
  private courseId: string;
  private sessionId: string;
  private stageWeights: Map<string, number>;
  private currentStage: string;
  private startTime: number;

  constructor(supabaseClient: any, courseId: string, sessionId: string) {
    this.supabaseClient = supabaseClient;
    this.courseId = courseId;
    this.sessionId = sessionId;
    this.startTime = Date.now();
    
    // Initialize stage weights for overall progress calculation
    this.stageWeights.set('initialization', 0.05);
    this.stageWeights.set('planning', 0.25);
    this.stageWeights.set('generation', 0.50);
    this.stageWeights.set('quality_verification', 0.15);
    this.stageWeights.set('storage', 0.05);
  }

  async updateProgress(update: ProgressUpdate): Promise<void> {
    // Implementation handles database updates with error handling
  }

  async updateQuestionProgress(update: QuestionProgressUpdate): Promise<void> {
    // Implementation handles individual question progress updates
  }

  // Stage-specific helper methods
  async startStage(stage: string, step: string, details?: Record<string, any>): Promise<void>
  async updateStageProgress(stage: string, stageProgress: number, step: string, details?: Record<string, any>): Promise<void>
  async completeStage(stage: string, step: string, details?: Record<string, any>): Promise<void>
  async markComplete(finalDetails?: Record<string, any>): Promise<void>
  async markFailed(error: string, details?: Record<string, any>): Promise<void>

  // Question progress helper methods
  async planQuestion(questionId: string, questionType: string, reasoning: string): Promise<void>
  async startQuestionGeneration(questionId: string, questionType: string, reasoning: string, provider?: string): Promise<void>
  async completeQuestion(questionId: string, questionType: string, reasoning: string, provider: string, processingTime: number): Promise<void>
  async failQuestion(questionId: string, questionType: string, error: string, provider?: string): Promise<void>
}
```

### 3. API Endpoint Implementation

Create a progress-enabled API endpoint (`src/pages/api/course/analyze-video-with-progress.ts`):

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { course_id, youtube_url, session_id, max_questions = 4 } = req.body;

  // Validate required fields
  if (!course_id || !youtube_url || !session_id) {
    return res.status(400).json({ 
      error: 'Missing required fields: course_id, youtube_url, and session_id are required' 
    });
  }

  try {
    // Initialize progress tracking
    await supabase.from('processing_progress').upsert({
      course_id,
      session_id,
      stage: 'initialization',
      stage_progress: 0.0,
      overall_progress: 0.0,
      current_step: 'Starting video analysis pipeline',
      details: {
        youtube_url,
        max_questions,
        started_at: new Date().toISOString()
      }
    });

    // Call the quiz generation pipeline
    const pipelineResponse = await fetch(`${supabaseUrl}/functions/v1/quiz-generation-v4`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey
      },
      body: JSON.stringify({
        course_id,
        youtube_url,
        session_id,
        max_questions
      })
    });

    // Handle pipeline response and update final progress
    if (pipelineResponse.ok) {
      const result = await pipelineResponse.json();
      
      // Mark as completed
      await supabase.from('processing_progress').upsert({
        course_id,
        session_id,
        stage: 'completed',
        stage_progress: 1.0,
        overall_progress: 1.0,
        current_step: 'Video processing completed successfully',
        details: {
          completed_at: new Date().toISOString(),
          total_questions: result.final_questions?.length || 0
        }
      });

      return res.status(200).json({
        success: true,
        session_id,
        course_id,
        pipeline_result: result
      });
    }

  } catch (error) {
    // Handle errors and update progress to failed state
    await supabase.from('processing_progress').upsert({
      course_id,
      session_id,
      stage: 'failed',
      stage_progress: 0.0,
      overall_progress: 0.05,
      current_step: 'System error occurred',
      details: {
        error_message: error.message,
        failed_at: new Date().toISOString()
      }
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

### 4. Edge Function Integration

In your Supabase Edge Function, integrate the progress tracker:

```typescript
import { createProgressTracker } from './utils/progress-tracker.ts';

export default async function handler(req: Request) {
  const { course_id, youtube_url, session_id, max_questions } = await req.json();
  
  // Initialize progress tracker
  const tracker = createProgressTracker(supabaseClient, course_id, session_id);
  
  try {
    // Stage 1: Planning
    await tracker.startStage('planning', 'Analyzing video content and planning question types');
    
    // Perform video analysis
    const plan = await analyzeVideoAndPlan(youtube_url, max_questions);
    
    await tracker.completeStage('planning', 'Video analysis complete, question plan generated', {
      total_questions: plan.questions.length,
      question_types: plan.questions.map(q => q.type)
    });

    // Stage 2: Generation
    await tracker.startStage('generation', 'Generating questions using AI providers');
    
    const generatedQuestions = [];
    
    for (let i = 0; i < plan.questions.length; i++) {
      const questionPlan = plan.questions[i];
      const questionId = `q${i + 1}_${questionPlan.type}_${questionPlan.timestamp}`;
      
      // Track individual question progress
      await tracker.planQuestion(questionId, questionPlan.type, questionPlan.reasoning);
      
      try {
        await tracker.startQuestionGeneration(questionId, questionPlan.type, questionPlan.reasoning, 'gemini');
        
        const startTime = Date.now();
        const question = await generateQuestion(questionPlan);
        const processingTime = Date.now() - startTime;
        
        await tracker.completeQuestion(questionId, questionPlan.type, questionPlan.reasoning, 'gemini', processingTime);
        
        generatedQuestions.push(question);
        
        // Update overall generation progress
        const stageProgress = (i + 1) / plan.questions.length;
        await tracker.updateStageProgress('generation', stageProgress, 
          `Generated ${i + 1}/${plan.questions.length} questions`);
        
      } catch (error) {
        await tracker.failQuestion(questionId, questionPlan.type, error.message, 'gemini');
      }
    }
    
    await tracker.completeStage('generation', 'Question generation completed');
    
    // Stage 3: Storage
    await tracker.startStage('storage', 'Saving questions to database');
    
    // Save questions to database
    await saveQuestions(generatedQuestions);
    
    await tracker.completeStage('storage', 'Questions saved successfully');
    
    // Mark complete
    await tracker.markComplete({
      total_questions: generatedQuestions.length,
      success_rate: generatedQuestions.length / plan.questions.length
    });
    
    return new Response(JSON.stringify({
      success: true,
      final_questions: generatedQuestions
    }));
    
  } catch (error) {
    await tracker.markFailed(error.message);
    throw error;
  }
}
```

## Frontend Implementation

### 1. ProgressTracker Component

Create a comprehensive progress tracking component (`src/components/ProgressTracker.tsx`):

```typescript
interface ProgressTrackerProps {
  courseId: string;
  sessionId: string;
  onComplete?: (questions: any[]) => void;
  onError?: (error: string) => void;
}

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

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // Subscribe to processing progress updates
    const progressChannel = supabase
      .channel('processing-progress')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'processing_progress',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setProcessingProgress(payload.new as ProcessingProgress);
        
        if (payload.new.stage === 'completed') {
          onComplete?.(questionProgress);
        } else if (payload.new.stage === 'failed') {
          onError?.(payload.new.details?.error_message || 'Processing failed');
        }
      })
      .subscribe();

    // Subscribe to question progress updates
    const questionChannel = supabase
      .channel('question-progress')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'question_progress',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        const newQuestionProgress = payload.new as QuestionProgress;
        setQuestionProgress(prev => {
          const existing = prev.find(q => q.question_id === newQuestionProgress.question_id);
          return existing 
            ? prev.map(q => q.question_id === newQuestionProgress.question_id ? newQuestionProgress : q)
            : [...prev, newQuestionProgress];
        });
      })
      .subscribe();

    setIsConnected(true);

    return () => {
      progressChannel.unsubscribe();
      questionChannel.unsubscribe();
    };
  }, [sessionId, supabase]);

  // UI rendering with progress bars, stage indicators, question details
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
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{processingProgress?.current_step || 'Initializing...'}</span>
              <span>{Math.round((processingProgress?.overall_progress || 0) * 100)}%</span>
            </div>
            <Progress value={(processingProgress?.overall_progress || 0) * 100} />
          </div>
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
              {questionProgress.map((question) => (
                <div key={question.question_id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getQuestionStatusIcon(question.status)}
                      <span className="font-medium text-sm">{question.question_id}</span>
                      <Badge variant="outline">{question.question_type}</Badge>
                      {question.provider_used && (
                        <Badge className={getProviderBadgeColor(question.provider_used)}>
                          {question.provider_used}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Progress value={question.progress * 100} className="h-1 mt-2" />
                  
                  {question.reasoning && (
                    <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded mt-2">
                      💭 {question.reasoning}
                    </div>
                  )}
                  
                  {question.error_message && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
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
```

### 2. Integration Page

Create a demo page showing the integration (`src/pages/create-with-progress.tsx`):

```typescript
export default function CreateWithProgress() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const router = useRouter();

  const handleCreateCourse = async () => {
    if (!youtubeUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    try {
      setIsProcessing(true);
      
      // Create course record
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: `Course from ${youtubeUrl}`,
          youtube_url: youtubeUrl,
          status: 'processing'
        })
        .select()
        .single();

      if (courseError) throw new Error(courseError.message);

      setCourseId(courseData.id);

      // Generate session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Start processing with progress tracking
      const response = await fetch('/api/course/analyze-video-with-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: courseData.id,
          youtube_url: youtubeUrl,
          session_id: newSessionId,
          max_questions: 4
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }

      toast.success('Video processing started! Watch the progress below.');

    } catch (error) {
      console.error('Course creation failed:', error);
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  const handleProcessingComplete = (questions: any[]) => {
    setIsProcessing(false);
    toast.success('Course created successfully!');
    
    setTimeout(() => {
      if (courseId) {
        router.push(`/course/${courseId}`);
      }
    }, 2000);
  };

  const handleProcessingError = (error: string) => {
    setIsProcessing(false);
    toast.error(`Processing failed: ${error}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Creation with Progress Tracking
          </h1>
          <p className="text-gray-600">
            Create an interactive course from a YouTube video and watch the AI processing in real-time
          </p>
        </div>

        {/* Course Creation Form */}
        {!isProcessing && !sessionId && (
          <Card className="max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <Button 
                onClick={handleCreateCourse} 
                className="w-full"
                disabled={!youtubeUrl}
              >
                Create Course with Progress Tracking
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Tracking Display */}
        {isProcessing && sessionId && courseId && (
          <ProgressTracker
            courseId={courseId}
            sessionId={sessionId}
            onComplete={handleProcessingComplete}
            onError={handleProcessingError}
          />
        )}
      </div>
    </div>
  );
}
```

## Integration Patterns

### 1. Session Management

```typescript
// Generate unique session ID for each processing session
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Track sessions in localStorage for persistence
const saveSession = (sessionId: string, courseId: string) => {
  localStorage.setItem('current_session', JSON.stringify({
    sessionId,
    courseId,
    timestamp: Date.now()
  }));
};

// Restore session on page reload
const restoreSession = () => {
  const saved = localStorage.getItem('current_session');
  if (saved) {
    const { sessionId, courseId, timestamp } = JSON.parse(saved);
    // Only restore if less than 1 hour old
    if (Date.now() - timestamp < 3600000) {
      return { sessionId, courseId };
    }
  }
  return null;
};
```

### 2. Error Handling

```typescript
// Comprehensive error handling in progress tracker
const handleProgressError = (error: any, context: string) => {
  console.error(`Progress tracking error in ${context}:`, error);
  
  // Log to external monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
    logError(error, { context, sessionId, courseId });
  }
  
  // Update UI with user-friendly error
  toast.error(`Processing ${context} failed. Please try again.`);
};

// Retry logic for failed operations
const retryOperation = async (operation: () => Promise<any>, maxRetries: number = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};
```

### 3. Real-time Connection Management

```typescript
// Connection state management
const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

// Monitor connection health
useEffect(() => {
  const channel = supabase.channel('connection-monitor');
  
  channel.on('system', { event: 'connected' }, () => {
    setConnectionState('connected');
  });
  
  channel.on('system', { event: 'disconnected' }, () => {
    setConnectionState('disconnected');
  });
  
  channel.subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);

// Reconnection logic
const reconnectRealtime = async () => {
  try {
    await supabase.removeAllChannels();
    // Re-establish subscriptions
    setupProgressSubscriptions();
  } catch (error) {
    console.error('Reconnection failed:', error);
  }
};
```

## Best Practices

### 1. Performance Optimization

```typescript
// Debounce rapid progress updates
const debouncedProgressUpdate = useMemo(
  () => debounce((update: ProgressUpdate) => {
    updateProgressState(update);
  }, 100),
  []
);

// Efficient state updates
const updateQuestionProgress = useCallback((newProgress: QuestionProgress) => {
  setQuestionProgress(prev => {
    const index = prev.findIndex(q => q.question_id === newProgress.question_id);
    if (index >= 0) {
      const updated = [...prev];
      updated[index] = newProgress;
      return updated;
    }
    return [...prev, newProgress];
  });
}, []);

// Virtualize large lists
const VirtualizedQuestionList = ({ questions }: { questions: QuestionProgress[] }) => {
  return (
    <FixedSizeList
      height={400}
      itemCount={questions.length}
      itemSize={80}
    >
      {({ index, style }) => (
        <div style={style}>
          <QuestionProgressItem question={questions[index]} />
        </div>
      )}
    </FixedSizeList>
  );
};
```

### 2. User Experience Enhancements

```typescript
// Smooth progress animations
const AnimatedProgress = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => {
      setDisplayValue(prev => {
        const diff = value - prev;
        if (Math.abs(diff) < 0.1) return value;
        return prev + diff * 0.1;
      });
    }, 16);
    
    return () => clearInterval(timer);
  }, [value]);
  
  return <Progress value={displayValue} />;
};

// Contextual messaging
const getContextualMessage = (stage: string, progress: number) => {
  switch (stage) {
    case 'planning':
      return progress < 0.5 
        ? 'Analyzing video content...' 
        : 'Planning question types and timestamps...';
    case 'generation':
      return progress < 0.3 
        ? 'Generating multiple choice questions...' 
        : progress < 0.7 
        ? 'Creating interactive hotspot questions...' 
        : 'Finalizing question content...';
    default:
      return 'Processing...';
  }
};
```

### 3. Error Recovery

```typescript
// Graceful degradation for connection issues
const ProgressTrackerWithFallback = ({ courseId, sessionId }: ProgressTrackerProps) => {
  const [fallbackMode, setFallbackMode] = useState(false);
  
  const handleConnectionError = () => {
    setFallbackMode(true);
    
    // Start polling fallback
    const pollProgress = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('processing_progress')
          .select('*')
          .eq('session_id', sessionId)
          .single();
        
        if (data) {
          setProcessingProgress(data);
          if (data.stage === 'completed' || data.stage === 'failed') {
            clearInterval(pollProgress);
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);
  };
  
  return fallbackMode ? (
    <PollingProgressTracker courseId={courseId} sessionId={sessionId} />
  ) : (
    <RealtimeProgressTracker 
      courseId={courseId} 
      sessionId={sessionId} 
      onConnectionError={handleConnectionError}
    />
  );
};
```

## Testing Strategy

### 1. Unit Tests

```typescript
// Test progress calculations
describe('ProgressTracker', () => {
  test('calculates overall progress correctly', () => {
    const tracker = new ProgressTracker(mockSupabase, 'course-1', 'session-1');
    expect(tracker.calculateOverallProgress('planning', 0.5)).toBe(0.175);
  });
  
  test('handles stage transitions', async () => {
    const tracker = new ProgressTracker(mockSupabase, 'course-1', 'session-1');
    await tracker.startStage('generation', 'Starting generation');
    expect(mockSupabase.from).toHaveBeenCalledWith('processing_progress');
  });
});
```

### 2. Integration Tests

```typescript
// Test end-to-end flow
describe('Course Creation with Progress', () => {
  test('completes full processing pipeline', async () => {
    const { getByText, getByRole } = render(<CreateWithProgress />);
    
    // Fill form
    fireEvent.change(getByRole('textbox'), { 
      target: { value: 'https://youtube.com/watch?v=test' } 
    });
    
    // Submit
    fireEvent.click(getByText('Create Course with Progress Tracking'));
    
    // Wait for progress to appear
    await waitFor(() => {
      expect(getByText('Video Processing Progress')).toBeInTheDocument();
    });
    
    // Mock progress updates
    act(() => {
      mockProgressUpdate({ stage: 'planning', progress: 0.5 });
    });
    
    await waitFor(() => {
      expect(getByText('50%')).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting Guide

### Common Issues

1. **Real-time Connection Fails**
   - Check Supabase project settings
   - Verify RLS policies allow read access
   - Ensure proper authentication

2. **Progress Updates Stop**
   - Check Edge Function logs
   - Verify database connection in progress tracker
   - Look for rate limiting issues

3. **UI Not Updating**
   - Verify subscription filters are correct
   - Check for JavaScript errors in console
   - Ensure proper state management

### Debugging Tools

```typescript
// Debug progress tracking
const debugProgressTracker = (tracker: ProgressTracker) => {
  console.log('Progress Tracker Debug Info:');
  console.log('- Course ID:', tracker.getCourseId());
  console.log('- Session ID:', tracker.getSessionId());
  console.log('- Elapsed Time:', tracker.getElapsedTime());
  
  // Add debugging to database operations
  const originalUpdateProgress = tracker.updateProgress;
  tracker.updateProgress = async (update) => {
    console.log('Progress Update:', update);
    return originalUpdateProgress.call(tracker, update);
  };
};

// Monitor subscription health
const monitorSubscriptions = (supabase: SupabaseClient) => {
  const originalChannel = supabase.channel;
  supabase.channel = (name: string) => {
    console.log(`Creating channel: ${name}`);
    const channel = originalChannel.call(supabase, name);
    
    const originalSubscribe = channel.subscribe;
    channel.subscribe = (callback?: (status: string) => void) => {
      console.log(`Subscribing to channel: ${name}`);
      return originalSubscribe.call(channel, (status) => {
        console.log(`Channel ${name} status:`, status);
        callback?.(status);
      });
    };
    
    return channel;
  };
};
```

## Security Considerations

1. **Row Level Security (RLS)**
   - Implement proper RLS policies on progress tables
   - Ensure users can only access their own progress data
   - Service role should have full access for backend operations

2. **Session Validation**
   - Validate session IDs on the backend
   - Implement session expiration
   - Clean up old progress records

3. **Error Information**
   - Don't expose sensitive information in error messages
   - Log detailed errors server-side only
   - Sanitize user inputs

## Future Enhancements

1. **Advanced Analytics**
   - Processing time analytics
   - Success rate tracking
   - Performance metrics dashboard

2. **Enhanced UI Features**
   - Animated progress indicators
   - Sound notifications
   - Mobile responsiveness
   - Dark mode support

3. **Scalability Improvements**
   - Connection pooling
   - Batch progress updates
   - Horizontal scaling support

4. **Additional Integrations**
   - Webhooks for external systems
   - Email notifications
   - Slack integration
   - API endpoints for third-party access

This implementation guide provides a comprehensive foundation for incorporating real-time course generation updates into your UI. The system is designed to be scalable, maintainable, and user-friendly while providing detailed insights into the AI processing pipeline. 