/**
 * Stage 2: Sequencing Question Processor
 * 
 * Specialized processor for generating high-quality sequencing questions
 * that test understanding of chronological order, process flows, and
 * logical progression through meaningful step-by-step interactions.
 */

import { QuestionPlan, SequencingQuestion, QuestionGenerationError } from '../types/interfaces.ts';
import LLMService from './llm-providers.ts';

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
- **Optimal Count**: 4-6 items for meaningful sequencing without cognitive overload

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

export const generateSequencingQuestion = async (plan: QuestionPlan): Promise<SequencingQuestion> => {
  try {
    console.log(`📋 Generating Sequencing: ${plan.question_id}`);
    console.log(`   📚 Learning Objective: ${plan.learning_objective}`);
    console.log(`   🧠 Bloom Level: ${plan.bloom_level}`);
    console.log(`   💡 Key Concepts: ${plan.key_concepts.join(', ')}`);
    
    const contextualPrompt = buildSequencingContextualPrompt(plan);
    
    // Use LLM service interface with OpenAI as preferred provider
    const llmService = new LLMService();
    const response = await llmService.generateQuestion(
      'sequencing',
      contextualPrompt,
      {
        temperature: 0.5,
        maxOutputTokens: 2048,
        topK: 30,
        topP: 0.8
      }
    );

    if (!response.content) {
      throw new Error('No content in LLM response');
    }

    const questionData = response.content;
    
    // Validate Sequencing structure
    validateSequencingStructure(questionData);
    
    // Convert to our SequencingQuestion interface
    const sequencingQuestion: SequencingQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'sequencing',
      question: questionData.question,
      sequence_items: questionData.sequence_items,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: questionData.educational_rationale || plan.educational_rationale,
      sequence_analysis: questionData.sequence_analysis || {},
      sequence_type: questionData.sequence_analysis?.sequence_type || 'logical'
    };
    
    console.log(`✅ Sequencing generated successfully: ${plan.question_id}`);
    console.log(`   🎯 Question: ${questionData.question.substring(0, 60)}...`);
    console.log(`   📋 Items: ${questionData.sequence_items.length}`);
    console.log(`   🔄 Sequence Type: ${questionData.sequence_analysis?.sequence_type || 'Not specified'}`);
    console.log(`   📝 First Step: "${questionData.sequence_items[0]}"`);
    console.log(`   📝 Last Step: "${questionData.sequence_items[questionData.sequence_items.length - 1]}"`);
    console.log(`   🤖 Provider Used: ${response.provider || 'unknown'}`);
    
    return sequencingQuestion;
    
  } catch (error: unknown) {
    console.error(`❌ Sequencing generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(
      `Sequencing generation failed: ${error instanceof Error ? error.message : String(error)}`,
      plan.question_id,
      { plan, stage: 'sequencing_generation' }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const buildSequencingContextualPrompt = (plan: QuestionPlan): string => {
  return `${SEQUENCING_DETAILED_PROMPT}

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

Based on this educational context, create a single, exceptional sequencing question that:
1. Tests the specified learning objective through meaningful process understanding at the ${plan.bloom_level} level
2. Incorporates the key concepts through logical progression or dependencies
3. Uses sequence order that is educationally necessary, not arbitrary
4. Provides educational explanations that reinforce understanding of WHY order matters

Focus on creating sequences that develop understanding of important processes, dependencies, or logical flows, not just memorized lists.`;
};

const validateSequencingStructure = (data: any): void => {
  // Basic structure validation
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length < 15) {
    throw new Error('Sequencing question must be a meaningful string of at least 15 characters');
  }
  
  if (!Array.isArray(data.sequence_items) || data.sequence_items.length < 4 || data.sequence_items.length > 6) {
    throw new Error('Sequencing must have 4-6 items for optimal cognitive engagement');
  }
  
  // Validate all items are non-empty strings
  for (let i = 0; i < data.sequence_items.length; i++) {
    if (!data.sequence_items[i] || typeof data.sequence_items[i] !== 'string' || data.sequence_items[i].trim().length < 3) {
      throw new Error(`Sequence item ${i} must be a meaningful string of at least 3 characters`);
    }
  }
  
  if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length < 30) {
    throw new Error('Explanation must be a comprehensive string of at least 30 characters');
  }
  
  // Check for duplicate items
  const items = data.sequence_items.map((item: string) => item.toLowerCase().trim());
  const uniqueItems = new Set(items);
  
  if (uniqueItems.size !== items.length) {
    throw new Error('All sequence items must be unique');
  }
  
  // Check for educational quality indicators
  const explanation = data.explanation.toLowerCase();
  const hasSequenceLogic = explanation.includes('order') || 
                          explanation.includes('sequence') || 
                          explanation.includes('first') ||
                          explanation.includes('then') ||
                          explanation.includes('because') ||
                          explanation.includes('depend');
  
  if (!hasSequenceLogic) {
    console.warn('⚠️ Explanation may lack sequence logic - consider explaining WHY order matters');
  }
  
  // Validate sequence type
  if (data.sequence_analysis && data.sequence_analysis.sequence_type) {
    const sequenceType = data.sequence_analysis.sequence_type;
    console.log(`✅ Sequence type specified: ${sequenceType}`);
  } else {
    console.warn('⚠️ Consider specifying the sequence type for educational clarity');
  }
  
  // Check for procedural language
  const hasProceduralLanguage = data.sequence_items.some((item: string) => {
    const lowerItem = item.toLowerCase();
    return lowerItem.includes('first') || 
           lowerItem.includes('then') || 
           lowerItem.includes('next') ||
           lowerItem.includes('finally') ||
           lowerItem.includes('before') ||
           lowerItem.includes('after');
  });
  
  if (hasProceduralLanguage) {
    console.warn('⚠️ Sequence items contain procedural language - consider using content-focused descriptions instead');
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
  
  // Educational value assessment
  const explanation = question.explanation.toLowerCase();
  const hasSequenceLogic = explanation.includes('order') || 
                          explanation.includes('depend') || 
                          explanation.includes('because') ||
                          explanation.includes('sequence');
  
  if (hasSequenceLogic) {
    strengths.push('Explanation focuses on sequence logic');
  } else {
    improvements.push('Could better explain why order matters');
    score -= 10;
  }
  
  // Dependency analysis
  if (question.sequence_analysis && question.sequence_analysis.dependency_pattern) {
    strengths.push('Includes dependency pattern analysis');
  } else {
    improvements.push('Could benefit from dependency analysis');
    score -= 5;
  }
  
  // Check for procedural language in items
  const hasProceduralLanguage = question.sequence_items.some(item => {
    const lowerItem = item.toLowerCase();
    return lowerItem.includes('first') || lowerItem.includes('then') || lowerItem.includes('next');
  });
  
  if (!hasProceduralLanguage) {
    strengths.push('Items focus on content rather than procedural language');
  } else {
    improvements.push('Consider focusing on content rather than procedural language');
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
  processorName: 'Sequencing Processor v4.0',
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