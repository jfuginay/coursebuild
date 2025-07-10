/**
 * Comprehensive Type Definitions for Quiz Generation Pipeline v5.0
 * 
 * Defines interfaces for all stages of the question generation process,
 * including planning with transcript generation, generation, quality verification, and final output.
 */

// =============================================================================
// Core Workflow Interfaces
// =============================================================================

export interface CourseAnalysisRequest {
  course_id: string;
  youtube_url: string;
  max_questions?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  focus_topics?: string[];
  enable_visual_questions?: boolean;
  enable_quality_verification?: boolean; // Toggle to enable/disable Stage 3 verification (default: false)
  question_distribution?: QuestionTypeDistribution;
  session_id?: string; // For progress tracking
}

export interface QuestionTypeDistribution {
  'multiple-choice': number;
  'true-false': number;
  'hotspot': number;
  'matching': number;
  'sequencing': number;
}

export interface WorkflowContext {
  course_id: string;
  youtube_url: string;
  video_summary: string;
  total_duration: number;
  request_parameters: CourseAnalysisRequest;
  current_stage: 'planning' | 'generation' | 'verification' | 'complete';
  stage_results: {
    planning?: QuestionPlan[];
    generation?: BaseQuestion[];
    verification?: QualityVerificationResult[];
  };
  error_context?: ErrorContext;
}

export interface ErrorContext {
  stage: string;
  question_id?: string;
  error_type: 'api_error' | 'validation_error' | 'generation_error' | 'verification_error';
  error_message: string;
  retry_count: number;
  timestamp: string;
}

// =============================================================================
// Stage 1: Question Planning Interfaces
// =============================================================================

export interface TranscriptSegment {
  timestamp: number;
  end_timestamp: number;
  text: string;
  visual_description: string;
  is_salient_event: boolean;
  event_type?: string;
}

export interface VideoTranscript {
  full_transcript: TranscriptSegment[];
  key_concepts_timeline: Array<{
    concept: string;
    first_mentioned: number;
    explanation_timestamps: number[];
  }>;
  video_summary: string;
}

export interface QuestionPlan {
  question_id: string;
  timestamp: number;
  question_type: 'multiple-choice' | 'true-false' | 'hotspot' | 'matching' | 'sequencing';
  learning_objective: string;
  content_context: string;
  key_concepts: string[];
  bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  educational_rationale: string;
  planning_notes: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_time_seconds: number;
  
  // Hotspot-specific planning fields
  visual_learning_objective?: string; // What visual skill this develops
  frame_timestamp?: number; // Specific frame for optimal visibility
  target_objects?: string[]; // Objects to identify
  question_context?: string; // Context for visual identification
}

export interface PlanningStageResult {
  success: boolean;
  video_summary: string;
  total_duration: number;
  question_plans: QuestionPlan[];
  video_transcript?: VideoTranscript; // Add transcript data
  planning_metadata: {
    bloom_distribution: Record<string, number>;
    type_distribution: Record<string, number>;
    difficulty_distribution: Record<string, number>;
    content_coverage: string[];
  };
  error?: string;
}

// =============================================================================
// Stage 2: Question Generation Interfaces  
// =============================================================================

// Base Question Interface
export interface BaseQuestion {
  question_id: string;
  timestamp: number;
  type: 'multiple-choice' | 'true-false' | 'hotspot' | 'matching' | 'sequencing';
  question: string;
  explanation: string;
  bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  educational_rationale: string;
}

// Multiple Choice Question
export interface MCQQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
  correct_answer: number; // 0-based index
  misconception_analysis?: {
    [key: string]: string; // option_index -> misconception explanation
  };
}

// True/False Question
export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true-false';
  correct_answer: boolean;
  concept_analysis?: {
    key_concept: string;
    why_important: string;
    common_confusion: string;
  };
  misconception_addressed?: string;
}

