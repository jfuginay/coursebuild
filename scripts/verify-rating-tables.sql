-- Script to verify rating system tables exist and are working
-- Run this in Supabase SQL editor to check migration status

-- Check if main tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('course_ratings', 'course_rating_stats')
ORDER BY tablename;

-- Check if materialized view exists and has data
SELECT EXISTS (
    SELECT 1 
    FROM pg_matviews 
    WHERE matviewname = 'course_rating_stats'
) as materialized_view_exists;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('course_ratings', 'course_rating_stats')
ORDER BY tablename, policyname;

-- Check if functions exist
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name IN (
    'refresh_course_rating_stats',
    'calculate_engagement_score',
    'trigger_refresh_rating_stats',
    'auto_calculate_engagement_score'
)
ORDER BY routine_name;

-- Sample data check (will be empty initially)
SELECT 
    'course_ratings' as table_name,
    COUNT(*) as row_count
FROM course_ratings
UNION ALL
SELECT 
    'course_rating_stats' as table_name,
    COUNT(*) as row_count
FROM course_rating_stats;