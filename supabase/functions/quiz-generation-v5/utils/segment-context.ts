/**
 * Segment Context Utilities
 * 
 * Handles extraction and management of context between video segments
 * to maintain educational continuity
 */

import { convertBase60ToSeconds } from './timestamp-converter.ts';

export interface TranscriptSegment {
  timestamp: number;
  end_timestamp?: number;
  text: string;
  visual_description: string;
  is_salient_event: boolean;
  event_type?: string;
}

export interface KeyConcept {
  concept: string;
  first_mentioned: number;
  explanation_timestamps: number[];
}

export interface QuestionSummary {
  type: string;
  topic: string;
  concepts: string[];
  timestamp: number;
}

export interface SegmentContext {
  lastTranscriptSegments: TranscriptSegment[]; // Last ~2 minutes of transcript
  keyConcepts: KeyConcept[]; // All key concepts introduced
  lastQuestions: QuestionSummary[]; // Summary of last 2-3 questions
  segmentSummary: string; // Brief summary of the segment
  segmentIndex: number;
  totalProcessedDuration: number; // Total duration of all processed segments
}

/**
 * Extract context from a completed segment for passing to the next segment
 */
export const extractSegmentContext = (
  transcript: any,
  questions: any[],
  segmentIndex: number,
  segmentEndTime: number,
  contextDuration: number = 120 // Last 2 minutes
): SegmentContext => {
  // Extract last portion of transcript (last 2 minutes or less)
  const contextStartTime = Math.max(
    segmentEndTime - contextDuration,
    transcript.full_transcript[0]?.timestamp || 0
  );
  
  const lastTranscriptSegments = transcript.full_transcript.filter(
    (seg: TranscriptSegment) => seg.timestamp >= contextStartTime
  );
  
  // Extract all key concepts from this segment
  const rawKeyConcepts = transcript.key_concepts_timeline || [];
  
  // Ensure all timestamps are properly converted to seconds
  const keyConcepts = rawKeyConcepts.map((concept: any) => ({
    ...concept,
    first_mentioned: typeof concept.first_mentioned === 'number' && concept.first_mentioned < 100 && concept.first_mentioned.toString().includes('.')
      ? convertBase60ToSeconds(concept.first_mentioned)
      : concept.first_mentioned,
    explanation_timestamps: (concept.explanation_timestamps || []).map((ts: number) => 
      typeof ts === 'number' && ts < 100 && ts.toString().includes('.')
        ? convertBase60ToSeconds(ts)
        : ts
    )
  }));
  
  // Get last few questions for context (up to 3)
  const lastQuestions = questions.slice(-3).map(q => ({
    type: q.type,
    topic: extractQuestionTopic(q.question),
    concepts: q.key_concepts || [],
    timestamp: typeof q.timestamp === 'number' && q.timestamp < 100 && q.timestamp.toString().includes('.')
      ? convertBase60ToSeconds(q.timestamp)
      : q.timestamp || 0
  }));
  
  // Generate segment summary
  const segmentSummary = generateSegmentSummary(transcript, lastTranscriptSegments);
  
  return {
    lastTranscriptSegments,
    keyConcepts,
    lastQuestions,
    segmentSummary,
    segmentIndex,
    totalProcessedDuration: segmentEndTime
  };
};

/**
 * Merge context from previous segments with current segment
 */
export const mergeSegmentContexts = (
  previousContext: SegmentContext | null,
  currentContext: SegmentContext
): SegmentContext => {
  if (!previousContext) return currentContext;
  
  // Merge key concepts, avoiding duplicates
  const mergedConcepts = [...previousContext.keyConcepts];
  currentContext.keyConcepts.forEach(concept => {
    if (!mergedConcepts.find(c => c.concept === concept.concept)) {
      mergedConcepts.push(concept);
    }
  });
  
  return {
    ...currentContext,
    keyConcepts: mergedConcepts,
    totalProcessedDuration: currentContext.totalProcessedDuration
  };
};

/**
 * Generate a context-aware prompt section for the next segment
 */
export const generateContextPrompt = (
  previousContext: SegmentContext | null,
  currentSegmentInfo: { index: number; startTime: number; endTime: number; totalSegments: number }
): string => {
  if (!previousContext || previousContext.segmentIndex === -1) {
    return `
## SEGMENT INFORMATION:
This is the FIRST segment of a ${currentSegmentInfo.totalSegments}-part video.
Time range: ${formatTime(currentSegmentInfo.startTime)} to ${formatTime(currentSegmentInfo.endTime)}

## INSTRUCTIONS:
- This is the beginning of the course, so introduce concepts clearly
- Don't assume prior knowledge beyond general prerequisites
- Generate questions that establish foundational understanding
`;
  }
  
  return `
## PREVIOUS SEGMENT CONTEXT

This is segment ${currentSegmentInfo.index + 1} of ${currentSegmentInfo.totalSegments}. 
The learner has already watched ${formatTime(previousContext.totalProcessedDuration)} of content.

### Summary of Previous Segment:
${previousContext.segmentSummary}

### Key Concepts Already Introduced:
${previousContext.keyConcepts.map(c => 
  `- ${c.concept} (introduced at ${formatTime(c.first_mentioned)})`
).join('\n')}

### Last Few Transcript Segments from Previous Part:
${previousContext.lastTranscriptSegments.slice(-5).map(s => 
  `[${formatTime(s.timestamp)}] ${s.text}`
).join('\n')}

### Recent Questions Asked:
${previousContext.lastQuestions.map(q => 
  `- ${q.type} at ${formatTime(q.timestamp)}: ${q.topic}`
).join('\n')}

## CURRENT SEGMENT:
Time range: ${formatTime(currentSegmentInfo.startTime)} to ${formatTime(currentSegmentInfo.endTime)}

## INSTRUCTIONS FOR CONTINUITY:
1. Assume learners have understood the concepts listed above
2. Reference previous concepts when relevant but focus on NEW content in this segment
3. Build upon previous knowledge - questions can require understanding from earlier segments
4. If this segment continues a topic from the previous segment, acknowledge that continuity
5. Maintain educational progression - avoid re-introducing basic concepts already covered
6. For visual questions, you may reference objects/concepts shown in previous segments
`;
};

// Helper functions

function extractQuestionTopic(question: string): string {
  // Extract first 100 chars or until first question mark
  const questionMark = question.indexOf('?');
  const endIndex = questionMark > 0 ? Math.min(questionMark + 1, 100) : 100;
  return question.substring(0, endIndex).trim();
}

function generateSegmentSummary(
  transcript: any, 
  lastSegments: TranscriptSegment[]
): string {
  // Create a brief summary based on key concepts and last few transcript segments
  const concepts = transcript.key_concepts_timeline || [];
  const conceptList = concepts.slice(0, 5).map((c: KeyConcept) => c.concept).join(', ');
  
  const lastText = lastSegments
    .slice(-3)
    .map(s => s.text)
    .join(' ')
    .substring(0, 200);
  
  return `Covered topics: ${conceptList || 'general content'}. Recent focus: ${lastText}...`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
} 