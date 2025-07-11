# Segmented Video Processing Implementation Summary

## Overview
This implementation enables processing of long videos (10+ minutes) by splitting them into segments to avoid Supabase Edge Function's 150-second timeout limit. Each segment is processed sequentially with context continuity maintained throughout.

## Key Features

### 1. **Automatic Video Segmentation**
- Videos longer than 10 minutes are automatically split into segments
- Default segment duration: 10 minutes (configurable)
- Uses YouTube API to determine video duration
- Falls back to segmented processing if duration can't be determined

### 2. **Context Continuity Between Segments**
- Each segment receives context from previous segments:
  - Last 2 minutes of transcript
  - All previously introduced key concepts
  - Summary of previous questions
- Ensures educational coherence across segment boundaries

### 3. **Unified Data Storage**

#### **Transcripts**
- Single `video_transcripts` entry per video
- First segment creates the entry
- Subsequent segments update and merge their content
- Final result: One complete transcript with all segments merged

#### **Questions**
- All questions stored in single `questions` table
- Each question tagged with `segment_id` and `segment_index`
- Users see all questions seamlessly during playback
- No indication to users that video was processed in segments

### 4. **Real-time Progress Updates**
- Frontend shows live updates as segments process
- Displays:
  - Segment processing status
  - Growing list of generated questions
  - Transcript generation progress
  - Overall completion percentage

## Technical Implementation

### Database Schema

```sql
-- course_segments table
- Tracks individual segments
- Stores processing status and context
- Links to course and questions

-- video_transcripts table
- Single entry per video
- Progressively updated as segments complete
- Contains merged transcript from all segments

-- questions table
- segment_id and segment_index columns
- All questions for course stored together
```

### Processing Flow

1. **Initialization** (`init-segmented-processing`)
   - Determines if video needs segmentation
   - Creates segment records
   - Triggers first segment processing

2. **Segment Processing** (`process-video-segment`)
   - Processes one segment at a time
   - Uses Gemini's videoMetadata with startOffset/endOffset
     - Adds 5-second buffer to endOffset to avoid mid-sentence cutoffs
     - Filters transcript back to actual segment boundaries after generation
   - Generates transcript and questions
   - Updates unified transcript
   - Passes context to next segment
   - Automatically triggers next segment

3. **Context Management** (`segment-context.ts`)
   - Extracts relevant context from completed segments
   - Generates context-aware prompts
   - Maintains educational continuity

4. **Transcript Management** (`transcript-manager.ts`)
   - Creates/updates single transcript entry
   - Merges segment transcripts
   - Tracks processing progress

### Frontend Integration

#### Progress Tracking Component
- Real-time subscriptions to:
  - Segment status updates
  - New questions being added
  - Transcript updates
- Shows live progress for each segment
- Displays cumulative results

#### Course Viewing
- Fetches all questions regardless of segment
- Seamless playback experience
- No user-facing indication of segmentation

## API Endpoints

### `/api/course/analyze-video-smart`
- Intelligently routes between regular and segmented processing
- Determines optimal processing method based on video duration

### Edge Functions

1. **`init-segmented-processing`**
   - Creates segment records
   - Initiates processing chain

2. **`process-video-segment`**
   - Processes individual segments
   - Maintains context between segments
   - Triggers next segment automatically

## Benefits

1. **Scalability**: Can process videos of any length
2. **Reliability**: Avoids timeout issues
3. **User Experience**: 
   - Can start watching while later segments process
   - See questions appear in real-time
   - No difference in viewing experience
4. **Data Integrity**: 
   - Single source of truth for transcripts
   - All questions properly associated with course
   - Context maintained throughout processing

## Configuration

### Environment Variables
- `YOUTUBE_API_KEY`: For fetching video duration
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: For server-side operations
- `GEMINI_API_KEY`: For video analysis

### Adjustable Parameters
- `segment_duration`: Length of each segment (default: 600 seconds)
- `max_questions_per_segment`: Questions per segment (default: 10)
- Frame sampling rate: 300 frames per video (constant)

## Usage Example

```javascript
// Frontend - Start segmented processing
const response = await fetch('/api/course/analyze-video-smart', {
  method: 'POST',
  body: JSON.stringify({
    course_id: courseId,
    youtube_url: youtubeUrl,
    session_id: sessionId,
    max_questions: 10,
    segment_duration: 600 // 10 minutes
  })
});
```

## Error Handling

- Failed segments can be retried
- Processing continues even if one segment fails
- Graceful degradation if YouTube API unavailable
- Context preserved across retries

## Future Enhancements

1. **Parallel Processing**: Process multiple segments simultaneously
2. **Dynamic Segmentation**: Adjust segment boundaries based on content
3. **Resume Capability**: Resume processing from last completed segment
4. **Segment Preview**: Allow users to preview completed segments immediately 