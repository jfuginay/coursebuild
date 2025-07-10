-- Debug script to check rating filter functionality
-- Run this in Supabase SQL editor to diagnose the issue

-- 1. Check if rating tables exist and are populated
SELECT 
    'Rating Tables Status' as check_type,
    (SELECT COUNT(*) FROM course_ratings) as total_ratings,
    (SELECT COUNT(*) FROM course_rating_stats) as total_stats,
    (SELECT COUNT(*) FROM courses WHERE published = true) as total_published_courses;

-- 2. Check materialized view refresh status
SELECT 
    'Materialized View Status' as check_type,
    schemaname,
    matviewname,
    ispopulated,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews 
WHERE matviewname = 'course_rating_stats';

-- 3. Show any existing rating data
SELECT 
    'Existing Rating Data' as check_type,
    cr.course_id,
    c.title as course_title,
    cr.rating,
    cr.rating_context,
    cr.created_at
FROM course_ratings cr
JOIN courses c ON c.id = cr.course_id
ORDER BY cr.created_at DESC
LIMIT 10;

-- 4. Show rating stats for courses
SELECT 
    'Rating Statistics' as check_type,
    crs.course_id,
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
ORDER BY crs.total_ratings DESC;

-- 5. Add sample rating data if none exists (uncomment to run)
-- INSERT INTO course_ratings (user_id, course_id, rating, rating_context, time_spent_minutes, questions_answered, completion_percentage)
-- SELECT 
--     auth.uid(), -- This will be NULL in SQL editor, but shows the structure
--     c.id,
--     5, -- 5-star rating
--     'completion',
--     45, -- 45 minutes
--     12, -- 12 questions
--     100.0 -- 100% completion
-- FROM courses c 
-- WHERE c.published = true 
-- LIMIT 1;

-- 6. Force refresh of materialized view
SELECT refresh_course_rating_stats();

-- 7. Check if stats were updated
SELECT 
    'Post-Refresh Stats' as check_type,
    COUNT(*) as total_stats_records,
    SUM(total_ratings) as total_all_ratings,
    ROUND(AVG(average_rating), 2) as overall_average
FROM course_rating_stats;