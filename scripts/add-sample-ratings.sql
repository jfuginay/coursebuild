-- Add sample rating data for testing the filter functionality
-- This script creates sample ratings for existing courses
-- Run this in Supabase SQL editor to test the rating filter

-- First, let's see what courses we have
SELECT 
    id,
    title,
    published,
    created_at
FROM courses 
WHERE published = true 
ORDER BY created_at DESC
LIMIT 5;

-- Add sample ratings for the first few published courses
-- Note: This assumes you have users in the auth.users table
-- If running in SQL editor, you may need to replace auth.uid() with actual user IDs

-- Get a sample user ID (replace with actual user ID if needed)
-- SELECT id FROM auth.users LIMIT 1;

-- Add 5-star ratings for testing
INSERT INTO course_ratings (
    user_id, 
    course_id, 
    rating, 
    rating_context, 
    time_spent_minutes, 
    questions_answered, 
    completion_percentage
)
SELECT 
    -- Use a dummy UUID for testing (replace with real user ID in production)
    '00000000-0000-0000-0000-000000000001'::uuid as user_id,
    c.id as course_id,
    5 as rating,
    'completion' as rating_context,
    FLOOR(RANDOM() * 60 + 30) as time_spent_minutes, -- Random 30-90 minutes
    FLOOR(RANDOM() * 15 + 5) as questions_answered,  -- Random 5-20 questions
    100.0 as completion_percentage
FROM courses c 
WHERE c.published = true 
LIMIT 2
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Add 4-star ratings
INSERT INTO course_ratings (
    user_id, 
    course_id, 
    rating, 
    rating_context, 
    time_spent_minutes, 
    questions_answered, 
    completion_percentage
)
SELECT 
    '00000000-0000-0000-0000-000000000002'::uuid as user_id,
    c.id as course_id,
    4 as rating,
    'completion' as rating_context,
    FLOOR(RANDOM() * 50 + 20) as time_spent_minutes,
    FLOOR(RANDOM() * 12 + 3) as questions_answered,
    FLOOR(RANDOM() * 20 + 80) as completion_percentage -- 80-100%
FROM courses c 
WHERE c.published = true 
LIMIT 2
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Add 3-star ratings
INSERT INTO course_ratings (
    user_id, 
    course_id, 
    rating, 
    rating_context, 
    time_spent_minutes, 
    questions_answered, 
    completion_percentage
)
SELECT 
    '00000000-0000-0000-0000-000000000003'::uuid as user_id,
    c.id as course_id,
    3 as rating,
    'mid_course' as rating_context,
    FLOOR(RANDOM() * 30 + 10) as time_spent_minutes,
    FLOOR(RANDOM() * 8 + 2) as questions_answered,
    FLOOR(RANDOM() * 30 + 50) as completion_percentage -- 50-80%
FROM courses c 
WHERE c.published = true 
LIMIT 1
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Force refresh the materialized view
SELECT refresh_course_rating_stats();

-- Verify the data was added
SELECT 
    'Sample Ratings Added' as status,
    COUNT(*) as total_ratings,
    COUNT(DISTINCT course_id) as courses_with_ratings,
    ROUND(AVG(rating), 2) as average_rating
FROM course_ratings;

-- Show the rating statistics
SELECT 
    c.title as course_title,
    crs.average_rating,
    crs.total_ratings,
    crs.five_star_count,
    crs.four_star_count,
    crs.three_star_count,
    crs.two_star_count,
    crs.one_star_count
FROM course_rating_stats crs
JOIN courses c ON c.id = crs.course_id
ORDER BY crs.average_rating DESC;