/**
 * Transcript Context Utilities
 * 
 * Provides utilities for extracting and formatting relevant transcript
 * segments around specific timestamps for question generation context.
 */

import { VideoTranscript, TranscriptSegment } from '../types/interfaces.ts';
import { formatSecondsForDisplay } from './timestamp-converter.ts';

// =============================================================================
// Transcript Segment Extraction
// =============================================================================

export interface TranscriptContext {
  segments: TranscriptSegment[];
  nearbyConcepts: string[];
  nearbyConceptTimestamps: Map<string, number[]>;
  visualContext?: string;
  isSalientMoment: boolean;
  eventType?: string;
  formattedContext?: string;
}

/**
 * Checks if a segment is within the context window
 */
const isWithinContextWindow = (
  segment: TranscriptSegment,
  targetTimestamp: number,
  contextWindowSeconds: number
): boolean => {
  const startTime = Math.max(0, targetTimestamp - contextWindowSeconds);
  const endTime = targetTimestamp + contextWindowSeconds;
  const segmentStart = segment.timestamp;
  // If no end_timestamp, assume a default duration of 5 seconds
  const segmentEnd = segment.end_timestamp || (segment.timestamp + 5);
  
  return (
    (segmentStart >= startTime && segmentStart <= endTime) ||
    (segmentEnd >= startTime && segmentEnd <= endTime) ||
    (segmentStart <= startTime && segmentEnd >= endTime)
  );
};

/**
 * Checks if a concept is nearby the target timestamp
 */
const isConceptNearby = (
  concept: { concept: string; first_mentioned: number; explanation_timestamps: number[] },
  targetTimestamp: number,
  contextWindowSeconds: number
): boolean => {
  const startTime = Math.max(0, targetTimestamp - contextWindowSeconds);
  const endTime = targetTimestamp + contextWindowSeconds;
  
  // Check if first mention is within window
  if (concept.first_mentioned >= startTime && concept.first_mentioned <= endTime) {
    return true;
  }
  
  // Check if any explanation timestamp is within window
  return concept.explanation_timestamps.some((ts: number) =>
    ts >= startTime && ts <= endTime
  );
};

/**
 * Finds the segment at a specific timestamp
 */
const findSegmentAtTimestamp = (
  transcript: VideoTranscript,
  timestamp: number
): TranscriptSegment | undefined => {
  // Look for the segment that contains this timestamp
  for (let i = 0; i < transcript.full_transcript.length; i++) {
    const segment = transcript.full_transcript[i];
    const segmentStart = segment.timestamp;
    
    // Determine segment end:
    // 1. Use segment's end_timestamp if available
    // 2. Use next segment's start timestamp if available
    // 3. Default to 5 seconds duration
    let segmentEnd: number;
    if (segment.end_timestamp) {
      segmentEnd = segment.end_timestamp;
    } else if (i < transcript.full_transcript.length - 1) {
      segmentEnd = transcript.full_transcript[i + 1].timestamp;
    } else {
      segmentEnd = segmentStart + 5; // Default duration for last segment
    }
    
    if (timestamp >= segmentStart && timestamp < segmentEnd) {
      return segment;
    }
  }
  
  return undefined;
};

/**
 * Extract relevant transcript segments around a given timestamp
 * @param transcript - The full video transcript
 * @param targetTimestamp - The timestamp to find segments around
 * @param contextWindowSeconds - Number of seconds before and after to include (default: 30)
 * @returns Array of relevant transcript segments with context
 */
