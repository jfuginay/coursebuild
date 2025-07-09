/**
 * LLM Schemas - OpenAI and Gemini Compatible Response Schemas
 * 
 * Defines structured output schemas for different question types that work
 * with both OpenAI's structured outputs and Gemini's response schemas.
 */

// =============================================================================
// Provider-Specific Schema Utilities
// =============================================================================

/**
 * Convert OpenAI schema to Gemini-compatible format
 * (removes additionalProperties which Gemini doesn't support)
 */
const toGeminiSchema = (schema: any): any => {
  const geminiSchema = JSON.parse(JSON.stringify(schema));
  
  const removeAdditionalProperties = (obj: any) => {
    if (obj && typeof obj === 'object') {
      delete obj.additionalProperties;
      Object.values(obj).forEach(removeAdditionalProperties);
    }
  };
  
  removeAdditionalProperties(geminiSchema);
  return geminiSchema;
};

// =============================================================================
// Multiple Choice Question Schema
// =============================================================================

export const MCQ_SCHEMA_BASE = {
  type: "object",
  properties: {
    question: { 
      type: "string", 
      description: "The question stem that tests understanding" 
    },
    options: { 
      type: "array", 
      items: { type: "string" },
      minItems: 4,
      maxItems: 4,
      description: "Exactly 4 answer options"
    },
    correct_answer: { 
      type: "integer", 
      minimum: 0,
      maximum: 3,
      description: "Index of correct answer (0-3)"
    },
    explanation: { 
      type: "string", 
      description: "Educational explanation of why the correct answer is right" 
    },
    misconception_analysis: {
      type: "object",
      properties: {
        option_1: { type: "string", description: "Why students might choose this misconception" },
        option_2: { type: "string", description: "Analysis of the incomplete knowledge this represents" },
        option_3: { type: "string", description: "Explanation of the logical confusion or misapplication" }
      },
      required: ["option_1", "option_2", "option_3"],
      additionalProperties: false,
      description: "Analysis of why each distractor represents common errors"
    },
    educational_rationale: { 
      type: "string", 
      description: "Why this question effectively tests the learning objective" 
    },
    cognitive_level: { 
      type: "string", 
      enum: ["understand", "apply", "analyze"],
      description: "Bloom's taxonomy level"
    },
    difficulty_indicators: {
      type: "object",
      properties: {
        requires_application: { type: "boolean" },
        tests_misconceptions: { type: "boolean" },
        involves_analysis: { type: "boolean" }
      },
      required: ["requires_application", "tests_misconceptions", "involves_analysis"],
      additionalProperties: false
    }
  },
  required: ["question", "options", "correct_answer", "explanation", "educational_rationale", "misconception_analysis", "cognitive_level", "difficulty_indicators"],
  additionalProperties: false
};

export const MCQ_SCHEMA = MCQ_SCHEMA_BASE;

// =============================================================================
// True/False Question Schema
// =============================================================================

export const TRUE_FALSE_SCHEMA_BASE = {
  type: "object",
  properties: {
    question: { 
      type: "string", 
      description: "The true/false statement to evaluate" 
    },
    correct_answer: { 
      type: "boolean", 
      description: "Whether the statement is true or false" 
    },
    explanation: { 
      type: "string", 
      description: "Educational explanation of the concept and why the statement is true/false" 
    },
    concept_analysis: {
      type: "object",
      properties: {
        key_concept: { type: "string", description: "The main concept being tested" },
        why_important: { type: "string", description: "Why understanding this concept matters" },
        common_confusion: { type: "string", description: "What students commonly misunderstand" }
      },
      required: ["key_concept", "why_important", "common_confusion"],
      additionalProperties: false
    },
    educational_rationale: { 
      type: "string", 
      description: "Why this true/false question effectively tests understanding" 
    },
    cognitive_level: { 
      type: "string", 
      enum: ["remember", "understand", "apply"],
      description: "Bloom's taxonomy level"
    },
    misconception_addressed: { 
      type: "string", 
      description: "If false, what common misconception does this address" 
    },
    difficulty_indicators: {
      type: "object",
      properties: {
        requires_careful_reading: { type: "boolean" },
        tests_fine_distinctions: { type: "boolean" },
        addresses_misconceptions: { type: "boolean" }
      },
      required: ["requires_careful_reading", "tests_fine_distinctions", "addresses_misconceptions"],
      additionalProperties: false
    }
  },
  required: ["question", "correct_answer", "explanation", "educational_rationale", "concept_analysis", "cognitive_level", "misconception_addressed", "difficulty_indicators"],
  additionalProperties: false
};

