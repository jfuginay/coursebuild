# Scripts Directory

This directory contains utility scripts for managing the CourseForge AI application.

## Available Scripts

### test-connection.js
Tests the database connection to Supabase. Useful for verifying environment variables are set correctly.

```bash
node scripts/test-connection.js
```

### update-course-metadata.js
Updates course metadata with proper video titles from YouTube. Fixes courses that have placeholder titles.

```bash
node scripts/update-course-metadata.js
```

### fix-anonymous-ratings.sql
SQL script that creates anonymous user profiles for ratings that were created without user authentication.

### add-sample-ratings.sql
Adds sample ratings to courses for testing the rating system.

### test-enhanced-recommendations.js
Tests the enhanced recommendations system for course suggestions based on user learning profiles and wrong answers.

### test-user-responses-in-recommendations.js (NEW)
Tests how user question responses are being processed and displayed in the enhanced recommendations system. Shows the full analysis of wrong answers including all options and user selections.

```bash
node scripts/test-enhanced-recommendations.js
```

### check-course-status.js
Checks the publication status of courses in the database and can fix courses that have questions but are not marked as published.

```bash
# Check course status
node scripts/check-course-status.js

# Check a specific course
node scripts/check-course-status.js <course-id>

# Fix unpublished courses that have questions
node scripts/check-course-status.js --fix
```

Common issues this script can detect:
- Courses marked as unpublished despite having questions
- Courses created but never processed
- Discrepancies between course status and question count

## Common Tasks

### Fix courses not showing on main page
If courses are not appearing on the main page, they might be marked as unpublished:

```bash
# Check status
node scripts/check-course-status.js

# Fix issues
node scripts/check-course-status.js --fix
```

## Prerequisites

All scripts require:
1. Node.js installed
2. `.env.local` file with proper environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 