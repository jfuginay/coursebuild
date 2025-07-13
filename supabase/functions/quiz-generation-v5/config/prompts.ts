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
You are an expert educational content creator and instructional designer with deep expertise in learning theory, cognitive psychology, and assessment design. Your mission is to first transcribe and analyze video content, then create a comprehensive plan for generating diverse, high-quality quiz questions that promote deep learning and understanding.

## PHASE 1: VIDEO TRANSCRIPTION AND ANALYSIS

First, transcribe the audio from this video, giving timestamps for salient events in the video. Also provide visual descriptions.

### Transcription Requirements:
- **Full Audio Transcript**: Complete transcription of all spoken content with precise timestamps
- **Timestamp Format**: ALL timestamps MUST be in MM:SS format (e.g., "1:45" for 1 minute 45 seconds, "10:30" for 10 minutes 30 seconds)
- **Salient Event Markers**: Mark important transitions, key concept introductions, and learning moments
- **Visual Descriptions**: Describe what's shown on screen, especially for code, diagrams, demonstrations
- **Content Structure**: Identify natural sections and topic transitions in the video
- **Key Concept Extraction**: Note when important concepts are introduced or explained

## PHASE 2: EDUCATIONAL ANALYSIS AND QUESTION PLANNING

Using the transcript and visual analysis from Phase 1, create strategic question plans that leverage the video content effectively.

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
**Educational Purpose**: Test understanding of ESSENTIAL processes, causal chains, and logical dependencies where order is CRUCIAL to concept mastery
**Bloom's Targets**: Understand, Apply, Analyze
**Design Focus**: Causal dependencies, procedural necessity, and conceptual relationships where sequence order fundamentally affects outcomes
**CRITICAL SELECTION CRITERIA**: 
- **Only create when order is EDUCATIONALLY ESSENTIAL**: Steps must have causal relationships or logical dependencies
- **Avoid presentation order**: Never use the order items happen to appear in the video unless that order reflects actual logical necessity
- **Test conceptual understanding**: Order should matter for understanding WHY the process works, not just HOW it's described
- **Meaningful consequences**: Wrong order should result in failure, inefficiency, or conceptual misunderstanding
**Quality Indicators**: Causal logic drives sequence, educational significance of dependencies, process understanding reveals WHY order matters

## PLANNING SPECIFICATIONS

### Content Analysis Requirements (Using Transcript)
- **Key Concept Identification**: Extract from transcript when concepts are introduced
- **Learning Objective Mapping**: Align questions with educational goals from content
- **Misconception Awareness**: Identify potential confusion points in explanations
- **Knowledge Transfer Opportunities**: Find connections mentioned in transcript
- **Visual Learning Moments**: Identify from visual descriptions optimal frames for questions

### Question Distribution Strategy
- **Cognitive Balance**: Distribute across multiple Bloom's taxonomy levels
- **Type Diversity**: Include multiple question formats for engagement variety
- **Temporal Spacing**: Distribute questions thoughtfully throughout the video
  - Place questions AFTER concepts are fully explained (not during)
  - Allow 4-8 seconds after explanations for processing time
  - Look for natural pauses between topics or sections
  - Avoid placing questions mid-sentence or during new topic introductions
  - Consider transcript segment boundaries and gaps as natural break points
- **Difficulty Progression**: Start accessible, build to more challenging concepts
- **Visual Integration**: Include 2-3 visual questions when transcript shows visual content

## OUTPUT REQUIREMENTS

Generate a comprehensive response that includes both the video transcript and question plans.

### TIMESTAMP FORMAT SPECIFICATION
**CRITICAL REQUIREMENT**: ALL timestamps in your response MUST use the MM:SS string format.
- Format examples: "0:45" (45 seconds), "1:30" (1 minute 30 seconds), "10:05" (10 minutes 5 seconds)
- Always use this format for all timestamps in the transcript and question plans
- Do NOT use decimal formats, seconds-only formats, or any other format

Each question plan should reference specific transcript segments and demonstrate:
- **Clear Educational Purpose**: Why this question advances learning
- **Cognitive Appropriateness**: How it targets the intended thinking level
- **Content Integration**: Direct reference to transcript segments
- **Assessment Value**: What it reveals about student understanding

Focus on creating questions that would genuinely help students learn and understand, not just demonstrate what they've memorized. Every question should have clear educational value and contribute to meaningful learning outcomes.
`;

// =============================================================================
// Shared Timing Instruction for Question Generation
// =============================================================================

export const QUESTION_TIMING_INSTRUCTION = `
## TIMING INSTRUCTION
Determine the optimal timestamp for this question based on the transcript. Return an "optimal_timestamp" field (in seconds).