export const extractTranscriptContext = (
  transcript: VideoTranscript,
  targetTimestamp: number,
  contextWindowSeconds: number = 30
): TranscriptContext => {
  const relevantSegments: TranscriptSegment[] = [];
  const nearbyConceptTimestamps = new Map<string, number[]>();
  
  // Find segments within the context window
  transcript.full_transcript.forEach((segment: any) => {
    if (isWithinContextWindow(segment, targetTimestamp, contextWindowSeconds)) {
      relevantSegments.push(segment);
    }
  });
  
  // Find nearby concepts and their timestamps
  transcript.key_concepts_timeline.forEach((concept: any) => {
    if (isConceptNearby(concept, targetTimestamp, contextWindowSeconds)) {
      nearbyConceptTimestamps.set(concept.concept, concept.explanation_timestamps || []);
    }
  });
  
  // Get visual context at the target timestamp
  const targetSegment = findSegmentAtTimestamp(transcript, targetTimestamp);
  
  return {
    segments: relevantSegments,
    nearbyConcepts: Array.from(nearbyConceptTimestamps.keys()),
    nearbyConceptTimestamps,
    visualContext: targetSegment?.visual_description,
    isSalientMoment: targetSegment?.is_salient_event || false,
    eventType: targetSegment?.event_type
  };
};

/**
 * Get the exact transcript segment for a specific timestamp
 * @param transcript - The full video transcript
 * @param timestamp - The exact timestamp to find
 * @returns The transcript segment containing that timestamp, or null
 */
export const getExactTranscriptSegment = (
  transcript: VideoTranscript,
  timestamp: number
): TranscriptSegment | null => {
  if (!transcript || !transcript.full_transcript) {
    return null;
  }

  return transcript.full_transcript.find(segment => {
    const segmentStart = segment.timestamp;
    const segmentEnd = segment.end_timestamp || segment.timestamp;
    return timestamp >= segmentStart && timestamp <= segmentEnd;
  }) || null;
};

/**
 * Format transcript segments into a readable context string
 * @param segments - Array of transcript segments
 * @param includeVisualDescriptions - Whether to include visual descriptions
 * @returns Formatted string of transcript content
 */
export const formatTranscriptContext = (context: TranscriptContext): string => {
  if (context.segments.length === 0) {
    return 'No transcript context available for this timestamp.';
  }
  
  let formatted = 'Transcript segments with timestamps:\n\n';
  
  context.segments.forEach((segment, index) => {
    const startTime = formatSecondsForDisplay(segment.timestamp);
    const endTime = segment.end_timestamp ? formatSecondsForDisplay(segment.end_timestamp) : '';
    
    // Format timestamp display
    let timestampDisplay = `[${startTime}`;
    if (endTime) {
      timestampDisplay += ` - ${endTime}]`;
    } else {
      timestampDisplay += ']';
    }
    
    // Add raw seconds
    let secondsDisplay = ` (${segment.timestamp}s`;
    if (segment.end_timestamp) {
      secondsDisplay += ` - ${segment.end_timestamp}s)`;
    } else {
      secondsDisplay += ')';
    }
    
    formatted += timestampDisplay + secondsDisplay + ':\n';
    formatted += `Text: ${segment.text}\n`;
    
    if (segment.visual_description) {
      formatted += `Visual: ${segment.visual_description}\n`;
    }
    
    if (segment.is_salient_event) {
      formatted += `[SALIENT EVENT: ${segment.event_type || 'Key moment'}]\n`;
    }
    
    if (index < context.segments.length - 1) {
      formatted += '\n';
    }
  });
  
  return formatted;
};

/**
 * Extract key concepts mentioned near a timestamp
 * @param transcript - The full video transcript
 * @param timestamp - The target timestamp
 * @param windowSeconds - Window around timestamp to search
 * @returns Array of key concepts mentioned in that window
 */
export const extractNearbyKeyConcepts = (
  transcript: VideoTranscript,
  timestamp: number,
  windowSeconds: number = 60
): string[] => {
  if (!transcript || !transcript.key_concepts_timeline) {
    return [];
  }

  const startTime = timestamp - windowSeconds;
  const endTime = timestamp + windowSeconds;

  // Find concepts that were explained within the window
  const nearbyConcepts = transcript.key_concepts_timeline.filter(concept => {
    return concept.explanation_timestamps.some(ts => 
      ts >= startTime && ts <= endTime
    );
  });

  return nearbyConcepts.map(c => c.concept);
};

/**
 * Finds the optimal timestamp for a question after concepts are explained
 * Returns a timestamp after the last relevant concept explanation
 */
