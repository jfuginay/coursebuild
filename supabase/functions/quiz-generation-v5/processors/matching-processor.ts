/**
 * Stage 2: Matching Question Processor
 * 
 * Specialized processor for generating high-quality matching questions
 * that test understanding of relationships between concepts, processes,
 * or categories through meaningful paired connections.
 */

import { QuestionPlan, MatchingQuestion, QuestionGenerationError } from '../types/interfaces.ts';
import LLMService from './llm-providers.ts';
import { formatSecondsForDisplay } from '../utils/timestamp-converter.ts';

// =============================================================================
// Matching-Specific Prompt (Stage 2)
// =============================================================================

export const MATCHING_DETAILED_PROMPT = `
You are an expert educational designer specializing in matching questions that test understanding of relationships and connections. Your mission is to create a single, high-quality matching question that reveals deep understanding of how concepts, processes, or categories relate to each other.

## RELATIONSHIP LEARNING EXCELLENCE CRITERIA

### Question Design Principles
- **Meaningful Connections**: Pairs should represent important educational relationships, not trivial associations
- **Conceptual Understanding**: Test understanding of WHY items connect, not just memorized pairings
- **Clear Categories**: Each set (left/right) should represent a coherent category or concept type
- **Educational Purpose**: Matching should advance understanding of key relationships in the domain
- **Discrimination Challenge**: Require genuine understanding to distinguish correct from incorrect pairings

### Pair Development Strategy
- **Conceptual Relationships**: Focus on cause-effect, category-example, process-outcome, theory-application connections
- **Educational Significance**: Each pair should represent important knowledge relationships
- **Clear Distinctions**: Avoid pairs that are too similar or could match multiple items
- **Balanced Difficulty**: Mix some obvious connections with more subtle relationship understanding
- **Domain Authentic**: Use terminology and relationships authentic to the educational domain

### Left Column Design (Stems)
- **Consistent Category**: All items should be from the same conceptual category (e.g., all processes, all theories, all causes)
- **Clear Identification**: Each item should be easily identified and distinguished
- **Educational Importance**: Focus on the most important concepts from the content
- **Appropriate Scope**: 3-5 items for meaningful interaction without cognitive overload

### Right Column Design (Matches)
- **Corresponding Category**: Items should logically correspond to left column category
- **One-to-One Mapping**: Each right item should clearly match exactly one left item
- **Educational Value**: Correct matches should represent important learning connections
- **Plausible Alternatives**: Include some items that could plausibly (but incorrectly) match multiple left items

### Explanation Excellence
- **Relationship Focus**: Explain WHY the pairs connect, not just WHAT they are
- **Conceptual Depth**: Address the underlying principles that make these connections meaningful
- **Learning Reinforcement**: Strengthen understanding of the relationship patterns
- **Misconception Prevention**: Address why incorrect pairings might seem plausible

## OUTPUT REQUIREMENTS

Respond with a JSON object in this exact format:

\`\`\`json
{
  "question": "Clear instruction for matching relationships between the two sets",
  "matching_pairs": [
    { "left": "First concept/process/category item", "right": "Its corresponding match/outcome/example" },
    { "left": "Second concept/process/category item", "right": "Its corresponding match/outcome/example" },
    { "left": "Third concept/process/category item", "right": "Its corresponding match/outcome/example" },
    { "left": "Fourth concept/process/category item", "right": "Its corresponding match/outcome/example" }
  ],
  "explanation": "Comprehensive explanation of the relationship patterns and why these specific connections are important",
  "relationship_analysis": {
    "relationship_type": "cause-effect|category-example|process-outcome|theory-application|concept-definition",
    "why_important": "Why understanding these relationships matters for learning",
    "common_confusions": "What makes some pairings potentially confusing"
  },
  "educational_rationale": "Why this matching exercise effectively tests understanding of relationships",
  "cognitive_level": "understand|apply|analyze",
  "difficulty_indicators": {
    "requires_relationship_understanding": true|false,
    "tests_fine_distinctions": true|false,
    "involves_transfer": true|false
  }
}
\`\`\`

## QUALITY STANDARDS
- MAKE SURE THERE ARE NO DUPLICATE ENTRIES THAT APPEAR IN BOTH LEFT AND RIGHT COLUMNS
- Pairs represent meaningful educational relationships, not trivial associations
- Left and right columns form coherent, parallel categories
- Requires genuine understanding of WHY items connect
- Explanation addresses relationship patterns and learning significance
- 3-5 pairs for optimal cognitive engagement without overload

Create a single, exceptional matching question based on the provided question plan.
`;

