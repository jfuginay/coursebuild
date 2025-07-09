/**
 * Stage 2: Text-Based Question Generation Processors
 * 
 * Handles MCQ, True/False, and text-based Matching/Sequencing questions
 * that don't require video analysis. Uses type-specific prompts for
 * optimal educational outcomes.
 */

import { 
  QuestionPlan, 
  MCQQuestion, 
  TrueFalseQuestion, 
  MatchingQuestion, 
  SequencingQuestion,
  GeneratedQuestion,
  QuestionGenerationError 
} from '../types/interfaces.ts';

import { 
  MCQ_GENERATION_PROMPT,
  TRUE_FALSE_GENERATION_PROMPT,
  MATCHING_GENERATION_PROMPT,
  SEQUENCING_GENERATION_PROMPT,
  MCQ_SCHEMA,
  TRUE_FALSE_SCHEMA,
  MATCHING_SCHEMA,
  SEQUENCING_SCHEMA,
  DEFAULT_GENERATION_CONFIG
} from '../config/prompts.ts';

// =============================================================================
// Text Question Generation Orchestrator
// =============================================================================

export const generateTextQuestions = async (plans: QuestionPlan[]): Promise<GeneratedQuestion[]> => {
  try {
    console.log(`📝 Stage 2A: Generating ${plans.length} text-based questions...`);
    
    // Process questions in parallel for efficiency
    const questionPromises = plans.map(async (plan) => {
      try {
        switch (plan.question_type) {
          case 'mcq':
            return await generateMCQQuestion(plan);
          case 'true_false':
            return await generateTrueFalseQuestion(plan);
          case 'matching':
            if (!plan.visual_analysis_needed) {
              return await generateTextMatchingQuestion(plan);
            }
            throw new Error('Visual matching questions should be processed in visual generation stage');
          case 'sequencing':
            if (!plan.visual_analysis_needed) {
              return await generateSequencingQuestion(plan);
            }
            throw new Error('Visual sequencing questions should be processed in visual generation stage');
          default:
            throw new Error(`Unsupported text question type: ${plan.question_type}`);
        }
      } catch (error) {
        console.error(`❌ Failed to generate question for plan ${plan.question_id}:`, error);
        throw new QuestionGenerationError(
          `Failed to generate ${plan.question_type} question: ${error.message}`,
          plan.question_id,
          { plan }
        );
      }
    });

    const results = await Promise.allSettled(questionPromises);
    
    const successfulQuestions: GeneratedQuestion[] = [];
    const failedQuestions: Array<{ plan: QuestionPlan; error: string }> = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulQuestions.push(result.value);
      } else {
        failedQuestions.push({
          plan: plans[index],
          error: result.reason.message
        });
      }
    });
    
    console.log(`✅ Text generation complete: ${successfulQuestions.length}/${plans.length} successful`);
    if (failedQuestions.length > 0) {
      console.log(`⚠️ Failed questions: ${failedQuestions.length}`);
      failedQuestions.forEach(failure => {
        console.log(`   ${failure.plan.question_id}: ${failure.error}`);
      });
    }
    
    return successfulQuestions;
    
  } catch (error) {
    console.error('❌ Text question generation failed:', error);
    throw new QuestionGenerationError(`Text generation process failed: ${error.message}`);
  }
};

// =============================================================================
// MCQ Question Generation
// =============================================================================

