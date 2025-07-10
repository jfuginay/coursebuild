/**
 * Stage 3: Gemini-Powered Quality Verification System
 * 
 * Uses Gemini API text analysis to evaluate question quality across multiple
 * dimensions without relying on hardcoded calculations or heuristics.
 * Provides comprehensive, AI-powered assessment of educational value.
 */

import { 
  GeneratedQuestion, 
  QualityVerificationResult, 
  QuestionPlan,
  QualityDimension,
  isMultipleChoiceQuestion,
  isTrueFalseQuestion,
  isHotspotQuestion,
  isMatchingQuestion,
  isSequencingQuestion
} from '../types/interfaces.ts';
import { formatSecondsForDisplay } from '../utils/timestamp-converter.ts';

// =============================================================================
// Quality Verification Interfaces
// =============================================================================

export interface QualityVerificationResult {
  question_id: string;
  overall_score: number; // 0-100
  quality_dimensions: {
    educational_value: QualityDimension;
    clarity_and_precision: QualityDimension;
    cognitive_appropriateness: QualityDimension;
    bloom_alignment: QualityDimension;
    misconception_handling: QualityDimension;
    explanation_quality: QualityDimension;
  };
  overall_assessment: string;
  specific_strengths: string[];
  improvement_recommendations: string[];
  verification_confidence: number; // 0-1
  meets_quality_threshold: boolean;
}

export interface QualityDimension {
  score: number; // 0-100
  assessment: string;
  evidence: string[];
  concerns: string[];
}

// =============================================================================
// Quality Verification Prompt
// =============================================================================

export const QUALITY_VERIFICATION_PROMPT = `
You are an expert educational assessment evaluator with deep expertise in question quality, learning theory, and cognitive psychology. Your mission is to perform comprehensive quality analysis of educational questions using advanced text analysis techniques.

## QUALITY EVALUATION FRAMEWORK

### Educational Value Assessment
- **Learning Objective Alignment**: How well does the question serve stated learning goals?
- **Conceptual Depth**: Does the question test understanding versus mere recall?
- **Real-World Relevance**: How meaningfully does the question connect to practical applications?
- **Knowledge Transfer**: Does answering this question develop transferable understanding?

### Clarity and Precision Analysis  
- **Question Clarity**: Is the question unambiguous and clearly communicating expectations?
- **Language Appropriateness**: Is vocabulary and syntax appropriate for the target audience?
- **Instruction Precision**: Are instructions clear, complete, and actionable?
- **Content Accuracy**: Is all content factually correct and current?

### Cognitive Appropriateness Evaluation
- **Cognitive Load**: Is the mental effort required appropriate for the learning context?
- **Complexity Management**: Does the question avoid unnecessary complexity while maintaining rigor?
- **Attention Focus**: Does the question direct attention to the most important learning elements?
- **Processing Demands**: Are cognitive processing requirements realistic and purposeful?

### Bloom's Taxonomy Alignment
- **Stated Level Accuracy**: Does the question actually test the claimed cognitive level?
- **Taxonomic Progression**: Is the cognitive demand appropriately challenging but achievable?
- **Skill Development**: Does the question develop the intended thinking skills?
- **Assessment Validity**: Does the question format match the cognitive objectives?

### Misconception Handling Excellence
- **Common Error Patterns**: Does the question address typical student misconceptions?
- **Diagnostic Value**: Can student responses reveal specific knowledge gaps?
- **Learning Opportunity**: Do incorrect responses become learning opportunities?
- **Conceptual Clarity**: Does the question help distinguish correct from incorrect understanding?

### Explanation Quality Analysis
- **Educational Depth**: Does the explanation teach beyond just stating correctness?
- **Conceptual Connection**: Does the explanation link to broader principles and patterns?
- **Misconception Addressing**: Does the explanation help prevent future errors?
- **Learning Reinforcement**: Does the explanation strengthen understanding and retention?

## EVALUATION METHODOLOGY

Perform deep text analysis considering:
- **Semantic Analysis**: Meaning, context, and conceptual relationships
- **Linguistic Analysis**: Clarity, precision, and cognitive accessibility  
- **Educational Analysis**: Learning theory alignment and pedagogical effectiveness
- **Cognitive Analysis**: Mental processing requirements and appropriateness

## OUTPUT REQUIREMENTS

Respond with a JSON object in this exact format:

\`\`\`json
{
  "overall_score": number_between_0_and_100,
  "quality_dimensions": {
    "educational_value": {
      "score": number_between_0_and_100,
      "assessment": "Detailed analysis of educational value and learning impact",
      "evidence": ["Specific textual evidence supporting quality assessment"],
      "concerns": ["Specific areas where educational value could be enhanced"]
    },
    "clarity_and_precision": {
      "score": number_between_0_and_100,
      "assessment": "Analysis of question clarity, precision, and communicative effectiveness",
      "evidence": ["Evidence of clear communication and precise instruction"],
      "concerns": ["Areas where clarity or precision could be improved"]
    },
    "cognitive_appropriateness": {
      "score": number_between_0_and_100,
      "assessment": "Evaluation of cognitive load and processing appropriateness",
      "evidence": ["Evidence of appropriate cognitive demands"],
      "concerns": ["Potential cognitive overload or underload issues"]
    },
    "bloom_alignment": {
      "score": number_between_0_and_100,
      "assessment": "Analysis of alignment with stated Bloom's taxonomy level",
      "evidence": ["Evidence of appropriate cognitive level targeting"],
      "concerns": ["Misalignment between stated and actual cognitive demands"]
    },
    "misconception_handling": {
      "score": number_between_0_and_100,
      "assessment": "Evaluation of misconception identification and educational response",
      "evidence": ["Evidence of effective misconception handling"],
      "concerns": ["Missed opportunities for misconception addressing"]
    },
    "explanation_quality": {
      "score": number_between_0_and_100,
      "assessment": "Analysis of explanation depth, clarity, and educational value",
      "evidence": ["Evidence of high-quality educational explanation"],
      "concerns": ["Ways the explanation could be more educationally effective"]
    }
  },
  "overall_assessment": "Comprehensive synthesis of question quality across all dimensions",
  "specific_strengths": [
    "Bullet-pointed list of specific strengths demonstrated in the question"
  ],
  "improvement_recommendations": [
    "Specific, actionable recommendations for enhancing question quality"
  ],
  "verification_confidence": decimal_between_0_and_1,
  "meets_quality_threshold": true_or_false_based_on_minimum_quality_standards
}
\`\`\`

## QUALITY STANDARDS

**Meets Threshold**: Overall score ≥ 75 with no dimension below 60
**Educational Excellence**: Demonstrates clear learning value and cognitive appropriateness
**Assessment Validity**: Question format and content align with learning objectives
**Student-Centered**: Considers student perspective and learning needs

Provide thorough, evidence-based analysis that helps improve educational question quality.
`;