// =============================================================================
// Matching Generation Function
// =============================================================================

export const generateMatchingQuestion = async (
  plan: QuestionPlan,
  transcriptContext?: any
): Promise<MatchingQuestion> => {
  try {
    console.log(`🔗 Generating Matching: ${plan.question_id}`);
    console.log(`   📚 Learning Objective: ${plan.learning_objective}`);
    console.log(`   🧠 Bloom Level: ${plan.bloom_level}`);
    console.log(`   💡 Key Concepts: ${plan.key_concepts.join(', ')}`);
    console.log(`   ⏰ Planned Timestamp: ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s)`);
    
    const contextualPrompt = buildMatchingContextualPrompt(plan, transcriptContext);
    
    // Use LLM service interface
    const llmService = new LLMService();
    const response = await llmService.generateQuestion(
      'matching',
      contextualPrompt,
      {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topK: 40,
        topP: 0.9
      }
    );

    if (!response.content) {
      throw new Error('No content in LLM response');
    }

    const questionData = response.content;
    
    // Validate and ensure all required fields
    validateMatchingStructure(questionData);
    
    // Use the timestamp from LLM if provided, otherwise use plan timestamp
    const finalTimestamp = questionData.optimal_timestamp || plan.timestamp;
    
    // Create the matching question
    const matchingQuestion: MatchingQuestion = {
      question_id: plan.question_id,
      timestamp: finalTimestamp,
      type: 'matching',
      question: questionData.question,
      matching_pairs: questionData.matching_pairs,
      explanation: questionData.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale,
      relationship_type: questionData.relationship_type || 'concept-definition'
    };
    
    console.log(`✅ Matching generated: ${plan.question_id}`);
    console.log(`   🎯 Question: ${questionData.question.substring(0, 60)}...`);
    console.log(`   📊 Pairs: ${questionData.matching_pairs.length}`);
    
    if (finalTimestamp !== plan.timestamp) {
      console.log(`   ⏰ Timestamp adjusted by LLM: ${formatSecondsForDisplay(plan.timestamp)} → ${formatSecondsForDisplay(finalTimestamp)}`);
    }
    console.log(`   ⏰ Final Timestamp: ${formatSecondsForDisplay(finalTimestamp)} (${finalTimestamp}s)`);
    
    return matchingQuestion;
    
  } catch (error: unknown) {
    console.error(`❌ Matching generation failed:`, error);
    
    if (error instanceof Error) {
      throw new QuestionGenerationError(
        `Failed to generate Matching: ${error.message}`,
        plan.question_id,
        { questionType: 'matching', planDetails: plan, error: error.message }
      );
    }
    
    throw new QuestionGenerationError(
      'Unknown error during Matching generation',
      plan.question_id,
      { questionType: 'matching', planDetails: plan }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const buildMatchingContextualPrompt = (plan: QuestionPlan, transcriptContext?: any): string => {
  let prompt = `${MATCHING_DETAILED_PROMPT}

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
- After all necessary concepts and relationships are explained
- After the end timestamp of the last relevant explanation
- Before the video moves to unrelated topics

Use this transcript context to:
1. Create pairs that directly relate to concepts discussed in the transcript
2. Ensure the relationships are based on actual content from the video
3. Make explanations reference specific points from the transcript
4. Determine the optimal timing for the question to appear`;
  } else {
    prompt += `

Note: No transcript context available. Use the suggested timestamp of ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s).`;
  }

  prompt += `

## YOUR TASK

Based on this educational context, create a single, exceptional matching question that:
1. Tests the specified learning objective at the ${plan.bloom_level} level
2. Exactly 4 pairs that represent meaningful educational relationships
3. Uses relationship analysis to explain why the matches matter
4. Provides educational explanations that reinforce understanding

Focus on creating pairs that reveal deep understanding of relationships rather than surface-level associations.`;

  return prompt;
};

const validateMatchingStructure = (data: any): void => {
  // Basic structure validation
  if (!data.question || typeof data.question !== 'string' || data.question.trim().length < 15) {
    throw new Error('Matching question must be a meaningful string of at least 15 characters');
  }
  
  if (!Array.isArray(data.matching_pairs) || data.matching_pairs.length < 3 || data.matching_pairs.length > 5) {
    throw new Error('Matching must have 3-5 pairs for optimal cognitive engagement');
  }
  
  // Validate all pairs have left and right items
  for (let i = 0; i < data.matching_pairs.length; i++) {
    const pair = data.matching_pairs[i];
    if (!pair.left || typeof pair.left !== 'string' || pair.left.trim().length < 2) {
      throw new Error(`Pair ${i} left item must be a meaningful string`);
    }
    if (!pair.right || typeof pair.right !== 'string' || pair.right.trim().length < 2) {
      throw new Error(`Pair ${i} right item must be a meaningful string`);
    }
  }
  
  if (!data.explanation || typeof data.explanation !== 'string' || data.explanation.trim().length < 30) {
    throw new Error('Explanation must be a comprehensive string of at least 30 characters');
  }
  
  // Check for duplicate items
  const leftItems = data.matching_pairs.map((pair: any) => pair.left.toLowerCase().trim());
  const rightItems = data.matching_pairs.map((pair: any) => pair.right.toLowerCase().trim());
  
  const uniqueLeftItems = new Set(leftItems);
  const uniqueRightItems = new Set(rightItems);
  
  if (uniqueLeftItems.size !== leftItems.length) {
    throw new Error('All left column items must be unique');
  }
  
  if (uniqueRightItems.size !== rightItems.length) {
    throw new Error('All right column items must be unique');
  }
  
  // Check for educational quality indicators
  const explanation = data.explanation.toLowerCase();
  const hasRelationshipFocus = explanation.includes('connect') || 
                              explanation.includes('relationship') || 
                              explanation.includes('because') ||
                              explanation.includes('correspond');
  
  if (!hasRelationshipFocus) {
    console.warn('⚠️ Explanation may lack relationship focus - consider explaining WHY items connect');
  }
  
  // Validate relationship consistency
  if (data.relationship_analysis && data.relationship_analysis.relationship_type) {
    const relationshipType = data.relationship_analysis.relationship_type;
    console.log(`✅ Relationship type specified: ${relationshipType}`);
  } else {
    console.warn('⚠️ Consider specifying the relationship type for educational clarity');
  }
};

// =============================================================================
// Matching Quality Assessment
// =============================================================================

export const assessMatchingQuality = (question: MatchingQuestion): {
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
  
  // Pairs quantity assessment
  const pairCount = question.matching_pairs.length;
  if (pairCount >= 3 && pairCount <= 5) {
    strengths.push(`Optimal number of pairs (${pairCount}) for cognitive engagement`);
  } else if (pairCount < 3) {
    improvements.push('Too few pairs - may not provide sufficient interaction');
    score -= 15;
  } else {
    improvements.push('Too many pairs - may cause cognitive overload');
    score -= 10;
  }
  
  // Explanation quality assessment
  if (question.explanation.length >= 50) {
    strengths.push('Explanation provides good educational value');
  } else {
    improvements.push('Explanation could better address relationship patterns');
    score -= 15;
  }
  
  // Relationship analysis assessment
  if (question.relationship_analysis && question.relationship_analysis.relationship_type) {
    strengths.push('Clear relationship type specified');
  } else {
    improvements.push('Could benefit from relationship type analysis');
    score -= 10;
  }
  
  // Pair quality assessment
  const leftItems = question.matching_pairs.map(pair => pair.left);
  const rightItems = question.matching_pairs.map(pair => pair.right);
  
  // Check for consistency in left column
  const avgLeftLength = leftItems.reduce((sum, item) => sum + item.length, 0) / leftItems.length;
  const avgRightLength = rightItems.reduce((sum, item) => sum + item.length, 0) / rightItems.length;
  
  if (Math.abs(avgLeftLength - avgRightLength) < 20) {
    strengths.push('Balanced item lengths between columns');
  } else {
    improvements.push('Consider balancing item lengths between columns');
    score -= 5;
  }
  
  // Educational value assessment
  const explanation = question.explanation.toLowerCase();
  const hasRelationshipFocus = explanation.includes('connect') || 
                              explanation.includes('relationship') || 
                              explanation.includes('because') ||
                              explanation.includes('important');
  
  if (hasRelationshipFocus) {
    strengths.push('Explanation focuses on relationship understanding');
  } else {
    improvements.push('Could better explain why relationships matter');
    score -= 10;
  }
  
  // Cognitive level appropriateness
  if (question.bloom_level === 'understand' || question.bloom_level === 'apply') {
    strengths.push('Appropriate cognitive level for matching format');
  } else if (question.bloom_level === 'analyze') {
    strengths.push('Targets higher-order relationship analysis');
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

export const matchingProcessorConfig = {
  questionType: 'matching',
  processorName: 'Matching Processor v5.0',
  stage: 2,
  requiresVideoAnalysis: false,
  supports: {
    relationshipAnalysis: true,
    conceptualConnections: true,
    educationalExplanations: true,
    qualityAssessment: true
  }
}; 