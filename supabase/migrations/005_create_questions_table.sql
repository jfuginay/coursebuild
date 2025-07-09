-- Create questions table
-- This table stores all questions for courses

-- Create the questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL,
    frame_timestamp INTEGER, -- When to show overlay on video (seconds)
    question TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('multiple-choice', 'true-false', 'hotspot', 'matching', 'sequencing')),
    options JSONB, -- Stored as JSON, parsed for frontend
    correct_answer INTEGER NOT NULL,
    explanation TEXT,
    has_visual_asset BOOLEAN DEFAULT FALSE,
    metadata JSONB, -- Provider info, token usage, quality metrics, detected_elements, matching_pairs
    quality_score INTEGER, -- From quality verification (0-100)
    meets_threshold BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted BOOLEAN DEFAULT FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_questions_course_id ON questions(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_timestamp ON questions(timestamp);
CREATE INDEX IF NOT EXISTS idx_questions_frame_timestamp ON questions(frame_timestamp);
CREATE INDEX IF NOT EXISTS idx_questions_metadata ON questions USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_questions_quality_score ON questions(quality_score);
CREATE INDEX IF NOT EXISTS idx_questions_meets_threshold ON questions(meets_threshold);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

-- Create updated_at trigger
CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public read access to questions of published courses
CREATE POLICY "Public can read questions of published courses" ON questions
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = questions.course_id 
            AND courses.published = true
        )
    );

-- Create RLS policy for authenticated users to create questions
CREATE POLICY "Authenticated users can create questions" ON questions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create RLS policy for authenticated users to update questions
CREATE POLICY "Users can update questions" ON questions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create RLS policy for authenticated users to delete questions
CREATE POLICY "Users can delete questions" ON questions
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comments for documentation
COMMENT ON TABLE questions IS 'Questions table storing all course questions';
COMMENT ON COLUMN questions.id IS 'Unique identifier for the question';
COMMENT ON COLUMN questions.course_id IS 'Foreign key to courses table';
COMMENT ON COLUMN questions.timestamp IS 'Video timestamp when question appears (seconds)';
COMMENT ON COLUMN questions.frame_timestamp IS 'Video timestamp (seconds) when overlay should appear for visual questions';
COMMENT ON COLUMN questions.question IS 'The question text';
COMMENT ON COLUMN questions.type IS 'Question type: multiple-choice, true-false, hotspot, matching, sequencing';
COMMENT ON COLUMN questions.options IS 'JSON array of answer options for multiple choice questions';
COMMENT ON COLUMN questions.correct_answer IS 'Index of the correct answer';
COMMENT ON COLUMN questions.explanation IS 'Explanation for the correct answer';
COMMENT ON COLUMN questions.has_visual_asset IS 'Whether question has visual elements';
COMMENT ON COLUMN questions.metadata IS 'JSON metadata containing detected_elements, matching_pairs, and other visual question data';
COMMENT ON COLUMN questions.quality_score IS 'Overall quality score (0-100) from Quiz Generation Pipeline v4.0';
COMMENT ON COLUMN questions.meets_threshold IS 'Whether question meets quality threshold from Pipeline v4.0';
COMMENT ON COLUMN questions.created_at IS 'Timestamp when question was created';
COMMENT ON COLUMN questions.updated_at IS 'Timestamp when question was last updated';
COMMENT ON COLUMN questions.accepted IS 'Whether question has been accepted/approved';