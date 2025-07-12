# Scripts

This directory contains utility scripts for debugging, testing, and fixing data in the CourseForge AI application.

## Question Generation Scripts

### `test-question-storage.mjs`
Tests how questions are being stored in the database, especially for true-false and hotspot questions.
```bash
node scripts/test-question-storage.mjs
```

### `check-boolean-questions.mjs`
Checks for true-false questions that have boolean values instead of numeric indices.
```bash
node scripts/check-boolean-questions.mjs
```

### `check-hotspot-questions.mjs`
Analyzes hotspot questions to verify correct_answer values and metadata structure.
```bash
node scripts/check-hotspot-questions.mjs
```

### `check-hotspot-storage.mjs`
Compares hotspot storage between metadata and bounding_boxes table to identify discrepancies.
```bash
node scripts/check-hotspot-storage.mjs
```

### `fix-hotspot-questions.mjs`
Fixes hotspot questions where bounding boxes have incorrect is_correct_answer values.
```bash
node scripts/fix-hotspot-questions.mjs
```

### `test-realtime-subscription.js`
Tests real-time subscriptions for live question generation updates.
```bash
node scripts/test-realtime-subscription.js <course-id>
```

### `test-insert-question.js`
Inserts a test question to verify real-time triggers are working.
```bash
node scripts/test-insert-question.js <course-id>
```

### `test-segment-questions.js`
Tests fetching questions from segmented courses.
```bash
node scripts/test-segment-questions.js <course-id>
```

### `test-single-segment-questions.js`
Tests question generation for single-segment courses.
```bash
node scripts/test-single-segment-questions.js <course-id>
```

### `test-question-types.js`
Tests storage and retrieval of different question types.
```bash
node scripts/test-question-types.js
```

## Rating System Scripts

### `add-sample-ratings.sql`
Adds sample ratings to courses for testing the rating system.

### `fix-anonymous-ratings.sql`
SQL script that creates anonymous user profiles for ratings that were created without user authentication.

### `test-ratings.ts`
Tests the rating system API endpoints.

## Course Management Scripts

### `test-connection.js`
Tests the database connection to Supabase. Useful for verifying environment variables are set correctly.
```bash
node scripts/test-connection.js
```

### `update-course-metadata.js`
Updates course metadata with proper video titles from YouTube. Fixes courses that have placeholder titles.
```bash
node scripts/update-course-metadata.js
```

### `check-course-status.js`
Checks the publication status of courses and can fix courses that have questions but are not marked as published.
```bash
# Check all courses
node scripts/check-course-status.js

# Check a specific course
node scripts/check-course-status.js <course-id>

# Fix unpublished courses that have questions
node scripts/check-course-status.js --fix
```

### `fix-already-published.js`
Fixes courses that are marked as published but may have inconsistent data.

### `verify-publishing-fix.js`
Verifies that course publishing fixes have been applied correctly.

## Recommendation System Scripts

### `test-enhanced-recommendations.js`
Tests the enhanced recommendations system for course suggestions based on user learning profiles and wrong answers.
```bash
node scripts/test-enhanced-recommendations.js
```

### `test-user-responses-in-recommendations.js`
Tests how user question responses are being processed and displayed in the enhanced recommendations system.
```bash
node scripts/test-user-responses-in-recommendations.js
```

### `test-recommendations-with-wrong-questions.js`
Tests recommendations specifically based on wrong question analysis.
```bash
node scripts/test-recommendations-with-wrong-questions.js
```

### `test-wrong-questions-for-course.js`
Tests fetching wrong questions for a specific course.
```bash
node scripts/test-wrong-questions-for-course.js <course-id>
```

## User Data Scripts

### `test-user-performance-data.js`
Tests user performance data retrieval and analysis.
```bash
node scripts/test-user-performance-data.js
```

## Prerequisites

All scripts require:
1. Node.js installed
2. `.env.local` file with proper environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations) 