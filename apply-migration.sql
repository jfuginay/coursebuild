-- Quick migration script to add video overlay support
-- Run this in the Supabase SQL Editor

-- Add frame_timestamp column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS frame_timestamp INTEGER;

-- Add metadata column  
ALTER TABLE questions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Make visual_asset_id nullable in bounding_boxes
ALTER TABLE bounding_boxes ALTER COLUMN visual_asset_id DROP NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_questions_frame_timestamp ON questions(frame_timestamp);
CREATE INDEX IF NOT EXISTS idx_questions_metadata ON questions USING GIN(metadata); 