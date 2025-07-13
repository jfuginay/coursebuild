/**
 * Stage 2: Sequencing Question Processor
 * 
 * Specialized processor for generating high-quality sequencing questions
 * that test understanding of chronological order, process flows, and
 * logical progression through meaningful step-by-step interactions.
 */

// =============================================================================
// Imports
// =============================================================================

import { QuestionPlan, SequencingQuestion, QuestionGenerationError } from '../types/interfaces.ts';
import { formatSecondsForDisplay } from '../utils/timestamp-converter.ts';
import { LLMService } from './llm-providers.ts';
import { QUESTION_TYPE_CONFIGS } from './llm-schemas.ts';
import { QUESTION_TIMING_INSTRUCTION } from '../config/prompts.ts';

// =============================================================================
// Sequencing-Specific Prompt (Stage 2)
// =============================================================================

export const SEQUENCING_DETAILED_PROMPT = `
You are an expert educational designer specializing in sequencing questions that test understanding of ESSENTIAL causal relationships and logical dependencies. Your mission is to create a single, high-quality sequencing question ONLY when the order of steps is CRUCIAL for understanding concepts, not just because items happen to be presented in a certain order in the video.

## CRITICAL SEQUENCING SELECTION CRITERIA

**ONLY CREATE sequencing questions when ALL of the following are true:**
1. **Causal Dependencies**: Each step MUST enable, require, or directly cause the next step
2. **Educational Necessity**: Understanding the sequence is ESSENTIAL for mastering the concept
3. **Failure Consequences**: Wrong order would result in failure, inefficiency, or fundamental misunderstanding
4. **Logical Relationships**: Order reflects natural laws, cause-effect relationships, or procedural requirements

**NEVER CREATE sequencing questions for:**
- Items that just happen to be mentioned in video order
- Lists or categories without causal relationships
- Steps that could reasonably be done in different orders
- Sequences based only on presentation convenience
- Temporal order without logical necessity

## PROCESS LEARNING EXCELLENCE CRITERIA

### Question Design Principles
- **Logical Flow Focus**: Test understanding of WHY items must be in a specific order, not just memorization of sequences
- **Process Understanding**: Sequence should represent meaningful progression with clear dependency relationships
- **Educational Significance**: Order should matter for understanding the concept, process, or phenomenon
- **Clear Dependencies**: Each step should logically depend on or build upon previous steps
- **Authentic Sequencing**: Use real-world processes, procedures, or developmental progressions

### Sequence Development Strategy
- **Meaningful Progression**: Focus on cause-effect chains, developmental stages, procedural steps, or logical dependencies - NOT video presentation order
- **Educational Importance**: Each step should represent important knowledge in the learning domain and demonstrate WHY sequence matters
- **Clear Distinctions**: Steps should be distinct enough that order is not arbitrary and has genuine consequences
- **Logical Dependencies**: Earlier steps should enable or be required for later steps - ask "What happens if I do step 3 before step 2?"
- **Prerequisite Testing**: Verify each step is a true prerequisite by considering if skipping or reordering would cause problems
- **Avoid Temporal Coincidence**: Reject sequences where order is only circumstantial to video explanation, not conceptually necessary
- **Appropriate Granularity**: Not too fine-grained (obvious) or too coarse-grained (ambiguous)

### Item Selection Criteria
- **Essential Steps**: Include only steps that are crucial to the process or development
- **Clear Boundaries**: Each item should represent a distinct, identifiable stage or action
- **Logical Necessity**: Order should be logically required, not conventional, arbitrary, or based on video presentation
- **Causal Validation**: Each step must be a PREREQUISITE for the next step - ask "Can this step happen BEFORE the previous step without causing problems?"
- **Educational Value**: Understanding the sequence should advance learning objectives and reveal WHY order matters
- **Avoid Video Order Bias**: Reject sequences that simply follow the order topics are mentioned in the video unless there's genuine logical dependency
- **Optimal Count**: 3-6 items for meaningful sequencing without cognitive overload

### Explanation Excellence
- **Process Logic**: Explain WHY the sequence matters and what drives the order - focus on causal necessity, not video presentation
- **Dependency Relationships**: Address how each step enables or requires the next, and what fails if order is wrong
- **Conceptual Understanding**: Connect sequencing to broader principles or patterns and emphasize why order is educationally crucial
- **Consequence Clarity**: Explain what happens when steps are done out of order - failure, inefficiency, or misunderstanding
- **Learning Reinforcement**: Strengthen understanding of process flow and dependencies, not just memorization of sequence

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
- Order is logically or chronologically necessary, not arbitrary or based on video presentation order
- Each step is distinct and essential to the process with genuine prerequisites
- Explanation addresses WHY sequence matters for understanding and what fails if order is wrong
- 4-6 items for optimal cognitive engagement

## MANDATORY VALIDATION CHECKLIST
Before creating the question, verify:
✅ **Causal Necessity**: Each step truly enables or requires the next step
✅ **Educational Dependency**: Understanding sequence order is essential for concept mastery
✅ **Failure Consequences**: Wrong order would cause real problems, not just "incorrectness"
✅ **Avoid Video Bias**: Sequence reflects logical necessity, not just video presentation order
✅ **Prerequisite Test**: Ask "Can I do step N before step N-1 without issues?" - answer should be NO

**ONLY PROCEED if ALL criteria are met. If not, this content is not suitable for sequencing questions.**

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
  if (transcriptContext && transcriptContext.formattedContext) {
    prompt += `

## TRANSCRIPT CONTEXT
The following is the transcript content around timestamp ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s) that provides context for this question:

${transcriptContext.formattedContext}

Key Concepts Nearby: ${transcriptContext.nearbyConcepts.join(', ')}
Visual Context: ${transcriptContext.visualContext || 'N/A'}
${transcriptContext.isSalientMoment ? `This is a salient learning moment (${transcriptContext.eventType})` : ''}

${QUESTION_TIMING_INSTRUCTION}

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
  if (itemCount >= 3 && itemCount <= 6) {
    strengths.push(`Optimal number of items (${itemCount}) for sequencing`);
  } else if (itemCount < 3) {
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