import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Clock, Eye, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptSegment {
  transcript_id: string;
  course_id: string;
  video_url: string;
  timestamp: string;
  end_timestamp: string;
  text: string;
  visual_description?: string;
  is_salient_event?: string;
  event_type?: string;
}

interface TranscriptDisplayProps {
  courseId: string;
  currentTime: number;
  onSeek?: (time: number) => void;
  formatTimestamp: (seconds: number) => string;
  className?: string;
}

export default function TranscriptDisplay({
  courseId,
  currentTime,
  onSeek,
  formatTimestamp,
  className
}: TranscriptDisplayProps) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTranscript();
  }, [courseId]);

  useEffect(() => {
    if (segments.length > 0) {
      const previousIndex = currentSegmentIndex;
      findCurrentSegment();
      
      // Trigger transition effect when segment changes
      if (previousIndex !== currentSegmentIndex && currentSegmentIndex !== -1) {
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 300);
      }
    }
  }, [currentTime, segments]);

  const fetchTranscript = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/course/${courseId}/transcript`);
      const data = await response.json();

      if (data.success) {
        // Sort segments by timestamp to ensure proper order
        const sortedSegments = data.segments.sort((a: TranscriptSegment, b: TranscriptSegment) => 
          parseFloat(a.timestamp) - parseFloat(b.timestamp)
        );
        setSegments(sortedSegments);
        console.log('📄 Transcript loaded:', sortedSegments.length, 'segments');
      } else {
        setError(data.error || 'Failed to load transcript');
      }
    } catch (err) {
      console.error('Error fetching transcript:', err);
      setError('Failed to load transcript');
    } finally {
      setIsLoading(false);
    }
  };

  const findCurrentSegment = () => {
    const index = segments.findIndex(segment => {
      const startTime = parseFloat(segment.timestamp);
      const endTime = parseFloat(segment.end_timestamp);
      return currentTime >= startTime && currentTime < endTime;
    });

    if (index !== -1) {
      setCurrentSegmentIndex(index);
    } else {
      // If no exact match, find the closest previous segment
      const closestIndex = segments.findIndex((segment, i) => {
        const startTime = parseFloat(segment.timestamp);
        const nextSegment = segments[i + 1];
        const nextStartTime = nextSegment ? parseFloat(nextSegment.timestamp) : Infinity;
        
        return currentTime >= startTime && currentTime < nextStartTime;
      });
      
      setCurrentSegmentIndex(closestIndex);
    }
  };

  const handleSegmentClick = (timestamp: string) => {
    // Validate onSeek is available and player is ready
    if (onSeek && typeof onSeek === 'function') {
      const time = parseFloat(timestamp);
      console.log('📍 Seeking to timestamp:', time);
      onSeek(time);
    } else {
      console.warn('⚠️ Seek functionality not available - player may not be ready');
    }
  };

  const getVisibleSegments = () => {
    if (currentSegmentIndex === -1 || segments.length === 0) {
      return [];
    }

    // Get a range of segments around the current one
    const visibleRange = 2; // Show 2 segments before and after
    const startIdx = Math.max(0, currentSegmentIndex - visibleRange);
    const endIdx = Math.min(segments.length - 1, currentSegmentIndex + visibleRange);
    
    const visibleSegments = [];
    for (let i = startIdx; i <= endIdx; i++) {
      visibleSegments.push({
        segment: segments[i],
        index: i,
        relativePosition: i - currentSegmentIndex
      });
    }
    
    return visibleSegments;
  };

  const renderSegment = (
    segment: TranscriptSegment, 
    index: number, 
    relativePosition: number
  ) => {
    const startTime = parseFloat(segment.timestamp);
    const isCurrent = relativePosition === 0;
    const isSalient = segment.is_salient_event === 'true';
    
    // Calculate opacity and scale based on distance from current
    const distance = Math.abs(relativePosition);
    const opacity = isCurrent ? 1 : Math.max(0.3, 1 - (distance * 0.3));
    const scale = isCurrent ? 1 : Math.max(0.85, 1 - (distance * 0.075));
    const blur = isCurrent ? 0 : distance * 0.5;
    
    return (
      <div
        key={`${segment.transcript_id}-${segment.timestamp}`}
        className={cn(
          "absolute w-full px-2 transition-all duration-300 ease-out",
          onSeek ? "cursor-pointer" : "cursor-wait",
          isTransitioning && "duration-500",
        )}
        style={{
          opacity,
          transform: `translateY(${relativePosition * 90}px) scale(${scale})`,
          filter: `blur(${blur}px)`,
          zIndex: 10 - distance,
        }}
        onClick={() => handleSegmentClick(segment.timestamp)}
        title={onSeek ? "Click to jump to this timestamp" : "Video player is loading..."}
      >
        <div className={cn(
          "p-4 rounded-xl border-2 transition-all duration-300",
          "bg-gradient-to-b",
          isCurrent 
            ? "from-background to-background/95 border-primary shadow-lg shadow-primary/20" 
            : "from-muted/30 to-muted/10 border-border/50 hover:border-border",
        )}>
          <div className="flex items-center justify-between mb-2">
            <Badge 
              variant={isCurrent ? "default" : "outline"}
              className={cn(
                "text-xs transition-all",
                isCurrent && "scale-110"
              )}
            >
              <Clock className="h-3 w-3 mr-1" />
              {formatTimestamp(startTime)}
            </Badge>
            {isSalient && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {segment.event_type || 'Event'}
              </Badge>
            )}
          </div>
          
          <p className={cn(
            "text-sm leading-relaxed transition-all",
            isCurrent 
              ? "text-foreground font-medium" 
              : "text-muted-foreground"
          )}>
            {segment.text}
          </p>
          
          {segment.visual_description && (
            <p className={cn(
              "text-xs mt-2 italic transition-all",
              isCurrent ? "text-muted-foreground" : "text-muted-foreground/70"
            )}>
              📹 {segment.visual_description}
            </p>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-semibold">Transcript</span>
            <span className="text-muted-foreground">– Loading transcript...</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-semibold">Transcript</span>
            <span className="text-muted-foreground">– Not available</span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (segments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            <span className="font-semibold">Transcript</span>
            <span className="text-muted-foreground">– No transcript available</span>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Transcript data not found</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleSegments = getVisibleSegments();

  return (
    <Card id="transcript-display" className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" />
          <span className="font-semibold">Transcript</span>
          <span className="text-muted-foreground">– Click on any segment to jump to that time</span>
        </div>
      </CardHeader>
      <CardContent className="relative px-4 pb-6 pt-2">
        {/* Warning when seek is not available */}
        {!onSeek && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Video player is loading. Seek functionality will be available shortly.</span>
            </div>
          </div>
        )}
        
        {/* Slot machine container */}
        <div 
          ref={containerRef}
          className="relative h-[400px] overflow-hidden"
        >
          {/* Gradient overlays for fade effect */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />
          
          {/* Centered highlight line */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-primary/20 z-0" />
          
          {/* Transcript segments carousel */}
          <div className="relative h-full flex flex-col items-center justify-center">
            {visibleSegments.length > 0 ? (
              visibleSegments.map(({ segment, index, relativePosition }) => 
                renderSegment(segment, index, relativePosition)
              )
            ) : (
              <div className="text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transcript segment for current time</p>
              </div>
            )}
          </div>
          
        </div>
        
        {/* Navigation hint */}
        {segments.length > 0 && currentSegmentIndex !== -1 && (
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Segment {currentSegmentIndex + 1} of {segments.length}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 