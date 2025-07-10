import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchTranscript();
  }, [courseId]);

  useEffect(() => {
    if (segments.length > 0) {
      findCurrentSegment();
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
    const time = parseFloat(timestamp);
    if (onSeek) {
      onSeek(time);
    }
  };

  const getDisplaySegments = () => {
    if (currentSegmentIndex === -1 || segments.length === 0) {
      return {
        previous: null,
        current: null,
        next: null
      };
    }

    return {
      previous: currentSegmentIndex > 0 ? segments[currentSegmentIndex - 1] : null,
      current: segments[currentSegmentIndex],
      next: currentSegmentIndex < segments.length - 1 ? segments[currentSegmentIndex + 1] : null
    };
  };

  const renderSegment = (segment: TranscriptSegment | null, type: 'previous' | 'current' | 'next') => {
    if (!segment) return null;

    const startTime = parseFloat(segment.timestamp);
    const endTime = parseFloat(segment.end_timestamp);
    const isCurrent = type === 'current';
    const isSalient = segment.is_salient_event === 'true';

    return (
      <div
        key={`${segment.transcript_id}-${segment.timestamp}`}
        className={cn(
          "p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:bg-muted/50",
          isCurrent 
            ? "bg-primary/10 border-primary shadow-sm" 
            : "bg-background border-border",
          type === 'previous' && "opacity-70",
          type === 'next' && "opacity-70"
        )}
        onClick={() => handleSegmentClick(segment.timestamp)}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isCurrent ? "default" : "secondary"}
              className="text-xs"
            >
              {formatTimestamp(startTime)}
            </Badge>
            {isSalient && (
              <Badge variant="outline" className="text-xs">
                <Eye className="h-3 w-3 mr-1" />
                {segment.event_type || 'Event'}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {type === 'previous' && '← Previous'}
            {type === 'current' && '● Current'}
            {type === 'next' && '→ Next'}
          </div>
        </div>
        
        <p className={cn(
          "text-sm leading-relaxed",
          isCurrent ? "font-medium" : "text-muted-foreground"
        )}>
          {segment.text}
        </p>
        
        {segment.visual_description && (
          <p className="text-xs text-muted-foreground mt-2 italic">
            📹 {segment.visual_description}
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript
          </CardTitle>
          <CardDescription>
            Loading transcript...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript
          </CardTitle>
          <CardDescription>
            Transcript not available
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transcript
          </CardTitle>
          <CardDescription>
            No transcript available for this course
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Transcript data not found</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displaySegments = getDisplaySegments();

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Transcript
        </CardTitle>
        <CardDescription>
          Click on any segment to jump to that time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {displaySegments.previous && renderSegment(displaySegments.previous, 'previous')}
        {displaySegments.current && renderSegment(displaySegments.current, 'current')}
        {displaySegments.next && renderSegment(displaySegments.next, 'next')}
        
        {!displaySegments.current && (
          <div className="text-center text-muted-foreground py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No transcript segment for current time</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 