export const TRUE_FALSE_SCHEMA = TRUE_FALSE_SCHEMA_BASE;

// =============================================================================
// Matching Question Schema
// =============================================================================

export const MATCHING_SCHEMA_BASE = {
  type: "object",
  properties: {
    question: { 
      type: "string", 
      description: "Clear instruction for matching relationships between the two sets" 
    },
    matching_pairs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          left: { type: "string", description: "Left column item" },
          right: { type: "string", description: "Right column item" }
        },
        required: ["left", "right"],
        additionalProperties: false
      },
      minItems: 3,
      maxItems: 5,
      description: "3-5 matching pairs showing meaningful relationships"
    },
    explanation: { 
      type: "string", 
      description: "Comprehensive explanation of the relationship patterns and their importance" 
    },
    relationship_analysis: {
      type: "object",
      properties: {
        relationship_type: { 
          type: "string", 
          enum: ["cause-effect", "category-example", "process-outcome", "theory-application", "concept-definition"],
          description: "Type of relationship being tested"
        },
        why_important: { type: "string", description: "Why understanding these relationships matters" },
        common_confusions: { type: "string", description: "What makes some pairings potentially confusing" }
      },
      required: ["relationship_type", "why_important", "common_confusions"],
      additionalProperties: false
    },
    educational_rationale: { 
      type: "string", 
      description: "Why this matching exercise effectively tests understanding of relationships" 
    },
    cognitive_level: { 
      type: "string", 
      enum: ["understand", "apply", "analyze"],
      description: "Bloom's taxonomy level"
    },
    difficulty_indicators: {
      type: "object",
      properties: {
        requires_relationship_understanding: { type: "boolean" },
        tests_fine_distinctions: { type: "boolean" },
        involves_transfer: { type: "boolean" }
      },
      required: ["requires_relationship_understanding", "tests_fine_distinctions", "involves_transfer"],
      additionalProperties: false
    }
  },
  required: ["question", "matching_pairs", "explanation", "educational_rationale", "relationship_analysis", "cognitive_level", "difficulty_indicators"],
  additionalProperties: false
};

export const MATCHING_SCHEMA = MATCHING_SCHEMA_BASE;

// =============================================================================
// Sequencing Question Schema
// =============================================================================

export const SEQUENCING_SCHEMA_BASE = {
  type: "object",
  properties: {
    question: { 
      type: "string", 
      description: "Clear instruction for ordering the sequence items" 
    },
    sequence_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Unique identifier for this item" },
          content: { type: "string", description: "The content/description of this sequence step" },
          position: { type: "integer", minimum: 1, description: "Correct position in sequence (1-based)" }
        },
        required: ["id", "content", "position"],
        additionalProperties: false
      },
      minItems: 3,
      maxItems: 6,
      description: "3-6 items that need to be ordered in correct sequence"
    },
    explanation: { 
      type: "string", 
      description: "Comprehensive explanation of why this sequence order is correct and the logic behind it" 
    },
    sequence_analysis: {
      type: "object",
      properties: {
        sequence_type: { 
          type: "string", 
          enum: ["chronological", "procedural", "logical", "causal", "hierarchical"],
          description: "Type of sequence being tested"
        },
        key_principle: { type: "string", description: "The main principle governing this sequence" },
        common_mistakes: { type: "string", description: "Common ordering mistakes students make" }
      },
      required: ["sequence_type", "key_principle", "common_mistakes"],
      additionalProperties: false
    },
    educational_rationale: { 
      type: "string", 
      description: "Why this sequencing exercise effectively tests understanding of process/logic" 
    },
    cognitive_level: { 
      type: "string", 
      enum: ["understand", "apply", "analyze"],
      description: "Bloom's taxonomy level"
    },
    difficulty_indicators: {
      type: "object",
      properties: {
        requires_process_understanding: { type: "boolean" },
        tests_logical_thinking: { type: "boolean" },
        involves_cause_effect: { type: "boolean" }
      },
      required: ["requires_process_understanding", "tests_logical_thinking", "involves_cause_effect"],
      additionalProperties: false
    }
  },
  required: ["question", "sequence_items", "explanation", "educational_rationale", "sequence_analysis", "cognitive_level", "difficulty_indicators"],
  additionalProperties: false
};

export const SEQUENCING_SCHEMA = SEQUENCING_SCHEMA_BASE;

// =============================================================================
// Schema Registry and Helpers
// =============================================================================

export const QUESTION_SCHEMAS: Record<string, any> = {
  'multiple-choice': MCQ_SCHEMA,
  'true-false': TRUE_FALSE_SCHEMA,
  'matching': MATCHING_SCHEMA,
  'sequencing': SEQUENCING_SCHEMA
};

