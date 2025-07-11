-- Fix anonymous ratings by allowing null user_id and updating constraints
-- Run this in Supabase SQL editor

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE course_ratings DROP CONSTRAINT IF EXISTS course_ratings_user_id_fkey;

-- Step 2: Make user_id nullable
ALTER TABLE course_ratings ALTER COLUMN user_id DROP NOT NULL;

-- Step 3: Add the foreign key back with proper handling
ALTER TABLE course_ratings 
ADD CONSTRAINT course_ratings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 4: Update the unique constraint to handle null user_id
-- First drop the existing unique constraint
ALTER TABLE course_ratings DROP CONSTRAINT IF EXISTS course_ratings_user_id_course_id_key;

-- For anonymous users, we'll use IP + course_id as uniqueness
-- Add a new column for anonymous user identifier
ALTER TABLE course_ratings ADD COLUMN IF NOT EXISTS anonymous_id VARCHAR(100);

-- Create a new unique constraint that handles both cases
CREATE UNIQUE INDEX unique_user_rating ON course_ratings (
    COALESCE(user_id::text, anonymous_id),
    course_id
);

-- Step 5: Update RLS policies to allow anonymous ratings
DROP POLICY IF EXISTS "Users can insert their own ratings" ON course_ratings;
DROP POLICY IF EXISTS "Allow anonymous ratings" ON course_ratings;

-- Allow authenticated users to insert their own ratings
CREATE POLICY "Users can insert their own ratings" ON course_ratings
    FOR INSERT WITH CHECK (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    );

-- Allow anonymous users to insert ratings
CREATE POLICY "Allow anonymous ratings" ON course_ratings
    FOR INSERT WITH CHECK (
        user_id IS NULL AND anonymous_id IS NOT NULL
    );

-- Update the update and delete policies
DROP POLICY IF EXISTS "Users can update their own ratings" ON course_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON course_ratings;

CREATE POLICY "Users can update their own ratings" ON course_ratings
    FOR UPDATE USING (
        (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
        (auth.uid() IS NULL AND user_id IS NULL)
    );

CREATE POLICY "Users can delete their own ratings" ON course_ratings
    FOR DELETE USING (
        auth.uid() IS NOT NULL AND auth.uid() = user_id
    );

-- Step 6: Test by inserting an anonymous rating
INSERT INTO course_ratings (
    user_id,
    anonymous_id,
    course_id,
    rating,
    rating_context,
    time_spent_minutes,
    questions_answered,
    completion_percentage
)
SELECT 
    NULL as user_id, -- NULL for anonymous
    'test_anonymous_001' as anonymous_id,
    c.id as course_id,
    5 as rating,
    'completion' as rating_context,
    30 as time_spent_minutes,
    10 as questions_answered,
    100.0 as completion_percentage
FROM courses c 
WHERE c.published = true 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Step 7: Refresh materialized view
SELECT refresh_course_rating_stats();

-- Step 8: Verify the changes
SELECT 
    'Anonymous Rating Test' as test_type,
    COUNT(*) FILTER (WHERE user_id IS NULL) as anonymous_ratings,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) as authenticated_ratings,
    COUNT(*) as total_ratings
FROM course_ratings;

-- Show the rating stats
SELECT 
    'Updated Rating Stats' as info,
    c.title,
    crs.average_rating,
    crs.total_ratings
FROM course_rating_stats crs
JOIN courses c ON c.id = crs.course_id
WHERE crs.total_ratings > 0
ORDER BY crs.average_rating DESC;