-- Progress Tracking Migration
-- Enables real-time progress updates for video processing pipeline

-- Main progress tracking table
CREATE TABLE IF NOT EXISTS processing_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- Frontend session identifier
    stage TEXT NOT NULL CHECK (stage IN ('initialization', 'planning', 'generation', 'quality_verification', 'storage', 'completed', 'failed')),
    stage_progress FLOAT NOT NULL DEFAULT 0.0 CHECK (stage_progress >= 0.0 AND stage_progress <= 1.0),
    overall_progress FLOAT NOT NULL DEFAULT 0.0 CHECK (overall_progress >= 0.0 AND overall_progress <= 1.0),
    current_step TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, session_id)
);

-- Individual question progress tracking
CREATE TABLE IF NOT EXISTS question_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    question_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'generating', 'completed', 'failed', 'validating')),
    progress FLOAT NOT NULL DEFAULT 0.0 CHECK (progress >= 0.0 AND progress <= 1.0),
    reasoning TEXT,
    provider_used TEXT,
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, session_id)
);

-- Pipeline stage definitions with timing estimates
CREATE TABLE IF NOT EXISTS pipeline_stages (
    stage TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_duration_seconds INTEGER NOT NULL,
    weight FLOAT NOT NULL CHECK (weight >= 0.0), -- For calculating overall progress
    order_index INTEGER NOT NULL
);

-- Insert stage definitions
INSERT INTO pipeline_stages (stage, display_name, description, estimated_duration_seconds, weight, order_index) VALUES
('initialization', 'Initialization', 'Setting up video analysis and validating inputs', 5, 0.05, 1),
('planning', 'Question Planning', 'Analyzing video content and planning question types and timestamps', 15, 0.25, 2),
('generation', 'Question Generation', 'Generating individual questions using AI providers', 25, 0.50, 3),
('quality_verification', 'Quality Verification', 'Verifying question quality and educational value', 10, 0.15, 4),
('storage', 'Database Storage', 'Storing questions and associated data', 5, 0.05, 5),
('completed', 'Completed', 'Processing completed successfully', 0, 0.0, 6),
('failed', 'Failed', 'Processing failed with errors', 0, 0.0, 7);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processing_progress_course_session ON processing_progress(course_id, session_id);
CREATE INDEX IF NOT EXISTS idx_processing_progress_updated_at ON processing_progress(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_question_progress_course_session ON question_progress(course_id, session_id);
CREATE INDEX IF NOT EXISTS idx_question_progress_status ON question_progress(status);

-- Enable Row Level Security
ALTER TABLE processing_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow read access for authenticated users)
CREATE POLICY "Allow read access to processing_progress" ON processing_progress
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to question_progress" ON question_progress
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to do everything
CREATE POLICY "Allow service role full access to processing_progress" ON processing_progress
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to question_progress" ON question_progress
    FOR ALL USING (auth.role() = 'service_role');

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_processing_progress_timestamp
    BEFORE UPDATE ON processing_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_progress_timestamp();

CREATE TRIGGER update_question_progress_timestamp
    BEFORE UPDATE ON question_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_progress_timestamp();

-- Enable realtime for progress tables
ALTER PUBLICATION supabase_realtime ADD TABLE processing_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE question_progress; 