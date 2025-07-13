export interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  courseId?: string;
  questionsGenerated?: boolean;
  questions?: Question[];
  videoId?: string;
  averageRating?: number;
  totalRatings?: number;
  topic?: string;
  // Segmentation fields
  is_segmented?: boolean;
  total_segments?: number;
  segment_duration?: number;
  // Enhanced recommendation fields
  reasons?: string[];
  difficulty_match?: 'too_easy' | 'perfect' | 'challenging' | 'too_hard';
  addresses_mistakes?: string[];
  thumbnail_url?: string;
  channel_name?: string;
  duration?: string;
  progression_type?: 'series_continuation' | 'topic_advancement' | 'reinforcement' | 'prerequisite';
}

export interface Question {
  id: string;
  question: string;
  type: string;
  options: string[]; // Always an array of strings
  correct: number; // Index of correct answer
  explanation: string;
  timestamp: number;
  // Legacy field names for compatibility
  correct_answer: number;
  // Visual question fields
  visual_context?: string;
  frame_timestamp?: number;
  bounding_boxes?: any[];
  detected_objects?: any[];
  matching_pairs?: any[];
  requires_video_overlay?: boolean;
  video_overlay?: boolean;
  bounding_box_count?: number;
  // Segment fields
  segment_index?: number;
  segment_id?: number;
}

export interface Segment {
  title: string;
  timestamp: string;
  timestampSeconds: number;
  concepts: string[];
  questions: Question[];
  isComplete?: boolean;
}

export interface CourseData {
  title: string;
  description: string;
  duration: string;
  videoId: string;
  segments: Segment[];
}

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number) => void;
}

export interface YouTubeWindow extends Window {
  YT: {
    Player: new (elementId: string, config: any) => YTPlayer;
    PlayerState: {
      PLAYING: number;
      PAUSED: number;
      ENDED: number;
    };
  };
  onYouTubeIframeAPIReady: () => void;
} 