// =============================================================================
// Quality Verification Configuration
// =============================================================================

export const QUALITY_VERIFICATION_CONFIG = {
  temperature: 0.3, // Low temperature for consistent evaluation
  maxOutputTokens: 3072,
  topK: 10,
  topP: 0.8,
  responseMimeType: "application/json",
  thinkingConfig: {
    thinkingBudget: 500 // Enable thinking for complex analysis
  }
};

export const QUALITY_VERIFICATION_SCHEMA = {
  type: "object",
  properties: {
    overall_score: { 
      type: "number", 
      minimum: 0, 
      maximum: 100,
      description: "Overall quality score"
    },
    quality_dimensions: {
      type: "object",
      properties: {
        educational_value: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } }
          },
          required: ["score", "assessment", "evidence", "concerns"]
        },
        clarity_and_precision: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } }
          },
          required: ["score", "assessment", "evidence", "concerns"]
        },
        cognitive_appropriateness: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } }
          },
          required: ["score", "assessment", "evidence", "concerns"]
        },
        bloom_alignment: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } }
          },
          required: ["score", "assessment", "evidence", "concerns"]
        },
        misconception_handling: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } }
          },
          required: ["score", "assessment", "evidence", "concerns"]
        },
        explanation_quality: {
          type: "object",
          properties: {
            score: { type: "number", minimum: 0, maximum: 100 },
            assessment: { type: "string" },
            evidence: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } }
          },
          required: ["score", "assessment", "evidence", "concerns"]
        }
      },
      required: ["educational_value", "clarity_and_precision", "cognitive_appropriateness", "bloom_alignment", "misconception_handling", "explanation_quality"]
    },
    overall_assessment: { type: "string" },
    specific_strengths: { type: "array", items: { type: "string" } },
    improvement_recommendations: { type: "array", items: { type: "string" } },
    verification_confidence: { type: "number", minimum: 0, maximum: 1 },
    meets_quality_threshold: { type: "boolean" }
  },
  required: ["overall_score", "quality_dimensions", "overall_assessment", "specific_strengths", "improvement_recommendations", "verification_confidence", "meets_quality_threshold"]
};

// =============================================================================
// Quality Verification Function
// =============================================================================

