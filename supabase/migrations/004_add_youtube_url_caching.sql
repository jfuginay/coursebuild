-- Migration: Add YouTube URL caching support and performance indexes
-- This adds indexes for efficient cache lookups and course duplication detection

-- 1. Add index for fast youtube_url lookups
CREATE INDEX IF NOT EXISTS idx_courses_youtube_url ON courses(youtube_url);

-- 2. Add composite index for efficient cache lookups (published courses with questions)
CREATE INDEX IF NOT EXISTS idx_courses_cache_lookup ON courses(youtube_url, published, created_at DESC) 
WHERE published = true;

-- 3. Add index for question retrieval by course with timestamp ordering
CREATE INDEX IF NOT EXISTS idx_questions_course_timestamp ON questions(course_id, timestamp);

-- 4. Add index for questions with visual assets (for cache reconstruction)
CREATE INDEX IF NOT EXISTS idx_questions_visual_assets ON questions(course_id, has_visual_asset) 
WHERE has_visual_asset = true;

-- 5. Add index for bounding boxes by question (for cache reconstruction)
CREATE INDEX IF NOT EXISTS idx_bounding_boxes_question_cache ON bounding_boxes(question_id, is_correct_answer);

-- 6. Add index for visual assets by course (for cache reconstruction)
CREATE INDEX IF NOT EXISTS idx_visual_assets_course_cache ON visual_assets(course_id, question_id);

-- 7. Add comments for documentation
COMMENT ON INDEX idx_courses_youtube_url IS 'Fast lookup for duplicate YouTube URLs';
COMMENT ON INDEX idx_courses_cache_lookup IS 'Efficient cache lookup for published courses with questions';
COMMENT ON INDEX idx_questions_course_timestamp IS 'Ordered question retrieval for course reconstruction';
COMMENT ON INDEX idx_questions_visual_assets IS 'Fast lookup for visual questions during cache reconstruction';
COMMENT ON INDEX idx_bounding_boxes_question_cache IS 'Efficient bounding box retrieval for cached questions';
COMMENT ON INDEX idx_visual_assets_course_cache IS 'Fast visual asset lookup for cache reconstruction'; 