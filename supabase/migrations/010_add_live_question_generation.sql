-- Migration: Add support for live question generation and real-time updates
-- This enables questions to be generated and displayed individually as they complete

-- Add question generation tracking to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS generation_status VARCHAR(50) DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES course_segments(id) ON DELETE CASCADE;

-- Create index for real-time subscriptions and status queries
CREATE INDEX IF NOT EXISTS idx_questions_course_status 
ON questions(course_id, generation_status, created_at);

CREATE INDEX IF NOT EXISTS idx_questions_segment 
ON questions(segment_id, timestamp);

-- Create question_plans table to persist quiz plans
CREATE TABLE IF NOT EXISTS question_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  segment_id UUID REFERENCES course_segments(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  question_id VARCHAR(255) NOT NULL,
  question_type VARCHAR(50) NOT NULL,
  timestamp NUMERIC NOT NULL,
  status VARCHAR(50) DEFAULT 'planned',
  plan_data JSONB NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique question IDs per course
  CONSTRAINT unique_question_id_per_course UNIQUE (course_id, question_id)
);

-- Create indexes for question_plans
CREATE INDEX idx_question_plans_course_segment 
ON question_plans(course_id, segment_id, status);

CREATE INDEX idx_question_plans_status 
ON question_plans(status, created_at);

-- Add planning status to course_segments
ALTER TABLE course_segments
ADD COLUMN IF NOT EXISTS planning_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS planned_questions_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS questions_generated_count INTEGER DEFAULT 0;

-- Create function to update segment question counts
CREATE OR REPLACE FUNCTION update_segment_question_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'questions' THEN
    -- Update questions_generated_count when a question is inserted
    UPDATE course_segments
    SET questions_generated_count = (
      SELECT COUNT(*) 
      FROM questions 
      WHERE segment_id = NEW.segment_id 
      AND generation_status = 'completed'
    )
    WHERE id = NEW.segment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating counts
DROP TRIGGER IF EXISTS update_segment_counts_on_question_insert ON questions;
CREATE TRIGGER update_segment_counts_on_question_insert
AFTER INSERT ON questions
FOR EACH ROW
EXECUTE FUNCTION update_segment_question_counts();

-- Add RLS policies for question_plans
ALTER TABLE question_plans ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to question_plans"
ON question_plans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read question plans for courses they created or enrolled in
CREATE POLICY "Users can read question plans for their courses"
ON question_plans
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_course_creations
    WHERE user_course_creations.course_id = question_plans.course_id
    AND user_course_creations.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM user_course_enrollments
    WHERE user_course_enrollments.course_id = question_plans.course_id
    AND user_course_enrollments.user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_plans_updated_at
BEFORE UPDATE ON question_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 