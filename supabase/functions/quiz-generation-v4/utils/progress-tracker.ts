/**
 * Progress Tracking Utility for Quiz Generation Pipeline v4.0
 * 
 * Provides real-time progress updates to the frontend during video processing
 * using Supabase Realtime and structured progress tracking.
 */

// =============================================================================
// Progress Tracking Types
// =============================================================================

export interface ProgressUpdate {
  stage: 'initialization' | 'planning' | 'generation' | 'quality_verification' | 'storage' | 'completed' | 'failed';
  stage_progress: number; // 0.0 to 1.0
  overall_progress: number; // 0.0 to 1.0
  current_step: string;
  details?: Record<string, any>;
}

export interface QuestionProgressUpdate {
  question_id: string;
  question_type: string;
  status: 'planned' | 'generating' | 'completed' | 'failed' | 'validating';
  progress: number; // 0.0 to 1.0
  reasoning?: string;
  provider_used?: string;
  processing_time_ms?: number;
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface StageDefinition {
  stage: string;
  display_name: string;
  description: string;
  estimated_duration_seconds: number;
  weight: number;
  order_index: number;
}

// =============================================================================
// Progress Tracker Class
// =============================================================================

export class ProgressTracker {
  private supabaseClient: any;
  private courseId: string;
  private sessionId: string;
  private stageWeights: Map<string, number> = new Map();
  private currentStage: string = 'initialization';
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

  // =============================================================================
  // Main Progress Tracking Methods
  // =============================================================================

  async updateProgress(update: ProgressUpdate): Promise<void> {
    try {
      console.log(`📊 Progress Update [${this.sessionId}]: ${update.stage} - ${Math.round(update.overall_progress * 100)}%`);
      console.log(`   🎯 Step: ${update.current_step}`);
      
      this.currentStage = update.stage;
      
      const { error } = await this.supabaseClient
        .from('processing_progress')
        .upsert({
          course_id: this.courseId,
          session_id: this.sessionId,
          stage: update.stage,
          stage_progress: update.stage_progress,
          overall_progress: update.overall_progress,
          current_step: update.current_step,
          details: update.details || {}
        }, {
          onConflict: 'course_id,session_id'
        });

      if (error) {
        console.error('❌ Failed to update progress:', error);
      }
    } catch (error) {
      console.error('❌ Progress tracking error:', error);
    }
  }

  async updateQuestionProgress(update: QuestionProgressUpdate): Promise<void> {
    try {
      console.log(`📝 Question Progress [${update.question_id}]: ${update.status} - ${Math.round(update.progress * 100)}%`);
      if (update.reasoning) {
        console.log(`   🤔 Reasoning: ${update.reasoning.substring(0, 100)}...`);
      }
      
      const { error } = await this.supabaseClient
        .from('question_progress')
        .upsert({
          course_id: this.courseId,
          session_id: this.sessionId,
          question_id: update.question_id,
          question_type: update.question_type,
          status: update.status,
          progress: update.progress,
          reasoning: update.reasoning,
          provider_used: update.provider_used,
          processing_time_ms: update.processing_time_ms,
          error_message: update.error_message,
          metadata: update.metadata || {}
        }, {
          onConflict: 'question_id,session_id'
        });

      if (error) {
        console.error('❌ Failed to update question progress:', error);
      }
    } catch (error) {
      console.error('❌ Question progress tracking error:', error);
    }
  }

  // =============================================================================
  // Stage-Specific Helper Methods
  // =============================================================================

  async startStage(stage: string, step: string, details?: Record<string, any>): Promise<void> {
    const overallProgress = this.calculateOverallProgress(stage, 0.0);
    
    await this.updateProgress({
      stage: stage as any,
      stage_progress: 0.0,
      overall_progress: overallProgress,
      current_step: step,
      details: {
        ...details,
        stage_started_at: new Date().toISOString(),
        elapsed_time_ms: Date.now() - this.startTime
      }
    });
  }

  async updateStageProgress(stage: string, stageProgress: number, step: string, details?: Record<string, any>): Promise<void> {
    const overallProgress = this.calculateOverallProgress(stage, stageProgress);
    
    await this.updateProgress({
      stage: stage as any,
      stage_progress: stageProgress,
      overall_progress: overallProgress,
      current_step: step,
      details: {
        ...details,
        elapsed_time_ms: Date.now() - this.startTime
      }
    });
  }

