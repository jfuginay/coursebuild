-- Quiz Generation Progress Table
-- This table tracks the overall progress of quiz generation for a course
-- Used by segmented processing to provide real-time updates

CREATE TABLE IF NOT EXISTS quiz_generation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- Frontend session identifier
    stage TEXT NOT NULL CHECK (stage IN ('initialization', 'planning', 'generation', 'quality_verification', 'storage', 'completed', 'failed')),
    stage_progress FLOAT NOT NULL DEFAULT 0.0 CHECK (stage_progress >= 0.0 AND stage_progress <= 1.0),
    overall_progress FLOAT NOT NULL DEFAULT 0.0 CHECK (overall_progress >= 0.0 AND overall_progress <= 1.0),
    current_step TEXT,
    metadata JSONB DEFAULT '{}', -- Stores additional metadata like segment info
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, session_id)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_quiz_generation_progress_course_session ON quiz_generation_progress(course_id, session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_generation_progress_updated_at ON quiz_generation_progress(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE quiz_generation_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow read access for authenticated users
CREATE POLICY "Allow read access to quiz_generation_progress" ON quiz_generation_progress
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role full access
CREATE POLICY "Allow service role full access to quiz_generation_progress" ON quiz_generation_progress
    FOR ALL USING (auth.role() = 'service_role');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_quiz_generation_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_quiz_generation_progress_timestamp
    BEFORE UPDATE ON quiz_generation_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_quiz_generation_progress_timestamp();

-- Enable realtime for progress tracking
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_generation_progress; 