export const generateMCQQuestion = async (plan: QuestionPlan): Promise<MCQQuestion> => {
  try {
    console.log(`🔤 Generating MCQ: ${plan.question_id}`);
    
    const contextualPrompt = buildMCQPrompt(plan);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextualPrompt }] }],
          generationConfig: {
            ...DEFAULT_GENERATION_CONFIG,
            responseSchema: MCQ_SCHEMA,
            temperature: 0.6, // Slightly lower for more consistent quality
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
    
    // Validate MCQ structure
    validateMCQStructure(questionData);
    
    const mcqQuestion: MCQQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'multiple-choice',
      question: questionData.question,
      options: questionData.options,
      correct_answer: questionData.correct_answer,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale,
      misconception_analysis: questionData.misconception_analysis || {}
    };
    
    console.log(`✅ MCQ generated: ${plan.question_id}`);
    return mcqQuestion;
    
  } catch (error) {
    console.error(`❌ MCQ generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(`MCQ generation failed: ${error.message}`, plan.question_id);
  }
};

const buildMCQPrompt = (plan: QuestionPlan): string => {
  return `${MCQ_GENERATION_PROMPT}

## QUESTION PLAN CONTEXT
- **Learning Objective**: ${plan.learning_objective}
- **Content Context**: ${plan.content_context}
- **Key Concepts**: ${plan.key_concepts.join(', ')}
- **Bloom Level**: ${plan.bloom_level}
- **Educational Rationale**: ${plan.educational_rationale}
- **Planning Notes**: ${plan.planning_notes}

Based on this educational plan, generate a high-quality multiple choice question that tests deep understanding and addresses common misconceptions.`;
};

const validateMCQStructure = (data: any): void => {
  if (!data.question || typeof data.question !== 'string') {
    throw new Error('Invalid or missing question field');
  }
  
  if (!Array.isArray(data.options) || data.options.length !== 4) {
    throw new Error('MCQ must have exactly 4 options');
  }
  
  if (typeof data.correct_answer !== 'number' || data.correct_answer < 0 || data.correct_answer > 3) {
    throw new Error('Invalid correct_answer index');
  }
  
  if (!data.explanation || typeof data.explanation !== 'string') {
    throw new Error('Missing or invalid explanation');
  }
};

// =============================================================================
// True/False Question Generation
// =============================================================================

export const generateTrueFalseQuestion = async (plan: QuestionPlan): Promise<TrueFalseQuestion> => {
  try {
    console.log(`✓ Generating True/False: ${plan.question_id}`);
    
    const contextualPrompt = buildTrueFalsePrompt(plan);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextualPrompt }] }],
          generationConfig: {
            ...DEFAULT_GENERATION_CONFIG,
            responseSchema: TRUE_FALSE_SCHEMA,
            temperature: 0.6,
            maxOutputTokens: 1536
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
    
    const trueFalseQuestion: TrueFalseQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'true-false',
      question: questionData.question,
      correct_answer: questionData.correct_answer,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale,
      misconception_addressed: questionData.misconception_addressed
    };
    
    console.log(`✅ True/False generated: ${plan.question_id}`);
    return trueFalseQuestion;
    
  } catch (error) {
    console.error(`❌ True/False generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(`True/False generation failed: ${error.message}`, plan.question_id);
  }
};

const buildTrueFalsePrompt = (plan: QuestionPlan): string => {
  return `${TRUE_FALSE_GENERATION_PROMPT}

## QUESTION PLAN CONTEXT
- **Learning Objective**: ${plan.learning_objective}
- **Content Context**: ${plan.content_context}
- **Key Concepts**: ${plan.key_concepts.join(', ')}
- **Bloom Level**: ${plan.bloom_level}
- **Educational Rationale**: ${plan.educational_rationale}
- **Planning Notes**: ${plan.planning_notes}

Generate a true/false question that addresses specific misconceptions and tests principle understanding.`;
};

// =============================================================================
// Text-Based Matching Question Generation
// =============================================================================

