/**
 * Stage 2: Multiple Choice Question (MCQ) Processor
 * 
 * Specialized processor for generating high-quality multiple choice questions
 * that test deep understanding through misconception-based distractors and
 * clear educational explanations.
 * 
 * Updated to use unified LLM interface supporting both Gemini and OpenAI.
 */

import { QuestionPlan, MCQQuestion, QuestionGenerationError } from '../types/interfaces.ts';
import { llmService, LLMRequest } from './llm-providers.ts';
import { QUESTION_TYPE_CONFIGS, validateResponseSchema } from './llm-schemas.ts';

// =============================================================================
// MCQ-Specific Prompt (Stage 2)
// =============================================================================

export const MCQ_DETAILED_PROMPT = `
You are an expert multiple choice question creator specializing in educational assessment design. Your mission is to create a single, high-quality MCQ that tests deep understanding rather than surface-level recall.

## EDUCATIONAL EXCELLENCE CRITERIA

### Question Stem Design
- **Clarity First**: Write a clear, unambiguous question that directly addresses the learning objective
- **Context Rich**: Provide sufficient context without giving away the answer
- **Conceptual Focus**: Test understanding, application, or analysis - not memorization
- **Positive Phrasing**: Avoid negative constructions ("Which is NOT...") unless essential
- **Specific Scope**: Focus on one key concept or principle

### Answer Options Strategy
- **Exactly 4 Options**: Provide options A, B, C, D for consistency
- **One Correct Answer**: Clearly and unambiguously correct based on the content
- **Three Educational Distractors**: Each wrong answer should represent a specific type of student error:
  1. **Misconception-Based**: Common misunderstanding of the concept
  2. **Incomplete Knowledge**: Partial understanding that leads to wrong conclusion
  3. **Logical Confusion**: Reasonable but incorrect application of related concept

### Distractor Development Excellence
- **Plausible Alternatives**: Each distractor should seem reasonable to someone with incomplete understanding
- **Educational Value**: Choosing a distractor should reveal specific knowledge gaps
- **Eliminable Through Knowledge**: Correct understanding should allow elimination of all distractors
- **Similar Structure**: All options should be similar in length and grammatical form
- **No "All/None of Above"**: Focus on substantive alternatives

### Explanation Requirements
- **Educational Focus**: Explain WHY the correct answer is right, not just WHAT it is
- **Misconception Addressing**: Briefly explain why common distractors are incorrect
- **Concept Reinforcement**: Strengthen understanding of the underlying principle
- **Learning Connection**: Link back to the broader learning objective

## QUALITY STANDARDS
- Question tests understanding/application, not recall
- All distractors are educationally meaningful 
- Explanation addresses learning, not just correctness
- Options are parallel in structure and plausibility
- Clear connection to learning objective

Create a single, exceptional MCQ based on the provided question plan.
`;

// =============================================================================
// MCQ Generation Function
// =============================================================================

