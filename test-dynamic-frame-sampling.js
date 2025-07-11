#!/usr/bin/env node

/**
 * Test script for dynamic frame sampling in Quiz Generation v5.0
 * 
 * This script demonstrates how the frame sampling rate adjusts based on video duration
 * 
 * Usage: 
 *   node test-dynamic-frame-sampling.js [youtube-url]
 * 
 * Environment variables required:
 *   - YOUTUBE_API_KEY: Your YouTube Data API v3 key
 */

const https = require('https');

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Parse ISO 8601 duration to seconds
function parseISO8601Duration(duration) {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const match = duration.match(regex);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Calculate frame sampling rate based on duration
function calculateFrameSamplingRate(durationInSeconds) {
  const durationInMinutes = durationInSeconds / 60;
  let fps;
  
  if (durationInMinutes < 5) {
    fps = 1.0; // 1 fps for videos under 5 minutes
  } else if (durationInMinutes < 10) {
    fps = 0.5; // 0.5 fps for videos 5-10 minutes
  } else if (durationInMinutes < 20) {
    fps = 0.33; // ~0.33 fps (1 frame every 3 seconds) for videos 10-20 minutes
  } else if (durationInMinutes < 30) {
    fps = 0.25; // 0.25 fps (1 frame every 4 seconds) for videos 20-30 minutes
  } else if (durationInMinutes < 60) {
    fps = 0.2; // 0.2 fps (1 frame every 5 seconds) for videos 30-60 minutes
  } else {
    fps = 0.1; // 0.1 fps (1 frame every 10 seconds) for videos over 1 hour
  }
  
  return fps;
}

// Fetch video duration from YouTube API
async function getVideoDuration(videoId, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          
          if (!jsonData.items || jsonData.items.length === 0) {
            reject(new Error('Video not found'));
            return;
          }
          
          const duration = jsonData.items[0].contentDetails.duration;
          const durationInSeconds = parseISO8601Duration(duration);
          resolve(durationInSeconds);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

// Main function
async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    console.error('❌ Error: YOUTUBE_API_KEY environment variable not set');
    console.log('\nTo set it:');
    console.log('  export YOUTUBE_API_KEY=your_api_key');
    process.exit(1);
  }
  
  const youtubeUrl = process.argv[2];
  
  if (!youtubeUrl) {
    console.error('❌ Error: Please provide a YouTube URL as an argument');
    console.log('\nUsage:');
    console.log('  node test-dynamic-frame-sampling.js https://youtube.com/watch?v=VIDEO_ID');
    process.exit(1);
  }
  
  console.log('🎥 Testing Dynamic Frame Sampling for Quiz Generation v5.0\n');
  console.log(`📺 URL: ${youtubeUrl}`);
  
  const videoId = extractVideoId(youtubeUrl);
  
  if (!videoId) {
    console.error('❌ Error: Could not extract video ID from URL');
    process.exit(1);
  }
  
  console.log(`🔍 Video ID: ${videoId}`);
  console.log(`🔑 Using API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
  
  try {
    console.log('\n⏳ Fetching video duration from YouTube API...');
    const durationInSeconds = await getVideoDuration(videoId, apiKey);
    const durationInMinutes = durationInSeconds / 60;
    
    console.log(`\n✅ Video Duration: ${Math.floor(durationInMinutes)}m ${Math.round((durationInMinutes % 1) * 60)}s (${durationInSeconds}s total)`);
    
    const fps = calculateFrameSamplingRate(durationInSeconds);
    const framesPerMinute = fps * 60;
    const totalFrames = Math.round(fps * durationInSeconds);
    
    console.log(`\n📊 Calculated Frame Sampling Rate: ${fps} fps`);
    console.log(`   • Frames per minute: ${framesPerMinute}`);
    console.log(`   • Total frames to process: ~${totalFrames}`);
    console.log(`   • Frame interval: 1 frame every ${Math.round(1/fps)} seconds`);
    
    // Estimate token usage
    const tokensPerFrame = 258; // Default resolution
    const audioTokensPerSecond = 32;
    const estimatedTokens = (totalFrames * tokensPerFrame) + (durationInSeconds * audioTokensPerSecond);
    
    console.log(`\n💡 Estimated Token Usage:`);
    console.log(`   • Video frames: ~${totalFrames * tokensPerFrame} tokens`);
    console.log(`   • Audio: ~${durationInSeconds * audioTokensPerSecond} tokens`);
    console.log(`   • Total: ~${estimatedTokens} tokens`);
    
    // Compare with default 1 fps
    const defaultTotalFrames = durationInSeconds;
    const defaultTokens = (defaultTotalFrames * tokensPerFrame) + (durationInSeconds * audioTokensPerSecond);
    const tokenSavings = defaultTokens - estimatedTokens;
    const savingsPercentage = (tokenSavings / defaultTokens * 100).toFixed(1);
    
    if (fps < 1.0) {
      console.log(`\n💰 Token Savings vs Default (1 fps):`);
      console.log(`   • Default tokens: ~${defaultTokens}`);
      console.log(`   • Optimized tokens: ~${estimatedTokens}`);
      console.log(`   • Savings: ~${tokenSavings} tokens (${savingsPercentage}%)`);
    }
    
    console.log('\n✨ This frame sampling rate will be automatically applied in the Quiz Generation v5.0 pipeline!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.message.includes('Video not found')) {
      console.log('\n💡 Tip: Make sure the video exists and is publicly accessible');
    }
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 