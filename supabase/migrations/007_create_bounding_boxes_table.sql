-- Create bounding boxes table
-- This table stores bounding box coordinates for hotspot questions

-- Create the bounding_boxes table
CREATE TABLE IF NOT EXISTS bounding_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    visual_asset_id UUID REFERENCES visual_assets(id) ON DELETE SET NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    label TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bounding_boxes_question_id ON bounding_boxes(question_id);
CREATE INDEX IF NOT EXISTS idx_bounding_boxes_visual_asset_id ON bounding_boxes(visual_asset_id);
CREATE INDEX IF NOT EXISTS idx_bounding_boxes_metadata ON bounding_boxes USING GIN(metadata);

-- Create updated_at trigger
CREATE TRIGGER update_bounding_boxes_updated_at
    BEFORE UPDATE ON bounding_boxes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE bounding_boxes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for public read access to bounding boxes for published courses
CREATE POLICY "Public can read bounding boxes for published courses" ON bounding_boxes
    FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM questions 
            JOIN courses ON courses.id = questions.course_id
            WHERE questions.id = bounding_boxes.question_id 
            AND courses.published = true
        )
    );

-- Create RLS policy for authenticated users to create bounding boxes
CREATE POLICY "Authenticated users can create bounding boxes" ON bounding_boxes
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Create RLS policy for authenticated users to update bounding boxes
CREATE POLICY "Users can update bounding boxes" ON bounding_boxes
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create RLS policy for authenticated users to delete bounding boxes
CREATE POLICY "Users can delete bounding boxes" ON bounding_boxes
    FOR DELETE
    TO authenticated
    USING (true);

-- Add comments for documentation
COMMENT ON TABLE bounding_boxes IS 'Bounding boxes table storing coordinates for hotspot questions';
COMMENT ON COLUMN bounding_boxes.id IS 'Unique identifier for the bounding box';
COMMENT ON COLUMN bounding_boxes.question_id IS 'Foreign key to questions table';
COMMENT ON COLUMN bounding_boxes.visual_asset_id IS 'Foreign key to visual_assets table (nullable for video overlay)';
COMMENT ON COLUMN bounding_boxes.x IS 'X coordinate of the bounding box';
COMMENT ON COLUMN bounding_boxes.y IS 'Y coordinate of the bounding box';
COMMENT ON COLUMN bounding_boxes.width IS 'Width of the bounding box';
COMMENT ON COLUMN bounding_boxes.height IS 'Height of the bounding box';
COMMENT ON COLUMN bounding_boxes.label IS 'Label for the bounding box';
COMMENT ON COLUMN bounding_boxes.metadata IS 'JSON metadata for the bounding box';
COMMENT ON COLUMN bounding_boxes.created_at IS 'Timestamp when bounding box was created';
COMMENT ON COLUMN bounding_boxes.updated_at IS 'Timestamp when bounding box was last updated';