/**
 * Get schema for a specific question type and provider
 */
export const getQuestionSchema = (questionType: string, provider: 'openai' | 'gemini' = 'openai'): any => {
  const baseSchema = QUESTION_SCHEMAS[questionType];
  if (!baseSchema) {
    throw new Error(`No schema defined for question type: ${questionType}`);
  }
  
  // Return Gemini-compatible schema (without additionalProperties)
  if (provider === 'gemini') {
    return toGeminiSchema(baseSchema);
  }
  
  // Return OpenAI-compatible schema (with additionalProperties)
  return baseSchema;
};

/**
 * Validate that a response matches the expected schema structure
 */
export const validateResponseSchema = (data: any, questionType: string): boolean => {
  const schema = getQuestionSchema(questionType);
  const requiredFields = schema.required || [];
  
  // Check that all required fields are present
  for (const field of requiredFields) {
    if (!(field in data)) {
      console.error(`❌ Missing required field: ${field}`);
      return false;
    }
  }
  
  // Type-specific validations
  switch (questionType) {
    case 'multiple-choice':
      return validateMCQResponse(data);
    case 'true-false':
      return validateTrueFalseResponse(data);
    case 'matching':
      return validateMatchingResponse(data);
    case 'sequencing':
      return validateSequencingResponse(data);
    default:
      console.warn(`⚠️ No specific validation for question type: ${questionType}`);
      return true;
  }
};

// =============================================================================
// Type-Specific Validation Functions
// =============================================================================

const validateMCQResponse = (data: any): boolean => {
  if (!Array.isArray(data.options) || data.options.length !== 4) {
    console.error(`❌ MCQ must have exactly 4 options, got ${data.options?.length}`);
    return false;
  }
  
  if (typeof data.correct_answer !== 'number' || data.correct_answer < 0 || data.correct_answer > 3) {
    console.error(`❌ MCQ correct_answer must be 0-3, got ${data.correct_answer}`);
    return false;
  }
  
  return true;
};

const validateTrueFalseResponse = (data: any): boolean => {
  if (typeof data.correct_answer !== 'boolean') {
    console.error(`❌ True/False correct_answer must be boolean, got ${typeof data.correct_answer}`);
    return false;
  }
  
  return true;
};

const validateMatchingResponse = (data: any): boolean => {
  if (!Array.isArray(data.matching_pairs) || data.matching_pairs.length < 3 || data.matching_pairs.length > 5) {
    console.error(`❌ Matching must have 3-5 pairs, got ${data.matching_pairs?.length}`);
    return false;
  }
  
  for (let i = 0; i < data.matching_pairs.length; i++) {
    const pair = data.matching_pairs[i];
    if (!pair.left || !pair.right) {
      console.error(`❌ Matching pair ${i} missing left or right item`);
      return false;
    }
  }
  
  return true;
};

const validateSequencingResponse = (data: any): boolean => {
  if (!Array.isArray(data.sequence_items) || data.sequence_items.length < 3 || data.sequence_items.length > 6) {
    console.error(`❌ Sequencing must have 3-6 items, got ${data.sequence_items?.length}`);
    return false;
  }
  
  const positions = data.sequence_items.map((item: any) => item.position);
  const expectedPositions = Array.from({ length: data.sequence_items.length }, (_, i) => i + 1);
  
  if (!positions.every((pos: number) => expectedPositions.includes(pos))) {
    console.error(`❌ Sequencing positions must be consecutive starting from 1`);
    return false;
  }
  
  return true;
};

// =============================================================================
// Configuration for Each Question Type
// =============================================================================

export const QUESTION_TYPE_CONFIGS = {
  'multiple-choice': {
    schema: MCQ_SCHEMA,
    temperature: 0.6,
    maxOutputTokens: 4096,
    topK: 40,
    topP: 0.9,
    preferredProvider: 'openai' as const
  },
  'true-false': {
    schema: TRUE_FALSE_SCHEMA,
    temperature: 0.5,
    maxOutputTokens: 1536,
    topK: 30,
    topP: 0.8,
    preferredProvider: 'openai' as const
  },
  'matching': {
    schema: MATCHING_SCHEMA,
    temperature: 0.6,
    maxOutputTokens: 2048,
    topK: 40,
    topP: 0.9,
    preferredProvider: 'openai' as const
  },
  'sequencing': {
    schema: SEQUENCING_SCHEMA,
    temperature: 0.5,
    maxOutputTokens: 2048,
    topK: 35,
    topP: 0.8,
    preferredProvider: 'openai' as const
  }
}; 