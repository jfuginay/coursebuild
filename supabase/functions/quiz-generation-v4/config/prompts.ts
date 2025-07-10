/**
 * Stage 1 Question Planning Prompt Configuration
 * 
 * Based on the proven enhanced-quiz-service implementation with
 * refined educational frameworks and Bloom's Taxonomy integration.
 */

// =============================================================================
// Stage 1: Question Planning Prompt (Enhanced from enhanced-quiz-service)
// =============================================================================

export const ENHANCED_QUESTION_PLANNING_PROMPT = `
You are an expert educational content creator and instructional designer with deep expertise in learning theory, cognitive psychology, and assessment design. Your mission is to analyze video content and create a comprehensive plan for generating diverse, high-quality quiz questions that promote deep learning and understanding.

## EDUCATIONAL EXCELLENCE FRAMEWORK

### Learning Theory Foundation
- **Constructivist Approach**: Questions should help learners build understanding through active engagement
- **Cognitive Load Theory**: Balance challenge with accessibility to optimize learning
- **Bloom's Taxonomy Integration**: Target multiple cognitive levels for comprehensive assessment
- **Misconception-Based Learning**: Address common student errors and misunderstandings
- **Transfer-Oriented Design**: Promote knowledge application beyond the immediate context

### Assessment Design Principles
- **Authentic Assessment**: Questions should reflect real-world application of knowledge
- **Formative Purpose**: Each question should provide learning value, not just evaluation
- **Diagnostic Capability**: Question responses should reveal specific knowledge gaps
- **Progressive Difficulty**: Scaffold from basic understanding to complex application
- **Multi-Modal Engagement**: Leverage visual, textual, and interactive elements appropriately

## QUESTION TYPE STRATEGIC FRAMEWORK

### Multiple Choice Questions (MCQ)
**Educational Purpose**: Test conceptual understanding through misconception-based distractors
**Bloom's Targets**: Understand, Apply, Analyze
**Design Focus**: Create plausible alternatives that reveal specific misunderstandings
**Quality Indicators**: Rich explanations, educational distractors, clear concept focus

### True/False Questions
**Educational Purpose**: Test clear understanding of key principles and facts
**Bloom's Targets**: Remember, Understand
**Design Focus**: Address common misconceptions with meaningful true/false distinctions
**Quality Indicators**: Conceptual significance, avoids trivia, educational explanations

### Hotspot Questions (Visual)
**Educational Purpose**: Test visual recognition skills combined with conceptual understanding
**Bloom's Targets**: Understand, Apply, Analyze
**Design Focus**: Connect visual identification to learning objectives
**Quality Indicators**: Clear target objects, educational context, meaningful visual analysis

### Matching Questions
**Educational Purpose**: Test understanding of relationships and connections between concepts
**Bloom's Targets**: Understand, Apply
**Design Focus**: Meaningful relationships (cause-effect, category-example, process-outcome)
**Quality Indicators**: Educational connections, clear categories, relationship explanation

### Sequencing Questions
**Educational Purpose**: Test understanding of processes, chronology, and logical progression
**Bloom's Targets**: Understand, Apply, Analyze
**Design Focus**: Logical dependencies and meaningful order requirements
**Quality Indicators**: Clear progression logic, educational significance, process understanding

## PLANNING SPECIFICATIONS

### Content Analysis Requirements
- **Key Concept Identification**: Extract the most important learning elements
- **Learning Objective Mapping**: Align questions with clear educational goals
- **Misconception Awareness**: Identify common student errors for targeted assessment
- **Knowledge Transfer Opportunities**: Find connections to broader principles
- **Visual Learning Moments**: Identify optimal frames for visual questions

### Question Distribution Strategy
- **Cognitive Balance**: Distribute across multiple Bloom's taxonomy levels
- **Type Diversity**: Include multiple question formats for engagement variety
- **Temporal Spacing**: Distribute questions throughout video duration
- **Difficulty Progression**: Start accessible, build to more challenging concepts
- **Visual Integration**: Include 2-3 visual questions when content supports it

### Quality Planning Criteria
- **Educational Significance**: Every question should advance meaningful learning
- **Conceptual Depth**: Move beyond surface-level recall to understanding
- **Assessment Validity**: Question format should match learning objectives
- **Student-Centered Design**: Consider learner perspective and cognitive load
- **Real-World Relevance**: Connect to practical applications when possible

## OUTPUT REQUIREMENTS

Generate a comprehensive question plan that includes:

1. **Video Analysis Summary**: 2-3 sentence overview of content and learning potential
2. **Learning Objectives**: Clear, measurable objectives for each planned question
3. **Question Plans**: Detailed specifications for 6-10 questions including:
   - Specific learning objective and educational rationale
   - Target Bloom's taxonomy level with justification
   - Key concepts to address
   - Content context and timing
   - Question type selection rationale
   - Educational significance explanation

Each question plan should demonstrate:
- **Clear Educational Purpose**: Why this question advances learning
- **Cognitive Appropriateness**: How it targets the intended thinking level
- **Content Integration**: How it connects to the video's key concepts
- **Assessment Value**: What it reveals about student understanding

Focus on creating questions that would genuinely help students learn and understand, not just demonstrate what they've memorized. Every question should have clear educational value and contribute to meaningful learning outcomes.
`;

// =============================================================================
// Bloom's Taxonomy Level Definitions
// =============================================================================

