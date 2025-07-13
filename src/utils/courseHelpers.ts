import { Question } from '@/types/course';

// Parse options - handle both array and JSON string formats
export const parseOptions = (options: string[] | string): string[] => {
  if (Array.isArray(options)) {
    return options;
  }
  
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options);
      return Array.isArray(parsed) ? parsed : [options];
    } catch (e) {
      // If parsing fails, treat as a single option
      return [options];
    }
  }
  
  return [];
};

// Enhanced parseOptions function that handles true/false questions
export const parseOptionsWithTrueFalse = (options: string[] | string, questionType: string): string[] => {
  const parsedOptions = parseOptions(options);
  
  // For true/false questions, ensure we have the correct options
  if (parsedOptions.length === 0 && (questionType === 'true-false' || questionType === 'true_false')) {
    return ['True', 'False'];
  }
  
  return parsedOptions;
};

// Extract video ID from YouTube URL
export const extractVideoId = (url: string): string => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return '';
};

// Format time in MM:SS format
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Format timestamp with leading zeros
export const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Adjust question timestamps that are too close to the video end
export const adjustEndOfVideoQuestions = (questions: Question[], videoDuration: number): Question[] => {
  const END_BUFFER_SECONDS = 5; // Move questions this many seconds before the end
  
  return questions.map(question => {
    // Check if question is within the last 5 seconds of the video
    if (question.timestamp > videoDuration - END_BUFFER_SECONDS) {
      const originalTimestamp = question.timestamp;
      const adjustedTimestamp = Math.max(
        videoDuration - END_BUFFER_SECONDS,
        question.timestamp - END_BUFFER_SECONDS
      );
      
      console.log(`⏰ Adjusting end-of-video question: ${originalTimestamp}s → ${adjustedTimestamp}s (video ends at ${videoDuration}s)`);
      
      return {
        ...question,
        timestamp: adjustedTimestamp,
        frame_timestamp: question.frame_timestamp && question.frame_timestamp > videoDuration - END_BUFFER_SECONDS 
          ? adjustedTimestamp - 2 
          : question.frame_timestamp
      };
    }
    return question;
  });
};

// Get player state name for debugging
export const getPlayerStateName = (state: number): string => {
  const states: Record<number, string> = {
    [-1]: 'UNSTARTED',
    [0]: 'ENDED',
    [1]: 'PLAYING',
    [2]: 'PAUSED',
    [3]: 'BUFFERING',
    [5]: 'CUED'
  };
  return states[state] || `UNKNOWN(${state})`;
}; 

// Format user answer for session tracking
export function formatUserAnswer(answer: any, question: Question): string {
  switch (question.type) {
    case 'multiple-choice':
      if (typeof answer === 'number') {
        return question.options[answer] || `Option ${answer + 1}`;
      }
      return String(answer);
    case 'true-false':
    case 'true_false':
      return answer === 0 ? 'True' : 'False';
    case 'matching':
      return 'Matching pairs submitted';
    case 'hotspot':
      return answer.label || 'Clicked location';
    case 'sequencing':
      return 'Sequence submitted';
    default:
      return String(answer);
  }
}

// Format correct answer for session tracking
export function formatCorrectAnswer(question: Question): string {
  switch (question.type) {
    case 'multiple-choice':
      return question.options[question.correct] || `Option ${question.correct + 1}`;
    case 'true-false':
    case 'true_false':
      return question.correct === 0 ? 'True' : 'False';
    case 'matching':
      return 'Correct pairs';
    case 'hotspot':
      // Check detected_objects for correct answers
      const targets = question.detected_objects?.filter((obj: any) => obj.is_correct_answer).map((obj: any) => obj.label) || [];
      return targets.length > 0 ? targets.join(', ') : 'Target objects';
    case 'sequencing':
      return 'Correct sequence';
    default:
      return String(question.correct);
  }
} 