/**
 * Quiz Generation Pipeline v5.0 - Complete Implementation
 * 
 * Three-stage pipeline with type-specific processors and Gemini-powered quality verification:
 * Stage 1: Question Planning with Full Video Transcription
 * Stage 2: Type-Specific Question Generation (MCQ, True/False, Hotspot, Matching, Sequencing)
 * Stage 3: AI-Powered Quality Verification (no hardcoded heuristics)
 * 
 * NEW: Full video transcript generation and storage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Import types and interfaces
import { 
  CourseAnalysisRequest, 
  QuizGenerationResponse, 
  QuestionPlan, 
  GeneratedQuestion,
  QuestionGenerationError,
  QualityVerificationResult
} from './types/interfaces.ts';

// Import stage processors
import { generateQuestionPlans } from './stages/planning.ts';
import { generateMCQQuestion } from './processors/mcq-processor.ts';
import { generateTrueFalseQuestion } from './processors/true-false-processor.ts';
import { generateHotspotQuestion } from './processors/hotspot-processor.ts';
import { generateMatchingQuestion } from './processors/matching-processor.ts';
import { generateSequencingQuestion } from './processors/sequencing-processor.ts';

// Import quality verification (optional)
import { verifyQuestionsBatch } from './processors/quality-verifier.ts';

// Import progress tracking
import { createProgressTracker, ProgressTracker, withProgressTracking } from './utils/progress-tracker.ts';

// Import transcript utilities
import { createQuestionContext } from './utils/transcript-utils.ts';
import type { VideoTranscript } from './types/interfaces.ts';

// =============================================================================
// CORS Configuration
// =============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// =============================================================================
// Simple Workflow Stage Execution
// =============================================================================

const executeWorkflowStage = async <T>(stageName: string, stageFunction: () => Promise<T>): Promise<T> => {
  console.log(`⚡ Executing stage: ${stageName}`);
  const startTime = Date.now();
  
  try {
    const result = await stageFunction();
    const duration = Date.now() - startTime;
    console.log(`✅ Stage ${stageName} completed in ${duration}ms`);
    return result;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    console.error(`❌ Stage ${stageName} failed after ${duration}ms:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

// =============================================================================
// Stage 2: Question Generation Router with Progress Tracking
// =============================================================================

const generateQuestionByType = async (
  plan: QuestionPlan, 
  youtubeUrl: string, 
  tracker: ProgressTracker,
  transcript?: VideoTranscript
): Promise<GeneratedQuestion> => {
  const startTime = Date.now();
  
  console.log(`🎯 Generating ${plan.question_type} question: ${plan.question_id}`);
  
  // Extract transcript context for this question
  const transcriptContext = transcript ? createQuestionContext(transcript, plan.timestamp) : null;
  if (transcriptContext) {
    console.log(`   📄 Using transcript context: ${transcriptContext.segments.length} segments`);
    console.log(`   🔑 Nearby concepts: ${transcriptContext.nearbyConcepts.join(', ')}`);
  }
  
  // Track question start
  await tracker.startQuestionGeneration(
    plan.question_id,
    plan.question_type,
    `Generating ${plan.question_type} question: ${plan.learning_objective}`,
    'determining-provider'
  );
  
  try {
    let question: GeneratedQuestion;
  
  switch (plan.question_type) {
    case 'multiple-choice':
        await tracker.updateQuestionProgress({
          question_id: plan.question_id,
          question_type: plan.question_type,
          status: 'generating',
          progress: 0.3,
          reasoning: 'Using OpenAI for multiple-choice question with misconception-based distractors',
          provider_used: 'openai'
        });
        question = await generateMCQQuestion(plan, transcriptContext);
        break;
      
    case 'true-false':
        await tracker.updateQuestionProgress({
          question_id: plan.question_id,
          question_type: plan.question_type,
          status: 'generating',
          progress: 0.3,
          reasoning: 'Using OpenAI for true-false question focusing on concept clarification',
          provider_used: 'openai'
        });
        question = await generateTrueFalseQuestion(plan, transcriptContext);
        break;
      
    case 'hotspot':
        await tracker.updateQuestionProgress({
          question_id: plan.question_id,
          question_type: plan.question_type,
          status: 'generating',
          progress: 0.2,
          reasoning: 'Using Gemini Vision API for hotspot question with bounding box detection',
          provider_used: 'gemini-vision'
        });
        question = await generateHotspotQuestion(plan, youtubeUrl, transcriptContext);
        break;
      
    case 'matching':
        await tracker.updateQuestionProgress({
          question_id: plan.question_id,
          question_type: plan.question_type,
          status: 'generating',
          progress: 0.3,
          reasoning: 'Using OpenAI for matching question with conceptual relationship mapping',
          provider_used: 'openai'
        });
        question = await generateMatchingQuestion(plan, transcriptContext);
        break;
      
    case 'sequencing':
        await tracker.updateQuestionProgress({
          question_id: plan.question_id,
          question_type: plan.question_type,
          status: 'generating',
          progress: 0.3,
          reasoning: 'Using OpenAI for sequencing question testing process understanding',
          provider_used: 'openai'
        });
        question = await generateSequencingQuestion(plan, transcriptContext);
        break;
      
    default:
      throw new Error(`Unsupported question type: ${plan.question_type}`);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Track successful completion
    await tracker.completeQuestion(
      plan.question_id,
      plan.question_type,
      `Successfully generated ${plan.question_type} question with ${plan.key_concepts.length} key concepts`,
      question.type === 'hotspot' ? 'gemini-vision' : 'openai',
      processingTime
    );
    
    return question;
    
  } catch (error: unknown) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Track failure
    await tracker.failQuestion(
      plan.question_id,
      plan.question_type,
      errorMessage,
      plan.question_type === 'hotspot' ? 'gemini-vision' : 'openai'
    );
    
    throw error;
  }
};

// =============================================================================
// Stage 2: Batch Generation with Enhanced Progress Tracking
// =============================================================================

const generateQuestionsFromPlans = async (
  plans: QuestionPlan[], 
  youtubeUrl: string,
  tracker: ProgressTracker,
  transcript?: VideoTranscript
): Promise<{
  generated_questions: GeneratedQuestion[];
  generation_metadata: {
    successful_generations: number;
    failed_generations: number;
    generation_time_ms: number;
    type_breakdown: Record<string, number>;
  };
  errors: Array<{
    question_id: string;
    error_message: string;
    stage: string;
  }>;
}> => {
  const startTime = Date.now();
  const generatedQuestions: GeneratedQuestion[] = [];
  const errors: Array<{ question_id: string; error_message: string; stage: string; }> = [];
  const typeBreakdown: Record<string, number> = {};
  
  console.log(`🔄 Starting Stage 2: Generating ${plans.length} questions SIMULTANEOUSLY`);
  if (transcript) {
    console.log(`   📄 Using video transcript with ${transcript.full_transcript.length} segments`);
  }
  
  // Update overall stage progress
  await tracker.updateStageProgress(
    'generation', 
    0.1, 
    `Starting generation of ${plans.length} questions`,
    { 
      total_questions: plans.length,
      question_types: plans.map(p => p.question_type)
    }
  );
  
  // Generate all questions concurrently using Promise.allSettled()
  const questionPromises = plans.map(async (plan, index) => {
    try {
      console.log(`🚀 Starting generation for ${plan.question_type}: ${plan.question_id}`);
      
      // Update progress as each question starts
      const progressPercent = 0.1 + (index / plans.length) * 0.7; // 10% to 80% of stage
      await tracker.updateStageProgress(
        'generation',
        progressPercent,
        `Generating question ${index + 1}/${plans.length}: ${plan.question_type}`,
        { current_question: plan.question_id }
      );
      
      const question = await generateQuestionByType(plan, youtubeUrl, tracker, transcript);
      console.log(`✅ Generated ${plan.question_type}: ${plan.question_id}`);
      return { success: true, question, plan };
    } catch (error: unknown) {
      console.error(`❌ Failed to generate ${plan.question_type} question ${plan.question_id}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown generation error',
        plan 
      };
    }
  });
  
  // Wait for all question generation promises to complete
  console.log(`⏳ Waiting for all ${plans.length} question generations to complete...`);
  await tracker.updateStageProgress('generation', 0.8, 'Waiting for all questions to complete');
  
  const results = await Promise.allSettled(questionPromises);
  
  // Process the results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const { success, question, plan, error } = result.value;
      
      if (success && question) {
        generatedQuestions.push(question);
        
        // Track type breakdown
        typeBreakdown[plan.question_type] = (typeBreakdown[plan.question_type] || 0) + 1;
        
        console.log(`✅ Successfully processed ${plan.question_type}: ${plan.question_id}`);
      } else {
        // Handle generation failure
        errors.push({
          question_id: plan.question_id,
          error_message: error || 'Unknown generation error',
          stage: 'question_generation'
        });
        console.log(`❌ Failed to process ${plan.question_type}: ${plan.question_id}`);
      }
    } else {
      // Handle promise rejection (shouldn't happen with our current structure)
      const plan = plans[index];
      errors.push({
        question_id: plan.question_id,
        error_message: `Promise rejected: ${result.reason}`,
        stage: 'question_generation'
      });
      console.log(`❌ Promise rejected for ${plan.question_type}: ${plan.question_id}`);
    }
  });
  
  const endTime = Date.now();
  const generationTimeMs = endTime - startTime;
  
  // Final stage progress update
  await tracker.updateStageProgress(
    'generation',
    0.95,
    `Generated ${generatedQuestions.length}/${plans.length} questions successfully`,
    {
      successful_questions: generatedQuestions.length,
      failed_questions: errors.length,
      type_breakdown: typeBreakdown
    }
  );
  
  console.log(`✅ Stage 2 Complete: ${generatedQuestions.length}/${plans.length} questions generated CONCURRENTLY`);
  console.log(`   ⏱️ Generation Time: ${generationTimeMs}ms (${Math.round(generationTimeMs / plans.length)}ms avg per question)`);
  console.log(`   📊 Type Breakdown: ${JSON.stringify(typeBreakdown)}`);
  console.log(`   ✅ Successful: ${generatedQuestions.length}`);
  console.log(`   ❌ Failed: ${errors.length}`);
  
  // Log detailed breakdown by question type
  if (Object.keys(typeBreakdown).length > 0) {
    console.log(`   📋 Success by type:`);
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`      ${type}: ${count}`);
    });
  }
  
  if (errors.length > 0) {
    console.log(`   ❌ Failed questions:`);
    errors.forEach(error => {
      console.log(`      ${error.question_id}: ${error.error_message}`);
    });
  }
  
  return {
    generated_questions: generatedQuestions,
    generation_metadata: {
      successful_generations: generatedQuestions.length,
      failed_generations: errors.length,
      generation_time_ms: generationTimeMs,
      type_breakdown: typeBreakdown
    },
    errors
  };
};

// =============================================================================
// Enhanced Database Storage with Bounding Boxes
// =============================================================================

const storeQuestionsWithQualityAndBoundingBoxes = async (
  supabaseClient: any,
  courseId: string,
  questions: GeneratedQuestion[],
  qualityResults: QualityVerificationResult[]
): Promise<any[]> => {
  const hasQualityResults = qualityResults.length > 0;
  console.log(`💾 Storing ${questions.length} questions ${hasQualityResults ? 'with quality metrics' : 'without quality verification'} and bounding boxes`);
  
  // Prepare questions for database
  const questionsToInsert = questions.map((q) => {
    const qualityResult = hasQualityResults ? qualityResults.find(qr => qr.question_id === q.question_id) : null;
    
    let options = null;
    let correctAnswer: number | boolean = 0;
    let metadata: any = {};
    
    // Type-specific data preparation
    switch (q.type) {
      case 'multiple-choice':
        options = JSON.stringify((q as any).options);
        correctAnswer = (q as any).correct_answer;
        if ((q as any).misconception_analysis) {
          metadata.misconception_analysis = (q as any).misconception_analysis;
        }
        break;
        
      case 'true-false':
        // Convert boolean to correct index for ['True', 'False'] options array
        // true -> 0 (index of 'True'), false -> 1 (index of 'False')
        correctAnswer = (q as any).correct_answer === true ? 0 : 1;
        if ((q as any).concept_analysis) {
          metadata.concept_analysis = (q as any).concept_analysis;
        }
        if ((q as any).misconception_addressed) {
          metadata.misconception_addressed = (q as any).misconception_addressed;
        }
        break;
        
      case 'hotspot':
        correctAnswer = 1; // Hotspot questions use special handling
        metadata = {
          target_objects: (q as any).target_objects,
          frame_timestamp: (q as any).frame_timestamp,
          question_context: (q as any).question_context,
          visual_learning_objective: (q as any).visual_learning_objective,
          distractor_guidance: (q as any).distractor_guidance,
          video_overlay: true
        };
        
        // Add bounding box metadata if available
        if ((q as any).bounding_boxes) {
          metadata.detected_elements = (q as any).bounding_boxes;
          metadata.gemini_bounding_boxes = true;
          metadata.video_dimensions = { width: 1000, height: 1000 };
        }
        break;
        
      case 'matching':
        correctAnswer = 1; // Matching questions use special handling
        metadata = {
          matching_pairs: (q as any).matching_pairs,
          relationship_analysis: (q as any).relationship_analysis,
          relationship_type: (q as any).relationship_type,
          video_overlay: true
        };
        break;
        
      case 'sequencing':
        correctAnswer = 1; // Sequencing questions use special handling
        metadata = {
          sequence_items: (q as any).sequence_items,
          sequence_analysis: (q as any).sequence_analysis,
          sequence_type: (q as any).sequence_type,
          video_overlay: true
        };
        break;
    }
    
    return {
      course_id: courseId,
      timestamp: Math.round(q.timestamp), // Convert to integer
      question: q.question,
      type: q.type,
      options: options,
      correct_answer: correctAnswer,
      explanation: q.explanation,
      has_visual_asset: ['hotspot', 'matching', 'sequencing'].includes(q.type),
      frame_timestamp: q.type === 'hotspot' ? Math.round((q as any).frame_timestamp) : null, // Convert to integer
      metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      // Add quality metrics only if available
      quality_score: qualityResult?.overall_score || null,
      meets_threshold: qualityResult?.meets_quality_threshold || false
    };
  });
  
  // Insert questions
  const { data: createdQuestions, error: questionsError } = await supabaseClient
    .from('questions')
    .insert(questionsToInsert)
    .select();
    
  if (questionsError) {
    throw new Error(`Failed to create questions: ${questionsError.message}`);
  }
  
  console.log(`✅ Created ${createdQuestions.length} questions in database`);
  
  // Store bounding boxes separately for questions with them
  let totalBoundingBoxes = 0;
  
  for (const question of createdQuestions) {
    if (question.metadata) {
      try {
        const metadata = JSON.parse(question.metadata);
        const detectedElements = metadata.detected_elements || [];

        if (detectedElements.length > 0) {
          console.log(`🎯 Creating ${detectedElements.length} bounding boxes for question ${question.id}`);
          
          const boundingBoxesToInsert = detectedElements.map((element: any) => ({
            question_id: question.id,
            visual_asset_id: null, // No visual assets needed for video overlay
            label: element.label || 'Unknown Object',
            x: parseFloat(element.x.toFixed(4)),
            y: parseFloat(element.y.toFixed(4)),
            width: parseFloat(element.width.toFixed(4)),
            height: parseFloat(element.height.toFixed(4)),
            confidence_score: element.confidence_score || 0.8,
            is_correct_answer: element.is_correct_answer || false
          }));

          const { data: createdBoxes, error: boxError } = await supabaseClient
            .from('bounding_boxes')
            .insert(boundingBoxesToInsert)
            .select();

          if (boxError) {
            console.error(`❌ Error creating bounding boxes for question ${question.id}:`, boxError);
          } else {
            totalBoundingBoxes += createdBoxes.length;
            console.log(`✅ Created ${createdBoxes.length} bounding boxes for question ${question.id}`);
          }
        }
      } catch (parseError) {
        console.error(`❌ Error parsing metadata for question ${question.id}:`, parseError);
      }
    }
  }
  
  console.log(`🎯 Total bounding boxes created: ${totalBoundingBoxes}`);
  
  // Store quality metrics separately only if available
  if (hasQualityResults) {
    console.log(`📊 Storing quality metrics for ${qualityResults.length} questions`);
    
    const qualityMetricsToInsert = qualityResults.map((qr) => {
      const question = createdQuestions.find((cq: any) => 
        questions.find(q => q.question_id === qr.question_id)?.timestamp === cq.timestamp
      );
      
      if (!question) {
        console.warn(`⚠️ Could not find database question for quality result ${qr.question_id}`);
        return null;
      }
      
      return {
        question_id: question.id,
        overall_score: qr.overall_score,
        educational_value_score: qr.quality_dimensions.educational_value.score,
        clarity_score: qr.quality_dimensions.clarity_and_precision.score,
        cognitive_appropriateness_score: qr.quality_dimensions.cognitive_appropriateness.score,
        bloom_alignment_score: qr.quality_dimensions.bloom_alignment.score,
        misconception_handling_score: qr.quality_dimensions.misconception_handling.score,
        explanation_quality_score: qr.quality_dimensions.explanation_quality.score,
        meets_threshold: qr.meets_quality_threshold,
        verification_confidence: qr.verification_confidence,
        quality_analysis: JSON.stringify({
          overall_assessment: qr.overall_assessment,
          specific_strengths: qr.specific_strengths,
          improvement_recommendations: qr.improvement_recommendations,
          quality_dimensions: qr.quality_dimensions
        })
      };
    }).filter(Boolean);
    
    if (qualityMetricsToInsert.length > 0) {
      const { error: metricsError } = await supabaseClient
        .from('question_quality_metrics')
        .insert(qualityMetricsToInsert);
        
      if (metricsError) {
        console.error('Failed to store quality metrics:', metricsError);
      } else {
        console.log(`✅ Stored quality metrics for ${qualityMetricsToInsert.length} questions`);
      }
    }
  } else {
    console.log(`⏭️ Skipping quality metrics storage (verification disabled)`);
  }
  
  return createdQuestions;
};

// =============================================================================
// Main Pipeline Orchestration
// =============================================================================

const executeQuizGenerationPipeline = async (
  request: CourseAnalysisRequest
): Promise<QuizGenerationResponse> => {
  const pipelineStartTime = Date.now();
  const stageTimings: Record<string, number> = {};
  let errorCount = 0;
  
      console.log(`🚀 Starting Quiz Generation Pipeline v5.0 for course: ${request.course_id}`);
  console.log(`   📺 YouTube URL: ${request.youtube_url}`);
  console.log(`   📊 Max Questions: ${request.max_questions || 10}`);
  console.log(`   🎯 Difficulty: ${request.difficulty_level || 'intermediate'}`);
  console.log(`   🔍 Quality Verification: ${request.enable_quality_verification ? 'ENABLED' : 'DISABLED (default)'}`);
  
  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Verify course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title')
      .eq('id', request.course_id)
      .single();
      
    if (courseError) {
      throw new Error(`Course not found: ${courseError.message}`);
    }
    
    console.log(`✅ Course verified: ${course.title}`);
    
    // STAGE 1: QUESTION PLANNING
    console.log(`\n📋 STAGE 1: Question Planning`);
    const stage1StartTime = Date.now();
    
    const planningResult = await executeWorkflowStage(
      'planning',
      () => generateQuestionPlans(
        request.youtube_url,
        request.max_questions || 10,
        request.course_id,
        supabaseClient
      )
    );
    
    const { plans: questionPlans, transcript: planningTranscript } = planningResult;
    
    stageTimings.planning = Date.now() - stage1StartTime;
    
    console.log(`✅ Stage 1 Complete: ${questionPlans.length} questions planned`);
    if (planningTranscript) {
      console.log(`   📄 Transcript generated: ${planningTranscript.full_transcript.length} segments`);
    }
    
    // STAGE 2: QUESTION GENERATION
    console.log(`\n🔧 STAGE 2: Question Generation`);
    const stage2StartTime = Date.now();
    
    // Create a progress tracker with proper parameters
    const sessionId = request.session_id || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const generationTracker = await createProgressTracker(supabaseClient, request.course_id, sessionId);
    
    // Use transcript from stage 1 or fetch from database as fallback
    let transcript: VideoTranscript | undefined = planningTranscript;
    
    if (!transcript) {
      // Fallback: fetch transcript from database if not available from planning
      const { data: transcriptData, error: transcriptError } = await supabaseClient
        .from('video_transcripts')
        .select('*')
        .eq('course_id', request.course_id)
        .eq('video_url', request.youtube_url)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!transcriptError && transcriptData) {
        transcript = transcriptData;
        console.log(`✅ Transcript fetched from database: ${transcript.full_transcript.length} segments`);
      } else {
        console.warn(`⚠️ No transcript found in database for course ${request.course_id}`);
      }
    }

    const generationResult = await executeWorkflowStage(
      'generation',
      () => generateQuestionsFromPlans(questionPlans, request.youtube_url, generationTracker, transcript)
    );
    
    stageTimings.generation = Date.now() - stage2StartTime;
    errorCount += generationResult.errors.length;
    
    console.log(`✅ Stage 2 Complete: ${generationResult.generated_questions.length} questions generated`);
    
    // STAGE 3: QUALITY VERIFICATION (CONDITIONAL)
    let verificationResults: QualityVerificationResult[] = [];
    
    if (request.enable_quality_verification) {
      console.log(`\n🔍 STAGE 3: Quality Verification - ENABLED`);
      const stage3StartTime = Date.now();
      
      verificationResults = await executeWorkflowStage(
        'verification',
        () => verifyQuestionsBatch(
          generationResult.generated_questions,
          questionPlans
        )
      );
      
      stageTimings.verification = Date.now() - stage3StartTime;
      
      console.log(`✅ Stage 3 Complete: ${verificationResults.length} questions verified`);
      console.log(`   📊 Average Quality Score: ${verificationResults.length > 0 ? (verificationResults.reduce((sum, vr) => sum + vr.overall_score, 0) / verificationResults.length).toFixed(1) : 'N/A'}`);
    } else {
      console.log(`\n⏭️ STAGE 3: Quality Verification - SKIPPED (disabled)`);
      console.log(`   ℹ️ Questions from Stage 2 will be used directly without verification`);
      stageTimings.verification = 0;
    }
    
    // DATABASE STORAGE
    console.log(`\n💾 DATABASE STORAGE: Persisting Results`);
    const stage4StartTime = Date.now();
    
    const storedQuestions = await storeQuestionsWithQualityAndBoundingBoxes(
      supabaseClient,
      request.course_id,
      generationResult.generated_questions,
      verificationResults
    );
    
    stageTimings.storage = Date.now() - stage4StartTime;
    
    // PIPELINE COMPLETION
    const totalTimeMs = Date.now() - pipelineStartTime;
    const successRate = generationResult.generated_questions.length / questionPlans.length;
    
    console.log(`\n🎉 Pipeline Complete!`);
    console.log(`   ⏱️ Total Time: ${totalTimeMs}ms`);
    console.log(`   📈 Success Rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   🔍 Verification: ${request.enable_quality_verification ? 'Enabled' : 'Disabled'}`);
    
    // Calculate verification metrics (only if verification was enabled)
    const avgQualityScore = verificationResults.length > 0 
      ? verificationResults.reduce((sum, vr) => sum + vr.overall_score, 0) / verificationResults.length 
      : 0;
    const meetingThreshold = verificationResults.filter(vr => vr.meets_quality_threshold).length;
    
    // Prepare final response
    const response: QuizGenerationResponse = {
      success: true,
      course_id: request.course_id,
      video_summary: "Video content analyzed successfully",
      total_duration: 0,
      pipeline_results: {
        planning: {
          success: true,
          question_plans: questionPlans,
          planning_metadata: {
            bloom_distribution: {},
            type_distribution: {},
            difficulty_distribution: {},
            content_coverage: []
          },
          video_summary: "Video analyzed for question opportunities",
          total_duration: 0
        },
        generation: {
          success: true,
          generated_questions: generationResult.generated_questions,
          generation_metadata: generationResult.generation_metadata,
          errors: generationResult.errors
        },
        // Only include verification if it was enabled
        ...(request.enable_quality_verification && {
          verification: {
            success: true,
            verification_results: verificationResults,
            verification_metadata: {
              average_score: avgQualityScore,
              questions_meeting_threshold: meetingThreshold,
              total_questions_verified: verificationResults.length,
              verification_time_ms: stageTimings.verification,
              quality_distribution: {
                excellent: verificationResults.filter(vr => vr.overall_score >= 85).length,
                good: verificationResults.filter(vr => vr.overall_score >= 75 && vr.overall_score < 85).length,
                needs_work: verificationResults.filter(vr => vr.overall_score < 75).length
              }
            }
          }
        })
      },
      final_questions: storedQuestions.map((sq: any) => {
        const qualityResult = verificationResults.find(vr => 
          generationResult.generated_questions.find(gq => gq.question_id === vr.question_id)?.timestamp === sq.timestamp
        );
        
        // Parse JSON fields back to their proper formats for frontend compatibility
        let parsedQuestion = { ...sq };
        
        // Parse options back to array for multiple choice questions
        if (sq.type === 'multiple-choice' && sq.options && typeof sq.options === 'string') {
          try {
            parsedQuestion.options = JSON.parse(sq.options);
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse options for question ${sq.id}:`, parseError);
            parsedQuestion.options = [];
          }
        }
        
        // Parse metadata if present
        if (sq.metadata && typeof sq.metadata === 'string') {
          try {
            parsedQuestion.metadata = JSON.parse(sq.metadata);
          } catch (parseError) {
            console.warn(`⚠️ Failed to parse metadata for question ${sq.id}:`, parseError);
          }
        }
        
        return {
          ...parsedQuestion,
          // Only include quality metrics if verification was enabled
          ...(request.enable_quality_verification && {
            quality_score: qualityResult?.overall_score || 0,
            meets_threshold: qualityResult?.meets_quality_threshold || false
          })
        };
      }),
      pipeline_metadata: {
        total_time_ms: totalTimeMs,
        stage_timings: stageTimings,
        error_count: errorCount,
        success_rate: successRate,
        verification_enabled: request.enable_quality_verification || false
      }
    };
    
    return response;
    
  } catch (error: unknown) {
    console.error(`❌ Pipeline failed:`, error);
    
    return {
      success: false,
      course_id: request.course_id,
      pipeline_results: {
        planning: { success: false, question_plans: [], planning_metadata: { bloom_distribution: {}, type_distribution: {}, difficulty_distribution: {}, content_coverage: [] }, video_summary: '', total_duration: 0, error: error instanceof Error ? error.message : String(error) },
        generation: { success: false, generated_questions: [], generation_metadata: { successful_generations: 0, failed_generations: 0, generation_time_ms: 0, type_breakdown: {} }, errors: [] },
        verification: { success: false, verification_results: [], verification_metadata: { average_score: 0, questions_meeting_threshold: 0, total_questions_verified: 0, verification_time_ms: 0, quality_distribution: { excellent: 0, good: 0, needs_work: 0 } } }
      },
      final_questions: [],
      pipeline_metadata: {
        total_time_ms: Date.now() - pipelineStartTime,
        stage_timings: stageTimings,
        error_count: errorCount + 1,
        success_rate: 0,
        verification_enabled: false
      },
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// =============================================================================
// Main Handler
// =============================================================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Health check endpoint
    if (req.url.endsWith('/health')) {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '5.0',
        features: ['quiz-generation', 'provider-switching', 'llm-interface', 'transcript-generation']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Main quiz generation endpoint
    if (req.method === 'POST') {
      // Validate environment variables
      const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }

      // Parse request body
      const body = await req.json();
      console.log('📝 Received request:', JSON.stringify(body, null, 2));

      const {
        course_id,
        youtube_url,
        max_questions = 4,
        enable_quality_verification = false,
        question_types,
        difficulty_level,
        target_audience,
        session_id
      } = body;

      if (!course_id || !youtube_url) {
        throw new Error('Missing required fields: course_id and youtube_url are required');
      }

      // Create request object for the pipeline
      const request: CourseAnalysisRequest = {
        course_id,
        youtube_url,
        max_questions,
        enable_quality_verification,
        question_types,
        difficulty_level,
        target_audience,
        session_id
      };

      // Execute the quiz generation pipeline
      const response = await executeQuizGenerationPipeline(request);

      return new Response(
        JSON.stringify(response),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders });
    
  } catch (error: unknown) {
    console.error('❌ Request processing error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
}); 

// =============================================================================
// Exports for use by other modules (e.g., segment processing)
// =============================================================================
