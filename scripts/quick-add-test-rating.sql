-- Quick script to add a test rating for the filter to work
-- Run this in Supabase SQL editor to test rating functionality

-- Add a test rating (using dummy user ID)
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
    '00000000-0000-0000-0000-000000000001'::uuid as user_id,
    c.id as course_id,
    5 as rating,
    'completion' as rating_context,
    45 as time_spent_minutes,
    10 as questions_answered,
    100.0 as completion_percentage
FROM courses c 
WHERE c.published = true 
LIMIT 1
ON CONFLICT (user_id, course_id) DO NOTHING;

-- Force refresh the materialized view
SELECT refresh_course_rating_stats();

-- Check results
SELECT 
    c.title,
    crs.average_rating,
    crs.total_ratings
FROM course_rating_stats crs
JOIN courses c ON c.id = crs.course_id;