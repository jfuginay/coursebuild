-- Create visual assets table
-- This table stores visual assets for questions

-- Create the visual_assets table
CREATE TABLE IF NOT EXISTS visual_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    asset_url TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visual_assets_course_id ON visual_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_asset_type ON visual_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_visual_assets_metadata ON visual_assets USING GIN(metadata);

-- Create updated_at trigger
CREATE TRIGGER update_visual_assets_updated_at
    BEFORE UPDATE ON visual_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public read access to visual assets of published courses
CREATE POLICY "Public can read visual assets of published courses" ON visual_assets
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = visual_assets.course_id 
            AND courses.published = true
        )
    );

-- Create RLS policy for authenticated users to create visual assets
CREATE POLICY "Authenticated users can create visual assets" ON visual_assets
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create RLS policy for authenticated users to update visual assets
CREATE POLICY "Users can update visual assets" ON visual_assets
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create RLS policy for authenticated users to delete visual assets
CREATE POLICY "Users can delete visual assets" ON visual_assets
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comments for documentation
COMMENT ON TABLE visual_assets IS 'Visual assets table storing images, videos, and other visual content for courses';
COMMENT ON COLUMN visual_assets.id IS 'Unique identifier for the visual asset';
COMMENT ON COLUMN visual_assets.course_id IS 'Foreign key to courses table';
COMMENT ON COLUMN visual_assets.asset_type IS 'Type of visual asset (image, video, etc.)';
COMMENT ON COLUMN visual_assets.asset_url IS 'URL or path to the visual asset';
COMMENT ON COLUMN visual_assets.metadata IS 'JSON metadata for the visual asset';
COMMENT ON COLUMN visual_assets.created_at IS 'Timestamp when asset was created';
COMMENT ON COLUMN visual_assets.updated_at IS 'Timestamp when asset was last updated';