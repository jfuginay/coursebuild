-- Migration: Add course segments support for processing long videos in chunks
-- This enables sequential processing of video segments to avoid timeout issues

-- 1. Create course_segments table
CREATE TABLE IF NOT EXISTS course_segments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    start_time INTEGER NOT NULL, -- in seconds
    end_time INTEGER NOT NULL, -- in seconds
    title TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    -- transcript_data column removed - transcripts are managed in video_transcripts table
    previous_segment_context JSONB, -- Context from previous segment for continuity
    cumulative_key_concepts JSONB, -- All key concepts from previous segments
    questions_count INTEGER DEFAULT 0,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, segment_index)
);

-- 2. Add segment support to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES course_segments(id),
ADD COLUMN IF NOT EXISTS segment_index INTEGER;

-- 3. Add segment support to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS is_segmented BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_segments INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS segment_duration INTEGER DEFAULT 600; -- Default 10 minutes per segment

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_course_segments_course_id ON course_segments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_segments_status ON course_segments(status);
CREATE INDEX IF NOT EXISTS idx_course_segments_course_status ON course_segments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_segment_id ON questions(segment_id);

-- 5. Create updated_at trigger
CREATE TRIGGER update_course_segments_updated_at BEFORE UPDATE
    ON course_segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable Row Level Security
ALTER TABLE course_segments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Allow public read access to segments for published courses
CREATE POLICY "Public course segments access" ON course_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_segments.course_id 
            AND courses.published = TRUE
        )
    );

-- Allow service role full access
CREATE POLICY "Service role full access to course_segments" ON course_segments
    FOR ALL USING (auth.role() = 'service_role');

-- 8. Function to get next pending segment
CREATE OR REPLACE FUNCTION get_next_pending_segment(p_course_id UUID)
RETURNS course_segments AS $$
DECLARE
    v_segment course_segments;
BEGIN
    SELECT *
    INTO v_segment
    FROM course_segments
    WHERE course_id = p_course_id
      AND status = 'pending'
    ORDER BY segment_index
    LIMIT 1;
    
    RETURN v_segment;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to check if all segments are completed
CREATE OR REPLACE FUNCTION are_all_segments_completed(p_course_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_pending_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_pending_count
    FROM course_segments
    WHERE course_id = p_course_id
      AND status != 'completed';
    
    RETURN v_pending_count = 0;
END;
$$ LANGUAGE plpgsql;

-- 10. Enable realtime for segment updates
ALTER PUBLICATION supabase_realtime ADD TABLE course_segments;

-- 11. Add metadata column to video_transcripts table for segment tracking
ALTER TABLE video_transcripts
ADD COLUMN IF NOT EXISTS metadata JSONB; 