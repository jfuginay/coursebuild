/**
 * Stage 1: Question Planning Processor
 * 
 * Analyzes video content to create strategic question plans using the enhanced
 * educational framework from prompts.ts with Bloom's Taxonomy integration.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import type { QuestionPlan } from '../types/interfaces.ts';
import { 
  ENHANCED_QUESTION_PLANNING_PROMPT,
  PLANNING_RESPONSE_SCHEMA,
  QUESTION_TYPE_CONFIG,
  DIFFICULTY_LEVEL_GUIDELINES,
  BLOOM_LEVEL_DEFINITIONS 
} from '../config/prompts.ts';
import { convertBase60ToSeconds, formatSecondsForDisplay } from '../utils/timestamp-converter.ts';

// =============================================================================
// Enhanced Question Planning Configuration
// =============================================================================

const PLANNING_GENERATION_CONFIG = {
  temperature: 0.7,
  maxOutputTokens: 65535, // Increased for transcript + plans
  topK: 40,
  topP: 0.95,
  responseMimeType: "application/json",
  responseSchema: PLANNING_RESPONSE_SCHEMA // Use structured schema
};

// =============================================================================
// Transcript Storage Function
// =============================================================================

const saveTranscriptToDatabase = async (
  supabaseClient: any,
  courseId: string,
  videoUrl: string,
  transcript: any,
  processingTimeMs: number
): Promise<void> => {
  try {
    console.log('💾 Saving transcript to database...');
    
    // Calculate total duration from transcript
    const lastSegment = transcript.full_transcript[transcript.full_transcript.length - 1];
    const totalDuration = lastSegment.end_timestamp || lastSegment.timestamp;
    
    // Prepare transcript data
    const transcriptData = {
      course_id: courseId,
      video_url: videoUrl,
      video_summary: transcript.video_summary,
      total_duration: Math.round(totalDuration),
      full_transcript: transcript.full_transcript,
      key_concepts_timeline: transcript.key_concepts_timeline,
      model_used: 'gemini-2.5-flash',
      processing_time_ms: processingTimeMs
    };
    
    // Insert transcript
    const { data, error } = await supabaseClient
      .from('video_transcripts')
      .insert(transcriptData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Failed to save transcript:', error);
      throw new Error(`Failed to save transcript: ${error.message}`);
    }
    
    console.log('✅ Transcript saved successfully');
    console.log(`   📊 Transcript ID: ${data.id}`);
    console.log(`   🎬 Total Duration: ${totalDuration}s`);
    console.log(`   📝 Segments: ${transcript.full_transcript.length}`);
    console.log(`   🔑 Key Concepts: ${transcript.key_concepts_timeline.length}`);
    
  } catch (error) {
    console.error('❌ Error saving transcript to database:', error);
    // Don't throw here to avoid breaking the pipeline - transcript saving is supplementary
    console.warn('⚠️ Continuing without saved transcript...');
  }
};

// =============================================================================
// Core Planning Function
// =============================================================================

export const generateQuestionPlans = async (
  youtubeUrl: string, 
  maxQuestions: number,
  courseId?: string,
  supabaseClient?: any
): Promise<{ plans: QuestionPlan[], transcript: any }> => {
  const startTime = Date.now();
  
  try {
    console.log('🔍 Analyzing video content for strategic question planning...');
    console.log(`   📺 URL: ${youtubeUrl}`);
    console.log(`   📊 Target Questions: ${maxQuestions}`);
    console.log('   📝 Phase 1: Generating full transcript with visual descriptions');
    console.log('   🎯 Phase 2: Creating question plans based on transcript');
    
    // Enhanced prompt with educational framework and transcript generation
    const enhancedPrompt = `${ENHANCED_QUESTION_PLANNING_PROMPT}

## SPECIFIC REQUIREMENTS FOR THIS VIDEO

1. **Phase 1 - Video Transcription**:
   - Generate a complete transcript with timestamps for all spoken content
   - Include visual descriptions of what's shown on screen
   - Mark salient events (concept introductions, examples, transitions, etc.)
   - Extract key concepts and when they're introduced

2. **Phase 2 - Question Planning**:
   - Target exactly ${maxQuestions} questions with the following distribution:
     • Multiple Choice: 40% (focus on misconception-based distractors)
     • True/False: 20% (address key principles and common confusions)  
     • Hotspot: 20% (visual identification with conceptual connections)
     • Matching: 10% (meaningful relationships and categories)
     • Sequencing: 10% (process understanding and logical progression)
   - Each question plan must reference specific transcript segments
   - Use transcript timestamps to ensure the question timestamp is placed after the concept is finished being explained

## QUALITY STANDARDS
- Every question must have clear educational value based on transcript content
- Include relevant transcript content in the content_context field
- Extract key_concepts directly from the transcript
- For hotspot questions, use visual_description from transcript to identify target_objects

## IMPORTANT FIELDS
- content_context: Include the relevant transcript text and visual description for the timestamp
- key_concepts: Extract concepts mentioned in the transcript around the question timestamp
- For hotspot questions:
  - visual_learning_objective: What visual skill this develops
  - target_objects: Specific objects visible in the transcript's visual_description
  - question_context: Educational context for the visual identification
  - frame_timestamp: Use for precise visual timing

Return a structured JSON response following the provided schema with both video_transcript and question_plans.`;
    
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

    const responseText = data.candidates[0].content.parts[0].text;
    let planningResponse;
    
    try {
      planningResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse planning response:', parseError);
      throw new Error('Failed to parse structured planning response');
    }
    
    // Extract transcript and question plans from structured response
    const { video_transcript, question_plans } = planningResponse;
    
    if (!video_transcript || !question_plans) {
      throw new Error('Response missing required fields: video_transcript or question_plans');
    }
    
    // Convert all timestamps from base-60 to seconds
    console.log('🕐 Converting timestamps from base-60 format...');
    
    // Convert transcript timestamps
    if (video_transcript.full_transcript) {
      // Log a few examples of timestamp conversion
      const exampleSegments = video_transcript.full_transcript.slice(0, 3);
      console.log('   📍 Example timestamp conversions:');
      exampleSegments.forEach((seg: any) => {
        const converted = convertBase60ToSeconds(seg.timestamp);
        console.log(`      ${seg.timestamp} → ${converted}s (${formatSecondsForDisplay(converted)})`);
      });
      
      video_transcript.full_transcript = video_transcript.full_transcript.map((segment: any, index: number, array: any[]) => {
        const convertedSegment = {
          ...segment,
          timestamp: convertBase60ToSeconds(segment.timestamp),
          end_timestamp: segment.end_timestamp ? convertBase60ToSeconds(segment.end_timestamp) : undefined
        };
        
        // If no end_timestamp, use the start of the next segment
        if (!convertedSegment.end_timestamp && index < array.length - 1) {
          const nextSegmentStart = convertBase60ToSeconds(array[index + 1].timestamp);
          convertedSegment.end_timestamp = nextSegmentStart;
        }
        
        return convertedSegment;
      });
    }
    
    // Convert key concepts timeline timestamps
    if (video_transcript.key_concepts_timeline) {
      video_transcript.key_concepts_timeline = video_transcript.key_concepts_timeline.map((concept: any) => ({
        ...concept,
        first_mentioned: convertBase60ToSeconds(concept.first_mentioned),
        explanation_timestamps: concept.explanation_timestamps ? 
          concept.explanation_timestamps.map((ts: number) => convertBase60ToSeconds(ts)) : []
      }));
    }
    
    // Convert question plan timestamps
    const convertedQuestionPlans = question_plans.map((plan: any) => ({
      ...plan,
      timestamp: convertBase60ToSeconds(plan.timestamp),
      frame_timestamp: plan.frame_timestamp ? convertBase60ToSeconds(plan.frame_timestamp) : undefined,
      // Convert transcript_reference timestamps if present
      transcript_reference: plan.transcript_reference ? {
        ...plan.transcript_reference,
        start_timestamp: convertBase60ToSeconds(plan.transcript_reference.start_timestamp),
        end_timestamp: convertBase60ToSeconds(plan.transcript_reference.end_timestamp)
      } : undefined
    }));
    
    console.log(`📝 Transcript generated: ${video_transcript.full_transcript.length} segments`);
    console.log(`📊 Key concepts identified: ${video_transcript.key_concepts_timeline.length}`);
    console.log(`🎯 Question plans created: ${convertedQuestionPlans.length}`);
    
    // Log transcript summary
    console.log(`\n📹 Video Summary: ${video_transcript.video_summary}`);
    console.log(`\n🔑 Key Concepts Timeline:`);
    video_transcript.key_concepts_timeline.forEach((concept: any) => {
      console.log(`   - ${concept.concept} (first at ${concept.first_mentioned}s)`);
    });
    
    // Save transcript to database if courseId and supabaseClient are provided
    if (courseId && supabaseClient) {
      const processingTimeMs = Date.now() - startTime;
      await saveTranscriptToDatabase(
        supabaseClient,
        courseId,
        youtubeUrl,
        video_transcript,
        processingTimeMs
      );
    } else {
      console.log('⏭️ Skipping transcript save (courseId or supabaseClient not provided)');
    }
    
    // Enhanced post-processing with transcript awareness
    const processedPlans = enhanceQuestionPlans(convertedQuestionPlans, maxQuestions, video_transcript);
    
    console.log(`\n✅ Generated ${processedPlans.length} strategically designed question plans`);
    console.log(`   📚 Educational framework: Transcript-based planning with Bloom's integration`);
    console.log(`   🎨 Question variety: ${getTypeDistribution(processedPlans)}`);
    
    return { plans: processedPlans, transcript: video_transcript };
    
  } catch (error: unknown) {
    console.error('❌ Enhanced question planning failed:', error);
    throw new Error(`Failed to generate question plans: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// =============================================================================
// Enhanced Plan Post-Processing
// =============================================================================

const enhanceQuestionPlans = (plans: QuestionPlan[], maxQuestions: number, transcript?: any): QuestionPlan[] => {
  let processedPlans = [...plans];
  
  // Validate educational quality with transcript verification
  processedPlans = validateEducationalQuality(processedPlans, transcript);
  
  // Limit to max questions
  if (processedPlans.length > maxQuestions) {
    console.log(`📏 Limiting plans from ${processedPlans.length} to ${maxQuestions} (prioritizing educational value)`);
    processedPlans = prioritizeByEducationalValue(processedPlans, maxQuestions);
  }
  
  // Sort by timestamp for logical progression
  processedPlans.sort((a, b) => a.timestamp - b.timestamp);
  
  // Ensure proper spacing for cognitive processing (now checks video duration)
  //processedPlans = optimizeQuestionSpacing(processedPlans, transcript);
  
  // Ensure unique identifiers
  processedPlans = ensureUniqueIdentifiers(processedPlans);
  
  // Validate Bloom's distribution
  const bloomDistribution = analyzeBloomDistribution(processedPlans);
  console.log(`   🧠 Bloom's Distribution: ${JSON.stringify(bloomDistribution)}`);
  
  return processedPlans;
};

const validateEducationalQuality = (plans: QuestionPlan[], transcript: any): QuestionPlan[] => {
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
    
    // Verify content_context exists (which should reference transcript content)
    if (!plan.content_context || plan.content_context.length === 0) {
      console.warn(`⚠️ Removing plan ${plan.question_id}: Missing content context from transcript`);
      return false;
    }
    
    // Verify key_concepts are present
    if (!plan.key_concepts || plan.key_concepts.length === 0) {
      console.warn(`⚠️ Removing plan ${plan.question_id}: No key concepts identified`);
      return false;
    }
    
    // For hotspot questions, verify visual-specific fields
    if (plan.question_type === 'hotspot') {
      if (!plan.visual_learning_objective || !plan.target_objects || !plan.question_context) {
        console.warn(`⚠️ Removing hotspot plan ${plan.question_id}: Missing visual requirements`);
        return false;
      }
    }
    
    // Verify timestamp is within valid range based on transcript
    if (transcript && transcript.full_transcript && transcript.full_transcript.length > 0) {
      const lastSegment = transcript.full_transcript[transcript.full_transcript.length - 1];
      const maxTimestamp = lastSegment.end_timestamp || lastSegment.timestamp;
      
      if (plan.timestamp > maxTimestamp) {
        console.warn(`⚠️ Removing plan ${plan.question_id}: Timestamp ${plan.timestamp}s exceeds video duration ${maxTimestamp}s`);
        return false;
      }
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

const optimizeQuestionSpacing = (plans: QuestionPlan[], transcript?: any): QuestionPlan[] => {
  const MIN_SPACING = 30; // seconds
  const spacedPlans: QuestionPlan[] = [];
  let lastTimestamp = -MIN_SPACING;
  
  // Get maximum video duration from transcript
  let maxVideoTimestamp = Infinity;
  if (transcript && transcript.full_transcript && transcript.full_transcript.length > 0) {
    const lastSegment = transcript.full_transcript[transcript.full_transcript.length - 1];
    maxVideoTimestamp = lastSegment.end_timestamp || lastSegment.timestamp;
    console.log(`   📏 Video duration: ${formatSecondsForDisplay(maxVideoTimestamp)} (${maxVideoTimestamp}s)`);
  }
  
  for (const plan of plans) {
    if (plan.timestamp >= lastTimestamp + MIN_SPACING) {
      spacedPlans.push(plan);
      lastTimestamp = plan.timestamp;
    } else {
      // Adjust timestamp to maintain spacing
      const adjustedTimestamp = lastTimestamp + MIN_SPACING;
      
      // Check if adjusted timestamp exceeds video duration
      if (adjustedTimestamp > maxVideoTimestamp) {
        console.log(`⏰ Cannot adjust question ${plan.question_id} - would exceed video duration (${adjustedTimestamp}s > ${maxVideoTimestamp}s)`);
        // Skip this question if it can't fit within video duration
        continue;
      }
      
      spacedPlans.push({
        ...plan,
        timestamp: adjustedTimestamp
      });
      lastTimestamp = adjustedTimestamp;
      console.log(`⏰ Adjusted question ${plan.question_id} timestamp to ${formatSecondsForDisplay(adjustedTimestamp)} (${adjustedTimestamp}s) for optimal cognitive spacing`);
    }
  }
  
  // Final check: remove any questions that still exceed video duration
  const finalPlans = spacedPlans.filter(plan => {
    if (plan.timestamp > maxVideoTimestamp) {
      console.warn(`⚠️ Removing question ${plan.question_id}: Timestamp ${plan.timestamp}s exceeds video duration ${maxVideoTimestamp}s`);
      return false;
    }
    return true;
  });
  
  if (finalPlans.length < spacedPlans.length) {
    console.log(`   📊 Removed ${spacedPlans.length - finalPlans.length} questions that exceeded video duration after spacing adjustment`);
  }
  
  return finalPlans;
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