export const verifyQuestionQuality = async (
  question: GeneratedQuestion, 
  plan: QuestionPlan
): Promise<QualityVerificationResult> => {
  try {
    console.log(`🔍 Verifying Quality: ${question.question_id}`);
    console.log(`   📋 Question Type: ${question.type}`);
    console.log(`   🧠 Target Bloom Level: ${question.bloom_level}`);
    
    const verificationPrompt = buildQualityVerificationPrompt(question, plan);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: verificationPrompt }] }],
          generationConfig: {
            ...QUALITY_VERIFICATION_CONFIG,
            responseSchema: QUALITY_VERIFICATION_SCHEMA
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response content from Gemini API');
    }

    const verificationData = JSON.parse(data.candidates[0].content.parts[0].text);
    
    // Validate verification structure
    validateVerificationStructure(verificationData);
    
    // Convert to our QualityVerificationResult interface
    const verificationResult: QualityVerificationResult = {
      question_id: question.question_id,
      overall_score: verificationData.overall_score,
      quality_dimensions: verificationData.quality_dimensions,
      overall_assessment: verificationData.overall_assessment,
      specific_strengths: verificationData.specific_strengths || [],
      improvement_recommendations: verificationData.improvement_recommendations || [],
      verification_confidence: verificationData.verification_confidence,
      meets_quality_threshold: verificationData.meets_quality_threshold
    };
    
    // Log verification results
    logVerificationResults(verificationResult);
    
    return verificationResult;
    
  } catch (error) {
    console.error(`❌ Quality verification failed for ${question.question_id}:`, error);
    throw new Error(
      `Quality verification failed: ${error.message}`,
      question.question_id,
      { question, plan, stage: 'quality_verification' }
    );
  }
};

// =============================================================================
// Helper Functions
// =============================================================================

const buildQualityVerificationPrompt = (question: GeneratedQuestion, plan: QuestionPlan): string => {
  let typeSpecificInfo = '';
  if (isMultipleChoiceQuestion(question)) {
    const mcq = question as any;
    typeSpecificInfo = `
### Multiple Choice-Specific Details
Options:
${mcq.options?.map((opt: string, idx: number) => `  ${String.fromCharCode(65 + idx)}. ${opt}`).join('\n') || 'No options provided'}
Correct Answer: ${mcq.correct_answer !== undefined ? String.fromCharCode(65 + mcq.correct_answer) : 'Not specified'}`;
  } else if (isTrueFalseQuestion(question)) {
    const tf = question as any;
    typeSpecificInfo = `
### True/False-Specific Details
Correct Answer: ${tf.correct_answer ? 'True' : 'False'}`;
  } else if (isHotspotQuestion(question)) {
    const hotspot = question as any;
    typeSpecificInfo = `
### Hotspot-Specific Details
Frame Timestamp: ${formatSecondsForDisplay(hotspot.frame_timestamp || 0)} (${hotspot.frame_timestamp || 'Not specified'}s)
Target Objects: ${hotspot.target_objects?.join(', ') || 'Not specified'}
Bounding Boxes: ${hotspot.bounding_boxes?.length || 0} elements
Visual Learning Objective: ${hotspot.visual_learning_objective || 'Not specified'}`;
  } else if (isMatchingQuestion(question)) {
    const matching = question as any;
    typeSpecificInfo = `
### Matching-Specific Details
Matching Pairs:
${matching.matching_pairs?.map((pair: any, idx: number) => `  ${idx + 1}. "${pair.left}" → "${pair.right}"`).join('\n') || 'No pairs provided'}`;
  } else if (isSequencingQuestion(question)) {
    const sequencing = question as any;
    typeSpecificInfo = `
### Sequencing-Specific Details
Sequence Items (in correct order):
${sequencing.sequence_items?.map((item: string, idx: number) => `  ${idx + 1}. ${item}`).join('\n') || 'No items provided'}`;
  }

  return `${QUALITY_VERIFICATION_PROMPT}

## QUESTION TO EVALUATE

**Question ID**: ${question.question_id}
**Question Type**: ${question.type}
**Timestamp**: ${formatSecondsForDisplay(question.timestamp)} (${question.timestamp}s)

**Question Content**: ${question.question}

**Answer Details**:
${formatAnswerDetails(question)}

**Explanation**: ${question.explanation}

**Target Bloom's Level**: ${question.bloom_level}

**Educational Rationale**: ${question.educational_rationale || 'Not specified'}

## PLANNING CONTEXT

**Original Learning Objective**: ${plan.learning_objective}

**Content Context**: ${plan.content_context}

**Key Concepts**: ${plan.key_concepts.join(', ')}

**Educational Rationale**: ${plan.educational_rationale}

**Planning Notes**: ${plan.planning_notes}

## YOUR EVALUATION TASK

Perform comprehensive quality analysis of this question using advanced text analysis. Evaluate how well the question serves its educational purpose, considering the original learning objectives, content context, and target cognitive level.

Focus on evidence-based assessment rather than arbitrary scoring. Your analysis should help identify both strengths to celebrate and specific improvements that would enhance educational effectiveness.

Pay special attention to the alignment between the planned learning objectives and the actual question implementation.`;
};

