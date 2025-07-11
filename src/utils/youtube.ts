/**
 * YouTube utility functions
 */

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
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
  
  return null;
}

/**
 * Fetch video metadata from YouTube using oEmbed API
 * This doesn't require an API key
 */
export async function fetchYouTubeMetadata(url: string): Promise<{
  title: string;
  author_name: string;
  thumbnail_url: string;
} | null> {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      console.error('Failed to fetch YouTube metadata:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}

/**
 * Generate a fallback title from video ID
 */
export function generateFallbackTitle(url: string): string {
  const videoId = extractVideoId(url);
  return videoId ? `YouTube Video (${videoId})` : 'YouTube Video';
}