export const generateTextMatchingQuestion = async (plan: QuestionPlan): Promise<MatchingQuestion> => {
  try {
    console.log(`🔗 Generating Text Matching: ${plan.question_id}`);
    
    const contextualPrompt = buildMatchingPrompt(plan);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextualPrompt }] }],
          generationConfig: {
            ...DEFAULT_GENERATION_CONFIG,
            responseSchema: MATCHING_SCHEMA,
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
    
    const matchingQuestion: MatchingQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'matching',
      question: questionData.question,
      matching_pairs: questionData.matching_pairs,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale
    };
    
    console.log(`✅ Text Matching generated: ${plan.question_id}`);
    return matchingQuestion;
    
  } catch (error) {
    console.error(`❌ Text Matching generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(`Text Matching generation failed: ${error.message}`, plan.question_id);
  }
};

const buildMatchingPrompt = (plan: QuestionPlan): string => {
  return `${MATCHING_GENERATION_PROMPT}

## QUESTION PLAN CONTEXT
- **Learning Objective**: ${plan.learning_objective}
- **Content Context**: ${plan.content_context}
- **Key Concepts**: ${plan.key_concepts.join(', ')}
- **Bloom Level**: ${plan.bloom_level}
- **Educational Rationale**: ${plan.educational_rationale}
- **Planning Notes**: ${plan.planning_notes}

Generate a text-based matching question that tests understanding of relationships between concepts. Focus on meaningful educational connections.`;
};

// =============================================================================
// Sequencing Question Generation
// =============================================================================

export const generateSequencingQuestion = async (plan: QuestionPlan): Promise<SequencingQuestion> => {
  try {
    console.log(`📋 Generating Sequencing: ${plan.question_id}`);
    
    const contextualPrompt = buildSequencingPrompt(plan);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: contextualPrompt }] }],
          generationConfig: {
            ...DEFAULT_GENERATION_CONFIG,
            responseSchema: SEQUENCING_SCHEMA,
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const questionData = JSON.parse(data.candidates[0].content.parts[0].text);
    
    const sequencingQuestion: SequencingQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'sequencing',
      question: questionData.question,
      sequence_items: questionData.sequence_items,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale
    };
    
    console.log(`✅ Sequencing generated: ${plan.question_id}`);
    return sequencingQuestion;
    
  } catch (error) {
    console.error(`❌ Sequencing generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(`Sequencing generation failed: ${error.message}`, plan.question_id);
  }
};

const buildSequencingPrompt = (plan: QuestionPlan): string => {
  return `${SEQUENCING_GENERATION_PROMPT}

## QUESTION PLAN CONTEXT
- **Learning Objective**: ${plan.learning_objective}
- **Content Context**: ${plan.content_context}
- **Key Concepts**: ${plan.key_concepts.join(', ')}
- **Bloom Level**: ${plan.bloom_level}
- **Educational Rationale**: ${plan.educational_rationale}
- **Planning Notes**: ${plan.planning_notes}

Generate a sequencing question that tests understanding of processes, logical order, or chronological reasoning.`;
};

// =============================================================================
// Quality Assessment for Text Questions
// =============================================================================

export const assessTextQuestionQuality = (question: GeneratedQuestion): number => {
  let qualityScore = 100;
  
  // Basic structure validation
  if (!question.question || question.question.length < 10) {
    qualityScore -= 20;
  }
  
  if (!question.explanation || question.explanation.length < 20) {
    qualityScore -= 15;
  }
  
  // Type-specific validation
  switch (question.type) {
    case 'multiple-choice':
      const mcq = question as MCQQuestion;
      if (!mcq.options || mcq.options.length !== 4) {
        qualityScore -= 30;
      }
      if (typeof mcq.correct_answer !== 'number' || mcq.correct_answer < 0 || mcq.correct_answer > 3) {
        qualityScore -= 25;
      }
      break;
      
    case 'true-false':
      const tf = question as TrueFalseQuestion;
      if (typeof tf.correct_answer !== 'boolean') {
        qualityScore -= 25;
      }
      break;
      
    case 'matching':
      const matching = question as MatchingQuestion;
      if (!matching.matching_pairs || matching.matching_pairs.length < 3) {
        qualityScore -= 25;
      }
      break;
      
    case 'sequencing':
      const sequencing = question as SequencingQuestion;
      if (!sequencing.sequence_items || sequencing.sequence_items.length < 3) {
        qualityScore -= 25;
      }
      break;
  }
  
  return Math.max(qualityScore, 0);
};

// =============================================================================
// Export for LangGraph Integration
// =============================================================================

export const textGenerationNode = {
  name: 'text_generation',
  function: async (state: any) => {
    const textQuestions = await generateTextQuestions(state.text_questions);
    return {
      generated_questions: [...(state.generated_questions || []), ...textQuestions]
    };
  },
  input_keys: ['text_questions'] as const,
  output_keys: ['generated_questions'] as const
}; 