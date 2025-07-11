-- Add worker_id column for segment processing locks (retry_count already exists)
ALTER TABLE course_segments 
ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- Create index for finding stuck segments (if not exists)
CREATE INDEX IF NOT EXISTS idx_course_segments_processing 
ON course_segments(status, processing_started_at) 
WHERE status = 'processing';

-- Add comment explaining the worker_id purpose
COMMENT ON COLUMN course_segments.worker_id IS 'Unique identifier for the worker processing this segment, used to prevent concurrent processing'; 