# Live Question Generation Fix for Multi-Segment Videos

## Problem Statement

Live question generation updates were working correctly for single-segment videos (< 5 minutes) but not for multi-segment videos (> 5 minutes). Questions would only appear after the entire segment was marked as complete, preventing real-time updates.

## Root Cause

The issue was in the `fetchSegmentQuestions` function which had a hardcoded filter `completed_only=true`. This meant:
- Only questions from completed segments were fetched
- Real-time INSERT events were received but the UI wouldn't show them
- Users had to wait for entire segments to complete before seeing any questions

## Solution

### 1. API Enhancement
Modified `/api/course/[id]/segment-questions.ts` to support fetching incomplete segments:
```typescript
const includeIncomplete = req.query.include_incomplete === 'true';
```

### 2. Data Fetching Updates
Updated `useCourseData` hook to:
- Accept an `includeIncomplete` parameter in `fetchSegmentQuestions`
- Fetch incomplete segments when course is processing

### 3. Real-Time Updates
Modified `useRealTimeUpdates` hook to:
- Call `fetchSegmentQuestions(true)` for multi-segment videos
- Include questions from all segments, not just completed ones

### 4. UI Enhancements
Enhanced the UI to differentiate questions from incomplete segments:
- **ProcessingIndicator**: Shows real-time progress with segment badges
- **CourseCurriculumCard**: Displays questions from incomplete segments with:
  - Blue background color
  - "Processing" badge
  - Spinning loader icon

## Visual Flow

### Before Fix
```
Segment Processing → Questions Generated → Wait for Completion → Questions Visible
```

### After Fix
```
Segment Processing → Questions Generated → Immediately Visible (with Processing indicator)
```

## Benefits

1. **Better User Experience**: Users see questions appearing in real-time
2. **Transparency**: Clear visual indicators show which segments are still processing
3. **Engagement**: Users can start answering questions before all segments complete
4. **Progress Tracking**: Detailed breakdown of question generation per segment

## Implementation Details

### Key Changes

1. **API Parameter**: `include_incomplete=true` to fetch all questions
2. **Type Updates**: Added `isComplete` property to Segment interface
3. **Visual Indicators**: 
   - Spinning loader for questions being processed
   - Segment badges showing question counts
   - Real-time update notifications

### Files Modified

- `/src/pages/api/course/[id]/segment-questions.ts`
- `/src/hooks/useCourseData.ts`
- `/src/hooks/useRealTimeUpdates.ts`
- `/src/components/ProcessingIndicator.tsx`
- `/src/components/CourseCurriculumCard.tsx`
- `/src/types/course.ts`
- `/src/pages/course/[id].tsx`

## Testing

To test the implementation:

1. Create a course with a video > 5 minutes
2. Observe questions appearing in real-time as segments process
3. Verify visual indicators show processing status
4. Confirm questions are interactive even from incomplete segments

## Future Enhancements

1. Add percentage complete for individual segments
2. Show estimated time remaining per segment
3. Allow filtering to show only completed segment questions
4. Add animations for new questions appearing 