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
import { 
  convertBase60ToSeconds, 
  formatSecondsForDisplay, 
  convertTimestampObject,
  convertSecondsToMMSS,
  convertMMSSToSeconds
} from '../utils/timestamp-converter.ts';
import { logGeminiCall } from '../utils/langsmith-logger.ts';

// =============================================================================
// YouTube API Integration
// =============================================================================

/**
 * Extract video ID from YouTube URL
 */
const extractVideoId = (url: string): string | null => {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

/**
 * Parse ISO 8601 duration to seconds
 */
const parseISO8601Duration = (duration: string): number => {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Fetch video duration from YouTube API
 */
const getVideoDuration = async (videoId: string): Promise<number | null> => {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  
  if (!apiKey) {
    console.warn('⚠️ YOUTUBE_API_KEY not found, using default frame sampling rate');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('❌ YouTube API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.error('❌ Video not found');
      return null;
    }
    
    const duration = data.items[0].contentDetails.duration;
    const durationInSeconds = parseISO8601Duration(duration);
    
    console.log(`📹 Video duration: ${Math.floor(durationInSeconds / 60)}m ${durationInSeconds % 60}s (${durationInSeconds}s total)`);
    
    return durationInSeconds;
  } catch (error) {
    console.error('❌ Failed to fetch video duration:', error);
    return null;
  }
};

/**
 * Calculate optimal frame sampling rate based on video duration
 */
const calculateFrameSamplingRate = (durationInSeconds: number | null): number => {
  if (durationInSeconds === null) {
    console.log('📊 Using default frame sampling rate: 1 fps');
    return 1.0;
  }
  
  // Constant 300 frames per video for consistent processing
  const TARGET_FRAMES = 300;
  const fps = Math.min(TARGET_FRAMES / durationInSeconds, 1.0); // Cap at 1 fps max
  
  const durationInMinutes = durationInSeconds / 60;
  console.log(`📊 Dynamic frame sampling rate: ${fps.toFixed(3)} fps for ${Math.floor(durationInMinutes)}m ${Math.round((durationInMinutes % 1) * 60)}s video`);
  console.log(`   📸 Target: ${TARGET_FRAMES} frames total (constant for all videos)`);
  
  return fps;
};

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
      model_used: 'gemini-2.0-flash',
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
// Segment-specific Planning Function
// =============================================================================

export const generateQuestionPlansForSegment = async (
  youtubeUrl: string,
  segmentInfo: {
    index: number;
    startTime: number;
    endTime: number;
    totalSegments: number;
  },
  maxQuestions: number,
  previousSegmentContext?: any,
  courseId?: string,
  supabaseClient?: any
): Promise<{ plans: QuestionPlan[], transcript: any }> => {
  const startTime = Date.now();
  
  try {
    console.log('🎬 Analyzing video segment for strategic question planning...');
    console.log(`   📺 URL: ${youtubeUrl}`);
    console.log(`   🎯 Segment ${segmentInfo.index + 1}/${segmentInfo.totalSegments}`);
    console.log(`   ⏱️ Time range: ${formatSecondsForDisplay(segmentInfo.startTime)} - ${formatSecondsForDisplay(segmentInfo.endTime)}`);
    console.log(`   📊 Target Questions: ${maxQuestions}`);
    
    // Extract video ID and get duration for dynamic frame sampling
    const videoId = extractVideoId(youtubeUrl);
    let frameSamplingRate = 1.0; // Default
    
    if (videoId) {
      console.log(`   🎥 Video ID: ${videoId}`);
      const videoDuration = await getVideoDuration(videoId);
      // Calculate frame sampling for the entire video duration
      frameSamplingRate = calculateFrameSamplingRate(videoDuration);
    }
    
    // Import segment context utilities
    const { generateContextPrompt } = await import('../utils/segment-context.ts');

    // Generate context-aware prompt
    const contextPrompt = generateContextPrompt(previousSegmentContext, segmentInfo);
    console.log(`   previous context: ${contextPrompt}`);
    
    console.log('   📝 Phase 1: Generating segment transcript with visual descriptions');
    console.log('   🎯 Phase 2: Creating question plans based on segment content');
    
    // Enhanced prompt with segment context
    const segmentPrompt = `${ENHANCED_QUESTION_PLANNING_PROMPT}

## SEGMENT-SPECIFIC REQUIREMENTS

This is segment ${segmentInfo.index + 1} of ${segmentInfo.totalSegments} total segments.
Time range: ${formatSecondsForDisplay(segmentInfo.startTime)} - ${formatSecondsForDisplay(segmentInfo.endTime)}

${contextPrompt}

Target exactly ${maxQuestions} questions for this segment using the standard distribution.

Focus on content that appears within this time range while maintaining educational coherence.`;
    
    // Build video metadata with segment clipping
    // Add buffer to endOffset to avoid cutting off mid-sentence
    const END_OFFSET_BUFFER = 5; // 5 seconds buffer
    const bufferedEndTime = segmentInfo.index < segmentInfo.totalSegments - 1 
      ? segmentInfo.endTime + END_OFFSET_BUFFER 
      : segmentInfo.endTime; // No buffer for the last segment
    
    const videoConfig = {
      videoMetadata: {
        fps: frameSamplingRate,
        startOffset: `${segmentInfo.startTime}s`,
        endOffset: `${bufferedEndTime}s`
      }
    };
    
    console.log(`   🎬 Video segment config: ${formatSecondsForDisplay(segmentInfo.startTime)} - ${formatSecondsForDisplay(segmentInfo.endTime)} (with ${bufferedEndTime - segmentInfo.endTime}s buffer)`);
    console.log(`   📍 Sending to Gemini: startOffset="${segmentInfo.startTime}s", endOffset="${bufferedEndTime}s"`);
    
    const response = await logGeminiCall(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
        contents: [{
          parts: [
            { 
              fileData: { 
                fileUri: youtubeUrl
              },
              videoMetadata: videoConfig.videoMetadata
            },
            { text: segmentPrompt }
          ]
        }],
        generationConfig: PLANNING_GENERATION_CONFIG
      },
      `Planning Stage - Generating question plans for segment ${segmentInfo.index + 1}/${segmentInfo.totalSegments}`
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
      console.error('Failed to parse segment planning response:', parseError);
      throw new Error('Failed to parse structured planning response');
    }
    
    // Extract transcript and question plans from structured response
    const { timestamp_format, video_transcript, question_plans } = planningResponse;
    
    if (!video_transcript || !question_plans) {
      throw new Error('Response missing required fields: video_transcript or question_plans');
    }
    
    if (!timestamp_format) {
      console.warn('⚠️ No timestamp_format specified, defaulting to mm:ss');
    }
    
    // Convert timestamps based on the format specified by Gemini
    const timestampFormat = timestamp_format || 'mm:ss';
    console.log(`🕐 Timestamp format specified by Gemini: ${timestampFormat}`);
    
    // Helper function to convert timestamps based on format
    const convertTimestamp = (ts: number | string): number => {
      if (timestampFormat === 'mm:ss') {
        // Convert MM:SS string format to seconds
        return typeof ts === 'string' ? convertMMSSToSeconds(ts) : ts;
      } else if (timestampFormat === 'seconds') {
        // Already in seconds, no conversion needed
        return typeof ts === 'number' ? ts : parseFloat(ts);
      } else {
        // Use the existing converter for other formats (legacy support)
        return convertBase60ToSeconds(ts);
      }
    };
    
    // Check if this is a segment (timestamps likely already in seconds)
    const isSegment = segmentInfo.index !== undefined && segmentInfo.totalSegments > 1;
    console.log(`   📊 Processing mode: ${isSegment ? `Segment ${segmentInfo.index + 1}/${segmentInfo.totalSegments}` : 'Full video'}`);
    
    // Convert transcript timestamps
    if (video_transcript.full_transcript) {
      // Log raw timestamps to understand format
      if (video_transcript.full_transcript.length > 0) {
        const firstTimestamp = video_transcript.full_transcript[0].timestamp;
        const lastTimestamp = video_transcript.full_transcript[video_transcript.full_transcript.length - 1].timestamp;
        console.log(`   📍 Raw timestamp examples from Gemini:`);
        console.log(`      First: ${firstTimestamp} (type: ${typeof firstTimestamp})`);
        console.log(`      Last: ${lastTimestamp} (type: ${typeof lastTimestamp})`);
      }
      
      video_transcript.full_transcript = video_transcript.full_transcript.map((segment: any, index: number, array: any[]) => {
        const convertedSegment = {
          ...segment,
          timestamp: convertTimestamp(segment.timestamp),
          end_timestamp: segment.end_timestamp ? convertTimestamp(segment.end_timestamp) : undefined
        };
        
        // If no end_timestamp, use the start of the next segment
        if (!convertedSegment.end_timestamp && index < array.length - 1) {
          const nextSegmentStart = convertTimestamp(array[index + 1].timestamp);
          convertedSegment.end_timestamp = nextSegmentStart;
        }
        
        return convertedSegment;
      });
      
      // Filter transcript to only include segments within the actual time range
      // (removing the buffer content except for completing sentences)
      const originalLength = video_transcript.full_transcript.length;
      
      // Log some examples before filtering
      console.log(`   📊 Transcript segments: ${originalLength}`);
      if (originalLength > 0) {
        const first = video_transcript.full_transcript[0];
        const last = video_transcript.full_transcript[originalLength - 1];
        console.log(`      First segment: ${formatSecondsForDisplay(first.timestamp)} (${first.timestamp}s)`);
        console.log(`      Last segment: ${formatSecondsForDisplay(last.timestamp)} (${last.timestamp}s)`);
        console.log(`      Segment range: ${formatSecondsForDisplay(segmentInfo.startTime)} - ${formatSecondsForDisplay(segmentInfo.endTime)}`);
      }
      
      // IMPORTANT: When using startOffset/endOffset, Gemini already clips the video
      // and returns only content from that range. We should NOT filter again as it
      // can remove valid content. The timestamps are absolute but the content is
      // already scoped to our segment.
      console.log(`   ✅ Using all ${video_transcript.full_transcript.length} transcript segments from Gemini (already clipped to segment)`);
      
      // Log example of timestamps
      if (video_transcript.full_transcript.length > 0) {
        const firstSegment = video_transcript.full_transcript[0];
        console.log(`   ⏰ Transcript starts at: ${formatSecondsForDisplay(firstSegment.timestamp)} (absolute timestamp)`);
      }
    }
    
    // Convert key concepts timeline timestamps - but don't filter
    if (video_transcript.key_concepts_timeline) {
      const originalConceptCount = video_transcript.key_concepts_timeline.length;
      
      video_transcript.key_concepts_timeline = video_transcript.key_concepts_timeline
        .map((concept: any) => ({
          ...concept,
          first_mentioned: convertTimestamp(concept.first_mentioned),
          explanation_timestamps: concept.explanation_timestamps ? 
            concept.explanation_timestamps.map((ts: number) => convertTimestamp(ts)) : []
        }));
        
      console.log(`   🔑 Key concepts: ${video_transcript.key_concepts_timeline.length} (from clipped segment)`);
    }
    
    // Convert question plan timestamps
    const convertedQuestionPlans = question_plans.map((plan: any) => ({
      ...plan,
      timestamp: convertTimestamp(plan.timestamp),
      frame_timestamp: plan.frame_timestamp ? convertTimestamp(plan.frame_timestamp) : undefined
    }));
    
    console.log(`📝 Segment transcript generated: ${video_transcript.full_transcript.length} segments`);
    console.log(`📊 Key concepts in segment: ${video_transcript.key_concepts_timeline.length}`);
    console.log(`🎯 Question plans created: ${convertedQuestionPlans.length} (requested: ${maxQuestions})`);
    
    // Log question plan timestamps for debugging
    if (convertedQuestionPlans.length > 0) {
      console.log(`   📍 Question timestamps:`);
      convertedQuestionPlans.forEach((plan: any, idx: number) => {
        console.log(`      Q${idx + 1} (${plan.question_type}): ${formatSecondsForDisplay(plan.timestamp)} (${plan.timestamp}s)`);
      });
      
      // Check if any questions fall outside expected range (for debugging)
      const questionsOutsideRange = convertedQuestionPlans.filter((plan: any) => 
        plan.timestamp < segmentInfo.startTime || plan.timestamp >= segmentInfo.endTime
      );
      
      if (questionsOutsideRange.length > 0) {
        console.log(`   ⚠️ Note: ${questionsOutsideRange.length} questions have timestamps outside the segment's logical range`);
        console.log(`      This is expected when using endOffset buffer for better context`);
      }
    }
    
    // Save transcript segment to database if courseId and supabaseClient are provided
    if (courseId && supabaseClient) {
      const processingTimeMs = Date.now() - startTime;
      
      // Use the new transcript manager for proper segment handling
      const { saveOrUpdateTranscript } = await import('../utils/transcript-manager.ts');
      
      await saveOrUpdateTranscript(
        supabaseClient,
        courseId,
        youtubeUrl,
        video_transcript,
        segmentInfo,
        processingTimeMs
      );
    }
    
    // Enhanced post-processing with transcript awareness
    const processedPlans = enhanceQuestionPlans(convertedQuestionPlans, maxQuestions, video_transcript);
    
    console.log(`\n✅ Generated ${processedPlans.length} question plans for segment ${segmentInfo.index + 1}`);
    
    return { plans: processedPlans, transcript: video_transcript };
    
  } catch (error: unknown) {
    console.error('❌ Segment planning failed:', error);
    throw new Error(`Failed to generate segment question plans: ${error instanceof Error ? error.message : String(error)}`);
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
    
    // Extract video ID and get duration for dynamic frame sampling
    const videoId = extractVideoId(youtubeUrl);
    let frameSamplingRate = 1.0; // Default
    
    if (videoId) {
      console.log(`   🎥 Video ID: ${videoId}`);
      const videoDuration = await getVideoDuration(videoId);
      frameSamplingRate = calculateFrameSamplingRate(videoDuration);
    } else {
      console.warn('⚠️ Could not extract video ID from URL, using default frame sampling rate');
    }
    
    console.log('   📝 Phase 1: Generating full transcript with visual descriptions');
    console.log('   🎯 Phase 2: Creating question plans based on transcript');
    
    // Enhanced prompt with educational framework and transcript generation
    const enhancedPrompt = `${ENHANCED_QUESTION_PLANNING_PROMPT}

## VIDEO-SPECIFIC REQUIREMENTS

Target exactly ${maxQuestions} questions for this video.

For hotspot questions: Include 2-3 sentences in visual_learning_objective describing what visual skill this develops.`;
    
    // Build video metadata with dynamic frame sampling rate
    const videoConfig = {
      videoMetadata: {
        fps: frameSamplingRate
      }
    };
    
    const response = await logGeminiCall(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
      {
          contents: [{
            parts: [
            { 
              fileData: { 
                fileUri: youtubeUrl
              },
              videoMetadata: {
                fps: frameSamplingRate
              }
            },
              { text: enhancedPrompt }
            ]
          }],
          generationConfig: PLANNING_GENERATION_CONFIG
      },
      `Planning Stage - Generating question plans for full video`
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
    const { timestamp_format, video_transcript, question_plans } = planningResponse;
    
    if (!video_transcript || !question_plans) {
      throw new Error('Response missing required fields: video_transcript or question_plans');
    }
    
    if (!timestamp_format) {
      console.warn('⚠️ No timestamp_format specified, defaulting to mm:ss');
    }
    
    // Convert timestamps based on the format specified by Gemini
    const timestampFormat = timestamp_format || 'mm:ss';
    console.log(`🕐 Timestamp format specified by Gemini: ${timestampFormat}`);
    
    // Helper function to convert timestamps based on format
    const convertTimestamp = (ts: number | string): number => {
      if (timestampFormat === 'mm:ss') {
        // Convert MM:SS string format to seconds
        return typeof ts === 'string' ? convertMMSSToSeconds(ts) : ts;
      } else if (timestampFormat === 'seconds') {
        // Already in seconds, no conversion needed
        return typeof ts === 'number' ? ts : parseFloat(ts);
      } else {
        // Use the existing converter for other formats (legacy support)
        return convertBase60ToSeconds(ts);
      }
    };
    
    // Convert transcript timestamps
    if (video_transcript.full_transcript) {
      // Log raw timestamps before conversion to debug format issues
      console.log('   📍 Raw timestamps from Gemini (before conversion):');
      const firstFew = video_transcript.full_transcript.slice(0, 3);
      const lastFew = video_transcript.full_transcript.slice(-3);
      
      firstFew.forEach((seg: any, idx: number) => {
        console.log(`      Segment ${idx}: timestamp=${seg.timestamp}, end_timestamp=${seg.end_timestamp}`);
      });
      
      if (video_transcript.full_transcript.length > 6) {
        console.log(`      ... (${video_transcript.full_transcript.length - 6} more segments)`);
      }
      
      lastFew.forEach((seg: any, idx: number) => {
        const actualIdx = video_transcript.full_transcript.length - lastFew.length + idx;
        console.log(`      Segment ${actualIdx}: timestamp=${seg.timestamp}, end_timestamp=${seg.end_timestamp}`);
      });
      
      // Log a few examples of timestamp conversion
      const exampleSegments = video_transcript.full_transcript.slice(0, 3);
      console.log('   📍 Example timestamp conversions:');
      exampleSegments.forEach((seg: any) => {
        const converted = convertTimestamp(seg.timestamp);
        console.log(`      ${seg.timestamp} → ${converted}s (${formatSecondsForDisplay(converted)})`);
      });
      
      video_transcript.full_transcript = video_transcript.full_transcript.map((segment: any, index: number, array: any[]) => {
        const convertedSegment = {
          ...segment,
          timestamp: convertTimestamp(segment.timestamp),
          end_timestamp: segment.end_timestamp ? convertTimestamp(segment.end_timestamp) : undefined
        };
        
        // If no end_timestamp, use the start of the next segment
        if (!convertedSegment.end_timestamp && index < array.length - 1) {
          const nextSegmentStart = convertTimestamp(array[index + 1].timestamp);
          convertedSegment.end_timestamp = nextSegmentStart;
        }
        
        return convertedSegment;
      });
    }
    
    // Convert key concepts timeline timestamps
    if (video_transcript.key_concepts_timeline) {
      video_transcript.key_concepts_timeline = video_transcript.key_concepts_timeline.map((concept: any) => ({
        ...concept,
        first_mentioned: convertTimestamp(concept.first_mentioned),
        explanation_timestamps: concept.explanation_timestamps ? 
          concept.explanation_timestamps.map((ts: number) => convertTimestamp(ts)) : []
      }));
    }
    
    // Convert question plan timestamps
    const convertedQuestionPlans = question_plans.map((plan: any) => ({
      ...plan,
      timestamp: convertTimestamp(plan.timestamp),
      frame_timestamp: plan.frame_timestamp ? convertTimestamp(plan.frame_timestamp) : undefined,
      // Convert transcript_reference timestamps if present
      transcript_reference: plan.transcript_reference ? {
        ...plan.transcript_reference,
        start_timestamp: convertTimestamp(plan.transcript_reference.start_timestamp),
        end_timestamp: convertTimestamp(plan.transcript_reference.end_timestamp)
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
  
  // ALWAYS limit to max questions - this is a hard cap
  if (processedPlans.length > maxQuestions) {
    console.log(`⚠️ ENFORCING LIMIT: Reducing plans from ${processedPlans.length} to ${maxQuestions} (1 question per minute max)`);
    processedPlans = prioritizeByEducationalValue(processedPlans, maxQuestions);
  } else if (processedPlans.length < maxQuestions) {
    console.log(`ℹ️ Generated ${processedPlans.length} questions (less than max ${maxQuestions} - this is OK)`);
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
      
      console.log(`   🎬 Video duration check: maxTimestamp=${maxTimestamp}s (${formatSecondsForDisplay(maxTimestamp)})`);
      
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