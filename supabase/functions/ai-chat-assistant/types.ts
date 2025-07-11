export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface TranscriptSegment {
  id: string;
  text: string;
  start_time: number;
  end_time: number;
  segment_index: number;
}

export interface EdgeFunctionContext {
  message: string;
  conversationHistory: ChatMessage[];
  courseContext: {
    courseId: string;
    currentVideoTime: number;
    playedTranscriptSegments: TranscriptSegment[];
    totalSegments: number;
  };
  userContext: {
    hashedUserId?: string;
    sessionId: string;
  };
}

export interface OpenAIResponse {
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
} 