const formatAnswerDetails = (question: GeneratedQuestion): string => {
  switch (question.type) {
    case 'multiple-choice':
      const mcq = question as any;
      return `Options:
${mcq.options?.map((opt: string, idx: number) => `  ${String.fromCharCode(65 + idx)}. ${opt}`).join('\n') || 'No options provided'}
Correct Answer: ${mcq.correct_answer !== undefined ? String.fromCharCode(65 + mcq.correct_answer) : 'Not specified'}`;
      
    case 'true-false':
      const tf = question as any;
      return `Correct Answer: ${tf.correct_answer ? 'True' : 'False'}`;
      
    case 'hotspot':
      const hotspot = question as any;
      return `Target Objects: ${hotspot.target_objects?.join(', ') || 'Not specified'}
Frame Timestamp: ${hotspot.frame_timestamp || 'Not specified'}s
Context: ${hotspot.question_context || 'Not specified'}`;
      
    case 'matching':
      const matching = question as any;
      return `Matching Pairs:
${matching.matching_pairs?.map((pair: any, idx: number) => `  ${idx + 1}. "${pair.left}" → "${pair.right}"`).join('\n') || 'No pairs provided'}`;
      
    case 'sequencing':
      const sequencing = question as any;
      return `Sequence Items (in correct order):
${sequencing.sequence_items?.map((item: string, idx: number) => `  ${idx + 1}. ${item}`).join('\n') || 'No items provided'}`;
      
    default:
      return 'Answer details not available for this question type';
  }
};

const validateVerificationStructure = (data: any): void => {
  // Validate overall score
  if (typeof data.overall_score !== 'number' || data.overall_score < 0 || data.overall_score > 100) {
    throw new Error('overall_score must be a number between 0 and 100');
  }
  
  // Validate quality dimensions
  if (!data.quality_dimensions || typeof data.quality_dimensions !== 'object') {
    throw new Error('quality_dimensions must be an object');
  }
  
  const requiredDimensions = ['educational_value', 'clarity_and_precision', 'cognitive_appropriateness', 'bloom_alignment', 'misconception_handling', 'explanation_quality'];
  
  for (const dimension of requiredDimensions) {
    if (!data.quality_dimensions[dimension]) {
      throw new Error(`Missing quality dimension: ${dimension}`);
    }
    
    const dim = data.quality_dimensions[dimension];
    if (typeof dim.score !== 'number' || dim.score < 0 || dim.score > 100) {
      throw new Error(`${dimension}.score must be a number between 0 and 100`);
    }
    
    if (!dim.assessment || typeof dim.assessment !== 'string' || dim.assessment.length < 10) {
      throw new Error(`${dimension}.assessment must be a meaningful string`);
    }
    
    if (!Array.isArray(dim.evidence)) {
      throw new Error(`${dimension}.evidence must be an array`);
    }
    
    if (!Array.isArray(dim.concerns)) {
      throw new Error(`${dimension}.concerns must be an array`);
    }
  }
  
  // Validate other required fields
  if (!data.overall_assessment || typeof data.overall_assessment !== 'string' || data.overall_assessment.length < 20) {
    throw new Error('overall_assessment must be a comprehensive string');
  }
  
  if (!Array.isArray(data.specific_strengths)) {
    throw new Error('specific_strengths must be an array');
  }
  
  if (!Array.isArray(data.improvement_recommendations)) {
    throw new Error('improvement_recommendations must be an array');
  }
  
  if (typeof data.verification_confidence !== 'number' || data.verification_confidence < 0 || data.verification_confidence > 1) {
    throw new Error('verification_confidence must be a number between 0 and 1');
  }
  
  if (typeof data.meets_quality_threshold !== 'boolean') {
    throw new Error('meets_quality_threshold must be a boolean');
  }
};