  async completeStage(stage: string, step: string, details?: Record<string, any>): Promise<void> {
    const overallProgress = this.calculateOverallProgress(stage, 1.0);
    
    await this.updateProgress({
      stage: stage as any,
      stage_progress: 1.0,
      overall_progress: overallProgress,
      current_step: step,
      details: {
        ...details,
        stage_completed_at: new Date().toISOString(),
        elapsed_time_ms: Date.now() - this.startTime
      }
    });
  }

  async markComplete(finalDetails?: Record<string, any>): Promise<void> {
    await this.updateProgress({
      stage: 'completed',
      stage_progress: 1.0,
      overall_progress: 1.0,
      current_step: 'Processing completed successfully',
      details: {
        ...finalDetails,
        completed_at: new Date().toISOString(),
        total_time_ms: Date.now() - this.startTime
      }
    });
  }

  async markFailed(error: string, details?: Record<string, any>): Promise<void> {
    await this.updateProgress({
      stage: 'failed',
      stage_progress: 0.0,
      overall_progress: this.calculateOverallProgress(this.currentStage, 0.0),
      current_step: `Failed: ${error}`,
      details: {
        ...details,
        failed_at: new Date().toISOString(),
        error_message: error,
        elapsed_time_ms: Date.now() - this.startTime
      }
    });
  }

  // =============================================================================
  // Question Progress Helper Methods
  // =============================================================================

  async planQuestion(questionId: string, questionType: string, reasoning: string): Promise<void> {
    await this.updateQuestionProgress({
      question_id: questionId,
      question_type: questionType,
      status: 'planned',
      progress: 0.0,
      reasoning: reasoning
    });
  }

  async startQuestionGeneration(questionId: string, questionType: string, reasoning: string, provider?: string): Promise<void> {
    await this.updateQuestionProgress({
      question_id: questionId,
      question_type: questionType,
      status: 'generating',
      progress: 0.5,
      reasoning: reasoning,
      provider_used: provider
    });
  }

  async completeQuestion(questionId: string, questionType: string, reasoning: string, provider: string, processingTime: number): Promise<void> {
    await this.updateQuestionProgress({
      question_id: questionId,
      question_type: questionType,
      status: 'completed',
      progress: 1.0,
      reasoning: reasoning,
      provider_used: provider,
      processing_time_ms: processingTime
    });
  }

  async failQuestion(questionId: string, questionType: string, error: string, provider?: string): Promise<void> {
    await this.updateQuestionProgress({
      question_id: questionId,
      question_type: questionType,
      status: 'failed',
      progress: 0.0,
      error_message: error,
      provider_used: provider
    });
  }

  async validateQuestion(questionId: string, questionType: string, reasoning: string): Promise<void> {
    await this.updateQuestionProgress({
      question_id: questionId,
      question_type: questionType,
      status: 'validating',
      progress: 0.8,
      reasoning: reasoning
    });
  }

  // =============================================================================
  // Utility Methods
  // =============================================================================

  private calculateOverallProgress(currentStage: string, stageProgress: number): number {
    const stageOrder = ['initialization', 'planning', 'generation', 'quality_verification', 'storage'];
    const currentIndex = stageOrder.indexOf(currentStage);
    
    if (currentIndex === -1) return 0.0;
    
    let totalProgress = 0.0;
    
    // Add progress from completed stages
    for (let i = 0; i < currentIndex; i++) {
      totalProgress += this.stageWeights.get(stageOrder[i]) || 0.0;
    }
    
    // Add progress from current stage
    const currentStageWeight = this.stageWeights.get(currentStage) || 0.0;
    totalProgress += currentStageWeight * stageProgress;
    
    return Math.min(1.0, Math.max(0.0, totalProgress));
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getCourseId(): string {
    return this.courseId;
  }

  getElapsedTime(): number {
    return Date.now() - this.startTime;
  }
}

// =============================================================================
// Factory Function
// =============================================================================

export const createProgressTracker = (supabaseClient: any, courseId: string, sessionId?: string): ProgressTracker => {
  const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🚀 Creating progress tracker for course ${courseId} with session ${finalSessionId}`);
  return new ProgressTracker(supabaseClient, courseId, finalSessionId);
};

// =============================================================================
// Progress Tracking Integration Helpers
// =============================================================================

export const withProgressTracking = async <T>(
  tracker: ProgressTracker,
  stage: string,
  operation: () => Promise<T>,
  stepDescription: string
): Promise<T> => {
  await tracker.startStage(stage, stepDescription);
  
  try {
    const result = await operation();
    await tracker.completeStage(stage, `${stepDescription} - Completed`);
    return result;
  } catch (error) {
    await tracker.markFailed(`${stepDescription} failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}; 