export const BLOOM_LEVEL_DEFINITIONS = {
  remember: {
    description: "Recall facts, basic concepts, and answers",
    keywords: ["define", "list", "identify", "name", "state", "recall"],
    question_starters: ["What is...", "Who was...", "When did...", "Where is..."],
    educational_focus: "Building foundational knowledge and terminology"
  },
  understand: {
    description: "Explain ideas or concepts and interpret meaning",
    keywords: ["explain", "describe", "summarize", "interpret", "compare", "contrast"],
    question_starters: ["How would you explain...", "What does this mean...", "Why is this important..."],
    educational_focus: "Developing conceptual understanding and meaning-making"
  },
  apply: {
    description: "Use information in new situations or solve problems",
    keywords: ["apply", "solve", "use", "demonstrate", "calculate", "implement"],
    question_starters: ["How would you use...", "What would happen if...", "How would you solve..."],
    educational_focus: "Transferring knowledge to new contexts and problem-solving"
  },
  analyze: {
    description: "Draw connections among ideas and examine relationships",
    keywords: ["analyze", "compare", "examine", "categorize", "differentiate", "investigate"],
    question_starters: ["How do these relate...", "What patterns do you see...", "Why do you think..."],
    educational_focus: "Critical thinking and relationship identification"
  },
  evaluate: {
    description: "Justify decisions or course of action based on criteria",
    keywords: ["evaluate", "judge", "justify", "critique", "assess", "defend"],
    question_starters: ["How would you judge...", "What criteria would you use...", "Which approach is best..."],
    educational_focus: "Developing judgment and decision-making skills"
  },
  create: {
    description: "Produce new or original work by reorganizing elements",
    keywords: ["create", "design", "develop", "compose", "construct", "formulate"],
    question_starters: ["How would you design...", "What would you create...", "How might you develop..."],
    educational_focus: "Synthesis and original thinking"
  }
};

// =============================================================================
// Question Type Configuration
// =============================================================================

export const QUESTION_TYPE_CONFIG = {
  'multiple-choice': {
    min_options: 4,
    max_options: 4,
    optimal_bloom_levels: ['understand', 'apply', 'analyze'],
    educational_focus: 'misconception_based_learning',
    complexity_rating: 'medium',
    estimated_time_seconds: 45
  },
  'true-false': {
    options_count: 2,
    optimal_bloom_levels: ['remember', 'understand'],
    educational_focus: 'concept_clarity',
    complexity_rating: 'low',
    estimated_time_seconds: 20
  },
  'hotspot': {
    min_target_objects: 1,
    max_target_objects: 2,
    optimal_bloom_levels: ['understand', 'apply', 'analyze'],
    educational_focus: 'visual_conceptual_integration',
    complexity_rating: 'high',
    estimated_time_seconds: 60,
    requires_video_analysis: true
  },
  'matching': {
    min_pairs: 3,
    max_pairs: 5,
    optimal_bloom_levels: ['understand', 'apply'],
    educational_focus: 'relationship_understanding',
    complexity_rating: 'medium',
    estimated_time_seconds: 90
  },
  'sequencing': {
    min_items: 4,
    max_items: 6,
    optimal_bloom_levels: ['understand', 'apply', 'analyze'],
    educational_focus: 'process_comprehension',
    complexity_rating: 'medium',
    estimated_time_seconds: 75
  }
};

// =============================================================================
// Difficulty Level Guidelines
// =============================================================================

export const DIFFICULTY_LEVEL_GUIDELINES = {
  beginner: {
    primary_bloom_levels: ['remember', 'understand'],
    cognitive_load: 'low',
    concept_complexity: 'foundational',
    question_characteristics: 'clear, direct, minimal prerequisites',
    explanation_style: 'comprehensive, step-by-step'
  },
  intermediate: {
    primary_bloom_levels: ['understand', 'apply'],
    cognitive_load: 'moderate',
    concept_complexity: 'integrated',
    question_characteristics: 'application-focused, some inference required',
    explanation_style: 'thorough with reasoning'
  },
  advanced: {
    primary_bloom_levels: ['apply', 'analyze', 'evaluate'],
    cognitive_load: 'high',
    concept_complexity: 'complex_synthesis',
    question_characteristics: 'multi-step reasoning, critical thinking',
    explanation_style: 'concise, assumption of background knowledge'
  }
};

// =============================================================================
// Content Analysis Guidelines
// =============================================================================

export const CONTENT_ANALYSIS_FRAMEWORK = {
  key_concept_extraction: {
    focus_areas: ['main_principles', 'processes', 'relationships', 'applications'],
    extraction_criteria: ['educational_significance', 'assessment_potential', 'transfer_value'],
    prioritization: 'learning_objective_alignment'
  },
  misconception_identification: {
    common_patterns: ['overgeneralization', 'incomplete_understanding', 'logical_confusion'],
    detection_methods: ['contrast_analysis', 'alternative_explanations', 'edge_cases'],
    educational_value: 'diagnostic_assessment'
  },
  visual_opportunity_assessment: {
    suitable_content: ['object_identification', 'process_visualization', 'spatial_relationships'],
    timing_considerations: ['object_clarity', 'educational_context', 'frame_stability'],
    integration_potential: 'conceptual_connection'
  }
};

// =============================================================================
// Export Configuration
// =============================================================================

export const promptConfig = {
  version: '4.0',
  enhanced_framework: true,
  bloom_integration: true,
  misconception_focus: true,
  visual_learning_support: true,
  educational_research_based: true
}; 