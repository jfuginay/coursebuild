import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, BookOpen } from 'lucide-react';
import VideoProgressBar from '@/components/VideoProgressBar';

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[];
  correct: number;
  correct_answer: number;
  explanation: string;
  timestamp: number;
  visual_context?: string;
  frame_timestamp?: number;
  bounding_boxes?: any[];
  detected_objects?: any[];
  matching_pairs?: any[];
  requires_video_overlay?: boolean;
  video_overlay?: boolean;
  bounding_box_count?: number;
}

interface InteractiveVideoPlayerProps {
  videoId: string;
  youtubeUrl: string;
  isYTApiLoaded: boolean;
  error: string | null;
  isVideoReady: boolean;
  currentTime: number;
  duration: number;
  questions: Question[];
  answeredQuestions: Set<number>;
  onVideoSeek: (seekTime: number) => void;
  formatTime: (seconds: number) => string;
  onFetchNextCourse: () => void;
  isLoadingNextCourse: boolean;
  nextCourse: any;
  nextCourseApiCalled: boolean;
}

const InteractiveVideoPlayer: React.FC<InteractiveVideoPlayerProps> = ({
  videoId,
  youtubeUrl,
  isYTApiLoaded,
  error,
  isVideoReady,
  currentTime,
  duration,
  questions,
  answeredQuestions,
  onVideoSeek,
  formatTime,
  onFetchNextCourse,
  isLoadingNextCourse,
  nextCourse,
  nextCourseApiCalled
}) => {
  return (
    <Card id="interactive-video-player">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Interactive Video Course
        </CardTitle>
        <CardDescription>
          Watch the video and answer questions as they appear
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div id="video-player-area" className="aspect-video bg-muted rounded-lg overflow-hidden relative">
          {!isYTApiLoaded && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading video player...</p>
              </div>
            </div>
          )}
          
          {/* Fallback iframe if API fails */}
          {error && videoId && (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?controls=0&modestbranding=1&rel=0&enablejsapi=1&origin=${window.location.origin}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
            />
          )}
          
          {/* Main YouTube API player */}
          <div 
            id="youtube-player" 
            className="w-full h-full" 
            style={{ display: error ? 'none' : 'block' }} 
          />
        </div>
        
        {/* Progress Bar */}
        {isVideoReady && duration > 0 && (
          <div className="px-2">
            <VideoProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={onVideoSeek}
              questions={questions.map((question, index) => ({
                ...question,
                id: `0-${index}` // Simple ID for single segment structure
              }))}
              answeredQuestions={new Set(
                Array.from(answeredQuestions).map(index => `0-${index}`)
              )}
              formatTimestamp={formatTime}
              className=""
            />
          </div>
        )}

        {/* External Links */}
        <div className="flex justify-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(youtubeUrl, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Watch on YouTube
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onFetchNextCourse}
            disabled={isLoadingNextCourse || !!nextCourse || nextCourseApiCalled}
          >
            {isLoadingNextCourse ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
            ) : (
              <BookOpen className="mr-2 h-4 w-4" />
            )}
            {nextCourse ? 'Next Course Ready' : isLoadingNextCourse ? 'Generating...' : nextCourseApiCalled ? 'Generating...' : 'Generate Next Course'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveVideoPlayer; 