// Hotspot Question
export interface HotspotQuestion extends BaseQuestion {
  type: 'hotspot';
  target_objects: string[];
  frame_timestamp: number;
  question_context: string;
  visual_learning_objective?: string;
  distractor_guidance?: {
    expected_distractors: string[];
    why_distractors_matter: string;
  };
  bounding_boxes?: Array<{
    label: string;
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
    width: number; // 0-1 normalized
    height: number; // 0-1 normalized
    confidence_score: number;
    is_correct_answer: boolean;
    educational_significance?: string;
    description?: string;
  }>;
}

// Matching Question
export interface MatchingQuestion extends BaseQuestion {
  type: 'matching';
  matching_pairs: Array<{
    left: string;
    right: string;
  }>;
  relationship_analysis?: {
    relationship_type: 'cause-effect' | 'category-example' | 'process-outcome' | 'theory-application' | 'concept-definition';
    why_important: string;
    common_confusions: string;
  };
  relationship_type: string;
}

// Sequencing Question
export interface SequencingQuestion extends BaseQuestion {
  type: 'sequencing';
  sequence_items: string[];
  sequence_analysis?: {
    sequence_type: 'chronological' | 'procedural' | 'developmental' | 'causal' | 'logical';
    dependency_pattern: string;
    why_order_matters: string;
  };
  sequence_type: string;
}

// Union type for all question types
export type GeneratedQuestion = MCQQuestion | TrueFalseQuestion | HotspotQuestion | MatchingQuestion | SequencingQuestion;

export interface GenerationStageResult {
  success: boolean;
  generated_questions: GeneratedQuestion[];
  generation_metadata: {
    successful_generations: number;
    failed_generations: number;
    generation_time_ms: number;
    type_breakdown: Record<string, number>;
  };
  errors?: Array<{
    question_id: string;
    error_message: string;
    stage: string;
  }>;
}

// =============================================================================
// Stage 3: Quality Verification Interfaces
// =============================================================================

export interface QualityVerificationResult {
  question_id: string;
  overall_score: number; // 0-100
  quality_dimensions: {
    educational_value: QualityDimension;
    clarity_and_precision: QualityDimension;
    cognitive_appropriateness: QualityDimension;
    bloom_alignment: QualityDimension;
    misconception_handling: QualityDimension;
    explanation_quality: QualityDimension;
  };
  overall_assessment: string;
  specific_strengths: string[];
  improvement_recommendations: string[];
  verification_confidence: number; // 0-1
  meets_quality_threshold: boolean;
}

export interface QualityDimension {
  score: number; // 0-100
  assessment: string;
  evidence: string[];
  concerns: string[];
}

export interface VerificationStageResult {
  success: boolean;
  verification_results: QualityVerificationResult[];
  verification_metadata: {
    average_score: number;
    questions_meeting_threshold: number;
    total_questions_verified: number;
    verification_time_ms: number;
    quality_distribution: {
      excellent: number; // 85+
      good: number; // 75-84
      needs_work: number; // <75
    };
  };
  errors?: Array<{
    question_id: string;
    error_message: string;
  }>;
}

// =============================================================================
// Database Storage Interfaces
// =============================================================================

export interface DatabaseQuestion {
  id?: number;
  course_id: string;
  timestamp: number;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'hotspot' | 'matching' | 'sequencing';
  options?: string; // JSON string for MCQ options
  correct_answer: number | boolean;
  explanation: string;
  has_visual_asset: boolean;
  fallback_prompt?: string;
  frame_timestamp?: number;
  metadata?: string; // JSON string for type-specific data
  created_at?: string;
  updated_at?: string;
}

export interface DatabaseBoundingBox {
  id?: number;
  question_id: number;
  visual_asset_id?: number;
  label: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
  confidence_score: number;
  is_correct_answer: boolean;
  created_at?: string;
}

export interface DatabaseQualityMetrics {
  id?: number;
  question_id: number;
  overall_score: number;
  educational_value_score: number;
  clarity_score: number;
  cognitive_appropriateness_score: number;
  bloom_alignment_score: number;
  misconception_handling_score: number;
  explanation_quality_score: number;
  meets_threshold: boolean;
  verification_confidence: number;
  quality_analysis: string; // JSON string of full analysis
  created_at?: string;
}

