# Real-Time Segment Updates Implementation

## Overview
This document describes the implementation of real-time segment updates for live question generation in CourseForge AI.

## Architecture

### Database Schema
- `course_segments` table tracks segment processing status
- `questions` table stores generated questions with segment references
- Real-time enabled via Supabase publication

### Real-Time Subscriptions
The frontend subscribes to:
1. **Segment Updates** - Track processing progress
2. **Question Inserts** - Display questions as they're generated
3. **Question Plans** - Track planned vs generated counts

### Hybrid Update Approach
The system uses a combination of:
- **Primary**: Real-time subscriptions for immediate updates
- **Fallback**: Smart polling at 5-second intervals during processing
- **Auto-stop**: Polling ceases when processing completes

### Key Components

#### Frontend (`src/pages/course/[id].tsx`)
- Real-time subscription setup for live updates
- Progress tracking UI components
- Automatic course publishing detection

#### Backend (`supabase/functions/`)
- `process-video-segment` - Processes segments and creates question plans
- `generate-individual-questions` - Generates questions asynchronously
- `check-and-publish-course` - Verifies completion and publishes

## Benefits
- Questions appear immediately as generated
- No page refresh required
- Better user experience with live feedback
- Parallel processing of segments

## Troubleshooting

### Questions Not Appearing Live
If questions aren't updating in real-time:

1. **Check Subscription Status**
   - Open browser console and look for "📡 Question channel subscription status"
   - Should show "SUBSCRIBED" status
   - If showing "CHANNEL_ERROR" or "TIMED_OUT", check Supabase configuration

2. **Verify Real-Time is Enabled**
   - Run migration: `supabase migration up 011_enable_realtime_for_questions.sql`
   - Check Supabase dashboard → Database → Replication
   - Ensure `questions`, `course_segments`, and `question_plans` tables are enabled

3. **Debug Subscription Logic**
   - The subscription requires either:
     - Course is processing (`isProcessing = true`)
     - Course unpublished with no questions
   - Check console for "🔍 Real-time subscription check" logs

4. **Test Real-Time Connection**
   ```bash
   node scripts/test-realtime-subscription.js <course-id>
   ```
   This will monitor for 60 seconds and show any received questions
   
 5. **Test Manual Question Insert**
    ```bash
    node scripts/test-insert-question.js <course-id>
    ```
    This will insert a test question to verify real-time triggers

### Common Issues

1. **Subscription Not Created**
   - Ensure course is marked as processing
   - Check if questions are already loaded (subscription might skip)

2. **Questions Generated But Not Showing**
   - Verify `generate-individual-questions` is saving to database
   - Check for errors in Supabase logs
   - Ensure proper authentication tokens

3. **Subscription Closes Early**
   - The subscription now stays active until:
     - Course is published AND
     - Questions are loaded
   - This prevents missing questions during generation 