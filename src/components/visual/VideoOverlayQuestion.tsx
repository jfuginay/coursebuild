import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, Target } from 'lucide-react';

interface BoundingBox {
  id: string;
  label: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
  isCorrectAnswer: boolean;
  confidenceScore: number;
}

interface VideoOverlayQuestionProps {
  question: string;
  frameTimestamp: number; // When to show the overlay on video
  boundingBoxes: BoundingBox[];
  explanation: string;
  onAnswer: (isCorrect: boolean, selectedBox?: BoundingBox) => void;
  player: any; // YouTube player instance
  showAnswer?: boolean;
  disabled?: boolean;
}

const VideoOverlayQuestion: React.FC<VideoOverlayQuestionProps> = ({
  question,
  frameTimestamp,
  boundingBoxes,
  explanation,
  onAnswer,
  player,
  showAnswer = false,
  disabled = false
}) => {
  const [selectedBox, setSelectedBox] = useState<BoundingBox | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [videoContainer, setVideoContainer] = useState<HTMLElement | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const overlayContainerRef = useRef<HTMLDivElement>(null);

  // Find the video player container
  useEffect(() => {
    const findVideoContainer = () => {
      // Look for the actual YouTube iframe inside the youtube-player div
      const selectors = [
        '#youtube-player iframe', // Most likely - YouTube API creates iframe inside this div
        'iframe[src*="youtube.com"]',
        'iframe[src*="youtube-nocookie.com"]',
        'iframe[title*="YouTube"]',
        '#youtube-player', // Fallback to container div
        '[id*="youtube"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          setVideoContainer(element);
          console.log('🎬 Found video container:', selector, element);
          return;
        }
      }
      
      console.warn('🎬 Could not find video container');
    };

    findVideoContainer();
    
    // Re-check periodically in case the player loads after this component
    const interval = setInterval(findVideoContainer, 500);
    
    return () => clearInterval(interval);
  }, []);

  // Position overlay container to match video exactly
  useEffect(() => {
    if (!videoContainer || !overlayContainerRef.current) return;

    // Cache overlay reference and video rect to reduce DOM queries
    let cachedVideoRect: DOMRect | null = null;
    let isPositionUpdateScheduled = false;

    const updateOverlayPosition = () => {
      if (!overlayContainerRef.current) return;
      
      const videoRect = videoContainer.getBoundingClientRect();
      const overlay = overlayContainerRef.current;
      
      // Only update if position actually changed (optimization)
      if (cachedVideoRect && 
          Math.abs(cachedVideoRect.left - videoRect.left) < 1 &&
          Math.abs(cachedVideoRect.top - videoRect.top) < 1 &&
          Math.abs(cachedVideoRect.width - videoRect.width) < 1 &&
          Math.abs(cachedVideoRect.height - videoRect.height) < 1) {
        return; // Skip update if position hasn't meaningfully changed
      }
      
      cachedVideoRect = videoRect;
      
      // Position overlay container to exactly match video dimensions and position
      overlay.style.position = 'fixed';
      overlay.style.left = `${videoRect.left}px`;
      overlay.style.top = `${videoRect.top}px`;
      overlay.style.width = `${videoRect.width}px`;
      overlay.style.height = `${videoRect.height}px`;
      overlay.style.pointerEvents = 'none'; // Allow clicks through to video
      overlay.style.zIndex = '1100'; // Increased to be above ChatBubble (z-50)
    };

    // Debounced scroll handler to reduce frequency of updates
    const debouncedUpdate = () => {
      if (isPositionUpdateScheduled) return;
      
      isPositionUpdateScheduled = true;
      requestAnimationFrame(() => {
        updateOverlayPosition();
        isPositionUpdateScheduled = false;
      });
    };

    // Initial positioning
    updateOverlayPosition();

    // Use passive event listeners with debouncing
    window.addEventListener('scroll', debouncedUpdate, { passive: true });
    window.addEventListener('resize', updateOverlayPosition, { passive: true }); // Resize less frequent, no debounce needed

    // Reduced parent scroll detection - only check immediate scrollable parents
    const scrollElements: Element[] = [];
    let scrollParent = videoContainer.parentElement;
    let depth = 0;
    const maxDepth = 3; // Limit depth to prevent excessive listeners
    
    while (scrollParent && scrollParent !== document.body && depth < maxDepth) {
      const computedStyle = window.getComputedStyle(scrollParent);
      if (computedStyle.overflow === 'auto' || computedStyle.overflow === 'scroll' || 
          computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll') {
        scrollElements.push(scrollParent);
        scrollParent.addEventListener('scroll', debouncedUpdate, { passive: true });
      }
      scrollParent = scrollParent.parentElement;
      depth++;
    }

    return () => {
      window.removeEventListener('scroll', debouncedUpdate);
      window.removeEventListener('resize', updateOverlayPosition);
      scrollElements.forEach(el => {
        el.removeEventListener('scroll', debouncedUpdate);
      });
    };
  }, [videoContainer]);

  // Seek to frame timestamp when overlay becomes visible
  useEffect(() => {
    if (isOverlayVisible && player && frameTimestamp) {
      try {
        player.seekTo(frameTimestamp);
        player.pauseVideo();
        console.log('🎬 Seeked to frame timestamp:', frameTimestamp);
      } catch (error) {
        console.warn('Could not seek to frame timestamp:', error);
      }
    }
  }, [isOverlayVisible, player, frameTimestamp]);

  // Show overlay when component mounts
  useEffect(() => {
    setIsOverlayVisible(true);
  }, []);

  const handleBoxClick = (box: BoundingBox) => {
    if (disabled || isSubmitted) return;
    
    setSelectedBox(box);
    setIsSubmitted(true);
    
    const isCorrect = box.isCorrectAnswer;
    onAnswer(isCorrect, box);
  };

  const getBoundingBoxStyle = (box: BoundingBox): React.CSSProperties => {
    // Since the overlay container matches the video exactly, 
    // we can use percentage positioning directly
    return {
      position: 'absolute',
      left: `${box.x * 100}%`,
      top: `${box.y * 100}%`,
      width: `${box.width * 100}%`,
      height: `${box.height * 100}%`,
      border: getBoxBorderStyle(box),
      backgroundColor: getBoxBackgroundColor(box),
      cursor: disabled || isSubmitted ? 'default' : 'pointer',
      transition: 'all 0.2s ease-in-out',
      borderRadius: '4px',
      boxSizing: 'border-box',
      pointerEvents: 'auto' // Allow clicks on bounding boxes
    };
  };

  const getBoxBorderStyle = (box: BoundingBox): string => {
    if (!isSubmitted && !showAnswer) {
      return selectedBox?.id === box.id ? '3px solid #3b82f6' : '2px solid rgba(59, 130, 246, 0.8)';
    }
    
    if (showAnswer || isSubmitted) {
      if (box.isCorrectAnswer) {
        return '3px solid #10b981'; // Green for correct
      } else if (selectedBox?.id === box.id && !box.isCorrectAnswer) {
        return '3px solid #ef4444'; // Red for incorrect selection
      } else {
        return '2px solid rgba(156, 163, 175, 0.6)'; // Gray for other boxes
      }
    }
    
    return '2px solid rgba(59, 130, 246, 0.8)';
  };

  const getBoxBackgroundColor = (box: BoundingBox): string => {
    if (!isSubmitted && !showAnswer) {
      return selectedBox?.id === box.id ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)';
    }
    
    if (showAnswer || isSubmitted) {
      if (box.isCorrectAnswer) {
        return 'rgba(16, 185, 129, 0.25)'; // Green background for correct
      } else if (selectedBox?.id === box.id && !box.isCorrectAnswer) {
        return 'rgba(239, 68, 68, 0.25)'; // Red background for incorrect selection
      } else {
        return 'rgba(156, 163, 175, 0.15)'; // Gray background for other boxes
      }
    }
    
    return 'rgba(59, 130, 246, 0.15)';
  };

  const getBoxIcon = (box: BoundingBox) => {
    if (!isSubmitted && !showAnswer) return null;
    
    if (box.isCorrectAnswer) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (selectedBox?.id === box.id && !box.isCorrectAnswer) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
    
    return null;
  };

  const renderBoxLabel = (box: BoundingBox) => {
    if (!showAnswer && !isSubmitted) return null;
    
    return (
      <div className="absolute -top-8 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
        {box.label}
        {getBoxIcon(box) && (
          <span className="ml-1 inline-flex">
            {getBoxIcon(box)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Compact Question Card */}
      <Card className="w-full max-w-4xl mx-auto shadow-2xl border-2 border-primary animate-pulse-border">
        <CardHeader className="pb-3 relative">
          <div className="absolute -top-3 -right-3 flex items-center gap-2">
            <div className="animate-pulse">
              <div className="h-3 w-3 bg-primary rounded-full" />
            </div>
            <Badge className="bg-primary text-primary-foreground">Answer to Continue</Badge>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-primary animate-pulse" />
            <Badge variant="outline" className="text-xs">Interactive Video Question</Badge>
          </div>
          <CardTitle className="text-xl font-bold">{question}</CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Answer State */}
          {(showAnswer || isSubmitted) && (
            <div className="p-3 bg-gray-50 rounded-lg mb-3">
              <div className="flex items-start gap-2">
                {selectedBox?.isCorrectAnswer ? (
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm mb-1">
                    {selectedBox?.isCorrectAnswer ? 'Correct!' : 'Incorrect'}
                    {selectedBox && ` - You selected: ${selectedBox.label}`}
                  </p>
                  <p className="text-xs text-gray-700">{explanation}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Instructions */}
          {!isSubmitted && !showAnswer && (
            <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-blue-600" />
                <span>Click on the highlighted areas in the video above</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overlay Container - Positioned exactly over video */}
      <div ref={overlayContainerRef} className="pointer-events-none">
        {/* Bounding Boxes - positioned absolutely within overlay container */}
        {isOverlayVisible && videoContainer && boundingBoxes.map((box) => (
          <div
            key={box.id}
            style={getBoundingBoxStyle(box)}
            onClick={() => handleBoxClick(box)}
            className="group"
            role="button"
            tabIndex={disabled || isSubmitted ? -1 : 0}
            aria-label={`Clickable area: ${box.label}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBoxClick(box);
              }
            }}
          >
            {/* Hover effect */}
            <div className="absolute inset-0 group-hover:bg-white group-hover:bg-opacity-20 transition-all duration-200" />
            
            {/* Box Label */}
            {renderBoxLabel(box)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoOverlayQuestion; 