export const generateMCQQuestion = async (plan: QuestionPlan): Promise<MCQQuestion> => {
  try {
    console.log(`🔤 Generating MCQ: ${plan.question_id}`);
    console.log(`   📚 Learning Objective: ${plan.learning_objective}`);
    console.log(`   🧠 Bloom Level: ${plan.bloom_level}`);
    console.log(`   💡 Key Concepts: ${plan.key_concepts.join(', ')}`);
    
    const contextualPrompt = buildMCQContextualPrompt(plan);
    const config = QUESTION_TYPE_CONFIGS['multiple-choice'];
    
    // Create LLM request using unified interface
    const llmRequest: LLMRequest = {
      prompt: contextualPrompt,
      responseSchema: config.schema,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
        topK: config.topK,
        topP: config.topP
      }
    };

    // Generate question using LLM service
    const response = await llmService.generateQuestion(
      'multiple-choice',
      contextualPrompt,
      {
        ...config,
        preferredProvider: config.preferredProvider
      }
    );

    if (!response.content) {
      throw new Error('No content in LLM response');
    }

    const questionData = response.content;
    
    // Validate MCQ structure
    if (!validateResponseSchema(questionData, 'multiple-choice')) {
      throw new Error('Generated MCQ does not match expected schema');
    }
    
    validateMCQStructure(questionData);
    
    // Convert to our MCQQuestion interface
    const mcqQuestion: MCQQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'multiple-choice',
      question: questionData.question,
      options: questionData.options,
      correct_answer: questionData.correct_answer,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: questionData.educational_rationale || plan.educational_rationale,
      misconception_analysis: questionData.misconception_analysis || {}
    };
    
    console.log(`✅ MCQ generated successfully: ${plan.question_id} (Provider: ${response.provider})`);
    console.log(`   🎯 Question: ${questionData.question.substring(0, 60)}...`);
    console.log(`   📊 Options: ${questionData.options.length}`);
    console.log(`   ✅ Correct Answer: ${questionData.correct_answer} - "${questionData.options[questionData.correct_answer].substring(0, 40)}..."`);
    
    // Log usage if available (OpenAI)
    if (response.usage) {
      console.log(`   💰 Token Usage: ${response.usage.totalTokens} total (${response.usage.promptTokens} prompt, ${response.usage.completionTokens} completion)`);
    }
    
    return mcqQuestion;
    
  } catch (error: unknown) {
    console.error(`❌ MCQ generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(
      `MCQ generation failed: ${error instanceof Error ? error.message : String(error)}`,
      plan.question_id,
      { plan, stage: 'mcq_generation' }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const buildMCQContextualPrompt = (plan: QuestionPlan): string => {
  return `${MCQ_DETAILED_PROMPT}

## QUESTION PLAN CONTEXT

**Learning Objective**: ${plan.learning_objective}

**Content Context**: ${plan.content_context}

**Key Concepts to Address**: 
${plan.key_concepts.map(concept => `- ${concept}`).join('\n')}

**Target Bloom's Level**: ${plan.bloom_level}

**Educational Rationale**: ${plan.educational_rationale}

**Planning Notes**: ${plan.planning_notes}

**Video Timestamp Context**: This question appears at ${plan.timestamp} seconds in the video, addressing content around that timepoint.

## YOUR TASK

Based on this educational context, create a single, exceptional multiple choice question that:
1. Tests the specified learning objective through ${plan.bloom_level}-level thinking
2. Incorporates the key concepts meaningfully
3. Uses misconception-based distractors to reveal common student errors
4. Provides educational explanations that reinforce understanding

Focus on creating a question that would help students learn, not just demonstrate what they've memorized.`;
};

const validateMCQStructure = (data: any): void => {
  // Basic structure validation
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length < 10) {
    throw new Error('Question must be a non-empty string of at least 10 characters');
  }
  
  if (!Array.isArray(data.options) || data.options.length !== 4) {
    throw new Error('MCQ must have exactly 4 options');
  }
  
  // Validate all options are non-empty strings
  for (let i = 0; i < data.options.length; i++) {
    if (!data.options[i] || typeof data.options[i] !== 'string' || data.options[i].trim().length < 2) {
      throw new Error(`Option ${i} must be a non-empty string`);
    }
  }
  
  if (typeof data.correct_answer !== 'number' || data.correct_answer < 0 || data.correct_answer > 3) {
    throw new Error('correct_answer must be a number between 0 and 3');
  }
  
  if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length < 20) {
    throw new Error('Explanation must be a meaningful string of at least 20 characters');
  }
  
  // Validate options are reasonably different
  const uniqueOptions = new Set(data.options.map((opt: string) => opt.toLowerCase().trim()));
  if (uniqueOptions.size < 4) {
    throw new Error('All options must be unique');
  }
  
  // Check for basic educational quality indicators
  const explanation = data.explanation.toLowerCase();
  if (!explanation.includes('correct') && !explanation.includes('because') && !explanation.includes('why')) {
    console.warn('⚠️ Explanation may lack educational depth - missing explanatory language');
  }
};

// =============================================================================
// MCQ Quality Assessment
// =============================================================================

export const assessMCQQuality = (mcq: MCQQuestion): {
  score: number;
  strengths: string[];
  improvements: string[];
} => {
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 100;
  
  // Question quality assessment
  const questionLength = mcq.question.length;
  if (questionLength >= 20 && questionLength <= 200) {
    strengths.push('Question length is appropriate');
  } else if (questionLength < 20) {
    improvements.push('Question could be more detailed');
    score -= 10;
  } else {
    improvements.push('Question may be too verbose');
    score -= 5;
  }
  
  // Options quality assessment
  const avgOptionLength = mcq.options.reduce((sum, opt) => sum + opt.length, 0) / mcq.options.length;
  if (avgOptionLength >= 10 && avgOptionLength <= 100) {
    strengths.push('Option lengths are well-balanced');
  } else {
    improvements.push('Option lengths could be more balanced');
    score -= 5;
  }
  
  // Educational value assessment
  if (mcq.explanation.length >= 50) {
    strengths.push('Explanation provides good educational value');
  } else {
    improvements.push('Explanation could be more comprehensive');
    score -= 15;
  }
  
  // Misconception analysis assessment
  if (mcq.misconception_analysis && Object.keys(mcq.misconception_analysis).length >= 2) {
    strengths.push('Includes misconception analysis for learning');
  } else {
    improvements.push('Could benefit from misconception analysis');
    score -= 10;
  }
  
  // Bloom's taxonomy alignment
  const cognitiveWords = ['understand', 'apply', 'analyze', 'evaluate', 'create'];
  const hasHigherOrder = cognitiveWords.some(word => 
    mcq.question.toLowerCase().includes(word) || 
    mcq.explanation.toLowerCase().includes(word)
  );
  
  if (hasHigherOrder) {
    strengths.push('Targets higher-order thinking skills');
  } else {
    improvements.push('Could target higher-order thinking skills');
    score -= 5;
  }
  
  return {
    score: Math.max(0, score),
    strengths,
    improvements
  };
};

// =============================================================================
// Export Configuration
// =============================================================================

export const mcqProcessorConfig = {
  questionType: 'mcq',
  processorName: 'MCQ Processor v4.1 (Unified LLM)',
  stage: 2,
  requiresVideoAnalysis: false,
  supports: {
    misconceptionAnalysis: true,
    bloomTaxonomy: true,
    educationalExplanations: true,
    qualityAssessment: true,
    multipleProviders: true
  }
}; 