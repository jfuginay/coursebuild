/**
 * LangGraph Workflow Orchestrator for v5.0 Quiz Generation Pipeline
 * 
 * Manages the multi-stage question generation process with intelligent routing,
 * parallel processing, error handling, and quality validation.
 */

import { StateGraph, END } from "@langchain/langgraph";
import { 
  QuizGenerationState, 
  QuestionPlan, 
  GeneratedQuestion,
  PerformanceMetrics 
} from '../types/interfaces.ts';

import { executeQuestionPlanning } from '../stages/planning.ts';
import { generateTextQuestions } from '../processors/text-generation.ts';

// =============================================================================
// Workflow State Management
// =============================================================================

export const initializeWorkflowState = (input: {
  youtube_url: string;
  course_id: string;
  max_questions?: number;
  enable_visual_questions?: boolean;
}): QuizGenerationState => {
  return {
    // Input
    youtube_url: input.youtube_url,
    course_id: input.course_id,
    max_questions: input.max_questions || 8,
    enable_visual_questions: input.enable_visual_questions ?? true,
    
    // Stage 1: Planning
    question_plans: [],
    planning_metrics: null,
    
    // Stage 2: Generation
    generated_questions: [],
    failed_questions: [],
    
    // Processing tracking
    text_questions: [],
    visual_questions: [],
    
    // Results
    final_questions: [],
    success: false,
    processing_time: 0,
    
    // Error handling
    errors: [],
    warnings: []
  };
};

// =============================================================================
// LangGraph Node Functions
// =============================================================================