// =============================================================================
// Error Handling Interfaces
// =============================================================================

export class QuestionGenerationError extends Error {
  constructor(
    message: string,
    public questionId: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'QuestionGenerationError';
  }
}

export class QualityVerificationError extends Error {
  constructor(
    message: string,
    public questionId: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'QualityVerificationError';
  }
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

// =============================================================================
// API Response Interfaces
// =============================================================================

export interface QuizGenerationResponse {
  success: boolean;
  course_id: string;
  video_summary?: string;
  total_duration?: number;
  pipeline_results: {
    planning: PlanningStageResult;
    generation: GenerationStageResult;
    verification?: VerificationStageResult; // Optional when quality verification is disabled
  };
  final_questions: Array<DatabaseQuestion & {
    quality_score?: number; // Optional when quality verification is disabled
    meets_threshold?: boolean; // Optional when quality verification is disabled
  }>;
  pipeline_metadata: {
    total_time_ms: number;
    stage_timings: Record<string, number>;
    error_count: number;
    success_rate: number;
    verification_enabled: boolean; // Indicates if verification was enabled/disabled
  };
  error?: string;
}

// =============================================================================
// Configuration Interfaces
// =============================================================================

export interface GeminiRequestConfig {
  temperature: number;
  maxOutputTokens: number;
  topK?: number;
  topP?: number;
  responseMimeType?: string;
  responseSchema?: Record<string, any>;
  thinkingConfig?: {
    thinkingBudget: number;
  };
}

export interface ProcessorConfig {
  questionType: string;
  processorName: string;
  stage: number;
  requiresVideoAnalysis: boolean;
  supports: Record<string, boolean>;
}

export interface QualityThresholds {
  minimum_overall_score: number;
  minimum_dimension_score: number;
  required_confidence: number;
  max_improvement_recommendations: number;
}

// =============================================================================
// Utility Interfaces
// =============================================================================

export interface ProcessingMetrics {
  start_time: number;
  end_time: number;
  duration_ms: number;
  api_calls: number;
  tokens_used: number;
  success_rate: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Export Collections
// =============================================================================

// Question type guards
export const isMultipleChoiceQuestion = (question: BaseQuestion): question is MCQQuestion => {
  return question.type === 'multiple-choice';
};

export const isTrueFalseQuestion = (question: BaseQuestion): question is TrueFalseQuestion => {
  return question.type === 'true-false';
};

export const isHotspotQuestion = (question: BaseQuestion): question is HotspotQuestion => {
  return question.type === 'hotspot';
};

export const isMatchingQuestion = (question: BaseQuestion): question is MatchingQuestion => {
  return question.type === 'matching';
};

export const isSequencingQuestion = (question: BaseQuestion): question is SequencingQuestion => {
  return question.type === 'sequencing';
};

// Default configurations
export const DEFAULT_QUALITY_THRESHOLDS: QualityThresholds = {
  minimum_overall_score: 75,
  minimum_dimension_score: 60,
  required_confidence: 0.8,
  max_improvement_recommendations: 3
};

export const DEFAULT_QUESTION_DISTRIBUTION: QuestionTypeDistribution = {
  'multiple-choice': 0.4,
  'true-false': 0.2,
  'hotspot': 0.2,
  'matching': 0.1,
  'sequencing': 0.1
};

// Stage workflow constants
export const PIPELINE_STAGES = ['planning', 'generation', 'verification'] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];

export const QUESTION_TYPES = ['multiple-choice', 'true-false', 'hotspot', 'matching', 'sequencing'] as const;
export type QuestionType = typeof QUESTION_TYPES[number];

export const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] as const;
export type BloomLevel = typeof BLOOM_LEVELS[number];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type DifficultyLevel = typeof DIFFICULTY_LEVELS[number]; 