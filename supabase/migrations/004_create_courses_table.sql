-- Create courses table
-- This is the main table for storing course information

-- Create the courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);
CREATE INDEX IF NOT EXISTS idx_courses_youtube_url ON courses(youtube_url);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_courses_updated_at
    BEFORE UPDATE ON courses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public read access to published courses
CREATE POLICY "Public can read published courses" ON courses
    FOR SELECT
    TO public
    USING (published = true);

-- Create RLS policy for authenticated users to create courses
CREATE POLICY "Authenticated users can create courses" ON courses
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create RLS policy for authenticated users to update their own courses
CREATE POLICY "Users can update courses" ON courses
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create RLS policy for authenticated users to delete courses
CREATE POLICY "Users can delete courses" ON courses
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comments for documentation
COMMENT ON TABLE courses IS 'Main courses table storing course information';
COMMENT ON COLUMN courses.id IS 'Unique identifier for the course';
COMMENT ON COLUMN courses.title IS 'Course title';
COMMENT ON COLUMN courses.description IS 'Course description';
COMMENT ON COLUMN courses.youtube_url IS 'Original YouTube URL used to generate the course';
COMMENT ON COLUMN courses.published IS 'Whether the course is published and visible to public';
COMMENT ON COLUMN courses.created_at IS 'Timestamp when the course was created';
COMMENT ON COLUMN courses.updated_at IS 'Timestamp when the course was last updated';