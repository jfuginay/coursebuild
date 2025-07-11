/**
 * Question Generation Utilities
 * 
 * Shared functions for generating questions from plans
 * Extracted from index.ts to avoid serve() conflicts when importing
 */

import { 
  QuestionPlan, 
  GeneratedQuestion,
  VideoTranscript
} from '../types/interfaces.ts';

import { generateMCQQuestion } from '../processors/mcq-processor.ts';
import { generateTrueFalseQuestion } from '../processors/true-false-processor.ts';
import { generateHotspotQuestion } from '../processors/hotspot-processor.ts';
import { generateMatchingQuestion } from '../processors/matching-processor.ts';
import { generateSequencingQuestion } from '../processors/sequencing-processor.ts';

import { ProgressTracker } from './progress-tracker.ts';
import { createQuestionContext } from './transcript-utils.ts';

// =============================================================================
// Question Generation Router with Progress Tracking
// =============================================================================

export const generateQuestionByType = async (
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
// Batch Generation with Enhanced Progress Tracking
// =============================================================================

export const generateQuestionsFromPlans = async (
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