# Live Question Generation Implementation

## Overview

This implementation enables real-time question generation and display, allowing users to see questions appear individually as they are generated rather than waiting for entire segments to complete.

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