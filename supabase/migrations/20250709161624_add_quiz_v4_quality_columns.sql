-- Add missing columns for Quiz Generation Pipeline v4.0
-- These columns are needed for quality metrics tracking

-- Add meets_threshold and quality_score to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS quality_score INTEGER,
ADD COLUMN IF NOT EXISTS meets_threshold BOOLEAN DEFAULT FALSE;

-- Create question_quality_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS question_quality_metrics (
    id SERIAL PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL,
    educational_value_score INTEGER NOT NULL,
    clarity_score INTEGER NOT NULL,
    cognitive_appropriateness_score INTEGER NOT NULL,
    bloom_alignment_score INTEGER NOT NULL,
    misconception_handling_score INTEGER NOT NULL,
    explanation_quality_score INTEGER NOT NULL,
    meets_threshold BOOLEAN NOT NULL DEFAULT FALSE,
    verification_confidence DECIMAL(3,2) NOT NULL,
    quality_analysis TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_quality_metrics_question_id ON question_quality_metrics(question_id);
CREATE INDEX IF NOT EXISTS idx_questions_quality_score ON questions(quality_score);
CREATE INDEX IF NOT EXISTS idx_questions_meets_threshold ON questions(meets_threshold);

-- Add comments for documentation
COMMENT ON COLUMN questions.quality_score IS 'Overall quality score (0-100) from Quiz Generation Pipeline v4.0';
COMMENT ON COLUMN questions.meets_threshold IS 'Whether question meets quality threshold from Pipeline v4.0';
COMMENT ON TABLE question_quality_metrics IS 'Detailed quality metrics from Quiz Generation Pipeline v4.0 AI verification';
