import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, BookOpen } from 'lucide-react';
import VideoProgressBar from '@/components/VideoProgressBar';
import { Question } from '@/types/course';

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
  console.log('🎬 InteractiveVideoPlayer rendered:', {
    videoId,
    isYTApiLoaded,
    error,
    isVideoReady,
    hasQuestions: questions.length > 0,
    elementExists: typeof document !== 'undefined' ? !!document.getElementById('youtube-player') : 'SSR'
  });
  return (
    <Card id="interactive-video-player">
      <CardHeader>
        <div className="flex items-center justify-between">
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
        
        {/* Progress Bar - Show even during processing if we have basic video info */}
        {(isVideoReady || isYTApiLoaded) && (
          <div className="px-2">
            <VideoProgressBar
              currentTime={currentTime}
              duration={duration || 0} // Allow 0 duration to show progress bar structure
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
            
            {/* Show loading indicator when video is not fully ready */}
            {!isVideoReady && isYTApiLoaded && (
              <div className="mt-2 text-center">
                <div className="text-xs text-muted-foreground">
                  Video loading... Seek functionality will be available shortly.
                </div>
              </div>
            )}
          </div>
        )}


      </CardContent>
    </Card>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(InteractiveVideoPlayer, (prevProps, nextProps) => {
  // Only re-render if these key props change
  return (
    prevProps.videoId === nextProps.videoId &&
    prevProps.isVideoReady === nextProps.isVideoReady &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.duration === nextProps.duration &&
    prevProps.questions === nextProps.questions &&
    prevProps.answeredQuestions === nextProps.answeredQuestions &&
    prevProps.isLoadingNextCourse === nextProps.isLoadingNextCourse &&
    prevProps.nextCourse === nextProps.nextCourse
  );
}); 