export const questionPlanningNode = async (state: QuizGenerationState): Promise<Partial<QuizGenerationState>> => {
  console.log('🎯 Executing Question Planning Node...');
  
  try {
    const result = await executeQuestionPlanning(state);
    
    console.log(`📊 Planning completed: ${result.question_plans?.length || 0} plans generated`);
    console.log(`   📝 Text questions: ${result.text_questions?.length || 0}`);
    console.log(`   👁️ Visual questions: ${result.visual_questions?.length || 0}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Question Planning Node failed:', error);
    return {
      errors: [...(state.errors || []), `Planning failed: ${error.message}`],
      failed_questions: [{
        plan: null as any,
        error: error.message,
        stage: 'planning'
      }]
    };
  }
};

export const textGenerationNode = async (state: QuizGenerationState): Promise<Partial<QuizGenerationState>> => {
  console.log('📝 Executing Text Generation Node...');
  
  try {
    if (!state.text_questions || state.text_questions.length === 0) {
      console.log('⏭️ No text questions to process, skipping...');
      return {};
    }
    
    const textQuestions = await generateTextQuestions(state.text_questions);
    
    console.log(`✅ Text generation completed: ${textQuestions.length} questions generated`);
    
    return {
      generated_questions: [...(state.generated_questions || []), ...textQuestions]
    };
    
  } catch (error) {
    console.error('❌ Text Generation Node failed:', error);
    return {
      errors: [...(state.errors || []), `Text generation failed: ${error.message}`],
      failed_questions: [
        ...(state.failed_questions || []),
        ...state.text_questions.map(plan => ({
          plan,
          error: error.message,
          stage: 'generation' as const
        }))
      ]
    };
  }
};

export const visualGenerationNode = async (state: QuizGenerationState): Promise<Partial<QuizGenerationState>> => {
  console.log('👁️ Executing Visual Generation Node...');
  
  try {
    if (!state.visual_questions || state.visual_questions.length === 0) {
      console.log('⏭️ No visual questions to process, skipping...');
      return {};
    }
    
    // For now, placeholder for visual question generation
    // TODO: Implement enhanced hotspot, visual matching, and sequencing
    console.log(`⚠️ Visual generation not fully implemented yet - ${state.visual_questions.length} questions deferred`);
    
    return {
      warnings: [
        ...(state.warnings || []),
        `Visual generation deferred: ${state.visual_questions.length} questions not processed`
      ]
    };
    
  } catch (error) {
    console.error('❌ Visual Generation Node failed:', error);
    return {
      errors: [...(state.errors || []), `Visual generation failed: ${error.message}`],
      failed_questions: [
        ...(state.failed_questions || []),
        ...state.visual_questions.map(plan => ({
          plan,
          error: error.message,
          stage: 'generation' as const
        }))
      ]
    };
  }
};

export const qualityValidationNode = async (state: QuizGenerationState): Promise<Partial<QuizGenerationState>> => {
  console.log('🔍 Executing Quality Validation Node...');
  
  try {
    const validQuestions: GeneratedQuestion[] = [];
    const invalidQuestions: Array<{ plan: QuestionPlan; error: string }> = [];
    
    for (const question of state.generated_questions) {
      const qualityScore = assessQuestionQuality(question);
      
      if (qualityScore >= 70) { // Quality threshold
        validQuestions.push(question);
      } else {
        const matchingPlan = state.question_plans.find(p => p.question_id === question.question_id);
        invalidQuestions.push({
          plan: matchingPlan || {} as QuestionPlan,
          error: `Quality score too low: ${qualityScore}/100`
        });
      }
    }
    
    console.log(`✅ Quality validation completed: ${validQuestions.length}/${state.generated_questions.length} questions passed`);
    
    return {
      generated_questions: validQuestions,
      failed_questions: [
        ...(state.failed_questions || []),
        ...invalidQuestions.map(item => ({
          plan: item.plan,
          error: item.error,
          stage: 'validation' as const
        }))
      ]
    };
    
  } catch (error) {
    console.error('❌ Quality Validation Node failed:', error);
    return {
      errors: [...(state.errors || []), `Quality validation failed: ${error.message}`]
    };
  }
};

export const finalizationNode = async (state: QuizGenerationState): Promise<Partial<QuizGenerationState>> => {
  console.log('🏁 Executing Finalization Node...');
  
  try {
    // Convert generated questions to database format
    const finalQuestions = state.generated_questions.map(question => ({
      question_id: question.question_id,
      timestamp: question.timestamp,
      type: question.type,
      question: question.question,
      explanation: question.explanation,
      bloom_level: question.bloom_level,
      educational_rationale: question.educational_rationale,
      // Type-specific data
      ...(question.type === 'multiple-choice' ? {
        options: (question as any).options,
        correct_answer: (question as any).correct_answer,
        misconception_analysis: JSON.stringify((question as any).misconception_analysis)
      } : {}),
      ...(question.type === 'true-false' ? {
        correct_answer: (question as any).correct_answer,
        misconception_addressed: (question as any).misconception_addressed
      } : {}),
      ...(question.type === 'matching' ? {
        matching_pairs: (question as any).matching_pairs,
        metadata: JSON.stringify({ matching_pairs: (question as any).matching_pairs })
      } : {}),
      ...(question.type === 'sequencing' ? {
        sequence_items: (question as any).sequence_items,
        metadata: JSON.stringify({ sequence_items: (question as any).sequence_items })
      } : {}),
      ...(question.type === 'hotspot' ? {
        target_objects: (question as any).target_objects,
        frame_timestamp: (question as any).frame_timestamp,
        visual_context: (question as any).visual_context,
        metadata: (question as any).metadata
      } : {})
    }));
    
    const success = finalQuestions.length > 0;
    
    console.log(`🎯 Finalization completed: ${finalQuestions.length} questions ready`);
    console.log(`   ✅ Success: ${success}`);
    console.log(`   ⚠️ Warnings: ${state.warnings?.length || 0}`);
    console.log(`   ❌ Errors: ${state.errors?.length || 0}`);
    
    return {
      final_questions: finalQuestions,
      success
    };
    
  } catch (error) {
    console.error('❌ Finalization Node failed:', error);
    return {
      errors: [...(state.errors || []), `Finalization failed: ${error.message}`],
      success: false
    };
  }
};

// =============================================================================
// Routing Functions
// =============================================================================

export const shouldProcessTextQuestions = (state: QuizGenerationState): string => {
  if (state.text_questions && state.text_questions.length > 0) {
    console.log(`🔀 Routing to text generation: ${state.text_questions.length} questions`);
    return "text_generation";
  }
  console.log('🔀 Skipping text generation: no text questions');
  return "visual_routing";
};

export const shouldProcessVisualQuestions = (state: QuizGenerationState): string => {
  if (state.visual_questions && state.visual_questions.length > 0) {
    console.log(`🔀 Routing to visual generation: ${state.visual_questions.length} questions`);
    return "visual_generation";
  }
  console.log('🔀 Skipping visual generation: no visual questions');
  return "quality_validation";
};

export const shouldContinueProcessing = (state: QuizGenerationState): string => {
  // Check if we have any questions to validate
  if (state.generated_questions && state.generated_questions.length > 0) {
    console.log(`🔀 Proceeding to quality validation: ${state.generated_questions.length} questions`);
    return "quality_validation";
  }
  
  // Check if we have critical errors
  const criticalErrors = state.errors?.length || 0;
  if (criticalErrors > 0) {
    console.log(`🔀 Skipping to finalization due to critical errors: ${criticalErrors}`);
    return "finalization";
  }
  
  console.log('🔀 Proceeding to finalization');
  return "finalization";
};

// =============================================================================
// Workflow Creation
// =============================================================================

export const createQuizGenerationWorkflow = () => {
  console.log('🔧 Creating LangGraph workflow for v5.0 quiz generation...');
  
  const workflow = new StateGraph({
    channels: {
      // Input
      youtube_url: { default: () => "" },
      course_id: { default: () => "" },
      max_questions: { default: () => 8 },
      enable_visual_questions: { default: () => true },
      
      // Stage 1: Planning
      question_plans: { default: () => [] },
      planning_metrics: { default: () => null },
      
      // Stage 2: Generation
      generated_questions: { default: () => [] },
      failed_questions: { default: () => [] },
      
      // Processing tracking
      text_questions: { default: () => [] },
      visual_questions: { default: () => [] },
      current_plan: { default: () => undefined },
      
      // Results
      final_questions: { default: () => [] },
      success: { default: () => false },
      processing_time: { default: () => 0 },
      
      // Error handling
      errors: { default: () => [] },
      warnings: { default: () => [] }
    }
  });

  // Add nodes to the workflow
  workflow.addNode("question_planning", questionPlanningNode);
  workflow.addNode("text_generation", textGenerationNode);
  workflow.addNode("visual_generation", visualGenerationNode);
  workflow.addNode("quality_validation", qualityValidationNode);
  workflow.addNode("finalization", finalizationNode);

  // Set entry point
  workflow.setEntryPoint("question_planning");

  // Add conditional routing
  workflow.addConditionalEdges(
    "question_planning",
    shouldProcessTextQuestions,
    {
      text_generation: "text_generation",
      visual_routing: "visual_generation"
    }
  );

  workflow.addConditionalEdges(
    "text_generation",
    shouldProcessVisualQuestions,
    {
      visual_generation: "visual_generation",
      quality_validation: "quality_validation"
    }
  );

  workflow.addConditionalEdges(
    "visual_generation",
    shouldContinueProcessing,
    {
      quality_validation: "quality_validation",
      finalization: "finalization"
    }
  );

  // Add direct edges
  workflow.addEdge("quality_validation", "finalization");
  workflow.addEdge("finalization", END);

  console.log('✅ LangGraph workflow created successfully');
  return workflow.compile();
};

// =============================================================================
// Workflow Execution
// =============================================================================

export const executeQuizGenerationWorkflow = async (input: {
  youtube_url: string;
  course_id: string;
  max_questions?: number;
  enable_visual_questions?: boolean;
}): Promise<QuizGenerationState> => {
  const startTime = performance.now();
  
  try {
    console.log('🚀 Starting v5.0 Quiz Generation Workflow...');
    console.log(`   📹 YouTube URL: ${input.youtube_url}`);
    console.log(`   📚 Course ID: ${input.course_id}`);
    console.log(`   🎚️ Max Questions: ${input.max_questions || 8}`);
    console.log(`   👁️ Visual Questions: ${input.enable_visual_questions ?? true}`);
    
    const workflow = createQuizGenerationWorkflow();
    const initialState = initializeWorkflowState(input);
    
    console.log('🔄 Executing workflow...');
    const finalState = await workflow.invoke(initialState);
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    finalState.processing_time = processingTime;
    
    console.log('🎯 Workflow execution completed!');
    console.log(`   ⏱️ Processing time: ${Math.round(processingTime)}ms`);
    console.log(`   ✅ Success: ${finalState.success}`);
    console.log(`   📊 Questions generated: ${finalState.final_questions?.length || 0}`);
    console.log(`   ⚠️ Warnings: ${finalState.warnings?.length || 0}`);
    console.log(`   ❌ Errors: ${finalState.errors?.length || 0}`);
    
    return finalState;
    
  } catch (error) {
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    console.error('❌ Workflow execution failed:', error);
    
    return {
      ...initializeWorkflowState(input),
      processing_time: processingTime,
      success: false,
      errors: [`Workflow execution failed: ${error.message}`]
    };
  }
};

// =============================================================================
// Quality Assessment Helper
// =============================================================================

const assessQuestionQuality = (question: GeneratedQuestion): number => {
  let qualityScore = 100;
  
  // Basic validation
  if (!question.question || question.question.length < 10) {
    qualityScore -= 20;
  }
  
  if (!question.explanation || question.explanation.length < 20) {
    qualityScore -= 15;
  }
  
  if (!question.bloom_level || !['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'].includes(question.bloom_level)) {
    qualityScore -= 10;
  }
  
  // Type-specific validation
  switch (question.type) {
    case 'multiple-choice':
      const mcq = question as any;
      if (!mcq.options || mcq.options.length !== 4) qualityScore -= 25;
      if (typeof mcq.correct_answer !== 'number' || mcq.correct_answer < 0 || mcq.correct_answer > 3) qualityScore -= 20;
      break;
      
    case 'true-false':
      const tf = question as any;
      if (typeof tf.correct_answer !== 'boolean') qualityScore -= 20;
      break;
      
    case 'matching':
      const matching = question as any;
      if (!matching.matching_pairs || matching.matching_pairs.length < 3) qualityScore -= 25;
      break;
      
    case 'sequencing':
      const sequencing = question as any;
      if (!sequencing.sequence_items || sequencing.sequence_items.length < 3) qualityScore -= 25;
      break;
  }
  
  return Math.max(qualityScore, 0);
}; 