import { useState, useEffect, useRef, useCallback } from 'react';
import { YTPlayer } from '@/types/course';
import { getPlayerStateName, extractVideoId } from '@/utils/courseHelpers';
import { useAnalytics } from '@/hooks/useAnalytics';

interface UseYouTubePlayerProps {
  courseId: string | undefined;
  youtubeUrl: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayerStateChange: (state: number) => void;
  onVideoEnd: () => void;
}

interface UseYouTubePlayerResult {
  player: YTPlayer | null;
  playerRef: React.MutableRefObject<YTPlayer | null>;
  isVideoReady: boolean;
  isYTApiLoaded: boolean;
  videoId: string;
  currentTime: number;
  duration: number;
  startTimeTracking: () => void;
  stopTimeTracking: () => void;
}

export function useYouTubePlayer({
  courseId,
  youtubeUrl,
  onTimeUpdate,
  onDurationChange,
  onPlayerStateChange,
  onVideoEnd
}: UseYouTubePlayerProps): UseYouTubePlayerResult {
  const [player, setPlayer] = useState<YTPlayer | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isYTApiLoaded, setIsYTApiLoaded] = useState(false);
  const [videoId, setVideoId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add refs to store the latest time values independently of state
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  
  const { trackEngagement } = useAnalytics();

  // Extract video ID when URL changes
  useEffect(() => {
    if (youtubeUrl) {
      const extractedVideoId = extractVideoId(youtubeUrl);
      console.log('🎬 Video ID extracted:', extractedVideoId);
      setVideoId(extractedVideoId);
    }
  }, [youtubeUrl]);

  // Load YouTube API
  useEffect(() => {
    console.log('🔍 Checking YouTube API availability...');
    
    // Check if YT API is already loaded
    if (window.YT && window.YT.Player) {
      console.log('✅ YouTube API already loaded');
      setIsYTApiLoaded(true);
      return;
    }

    // Load YouTube iframe API if not already loaded
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      console.log('📥 Loading YouTube iframe API...');
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    } else {
      console.log('🔄 YouTube API script already exists');
    }

    // Set up the callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      console.log('✅ YouTube API loaded and ready');
      setIsYTApiLoaded(true);
    };

    // Fallback timeout in case API fails to load
    const timeout = setTimeout(() => {
      if (!isYTApiLoaded) {
        console.warn('⏰ YouTube API timeout - attempting fallback');
        // Check one more time if the API is actually available
        if (window.YT && window.YT.Player) {
          console.log('✅ YouTube API available after timeout check');
          setIsYTApiLoaded(true);
        } else {
          console.error('❌ YouTube API failed to load within timeout');
        }
      }
    }, 10000); // 10 second timeout

    return () => {
      clearTimeout(timeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isYTApiLoaded]);

  const startTimeTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    let errorCount = 0;
    
    intervalRef.current = setInterval(() => {
      if (playerRef.current) {
        try {
          const time = playerRef.current.getCurrentTime();
          const totalDuration = playerRef.current.getDuration();
          
          // Update refs immediately
          currentTimeRef.current = time;
          durationRef.current = totalDuration;
          
          // Update state (might be delayed by re-renders)
          setCurrentTime(time);
          setDuration(totalDuration);
          
          // Call callbacks with latest values
          onTimeUpdate(time);
          onDurationChange(totalDuration);
          
          // Reset error count on success
          errorCount = 0;
        } catch (error) {
          // Player might be in an invalid state during re-renders
          errorCount++;
          console.warn(`Error updating time (attempt ${errorCount}):`, error);
          
          // If we get too many errors, try to recover by restarting
          if (errorCount > 10) {
            console.log('🔄 Too many errors, attempting to restart time tracking...');
            // Clear interval directly instead of using stopTimeTracking
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setTimeout(() => {
              if (playerRef.current) {
                startTimeTracking();
              }
            }, 500);
          }
        }
      }
    }, 100); // Check every 100ms for smooth question timing
  }, [onTimeUpdate, onDurationChange]);

  const stopTimeTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const initializePlayer = useCallback((retryCount = 0) => {
    console.log(`🎯 initializePlayer called (attempt ${retryCount + 1})`, {
      hasYT: !!window.YT,
      hasPlayer: !!(window.YT && window.YT.Player),
      videoId: videoId,
      domReady: document.readyState,
      elementExists: !!document.getElementById('youtube-player')
    });

    if (!window.YT || !window.YT.Player || !videoId) {
      console.warn('⚠️ YouTube API not ready or no video ID:', {
        hasYT: !!window.YT,
        hasPlayer: !!(window.YT && window.YT.Player),
        videoId: videoId
      });
      return;
    }

    // Check if the target element exists
    const targetElement = document.getElementById('youtube-player');
    if (!targetElement) {
      console.warn(`⚠️ YouTube player target element not found (attempt ${retryCount + 1})`);
      
      // Retry up to 5 times with increasing delays
      if (retryCount < 5) {
        setTimeout(() => {
          initializePlayer(retryCount + 1);
        }, 200 * (retryCount + 1)); // 200ms, 400ms, 600ms, 800ms, 1000ms
        return;
      } else {
        console.error('❌ YouTube player target element not found after 5 attempts');
        return;
      }
    }

    try {
      console.log('🚀 Initializing YouTube player for video:', videoId);

      const newPlayer = new window.YT.Player('youtube-player', {
        videoId: videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 0,
          enablejsapi: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            console.log('✅ YouTube player ready');
            setPlayer(event.target);
            playerRef.current = event.target;
            setIsVideoReady(true);
            
            // Initialize time refs with current values
            try {
              const initialDuration = event.target.getDuration();
              durationRef.current = initialDuration;
              setDuration(initialDuration);
              onDurationChange(initialDuration);
            } catch (error) {
              console.warn('Could not get initial duration:', error);
            }
            
            startTimeTracking();
          },
          onStateChange: async (event: any) => {
            console.log('🎬 Player state changed:', {
              stateCode: event.data,
              stateName: getPlayerStateName(event.data)
            });
            
            onPlayerStateChange(event.data);
            
            if (event.data === window.YT.PlayerState.PLAYING) {
              startTimeTracking();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              stopTimeTracking();
              // Track pause engagement with error handling
              if (courseId) {
                try {
                  trackEngagement(courseId, { type: 'video_paused' });
                } catch (error) {
                  console.warn('Failed to track pause engagement:', error);
                }
              }
            } else if (event.data === window.YT.PlayerState.ENDED || event.data === 0) {
              console.log('🏁 Video ended - stopping time tracking');
              stopTimeTracking();
              onVideoEnd();
            }
          },
          onError: (event: any) => {
            console.error('❌ YouTube player error:', event.data);
            const errorMessages = {
              2: 'Invalid video ID',
              5: 'HTML5 player error',
              100: 'Video not found or private',
              101: 'Video not allowed to be embedded',
              150: 'Video not allowed to be embedded'
            };
            const errorMessage = errorMessages[event.data as keyof typeof errorMessages] || 'Unknown video error';
            console.error(`Video error: ${errorMessage}`);
          }
        },
      });
    } catch (error) {
      console.error('❌ Error initializing YouTube player:', error);
    }
  }, [videoId, courseId, startTimeTracking, stopTimeTracking, trackEngagement, onPlayerStateChange, onVideoEnd]);

  // Initialize YouTube player when API is ready and video ID is available
  useEffect(() => {
    console.log('🎬 YouTube Player useEffect triggered:', {
      videoId: videoId,
      isYTApiLoaded: isYTApiLoaded,
      hasWindowYT: !!(window.YT && window.YT.Player),
      hasPlayer: !!player
    });
    
    // Initialize player when all conditions are met
    if (videoId && isYTApiLoaded && window.YT && window.YT.Player) {
      // If we already have a player but no DOM element, reset it
      if (player && !document.getElementById('youtube-player')) {
        console.log('🔄 Player exists but DOM element missing - resetting');
        setPlayer(null);
        playerRef.current = null;
        return;
      }
      
      // Only initialize if we don't have a player
      if (!player) {
        console.log('🚀 Attempting to initialize player...');
        // Add small delay to ensure DOM is ready
        const timer = setTimeout(() => {
          initializePlayer();
        }, 200); // Increased delay for better DOM readiness
        
        return () => clearTimeout(timer);
      }
    }
  }, [videoId, isYTApiLoaded, player, initializePlayer]);

  return {
    player,
    playerRef,
    isVideoReady,
    isYTApiLoaded,
    videoId,
    currentTime: currentTimeRef.current || currentTime, // Prefer ref value
    duration: durationRef.current || duration, // Prefer ref value
    startTimeTracking,
    stopTimeTracking
  };
} 