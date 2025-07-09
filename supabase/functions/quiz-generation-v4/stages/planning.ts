/**
 * Stage 1: Question Planning Processor
 * 
 * Analyzes video content to create strategic question plans using the enhanced
 * educational framework from prompts.ts with Bloom's Taxonomy integration.
 */

import type { QuestionPlan } from '../types/interfaces.ts';
import { 
  ENHANCED_QUESTION_PLANNING_PROMPT,
  QUESTION_TYPE_CONFIG,
  DIFFICULTY_LEVEL_GUIDELINES,
  BLOOM_LEVEL_DEFINITIONS 
} from '../config/prompts.ts';

// =============================================================================
// Enhanced Question Planning Configuration
// =============================================================================

const PLANNING_GENERATION_CONFIG = {
  temperature: 0.7,
  maxOutputTokens: 8192, // Increased for comprehensive planning
  topK: 40,
  topP: 0.95,
  responseMimeType: "application/json"
};

// =============================================================================
// Core Planning Function
// =============================================================================

export const generateQuestionPlans = async (youtubeUrl: string, maxQuestions: number): Promise<QuestionPlan[]> => {
  try {
    console.log('🔍 Analyzing video content for strategic question planning...');
    console.log(`   📺 URL: ${youtubeUrl}`);
    console.log(`   📊 Target Questions: ${maxQuestions}`);
    
    // Enhanced prompt with educational framework
    const enhancedPrompt = `${ENHANCED_QUESTION_PLANNING_PROMPT}

## SPECIFIC PLANNING REQUIREMENTS

Target ${maxQuestions} questions with the following distribution:
- Multiple Choice: 40% (focus on misconception-based distractors)
- True/False: 20% (address key principles and common confusions)  
- Hotspot: 20% (visual identification with conceptual connections)
- Matching: 10% (meaningful relationships and categories)
- Sequencing: 10% (process understanding and logical progression)

## BLOOM'S TAXONOMY TARGETS
${Object.entries(BLOOM_LEVEL_DEFINITIONS).map(([level, def]) => 
  `**${level.toUpperCase()}**: ${def.description} - ${def.educational_focus}`
).join('\n')}



## QUALITY STANDARDS
Each question plan must include:
- Clear educational rationale explaining learning value
- Specific Bloom's taxonomy level with justification
- Key concepts that will be assessed
- Content context from the video
- Estimated completion time
- Educational significance explanation

Return a JSON array of exactly ${maxQuestions} question plans following this structure:

[
  {
    "question_id": "q1_multiple-choice_45",
    "timestamp": 45,
    "question_type": "multiple-choice",
    "learning_objective": "Students will identify and analyze the key factors affecting...",
    "content_context": "The video segment discusses three primary factors that influence...",
    "key_concepts": ["factor1", "factor2", "causal_relationship"],
    "bloom_level": "analyze",
    "educational_rationale": "This question promotes analytical thinking by requiring students to distinguish between related concepts and understand their interactions",
    "planning_notes": "Focus on common misconception between correlation and causation",
    "difficulty_level": "intermediate",
    "estimated_time_seconds": 45
  }
]

## HOTSPOT QUESTION PLANNING (ENHANCED)

For hotspot questions, include these additional fields:
- **visual_learning_objective**: What visual recognition skill this develops
- **frame_timestamp**: Optimal frame timing for object visibility (can be different from timestamp)  
- **target_objects**: Array of specific objects to identify (1-2 objects max)
- **question_context**: Educational context for the visual identification

Example hotspot question plan:
{
  "question_id": "q3_hotspot_141",
  "timestamp": 141,
  "question_type": "hotspot", 
  "learning_objective": "Students will identify the component that specifies the port number.",
  "content_context": "The speaker explains the bind() function parameters.",
  "key_concepts": ["bind()", "port", "parameters"],
  "bloom_level": "apply",
  "educational_rationale": "Visual identification connected to conceptual understanding.",
  "planning_notes": "Focus on the port number parameter in the code.",
  "difficulty_level": "intermediate", 
  "estimated_time_seconds": 30,
  "visual_learning_objective": "Develop ability to visually parse code syntax and identify specific values",
  "frame_timestamp": 141.5,
  "target_objects": ["1234"],
  "question_context": "Identifying the port number parameter in socket programming"
}

Focus on creating educationally meaningful questions that advance learning objectives beyond simple recall.`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { fileData: { fileUri: youtubeUrl } },
              { text: enhancedPrompt }
            ]
          }],
          generationConfig: PLANNING_GENERATION_CONFIG
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response structure from Gemini API');
    }

    const plans: QuestionPlan[] = JSON.parse(data.candidates[0].content.parts[0].text);
    
    // Enhanced post-processing with educational validation
    const processedPlans = enhanceQuestionPlans(plans, maxQuestions);
    
    console.log(`🎯 Generated ${processedPlans.length} strategically designed question plans`);
    console.log(`   📚 Educational framework: Enhanced prompts with Bloom's integration`);
    console.log(`   🎨 Question variety: ${getTypeDistribution(processedPlans)}`);
    
    return processedPlans;
    
  } catch (error: unknown) {
    console.error('❌ Enhanced question planning failed:', error);
    throw new Error(`Failed to generate question plans: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// =============================================================================
// Enhanced Plan Post-Processing
// =============================================================================

const enhanceQuestionPlans = (plans: QuestionPlan[], maxQuestions: number): QuestionPlan[] => {
  let processedPlans = [...plans];
  
  // Validate educational quality
  processedPlans = validateEducationalQuality(processedPlans);
  
  // Limit to max questions
  if (processedPlans.length > maxQuestions) {
    console.log(`📏 Limiting plans from ${processedPlans.length} to ${maxQuestions} (prioritizing educational value)`);
    processedPlans = prioritizeByEducationalValue(processedPlans, maxQuestions);
  }
  
  // Sort by timestamp for logical progression
  processedPlans.sort((a, b) => a.timestamp - b.timestamp);
  
  // Ensure proper spacing for cognitive processing
  processedPlans = optimizeQuestionSpacing(processedPlans);
  
  // Ensure unique identifiers
  processedPlans = ensureUniqueIdentifiers(processedPlans);
  
  // Validate Bloom's distribution
  const bloomDistribution = analyzeBloomDistribution(processedPlans);
  console.log(`   🧠 Bloom's Distribution: ${JSON.stringify(bloomDistribution)}`);
  
  return processedPlans;
};

const validateEducationalQuality = (plans: QuestionPlan[]): QuestionPlan[] => {
  return plans.filter(plan => {
    // Ensure all required educational fields are present
    if (!plan.learning_objective || !plan.educational_rationale || !plan.bloom_level) {
      console.warn(`⚠️ Removing plan ${plan.question_id}: Missing educational requirements`);
      return false;
    }
    
    // Validate Bloom's level
    if (!Object.keys(BLOOM_LEVEL_DEFINITIONS).includes(plan.bloom_level)) {
      console.warn(`⚠️ Removing plan ${plan.question_id}: Invalid Bloom's level`);
      return false;
    }
    
    // Ensure question type is supported
    if (!Object.keys(QUESTION_TYPE_CONFIG).includes(plan.question_type)) {
      console.warn(`⚠️ Removing plan ${plan.question_id}: Unsupported question type`);
      return false;
    }
    
    return true;
  });
};

const prioritizeByEducationalValue = (plans: QuestionPlan[], maxQuestions: number): QuestionPlan[] => {
  // Prioritize questions based on educational criteria
  const scoredPlans = plans.map(plan => ({
    plan,
    score: calculateEducationalScore(plan)
  }));
  
  // Sort by educational value and take top questions
  scoredPlans.sort((a, b) => b.score - a.score);
  return scoredPlans.slice(0, maxQuestions).map(item => item.plan);
};

const calculateEducationalScore = (plan: QuestionPlan): number => {
  let score = 0;
  
  // Higher cognitive levels get more points
  const bloomLevels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  const bloomIndex = bloomLevels.indexOf(plan.bloom_level);
  score += (bloomIndex + 1) * 2; // 2-12 points for Bloom's level
  
  // Educational rationale quality (length and keywords)
  const rationaleQuality = plan.educational_rationale.length > 50 ? 3 : 1;
  score += rationaleQuality;
  
  // Learning objective specificity
  const objectiveQuality = plan.learning_objective.includes('will') && plan.learning_objective.length > 30 ? 3 : 1;
  score += objectiveQuality;
  
  // Question type variety bonus (prefer diverse types)
  const typeBonus = plan.question_type === 'multiple-choice' ? 1 : 2;
  score += typeBonus;
  
  return score;
};

const optimizeQuestionSpacing = (plans: QuestionPlan[]): QuestionPlan[] => {
  const MIN_SPACING = 30; // seconds
  const spacedPlans: QuestionPlan[] = [];
  let lastTimestamp = -MIN_SPACING;
  
  for (const plan of plans) {
    if (plan.timestamp >= lastTimestamp + MIN_SPACING) {
      spacedPlans.push(plan);
      lastTimestamp = plan.timestamp;
    } else {
      // Adjust timestamp to maintain spacing
      const adjustedTimestamp = lastTimestamp + MIN_SPACING;
      spacedPlans.push({
        ...plan,
        timestamp: adjustedTimestamp
      });
      lastTimestamp = adjustedTimestamp;
      console.log(`⏰ Adjusted question ${plan.question_id} timestamp to ${adjustedTimestamp}s for optimal cognitive spacing`);
    }
  }
  
  return spacedPlans;
};

const ensureUniqueIdentifiers = (plans: QuestionPlan[]): QuestionPlan[] => {
  return plans.map((plan, index) => ({
    ...plan,
    question_id: plan.question_id || `q${index + 1}_${plan.question_type}_${plan.timestamp}`
  }));
};

// =============================================================================
// Educational Analytics
// =============================================================================

const getTypeDistribution = (plans: QuestionPlan[]): string => {
  const distribution = plans.reduce((acc, plan) => {
    acc[plan.question_type] = (acc[plan.question_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(distribution)
    .map(([type, count]) => `${type}:${count}`)
    .join(', ');
};

const analyzeBloomDistribution = (plans: QuestionPlan[]): Record<string, number> => {
  return plans.reduce((acc, plan) => {
    acc[plan.bloom_level] = (acc[plan.bloom_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}; 