export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  visuals?: VisualContent[]; // Add support for visual content
}

export interface TranscriptSegment {
  timestamp: number;        // Changed from start_time
  end_timestamp: number;    // Changed from end_time
  text: string;
  visual_description?: string;
  is_salient_event?: boolean;
  event_type?: string;
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

// New types for visual enhancement
export interface VisualContent {
  type: 'mermaid' | 'chart' | 'table' | 'mindmap';
  code: string;
  title?: string;
  description?: string;
  interactionHints?: string[];
}

export interface EnhancedAIResponse extends OpenAIResponse {
  visuals?: VisualContent[];
  visualContext?: {
    shouldGenerateVisual: boolean;
    suggestedVisualType: string;
    confidence: number;
  };
  insightsQueued?: boolean; // For chat insight extraction integration
} 