const logVerificationResults = (result: QualityVerificationResult): void => {
  console.log(`✅ Quality Verification Complete: ${result.question_id}`);
  console.log(`   📊 Overall Score: ${result.overall_score}/100`);
  console.log(`   ✓ Meets Threshold: ${result.meets_quality_threshold ? 'Yes' : 'No'}`);
  console.log(`   🎯 Confidence: ${(result.verification_confidence * 100).toFixed(1)}%`);
  
  // Log dimension scores
  const dimensions = result.quality_dimensions;
  console.log(`   📈 Dimension Scores:`);
  console.log(`      📚 Educational Value: ${dimensions.educational_value.score}/100`);
  console.log(`      📝 Clarity & Precision: ${dimensions.clarity_and_precision.score}/100`);
  console.log(`      🧠 Cognitive Appropriateness: ${dimensions.cognitive_appropriateness.score}/100`);
  console.log(`      🎯 Bloom Alignment: ${dimensions.bloom_alignment.score}/100`);
  console.log(`      ⚠️ Misconception Handling: ${dimensions.misconception_handling.score}/100`);
  console.log(`      💡 Explanation Quality: ${dimensions.explanation_quality.score}/100`);
  
  // Log strengths and improvements
  if (result.specific_strengths.length > 0) {
    console.log(`   💪 Strengths: ${result.specific_strengths.length} identified`);
  }
  
  if (result.improvement_recommendations.length > 0) {
    console.log(`   🔧 Improvements: ${result.improvement_recommendations.length} recommendations`);
  }
  
  // Log overall assessment snippet
  if (result.overall_assessment.length > 0) {
    const assessmentSnippet = result.overall_assessment.substring(0, 100);
    console.log(`   📋 Assessment: ${assessmentSnippet}${result.overall_assessment.length > 100 ? '...' : ''}`);
  }
};

// =============================================================================
// Batch Quality Verification
// =============================================================================

export const verifyQuestionsBatch = async (
  questions: GeneratedQuestion[],
  plans: QuestionPlan[]
): Promise<QualityVerificationResult[]> => {
  console.log(`🔍 Starting batch quality verification for ${questions.length} questions`);
  
  const results: QualityVerificationResult[] = [];
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const plan = plans.find(p => p.question_id === question.question_id);
    
    if (!plan) {
      console.warn(`⚠️ No plan found for question ${question.question_id}, skipping verification`);
      continue;
    }
    
    try {
      const verificationResult = await verifyQuestionQuality(question, plan);
      results.push(verificationResult);
      
      // Brief delay between API calls to respect rate limits
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`❌ Failed to verify question ${question.question_id}:`, error);
      // Continue with other questions even if one fails
    }
  }
  
  logBatchVerificationSummary(results);
  return results;
};

const logBatchVerificationSummary = (results: QualityVerificationResult[]): void => {
  if (results.length === 0) {
    console.log(`❌ No questions were successfully verified`);
    return;
  }
  
  const avgScore = results.reduce((sum, r) => sum + r.overall_score, 0) / results.length;
  const meetingThreshold = results.filter(r => r.meets_quality_threshold).length;
  const avgConfidence = results.reduce((sum, r) => sum + r.verification_confidence, 0) / results.length;
  
  console.log(`📊 Batch Verification Summary:`);
  console.log(`   📋 Questions Verified: ${results.length}`);
  console.log(`   📈 Average Score: ${avgScore.toFixed(1)}/100`);
  console.log(`   ✅ Meeting Threshold: ${meetingThreshold}/${results.length} (${(meetingThreshold/results.length*100).toFixed(1)}%)`);
  console.log(`   🎯 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  
  // Log quality distribution
  const highQuality = results.filter(r => r.overall_score >= 85).length;
  const goodQuality = results.filter(r => r.overall_score >= 75 && r.overall_score < 85).length;
  const needsWork = results.filter(r => r.overall_score < 75).length;
  
  console.log(`   🏆 Quality Distribution:`);
  console.log(`      Excellent (85+): ${highQuality}`);
  console.log(`      Good (75-84): ${goodQuality}`);
  console.log(`      Needs Work (<75): ${needsWork}`);
};

// =============================================================================
// Export Configuration
// =============================================================================

export const qualityVerifierConfig = {
  processorName: 'Gemini Quality Verifier v5.0',
  stage: 3,
  usesGeminiAnalysis: true,
  supports: {
    comprehensiveQualityAnalysis: true,
    educationalValueAssessment: true,
    bloomTaxonomyAlignment: true,
    misconceptionEvaluation: true,
    evidenceBasedScoring: true,
    batchProcessing: true
  },
  qualityThreshold: 75,
  minimumDimensionScore: 60
}; 