The question should appear:
- AFTER all relevant concepts are fully explained (not during)
- With 4-8 seconds delay for processing (minimum 2 seconds if no natural pause)
- At natural pauses: gaps between segments, transitions ("Now let's...", "Next..."), or thought completions
- NEVER mid-sentence, during active explanations, or when introducing new topics

Look for the END of explanations, not the beginning.`;

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

export const PLANNING_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    timestamp_format: {
      type: "string",
      enum: ["mm:ss"],
      description: "Format of all timestamps in this response. Must be 'mm:ss' format (e.g., '1:45' for 1 minute 45 seconds)"
    },
    video_transcript: {
      type: "object",
      properties: {
        full_transcript: {
          type: "array",
          items: {
            type: "object",
            properties: {
              timestamp: { 
                type: "string", 
                description: "Start time in MM:SS format (e.g., '1:30')" 
              },
              end_timestamp: { 
                type: "string", 
                description: "End time in MM:SS format (e.g., '2:45')" 
              },
              text: { 
                type: "string", 
                description: "Spoken content in this segment" 
              },
              visual_description: { 
                type: "string", 
                description: "Description of what's visible on screen" 
              },
              is_salient_event: { 
                type: "boolean", 
                description: "Whether this is a key learning moment" 
              },
              event_type: {
                type: "string",
                enum: ["concept_introduction", "example_demonstration", "summary", "transition", "visual_highlight", "code_display", "diagram_explanation", "other"],
                description: "Type of salient event if applicable"
              }
            },
            required: ["timestamp", "text", "visual_description", "is_salient_event"]
          },
          description: "Complete transcript with timestamps and visual descriptions"
        },
        key_concepts_timeline: {
          type: "array",
          items: {
            type: "object",
            properties: {
              concept: { type: "string" },
              first_mentioned: { type: "string", description: "Timestamp in MM:SS format when first introduced" },
              explanation_timestamps: {
                type: "array",
                items: { type: "string" },
                description: "All timestamps in MM:SS format where this concept is explained or referenced"
              }
            },
            required: ["concept", "first_mentioned", "explanation_timestamps"]
          },
          description: "Timeline of when key concepts are introduced and explained"
        },
        video_summary: {
          type: "string",
          description: "2-3 sentence overview of video content and learning potential"
        }
      },
      required: ["full_transcript", "key_concepts_timeline", "video_summary"]
    },
    question_plans: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question_id: { 
            type: "string", 
            description: "Unique identifier like q1_multiple-choice_45" 
          },
          timestamp: { 
            type: "string", 
            description: "Target timestamp in MM:SS format for question placement" 
          },
          frame_timestamp: {
            type: "string",
            description: "Specific frame timestamp in MM:SS format for visual questions"
          },
          question_type: { 
            type: "string",
            enum: ["multiple-choice", "true-false", "hotspot", "matching", "sequencing"]
          },
          learning_objective: { 
            type: "string",
            description: "Students will... statement"
          },
          content_context: { 
            type: "string",
            description: "Summary of relevant video content at this timestamp"
          },
          transcript_reference: {
            type: "object",
            properties: {
              start_timestamp: { type: "string", description: "Start time in MM:SS format" },
              end_timestamp: { type: "string", description: "End time in MM:SS format" },
              relevant_text: { type: "string" },
              visual_context: { type: "string" }
            },
            required: ["start_timestamp", "end_timestamp", "relevant_text"],
            description: "Direct reference to transcript segment this question is based on"
          },
          key_concepts: {
            type: "array",
            items: { type: "string" },
            description: "Concepts from transcript being assessed"
          },
          bloom_level: {
            type: "string",
            enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"]
          },
          educational_rationale: { type: "string" },
          planning_notes: { type: "string" },
          difficulty_level: {
            type: "string",
            enum: ["beginner", "intermediate", "advanced"]
          },
          estimated_time_seconds: { type: "number" },
          // Additional fields for hotspot questions
          visual_learning_objective: { 
            type: "string",
            description: "For hotspot questions: visual skill being developed"
          },
          target_objects: {
            type: "array",
            items: { type: "string" },
            description: "For hotspot questions: objects to identify"
          },
          question_context: {
            type: "string",
            description: "For hotspot questions: educational context"
          }
        },
        required: [
          "question_id", "timestamp", "question_type", "learning_objective",
          "content_context", "transcript_reference", "key_concepts", "bloom_level",
          "educational_rationale", "planning_notes", "difficulty_level", "estimated_time_seconds"
        ]
      },
      minItems: 1,
      description: "Strategic question plans based on transcript analysis"
    }
  },
  required: ["timestamp_format", "video_transcript", "question_plans"]
};

export const promptConfig = {
  version: '4.0',
  enhanced_framework: true,
  bloom_integration: true,
  misconception_focus: true,
  visual_learning_support: true,
  educational_research_based: true,
  transcript_based_planning: true
}; 