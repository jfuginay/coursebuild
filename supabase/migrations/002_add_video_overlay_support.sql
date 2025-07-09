-- Migration: Add video overlay support for enhanced quiz questions
-- This extends the questions table to support direct video overlay functionality

-- 1. Add frame_timestamp column for video overlay timing
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS frame_timestamp INTEGER; -- When to show overlay on video (seconds)

-- 2. Add metadata column for storing detected elements and matching pairs
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS metadata JSONB; -- Store detected_elements, matching_pairs, etc.

-- 3. Create index for frame_timestamp queries
CREATE INDEX IF NOT EXISTS idx_questions_frame_timestamp ON questions(frame_timestamp);

-- 4. Create index for metadata queries
CREATE INDEX IF NOT EXISTS idx_questions_metadata ON questions USING GIN(metadata);

-- 5. Update bounding_boxes table to allow null visual_asset_id for video overlay
ALTER TABLE bounding_boxes 
ALTER COLUMN visual_asset_id DROP NOT NULL;

-- 6. Add comment for documentation
COMMENT ON COLUMN questions.frame_timestamp IS 'Video timestamp (seconds) when overlay should appear for visual questions';
COMMENT ON COLUMN questions.metadata IS 'JSON metadata containing detected_elements, matching_pairs, and other visual question data'; 