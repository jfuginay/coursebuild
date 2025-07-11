# CourseForge Scripts

This directory contains utility scripts for managing and maintaining CourseForge data.

## test-connection.js

Tests your environment setup and Supabase connection before running other scripts.

### Usage:

```bash
node scripts/test-connection.js
```

### What it checks:

- Environment variables are properly set
- Supabase connection is working
- Database tables are accessible
- YouTube oEmbed API is reachable

### Example Output:

```
🔧 Testing Supabase Connection...

📋 Environment Check:
   SUPABASE_URL: ✅ Set
   SUPABASE_SERVICE_ROLE_KEY: ✅ Set

🔗 Connecting to Supabase...

📊 Testing database access...
   ✅ Found 150 courses in database
   ✅ Found 142 transcripts in database

🌐 Testing YouTube oEmbed API...
   ✅ YouTube API working - Test video: "Rick Astley - Never Gonna Give You Up"

✅ All tests passed! You can run the update script.
```

## update-course-metadata.js

Updates existing courses with proper YouTube titles and AI-generated descriptions.

### What it does:

1. **Updates Titles**: Replaces placeholder titles like "AI Generated Course" with actual YouTube video titles
2. **Updates Descriptions**: Replaces generic descriptions with AI-generated summaries from video transcripts

### Prerequisites:

- Node.js installed
- Environment variables configured (test with `test-connection.js` first)
  - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Usage:

```bash
# Test your connection first
node scripts/test-connection.js

# Dry run (see what would be updated without making changes)
node scripts/update-course-metadata.js --dry-run

# Actually update the courses
node scripts/update-course-metadata.js
```

### Features:

- **Smart Detection**: Only updates courses with placeholder/generic content
- **YouTube Integration**: Fetches real video titles from YouTube's oEmbed API
- **AI Summaries**: Uses video summaries generated during transcript analysis
- **Rate Limiting**: Includes delays to avoid hitting API rate limits
- **Progress Tracking**: Shows detailed progress and summary statistics
- **Safe Fallbacks**: Uses fallback titles if YouTube metadata fetch fails

### Example Output:

```
🚀 Course Metadata Update Script
================================

📝 Updating course titles...

📊 Found 150 total courses

🔄 Processing course abc-123:
   Current title: "AI Generated Course"
   YouTube URL: https://www.youtube.com/watch?v=xyz
   ✅ Found YouTube title: "Introduction to Machine Learning"
   ✅ Author: TechEducator
   ✅ Updated successfully!

📊 Title Update Summary:
   - Total courses: 150
   - Updated: 45
   - Skipped (already have good titles): 105

📝 Updating course descriptions with AI summaries...

📊 Found 38 courses with generic descriptions

🔄 Processing course abc-123:
   Current description: "Interactive course from TechEducator - Learn..."
   ✅ Found AI-generated summary: "This comprehensive introduction to machine learning..."
   ✅ Updated description successfully!

📊 Description Update Summary:
   - Courses with generic descriptions: 38
   - Updated with AI summaries: 32
   - No transcript available: 6

✅ Update Complete!
===================
📊 Final Summary:
   - Titles updated: 45
   - Descriptions updated: 32
```

## Other Scripts

### SQL Scripts

The `scripts` directory also contains SQL scripts for database operations:

- `setup-rating-system.sql` - Creates tables for the course rating system
- `add-sample-ratings.sql` - Adds sample rating data for testing
- `fix-anonymous-ratings.sql` - Fixes issues with anonymous user ratings
- `verify-rating-tables.sql` - Verifies rating table structure and data 