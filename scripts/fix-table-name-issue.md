# Fix for user_question_responses Table Issue

## Problem
The API is trying to use a table called `user_question_responses`, but the database has `user_question_attempts` instead.

## Solution
Run the migration to rename the table.

### Option 1: Run via Supabase Dashboard (Recommended)
1. Go to: https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/sql/new
2. Copy the entire contents of: `supabase/migrations/008_rename_question_attempts_to_responses.sql`
3. Paste it in the SQL editor
4. Click "Run"

### Option 2: Run via Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.nkqehqwbxkxrgecmgzuq.supabase.co:5432/postgres"
```

## Verification
After running the migration, verify it worked:
```bash
npm run check-infobite-tables
```

The table should now be accessible as `user_question_responses`.