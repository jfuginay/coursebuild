# Segmented Processing Update: 5 Questions Per Segment

## Changes Made

### 1. **Reduced Questions Per Segment from 10 to 5**
For videos that require segmentation (longer than 5 minutes), each segment will now generate a maximum of 5 questions instead of 10.

### Updated Files:
- `supabase/functions/init-segmented-processing/index.ts` - Changed `max_questions_per_segment` default from 10 to 5
- `supabase/functions/process-video-segment/index.ts` - Changed `max_questions` default from 10 to 5
- `src/pages/api/course/analyze-video-smart.ts` - Changed `max_questions` default from 10 to 5

### 2. **Improved Logging**
Added logging to display the max questions per segment in the console output:
```
🎬 Processing segment 1/3 for course xyz
   📹 Time range: 0s - 300s
   🎯 Max questions per segment: 5
   🔗 Has previous context: false
```

## Benefits

1. **Faster Processing**: Each segment processes faster with fewer questions
2. **Better Distribution**: Questions are more evenly distributed across the video
3. **Reduced Timeout Risk**: Lower chance of hitting the 150-second function timeout
4. **Focused Content**: 5 questions per 5-minute segment provides good coverage without overwhelming learners

## Impact

For a 15-minute video split into 3 segments:
- **Before**: Up to 30 questions total (10 per segment)
- **After**: Up to 15 questions total (5 per segment)

This provides a more reasonable question density of approximately 1 question per minute of video content.

## Technical Details

The segmentation logic remains unchanged:
- Videos longer than 5 minutes are split into segments
- Each segment is processed independently with context passing
- Transcripts are merged across segments
- Questions are stored with segment references

The only change is the maximum number of questions generated per segment. 

## Recent Improvements

### 1. Smart Last Segment Handling (December 2024)
When creating video segments, if the last segment is less than 20 seconds:
- It's automatically merged with the previous segment
- Prevents tiny segments that might not have enough content
- Ensures better question distribution

**Implementation**: `supabase/functions/init-segmented-processing/index.ts`

### 2. Empty Transcript Handling (December 2024)
Segments with no transcript content are handled gracefully:
- Question generation is skipped entirely
- Segment is marked as completed with 0 questions
- Processing continues to the next segment
- Useful for intro/outro music or silent sections

**Implementation**: `supabase/functions/process-video-segment/index.ts`

### 3. 5-Second Buffer (Already Implemented)
To avoid cutting off transcripts mid-sentence:
- Each segment (except the last) includes a 5-second buffer in the `endOffset`
- Gemini processes the extended segment
- Transcript is filtered back to actual boundaries after generation
- Ensures complete sentences and thoughts are captured

**Implementation**: `supabase/functions/quiz-generation-v5/stages/planning.ts`

## Segmentation Rules Summary

1. **Segment Duration**: Default 5 minutes (300 seconds)
2. **Last Segment Rule**: If < 20 seconds, merge with previous
3. **Questions per Segment**: 1 per minute of content (max 5)
4. **Empty Segments**: Skip question generation, mark complete
5. **Buffer**: 5-second buffer for all segments except the last
6. **Timeout Recovery**: Automatic retry after 3 minutes if stuck 