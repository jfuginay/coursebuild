# CourseForge AI - Scripts Documentation

This directory contains utility scripts for maintaining and updating the CourseForge database.

## Available Scripts

### 1. **test-connection.js**
Tests the Supabase connection and verifies environment variables are properly configured.

```bash
node scripts/test-connection.js
```

### 2. **update-course-metadata.js**
Updates existing courses with:
- Real YouTube video titles (replacing placeholders)
- AI-generated descriptions from video summaries

```bash
# Dry run (no changes)
node scripts/update-course-metadata.js --dry-run

# Apply updates
node scripts/update-course-metadata.js
```

### 3. **verify-publishing-fix.js**
Verifies that courses are only marked as published when questions exist in the database.

```bash
node scripts/verify-publishing-fix.js
```

This script will:
- Check all recent courses
- Count questions for each course
- Report any published courses without questions
- Provide a summary of course status

### 4. **fix-already-published.js**
Fixes courses that were published without questions (unpublishes them).

```bash
# Dry run to see what would be changed
node scripts/fix-already-published.js --dry-run

# Apply fixes
node scripts/fix-already-published.js
```

This script ensures data integrity by:
- Finding all published courses
- Checking if they have questions
- Unpublishing courses without questions

## SQL Scripts

### Database Maintenance

#### **add-sample-ratings.sql**
Adds sample rating data for testing the rating system.

#### **fix-anonymous-ratings.sql**
Fixes ratings that were created without proper user associations.

#### **quick-add-test-rating.sql**
Quickly adds a test rating for development purposes.

#### **setup-rating-system.sql**
Sets up the complete rating system tables and functions.

#### **verify-rating-tables.sql**
Verifies the rating system tables are properly configured.

#### **debug-rating-filter.sql**
Helps debug issues with rating filters and queries.

## Environment Setup

All scripts require proper environment variables. Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Or use existing environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Development Workflow

1. **Test Connection First**
   ```bash
   node scripts/test-connection.js
   ```

2. **Update Metadata**
   ```bash
   node scripts/update-course-metadata.js --dry-run
   node scripts/update-course-metadata.js
   ```

3. **Verify Publishing**
   ```bash
   node scripts/verify-publishing-fix.js
   ```

4. **Fix Issues if Needed**
   ```bash
   node scripts/fix-already-published.js --dry-run
   node scripts/fix-already-published.js
   ```

## Common Issues

### Missing dotenv
If you see warnings about dotenv, install it:
```bash
npm install --save-dev dotenv
```

### Connection Errors
- Verify your environment variables are correct
- Check that your Supabase project is running
- Ensure you're using the service role key for admin operations

### No Changes Applied
- Remove `--dry-run` flag to apply actual changes
- Check console output for specific error messages
- Verify you have the necessary permissions

## Rate Limiting

Scripts that call external APIs (like YouTube oEmbed) include rate limiting:
- Default: 1 request per second
- Adjustable in the script if needed
- Prevents API quota exhaustion 