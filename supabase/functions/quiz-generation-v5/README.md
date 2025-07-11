# Quiz Generation Pipeline v5.0

## Overview

Quiz Generation Pipeline v5.0 is an enhanced version of v4.0 that adds **full video transcript generation** during the planning stage. This allows for more context-aware question generation and provides a complete transcript that can be stored and used for various purposes.

## What's New in v5.0

### 1. Full Video Transcription
- **Phase 1 of Planning**: Now generates a complete transcript with timestamps
- **Visual Descriptions**: Includes descriptions of what's shown on screen
- **Salient Event Markers**: Marks important transitions and concept introductions
- **Key Concepts Timeline**: Tracks when concepts are introduced and explained

### 2. Transcript Storage
- **New Database Table**: `video_transcripts` table stores complete transcripts
- **JSONB Storage**: Efficient storage and searchable transcript segments
- **Helper Views**: Easy access to transcript segments and key concepts
- **Non-Breaking**: If transcript saving fails, pipeline continues normally

### 3. Enhanced Question Planning
- **Transcript-Based**: Questions now reference specific transcript segments
- **Better Context**: Questions have direct access to transcript content
- **Improved Validation**: Questions validated against actual transcript data

## Deployment

To deploy this function without overwriting v4:

```bash
cd supabase
npx supabase functions deploy quiz-generation-v5 --project-ref YOUR_PROJECT_ID
```

## Database Migration

Run the transcript table migration:

```bash
npx supabase db push --project-ref YOUR_PROJECT_ID
```

This creates the `video_transcripts` table and related views.

## API Usage

The API remains the same as v4, but now includes transcript generation:

```bash
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/quiz-generation-v5' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "course_id": "your-course-id",
    "youtube_url": "https://youtube.com/watch?v=...",
    "max_questions": 4,
    "enable_quality_verification": false
  }'
```

## Key Differences from v4

1. **Extended Processing Time**: Initial processing takes slightly longer due to transcript generation
2. **Increased Token Usage**: More Gemini API tokens used for transcription
3. **Storage Requirements**: Additional database storage for transcripts
4. **Enhanced Accuracy**: Questions are more accurately aligned with video content

## Benefits

- **Complete Content Record**: Full transcript stored for future reference
- **Searchable Content**: JSONB storage enables efficient transcript search
- **Accessibility**: Transcript can be used for closed captions
- **Content Analysis**: Enables deeper analysis of course content
- **Question Improvement**: Better question-to-content alignment

## Configuration

The function uses the same environment variables as v4:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY` 
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` 

### New in v5.0:
- `YOUTUBE_API_KEY` (Optional): Enables dynamic frame sampling based on video duration
  - If not provided, defaults to 1 fps sampling rate
  - Get your API key from [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Enable YouTube Data API v3 in your Google Cloud project

## Dynamic Frame Sampling (New Feature)

v5.0 introduces intelligent frame sampling that processes exactly 300 frames per video:

- **Constant Frame Count**: Every video is sampled to extract exactly 300 frames
- **Adaptive FPS**: Frame rate automatically adjusts based on video duration
- **Consistent Processing**: Same analysis depth regardless of video length

| Video Duration | Frame Sampling Rate | Frame Interval |
|----------------|-------------------|----------------|
| 5 minutes      | 1.0 fps          | Every second |
| 10 minutes     | 0.5 fps          | Every 2 seconds |
| 30 minutes     | 0.167 fps        | Every 6 seconds |
| 60 minutes     | 0.083 fps        | Every 12 seconds |
| 2 hours        | 0.042 fps        | Every 24 seconds |

This optimization:
- **Consistent Analysis**: All videos get the same level of visual analysis (300 frames)
- **Predictable Costs**: Token usage scales linearly with audio duration only
- **Optimal Coverage**: 300 frames provides good coverage for educational content
- **Automatic Fallback**: Works without YouTube API using default 1 fps

To enable dynamic frame sampling:
```bash
# Set the YouTube API key in Supabase Edge Functions
npx supabase secrets set YOUTUBE_API_KEY=your_youtube_api_key --project-ref YOUR_PROJECT_ID
``` 