export const findOptimalQuestionTimestamp = (
  context: TranscriptContext,
  originalTimestamp: number,
  minDelaySeconds: number = 5 // Adjusted from 8 to 5 seconds
): number => {
  let latestExplanationTimestamp = originalTimestamp;
  
  // Check all segments for the end of explanations
  context.segments.forEach((segment, index) => {
    let segmentEnd: number;
    
    // Determine actual segment end
    if (segment.end_timestamp) {
      segmentEnd = segment.end_timestamp;
    } else {
      // Try to find next segment in the original array to get more accurate end time
      const nextSegmentIndex = context.segments.findIndex((s, i) => 
        i > index && s.timestamp > segment.timestamp
      );
      
      if (nextSegmentIndex !== -1) {
        segmentEnd = context.segments[nextSegmentIndex].timestamp;
      } else {
        // Default to 5 seconds if no next segment
        segmentEnd = segment.timestamp + 5;
      }
    }
    
    if (segmentEnd > latestExplanationTimestamp) {
      latestExplanationTimestamp = segmentEnd;
    }
  });
  
  // Check concept explanation timestamps
  context.nearbyConceptTimestamps.forEach((timestamps) => {
    timestamps.forEach(ts => {
      if (ts > latestExplanationTimestamp) {
        latestExplanationTimestamp = ts;
      }
    });
  });
  
  // Add minimum delay after the last explanation
  return latestExplanationTimestamp + minDelaySeconds;
};

/**
 * Find the next natural pause after a given timestamp
 * Looks for segment boundaries and topic transitions
 */
export const findNextNaturalPause = (
  transcript: VideoTranscript,
  afterTimestamp: number,
  minPauseGap: number = 2
): number | null => {
  if (!transcript || !transcript.full_transcript) {
    return null;
  }
  
  // Sort segments by timestamp
  const sortedSegments = [...transcript.full_transcript].sort((a, b) => a.timestamp - b.timestamp);
  
  for (let i = 0; i < sortedSegments.length - 1; i++) {
    const currentSegment = sortedSegments[i];
    const nextSegment = sortedSegments[i + 1];
    
    // Check if this segment ends after our target timestamp
    const segmentEnd = currentSegment.end_timestamp || currentSegment.timestamp + 5;
    if (segmentEnd > afterTimestamp) {
      // Check if there's a gap between segments (natural pause)
      const gap = nextSegment.timestamp - segmentEnd;
      if (gap >= minPauseGap) {
        // Return a timestamp in the middle of the pause
        return segmentEnd + (gap / 2);
      }
      
      // Check if the next segment is a salient event (topic change)
      if (nextSegment.is_salient_event) {
        // Place question just before the new topic
        return Math.max(segmentEnd + 1, nextSegment.timestamp - 2);
      }
    }
  }
  
  return null;
};

/**
 * Check if a timestamp would interrupt an ongoing sentence
 */
export const isInterruptingSentence = (
  transcript: VideoTranscript,
  timestamp: number
): boolean => {
  const segment = findSegmentAtTimestamp(transcript, timestamp);
  if (!segment) return false;
  
  // Check if we're in the middle of a segment
  const segmentProgress = timestamp - segment.timestamp;
  const segmentDuration = (segment.end_timestamp || segment.timestamp + 5) - segment.timestamp;
  const progressRatio = segmentProgress / segmentDuration;
  
  // If we're in the middle 60% of a segment, we're likely interrupting
  return progressRatio > 0.2 && progressRatio < 0.8;
};

/**
 * Create a rich context object for question generation
 * @param transcript - The full video transcript
 * @param timestamp - The question timestamp
 * @returns Rich context object with transcript data
 */
export const createQuestionContext = (
  transcript: VideoTranscript,
  timestamp: number
): TranscriptContext => {
  const context = extractTranscriptContext(transcript, timestamp, 30);
  
  // Add formatted context to the context object
  return {
    ...context,
    formattedContext: formatTranscriptContext(context)
  };
}; 