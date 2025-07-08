// YouTube API utility functions
export const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }

    // Set up the callback for when API loads
    const originalCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (originalCallback) {
        originalCallback();
      }
      resolve();
    };

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      return; // Script is already loading
    }

    // Load the API script
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load YouTube API'));
    document.body.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      reject(new Error('YouTube API load timeout'));
    }, 10000);
  });
};

export const extractVideoId = (url: string): string => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return '';
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}; 