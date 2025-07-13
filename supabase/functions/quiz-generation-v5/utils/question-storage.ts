/**
 * Unified Question Storage Utilities
 * 
 * Provides consistent question storage logic for both segmented and non-segmented video processing.
 * Ensures correct_answer field and other data is stored consistently across all paths.
 */

import { GeneratedQuestion, QualityVerificationResult } from '../types/interfaces.ts';

export interface QuestionStorageOptions {
  courseId: string;
  segmentId?: string;
  segmentIndex?: number;
  includeQualityMetrics?: boolean;
  includeGenerationStatus?: boolean;
}

/**
 * Transforms a generated question into database format with consistent handling
 * of correct_answer field and other type-specific data.
 */
export const transformQuestionForDatabase = (
  question: GeneratedQuestion,
  options: QuestionStorageOptions,
  qualityResult?: QualityVerificationResult
): any => {
  let options_field = null;
  let correctAnswer: number | boolean = 0;
  let metadata: any = {};
  
  // Normalize type field (handle both 'true_false' and 'true-false')
  const normalizedType = (question.type as string) === 'true_false' ? 'true-false' : question.type;
  
  // Type-specific data preparation
  switch (normalizedType) {
    case 'multiple-choice':
      options_field = JSON.stringify((question as any).options || []);
      correctAnswer = (question as any).correct_answer || 0;
      if ((question as any).misconception_analysis) {
        metadata.misconception_analysis = (question as any).misconception_analysis;
      }
      break;
      
    case 'true-false':
      // True/False questions don't have options in the database
      options_field = null;
      
      // Unified boolean to index conversion
      // true -> 0 (index of 'True'), false -> 1 (index of 'False')
      const tfAnswer = (question as any).correct_answer;
      if (typeof tfAnswer === 'boolean') {
        correctAnswer = tfAnswer === true ? 0 : 1;
      } else if (typeof tfAnswer === 'string') {
        // Handle string "true"/"false" from older implementations
        correctAnswer = tfAnswer.toLowerCase() === 'true' ? 0 : 1;
      } else if (typeof tfAnswer === 'number') {
        // Already converted, use as-is
        correctAnswer = tfAnswer;
      } else {
        // Default to false (1) if unknown
        console.warn(`Unknown true/false answer format: ${tfAnswer}, defaulting to false`);
        correctAnswer = 1;
      }
      
      if ((question as any).concept_analysis) {
        metadata.concept_analysis = (question as any).concept_analysis;
      }
      if ((question as any).misconception_addressed) {
        metadata.misconception_addressed = (question as any).misconception_addressed;
      }
      break;
      
    case 'hotspot':
      options_field = null; // Hotspot questions don't have options
      correctAnswer = 1; // Hotspot questions use special handling
      metadata = {
        target_objects: (question as any).target_objects,
        frame_timestamp: (question as any).frame_timestamp,
        question_context: (question as any).question_context,
        visual_learning_objective: (question as any).visual_learning_objective,
        distractor_guidance: (question as any).distractor_guidance,
        video_overlay: true
      };
      
      // Add bounding box metadata if available
      if ((question as any).bounding_boxes) {
        metadata.detected_elements = (question as any).bounding_boxes;
        metadata.gemini_bounding_boxes = true;
        metadata.video_dimensions = (question as any).video_dimensions || { width: 1000, height: 1000 };
      }
      break;
      
    case 'matching':
      options_field = null; // Matching questions use metadata
      correctAnswer = 1; // Matching questions use special handling
      metadata = {
        matching_pairs: (question as any).matching_pairs,
        relationship_analysis: (question as any).relationship_analysis,
        relationship_type: (question as any).relationship_type,
        video_overlay: true
      };
      break;
      
    case 'sequencing':
      options_field = null; // Sequencing questions use metadata
      correctAnswer = 1; // Sequencing questions use special handling
      metadata = {
        sequence_items: (question as any).sequence_items,
        sequence_analysis: (question as any).sequence_analysis,
        sequence_type: (question as any).sequence_type,
        video_overlay: true
      };
      break;
      
    default:
      // For any other types, store options as JSON if array
      if (Array.isArray((question as any).options)) {
        options_field = JSON.stringify((question as any).options);
      }
      correctAnswer = (question as any).correct_answer || 0;
  }
  
  // Add common metadata fields
  metadata.bloom_level = question.bloom_level;
  metadata.educational_rationale = question.educational_rationale;
  
  // Add any additional metadata from the question
  if ((question as any).misconception_analysis && !metadata.misconception_analysis) {
    metadata.misconception_analysis = (question as any).misconception_analysis;
  }
  if ((question as any).misconception_addressed && !metadata.misconception_addressed) {
    metadata.misconception_addressed = (question as any).misconception_addressed;
  }
  
  // Build the database record
  const dbRecord: any = {
    course_id: options.courseId,
    timestamp: Math.round(question.timestamp), // Convert to integer
    question: question.question,
    type: normalizedType,
    options: options_field,
    correct_answer: correctAnswer,
    explanation: question.explanation,
    has_visual_asset: ['hotspot', 'matching', 'sequencing'].includes(normalizedType),
    frame_timestamp: normalizedType === 'hotspot' && (question as any).frame_timestamp 
      ? Math.round((question as any).frame_timestamp) 
      : null,
    metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null
  };
  
  // Add segment-specific fields if provided
  if (options.segmentId) {
    dbRecord.segment_id = options.segmentId;
  }
  if (options.segmentIndex !== undefined) {
    dbRecord.segment_index = options.segmentIndex;
  }
  
  // Add quality metrics if available and requested
  if (options.includeQualityMetrics && qualityResult) {
    dbRecord.quality_score = qualityResult.overall_score;
    dbRecord.meets_threshold = qualityResult.meets_quality_threshold;
  }
  
  // Add generation status fields if requested (for segmented processing)
  if (options.includeGenerationStatus) {
    dbRecord.generation_status = 'completed';
    dbRecord.generated_at = new Date().toISOString();
  }
  
  // Add visual context if available
  if ((question as any).visual_context) {
    dbRecord.visual_context = (question as any).visual_context;
  }
  
  return dbRecord;
};

/**
 * Extracts bounding boxes from a question if it's a hotspot type
 */
export const extractBoundingBoxes = (question: GeneratedQuestion, questionId: string): any[] | null => {
  if (question.type !== 'hotspot' || !(question as any).bounding_boxes) {
    return null;
  }
  
  return (question as any).bounding_boxes.map((box: any) => ({
    question_id: questionId,
    label: box.label,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    is_correct_answer: box.is_correct_answer || false,
    confidence_score: box.confidence_score || 0.9
  }));
};

/**
 * Debug helper to log question transformation
 */
export const debugQuestionTransformation = (
  original: GeneratedQuestion, 
  transformed: any,
  context: string
): void => {
  console.log(`🔍 Question Transformation Debug (${context}):`);
  console.log(`   Type: ${original.type} → ${transformed.type}`);
  console.log(`   Original correct_answer: ${(original as any).correct_answer} (${typeof (original as any).correct_answer})`);
  console.log(`   Transformed correct_answer: ${transformed.correct_answer} (${typeof transformed.correct_answer})`);
  
  if (original.type === 'true-false' || (original.type as string) === 'true_false') {
    console.log(`   True/False mapping: ${(original as any).correct_answer} → ${transformed.correct_answer}`);
    console.log(`   Expected: true→0 (True), false→1 (False)`);
  }
}; 