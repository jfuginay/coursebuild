/**
 * Stage 2: Sequencing Question Processor
 * 
 * Specialized processor for generating high-quality sequencing questions
 * that test understanding of chronological order, process flows, and
 * logical progression through meaningful step-by-step interactions.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { QuestionPlan, SequencingQuestion, QuestionGenerationError } from '../types/interfaces.ts';
import LLMService from './llm-providers.ts';
import { formatSecondsForDisplay } from '../utils/timestamp-converter.ts';

// =============================================================================
// Sequencing-Specific Prompt (Stage 2)
// =============================================================================

export const SEQUENCING_DETAILED_PROMPT = `
You are an expert educational designer specializing in sequencing questions that test understanding of order, progression, and process flow. Your mission is to create a single, high-quality sequencing question that reveals deep understanding of how steps, events, or concepts flow in logical or chronological order.

## PROCESS LEARNING EXCELLENCE CRITERIA

### Question Design Principles
- **Logical Flow Focus**: Test understanding of WHY items must be in a specific order, not just memorization of sequences
- **Process Understanding**: Sequence should represent meaningful progression with clear dependency relationships
- **Educational Significance**: Order should matter for understanding the concept, process, or phenomenon
- **Clear Dependencies**: Each step should logically depend on or build upon previous steps
- **Authentic Sequencing**: Use real-world processes, procedures, or developmental progressions

### Sequence Development Strategy
- **Meaningful Progression**: Focus on cause-effect chains, developmental stages, procedural steps, or logical dependencies
- **Educational Importance**: Each step should represent important knowledge in the learning domain
- **Clear Distinctions**: Steps should be distinct enough that order is not arbitrary
- **Logical Dependencies**: Earlier steps should enable or be required for later steps
- **Appropriate Granularity**: Not too fine-grained (obvious) or too coarse-grained (ambiguous)

### Item Selection Criteria
- **Essential Steps**: Include only steps that are crucial to the process or development
- **Clear Boundaries**: Each item should represent a distinct, identifiable stage or action
- **Logical Necessity**: Order should be logically required, not conventional or arbitrary
- **Educational Value**: Understanding the sequence should advance learning objectives
- **Optimal Count**: 3-6 items for meaningful sequencing without cognitive overload

### Explanation Excellence
- **Process Logic**: Explain WHY the sequence matters and what drives the order
- **Dependency Relationships**: Address how each step enables or requires the next
- **Conceptual Understanding**: Connect sequencing to broader principles or patterns
- **Learning Reinforcement**: Strengthen understanding of process flow and dependencies

## OUTPUT REQUIREMENTS

Respond with a JSON object in this exact format:

\`\`\`json
{
  "question": "Clear instruction for ordering the sequence with educational context",
  "sequence_items": [
    "First step in correct chronological/logical order",
    "Second step that builds on or follows the first",
    "Third step that depends on previous steps",
    "Fourth step that continues the logical progression",
    "Final step that completes the process or sequence"
  ],
  "explanation": "Comprehensive explanation of why this order is necessary and how steps depend on each other",
  "sequence_analysis": {
    "sequence_type": "chronological|procedural|developmental|causal|logical",
    "dependency_pattern": "How each step enables or requires the next",
    "why_order_matters": "What goes wrong if steps are out of order"
  },
  "educational_rationale": "Why understanding this sequence advances learning objectives",
  "cognitive_level": "understand|apply|analyze",
  "difficulty_indicators": {
    "requires_process_understanding": true|false,
    "tests_logical_dependencies": true|false,
    "involves_causal_reasoning": true|false
  }
}
\`\`\`

## QUALITY STANDARDS
- Sequence represents meaningful progression with clear dependencies
- Order is logically or chronologically necessary, not arbitrary
- Each step is distinct and essential to the process
- Explanation addresses WHY sequence matters for understanding
- 4-6 items for optimal cognitive engagement

Create a single, exceptional sequencing question based on the provided question plan.
`;

// =============================================================================
// Sequencing Generation Function
// =============================================================================

export const generateSequencingQuestion = async (
  plan: QuestionPlan,
  transcriptContext?: any
): Promise<SequencingQuestion> => {
  try {
    console.log(`📋 Generating Sequencing: ${plan.question_id}`);
    console.log(`   📚 Learning Objective: ${plan.learning_objective}`);
    console.log(`   🧠 Bloom Level: ${plan.bloom_level}`);
    console.log(`   💡 Key Concepts: ${plan.key_concepts.join(', ')}`);
    console.log(`   ⏰ Planned Timestamp: ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s)`);
    
    const contextualPrompt = buildSequencingContextualPrompt(plan, transcriptContext);
    
    // Use LLM service with OpenAI as preferred provider for sequencing
    const llmService = new LLMService();
    const response = await llmService.generateQuestion(
      'sequencing',
      contextualPrompt,
      {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.9,
        preferredProvider: 'openai' // Prefer OpenAI for complex sequencing logic
      }
    );

    if (!response.content) {
      throw new Error('No content in LLM response');
    }

    const questionData = response.content;
    
    // Validate Sequencing structure
    validateSequencingStructure(questionData);
    
    // Use the timestamp from LLM if provided, otherwise use plan timestamp
    const finalTimestamp = questionData.optimal_timestamp || plan.timestamp;
    
    // Convert to our SequencingQuestion interface
    const sequencingQuestion: SequencingQuestion = {
      question_id: plan.question_id,
      timestamp: finalTimestamp,
      type: 'sequencing',
      question: questionData.question,
      sequence_items: questionData.sequence_items,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale,
      sequence_type: questionData.sequence_analysis?.sequence_type || 'procedural'
    };
    
    console.log(`✅ Sequencing generated successfully: ${plan.question_id}`);
    console.log(`   🎯 Question: ${questionData.question.substring(0, 60)}...`);
    console.log(`   📊 Items: ${questionData.sequence_items.length}`);
    console.log(`   📋 Sequence Type: ${questionData.sequence_analysis?.sequence_type || 'Not specified'}`);
    
    if (finalTimestamp !== plan.timestamp) {
      console.log(`   ⏰ Timestamp adjusted by LLM: ${formatSecondsForDisplay(plan.timestamp)} → ${formatSecondsForDisplay(finalTimestamp)}`);
    }
    console.log(`   ⏰ Final Timestamp: ${formatSecondsForDisplay(finalTimestamp)} (${finalTimestamp}s)`);
    console.log(`   🤖 Provider Used: ${response.provider || 'unknown'}`);
    
    // Log usage if available (OpenAI)
    if (response.usage) {
      console.log(`   💰 Token Usage: ${response.usage.totalTokens} total`);
    }
    
    return sequencingQuestion;
    
  } catch (error: unknown) {
    console.error(`❌ Sequencing generation failed:`, error);
    
    if (error instanceof Error) {
      throw new QuestionGenerationError(
        `Failed to generate Sequencing: ${error.message}`,
        plan.question_id,
        { questionType: 'sequencing', planDetails: plan, error: error.message }
      );
    }
    
    throw new QuestionGenerationError(
      'Unknown error during Sequencing generation',
      plan.question_id,
      { questionType: 'sequencing', planDetails: plan }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const buildSequencingContextualPrompt = (plan: QuestionPlan, transcriptContext?: any): string => {
  let prompt = `${SEQUENCING_DETAILED_PROMPT}

## QUESTION PLAN CONTEXT

**Learning Objective**: ${plan.learning_objective}

**Content Context**: ${plan.content_context}

**Key Concepts to Address**: 
${plan.key_concepts.map(concept => `- ${concept}`).join('\n')}

**Target Bloom's Level**: ${plan.bloom_level}

**Educational Rationale**: ${plan.educational_rationale}

**Planning Notes**: ${plan.planning_notes}

**Suggested Timestamp**: ${plan.timestamp}s (${formatSecondsForDisplay(plan.timestamp)})`;

  // Add transcript context if available
  if (transcriptContext) {
    prompt += `

## TRANSCRIPT CONTEXT
The following is the transcript content around timestamp ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s) that provides context for this question:

${transcriptContext.formattedContext}

Key Concepts Nearby: ${transcriptContext.nearbyConcepts.join(', ')}
Visual Context: ${transcriptContext.visualContext || 'N/A'}
${transcriptContext.isSalientMoment ? `This is a salient learning moment (${transcriptContext.eventType})` : ''}

## IMPORTANT TIMING INSTRUCTION
Based on the transcript segments above, determine the OPTIMAL TIMESTAMP for this question to appear. The question should appear AFTER all relevant concepts have been fully explained. Look for when explanations end, not when they begin.

Return an "optimal_timestamp" field (in seconds) in your response that indicates when this question should appear. This should be:
- After all necessary processes or sequences are explained
- After the end timestamp of the last relevant explanation
- Before the video moves to unrelated topics

Use this transcript context to:
1. Create sequence items that directly relate to the process or order discussed in the transcript
2. Ensure the sequence is based on actual content from the video
3. Make explanations reference specific points from the transcript
4. Determine the optimal timing for the question to appear`;
  } else {
    prompt += `

Note: No transcript context available. Use the suggested timestamp of ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s).`;
  }

  prompt += `

## YOUR TASK

Based on this educational context, create a single, exceptional sequencing question that:
1. Tests the specified learning objective through process/order understanding at the ${plan.bloom_level} level
2. Incorporates the key concepts through meaningful sequence understanding
3. Uses sequence patterns that reveal genuine process comprehension vs. guessing
4. Provides educational explanations that reinforce understanding of WHY order matters

Focus on creating sequences that develop understanding of processes, causality, or logical progression.`;

  return prompt;
};

const validateSequencingStructure = (data: any): void => {
  // Basic structure validation
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length < 15) {
    throw new Error('Sequencing question must be a meaningful string of at least 15 characters');
  }
  
  // Validate sequence_items array
  if (!data.sequence_items || !Array.isArray(data.sequence_items)) {
    throw new Error('sequence_items must be an array');
  }
  
  // Transform and validate each item
  for (let i = 0; i < data.sequence_items.length; i++) {
    const item = data.sequence_items[i];
    
    // Handle object format (AI sometimes returns objects instead of strings)
    if (typeof item === 'object' && item !== null) {
      if (item.content && typeof item.content === 'string') {
        console.log(`🔄 Converting sequence_items[${i}] from object to string`);
        data.sequence_items[i] = item.content;
      } else if (item.text && typeof item.text === 'string') {
        console.log(`🔄 Converting sequence_items[${i}] from object to string (text field)`);
        data.sequence_items[i] = item.text;
      } else {
        throw new Error(`sequence_items[${i}] object must have 'content' or 'text' property, got: ${JSON.stringify(item)}`);
      }
    } else if (typeof item !== 'string') {
      throw new Error(`sequence_items[${i}] must be a string, got ${typeof item}: ${JSON.stringify(item)}`);
    }
    
    // Validate the final string content
    const finalItem = data.sequence_items[i];
    if (typeof finalItem !== 'string' || finalItem.trim().length < 5) {
      throw new Error(`sequence_items[${i}] must be at least 5 characters long`);
    }
  }
  
  if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length < 30) {
    throw new Error('Explanation must be a comprehensive string of at least 30 characters');
  }
  
  // Check for duplicate items (now safe to call toLowerCase)
  const items = data.sequence_items.map((item: string) => item.toLowerCase().trim());
  const uniqueItems = new Set(items);
  
  if (uniqueItems.size !== items.length) {
    throw new Error('All sequence items must be unique');
  }
  
  // Validate sequence type
  if (data.sequence_analysis && data.sequence_analysis.sequence_type) {
    const sequenceType = data.sequence_analysis.sequence_type;
    console.log(`✅ Sequence type specified: ${sequenceType}`);
  } else {
    console.warn('⚠️ Consider specifying the sequence type for educational clarity');
  }
  
};

// =============================================================================
// Sequencing Quality Assessment
// =============================================================================

export const assessSequencingQuality = (question: SequencingQuestion): {
  score: number;
  strengths: string[];
  improvements: string[];
} => {
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 100;
  
  // Question quality assessment
  const questionLength = question.question.length;
  if (questionLength >= 20 && questionLength <= 150) {
    strengths.push('Question instruction is clear and appropriate length');
  } else if (questionLength < 20) {
    improvements.push('Question instruction could be more detailed');
    score -= 10;
  } else {
    improvements.push('Question instruction may be too verbose');
    score -= 5;
  }
  
  // Items quantity assessment
  const itemCount = question.sequence_items.length;
  if (itemCount >= 4 && itemCount <= 6) {
    strengths.push(`Optimal number of items (${itemCount}) for sequencing`);
  } else if (itemCount < 4) {
    improvements.push('Too few items - may not provide sufficient sequencing challenge');
    score -= 15;
  } else {
    improvements.push('Too many items - may cause cognitive overload');
    score -= 10;
  }
  
  // Explanation quality assessment
  if (question.explanation.length >= 50) {
    strengths.push('Explanation provides good educational value');
  } else {
    improvements.push('Explanation could better address sequence logic');
    score -= 15;
  }
  
  // Sequence analysis assessment
  if (question.sequence_analysis && question.sequence_analysis.sequence_type) {
    strengths.push('Clear sequence type specified');
  } else {
    improvements.push('Could benefit from sequence type analysis');
    score -= 10;
  }
  
  // Item quality assessment
  const avgItemLength = question.sequence_items.reduce((sum, item) => sum + item.length, 0) / question.sequence_items.length;
  
  if (avgItemLength >= 15 && avgItemLength <= 80) {
    strengths.push('Sequence items are appropriately detailed');
  } else if (avgItemLength < 15) {
    improvements.push('Sequence items could be more descriptive');
    score -= 5;
  } else {
    improvements.push('Sequence items may be too verbose');
    score -= 5;
  }
  

  
  // Dependency analysis
  if (question.sequence_analysis && question.sequence_analysis.dependency_pattern) {
    strengths.push('Includes dependency pattern analysis');
  } else {
    improvements.push('Could benefit from dependency analysis');
    score -= 5;
  }
  
  
  // Cognitive level appropriateness
  if (question.bloom_level === 'understand' || question.bloom_level === 'apply') {
    strengths.push('Appropriate cognitive level for sequencing format');
  } else if (question.bloom_level === 'analyze') {
    strengths.push('Targets higher-order process analysis');
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

export const sequencingProcessorConfig = {
  questionType: 'sequencing',
  processorName: 'Sequencing Processor v5.0',
  stage: 2,
  requiresVideoAnalysis: false,
  supports: {
    processAnalysis: true,
    dependencyMapping: true,
    chronologicalReasoning: true,
    educationalExplanations: true,
    qualityAssessment: true
  }
}; 