import React, { ReactNode, useEffect, useRef } from 'react';
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
  showQuestion?: boolean;
  isFlipped?: boolean;
  flipContent?: ReactNode;
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
  nextCourseApiCalled,
  showQuestion = false,
  isFlipped = false,
  flipContent
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Add styles for 3D flip effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const styleId = 'interactive-video-player-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .flip-container {
            perspective: 1000px;
            width: 100%;
            height: 100%;
          }
          
          .flip-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s;
            transform-style: preserve-3d;
          }
          
          .flip-inner.flipped {
            transform: rotateY(180deg);
          }
          
          .flip-front, .flip-back {
            position: absolute;
            width: 100%;
            height: 100%;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
          }
          
          .flip-back {
            transform: rotateY(180deg);
          }
          
          /* Keep YouTube player always rendered but hidden when flipped */
          .youtube-container {
            position: relative;
            width: 100%;
            height: 100%;
          }
          
          .youtube-container.hidden-for-flip {
            opacity: 0;
            pointer-events: none;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  // If we have flip content, use the flip container
  if (flipContent !== undefined) {
    return (
      <div className="flip-container" style={{ minHeight: '600px' }}>
        <div className={`flip-inner ${isFlipped ? 'flipped' : ''}`}>
          {/* Front Face - Video Player */}
          <div className="flip-front">
            <Card className="h-full">
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
                <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
                  {/* YouTube player container - always rendered */}
                  <div className={`youtube-container ${isFlipped ? 'hidden-for-flip' : ''}`}>
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
                        src={`https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&enablejsapi=1&origin=${window.location.origin}`}
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
                </div>
                
                {/* Progress Bar */}
                {isVideoReady && duration > 0 && !isFlipped && (
                  <div className="space-y-3 px-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                    
                    <VideoProgressBar
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onVideoSeek}
                      questions={questions.map((question, index) => ({
                        ...question,
                        id: `0-${index}`
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
          </div>
          
          {/* Back Face - Question */}
          <div className="flip-back">
            <div className="h-full w-full">
              {flipContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No flip content - just show the video player
  return (
    <Card>
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
        <div className="aspect-video bg-muted rounded-lg overflow-hidden relative">
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
              src={`https://www.youtube.com/embed/${videoId}?controls=1&modestbranding=1&rel=0&enablejsapi=1&origin=${window.location.origin}`}
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
          
          {/* Overlay when question is showing */}
          {showQuestion && (
            <div 
              className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none z-10"
            >
              <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm">
                Video paused - Answer the question below
              </div>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        {isVideoReady && duration > 0 && (
          <div className="space-y-3 px-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            
            <VideoProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={showQuestion ? () => {} : onVideoSeek}
              questions={questions.map((question, index) => ({
                ...question,
                id: `0-${index}`
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
            disabled={showQuestion}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Watch on YouTube
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onFetchNextCourse}
            disabled={isLoadingNextCourse || !!nextCourse || nextCourseApiCalled || showQuestion}
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