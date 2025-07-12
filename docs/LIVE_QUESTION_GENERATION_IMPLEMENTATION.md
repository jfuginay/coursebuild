# Live Question Generation Implementation

## Overview

This implementation enables real-time question generation and display, allowing users to see questions appear individually as they are generated rather than waiting for entire segments to complete.

## Architecture Overview

### Pipeline Flow
1. **Video Analysis** → Determine if segmentation needed
2. **Segment Creation** → Split video into segments OR create single segment
3. **Parallel Planning** → Plan questions for all segments
4. **Individual Generation** → Generate each question separately
5. **Real-time Updates** → Push questions to UI as they complete

### Single-Segment Videos
As of the latest update, ALL videos now use the live question generation pipeline:
- **Short videos** (< 5 minutes) are processed as a single segment
- Questions are still generated individually and appear live
- Users see the same progressive loading experience
- This ensures consistency across all video lengths

Previously, single-segment videos used the old synchronous pipeline. Now they benefit from:
- Live question appearance as each is generated
- Better error recovery (individual questions can retry)
- Consistent user experience regardless of video length

## Architecture Changes

### 1. Database Schema

Added new tables and columns to support live question tracking:

```sql
-- New table: question_plans
CREATE TABLE question_plans (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,
  segment_id UUID,
  segment_index INTEGER NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  timestamp NUMERIC NOT NULL,
  status VARCHAR(50) DEFAULT 'planned',
  plan_data JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Updates to questions table
ALTER TABLE questions ADD COLUMN generation_status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE questions ADD COLUMN generated_at TIMESTAMP;
ALTER TABLE questions ADD COLUMN segment_id UUID;

-- Updates to course_segments table
ALTER TABLE course_segments ADD COLUMN planning_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE course_segments ADD COLUMN question_plans_count INTEGER DEFAULT 0;
ALTER TABLE course_segments ADD COLUMN questions_generated_count INTEGER DEFAULT 0;
```

### 2. Backend Processing Flow

#### Previous Flow:
1. Generate all quiz plans for a segment
2. Generate all questions from plans
3. Save all questions to database at once
4. Move to next segment

#### New Flow:
1. Generate quiz plans for a segment
2. Save plans to database
3. Trigger individual question generation (async)
4. Immediately start planning next segment
5. Questions are generated and saved individually

### 3. Edge Functions

#### Modified: `process-video-segment`
- Now saves quiz plans to database instead of keeping in memory
- Triggers `generate-individual-questions` function
- Can start next segment planning immediately

#### New: `generate-individual-questions`
- Processes questions one by one from saved plans
- Updates question status as it progresses
- Saves each question individually to trigger real-time updates

### 4. Frontend Real-time Updates

#### Enhanced Subscriptions:
```typescript
// Subscribe to individual question insertions
const questionChannel = supabase
  .channel(`questions_${courseId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'questions',
    filter: `course_id=eq.${courseId}`
  }, (payload) => {
    // Add new question to UI immediately
  });
```

#### UI Updates:
- Questions appear as they are generated
- Segment progress shows question counts in real-time
- Processing indicator shows total questions ready

## Benefits

1. **Faster Time to First Question**: Users see questions within seconds
2. **Better User Experience**: Progressive loading with real-time feedback
3. **Improved Scalability**: Questions can be processed in parallel
4. **Fault Tolerance**: Individual question failures don't block segments

## Implementation Status

✅ Database migration created (`010_add_live_question_generation.sql`)  
✅ Edge function for individual question generation  
✅ Modified segment processor to save plans  
✅ Frontend real-time subscriptions  
✅ Processing UI shows live progress  

## Next Steps

1. Deploy database migration
2. Deploy edge functions
3. Test with segmented videos
4. Monitor performance impact

## Potential Optimizations

1. **Batch Processing**: Process 2-3 questions together to reduce overhead
2. **Priority Queue**: Generate questions in timestamp order
3. **Caching**: Reuse transcript and context data across questions
4. **Worker Pool**: Multiple workers for parallel processing

## Known Limitations

1. **Database Writes**: Increased write operations (3-4x more)
2. **Subscriptions**: Each user creates multiple real-time channels
3. **Context Loading**: Repeated loading of transcript data
4. **Order Guarantees**: Questions may appear out of order briefly

## Monitoring

Track these metrics:
- Time to first question displayed
- Average question generation time
- Database write throughput
- Real-time subscription count
- Error rates by question type 

## Troubleshooting

### UUID Error When Saving Questions
If you see errors like `invalid input syntax for type uuid: "q2_multiple-choice_128"`, this means the question ID is being used as the database primary key incorrectly.

**Fix:** The `generate-individual-questions` function should not specify an `id` field when inserting questions. The database will generate a UUID automatically. The original plan question ID can be stored in the metadata for reference.

### Course Not Publishing After Questions Generated
Due to the async nature of individual question generation, the course might not be marked as published even after all questions are generated.

**Solution:** A separate `check-and-publish-course` edge function periodically checks:
1. All segments are completed
2. All question plans are processed (no pending/generating status)
3. Questions exist in the database
4. If all checks pass, the course is marked as published

The frontend polls this endpoint every 5 seconds until the course is published. 

### Questions Not Appearing in Real-time
If questions only appear when segments complete rather than individually:

**Common Causes:**
1. Real-time not enabled for the `questions` table in Supabase
2. Subscription setup issues in the frontend
3. RLS policies blocking real-time events

**Solutions:**
1. **Enable Real-time**: Run migration `011_enable_realtime_for_questions.sql`
2. **Frontend Fixes**:
   - Changed subscription from `isSegmented` to `isProcessing` dependency
   - Added subscription status logging
   - Added 2-second polling as fallback
3. **Check Supabase Dashboard**: Ensure real-time is enabled for the questions table

**Fallback Mechanism:**
The system now includes a 2-second polling interval during processing as a fallback if real-time fails. This ensures questions always appear progressively even if WebSocket connections have issues. 

### Question Types Not Saving Properly
Some question types (especially complex ones like hotspot, matching, sequencing) may not save correctly if the data structure handling is incomplete.

**Issue Details:**
- Multiple choice questions need options stored as JSON string
- True/false questions need correct_answer converted to index (0 for True, 1 for False)
- Hotspot questions need complex metadata including bounding boxes
- Matching and sequencing questions need their pairs/items in metadata

**Fix Applied:**
The `generate-individual-questions` function now matches the data structure handling from `quiz-generation-v5`:
1. **Options Storage**: Arrays are JSON.stringify'd before storage
2. **True/False Handling**: Boolean answers converted to indices
3. **Complex Metadata**: All special fields (bounding boxes, matching pairs, etc.) stored in metadata JSON
4. **Timestamp Rounding**: Frame timestamps and regular timestamps rounded to integers
5. **Visual Asset Flag**: Set for hotspot, matching, and sequencing questions

**Test Each Question Type:**
```javascript
// Monitor console for each type:
- Multiple choice: Check options array is stored
- True/false: Verify correct_answer is 0 or 1
- Hotspot: Ensure bounding_boxes table gets populated
- Matching: Check metadata contains matching_pairs
- Sequencing: Check metadata contains sequence_items