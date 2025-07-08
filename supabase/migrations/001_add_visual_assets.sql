-- Migration: Add visual assets support for quiz questions
-- This extends the existing schema to support frame capture, bounding boxes, and visual annotations

-- 1. Create visual_assets table for storing captured frames
CREATE TABLE IF NOT EXISTS visual_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL, -- Video timestamp in seconds
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('frame', 'thumbnail', 'generated')),
    image_url TEXT NOT NULL, -- URL to stored image
    thumbnail_url TEXT, -- Smaller version for performance
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    alt_text TEXT, -- Generated alt-text for accessibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create bounding_boxes table for hotspot question coordinates
CREATE TABLE IF NOT EXISTS bounding_boxes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    visual_asset_id UUID REFERENCES visual_assets(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- What this bounding box identifies
    x FLOAT NOT NULL, -- X coordinate (0-1 normalized)
    y FLOAT NOT NULL, -- Y coordinate (0-1 normalized)
    width FLOAT NOT NULL, -- Width (0-1 normalized)
    height FLOAT NOT NULL, -- Height (0-1 normalized)
    confidence_score FLOAT, -- AI confidence in this detection
    is_correct_answer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add visual enhancement fields to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS has_visual_asset BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS visual_asset_id UUID REFERENCES visual_assets(id),
ADD COLUMN IF NOT EXISTS fallback_prompt TEXT, -- For sketch mode generation
ADD COLUMN IF NOT EXISTS visual_question_type VARCHAR(20) CHECK (visual_question_type IN ('hotspot', 'matching', 'sequencing', 'annotation'));

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visual_assets_course_id ON visual_assets(course_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_question_id ON visual_assets(question_id);
CREATE INDEX IF NOT EXISTS idx_visual_assets_timestamp ON visual_assets(timestamp);
CREATE INDEX IF NOT EXISTS idx_bounding_boxes_question_id ON bounding_boxes(question_id);
CREATE INDEX IF NOT EXISTS idx_bounding_boxes_visual_asset_id ON bounding_boxes(visual_asset_id);

-- 5. Create updated_at trigger for visual_assets
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_visual_assets_updated_at BEFORE UPDATE
    ON visual_assets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Add RLS policies (Row Level Security)
ALTER TABLE visual_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounding_boxes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to visual assets for published courses
CREATE POLICY "Public visual assets access" ON visual_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = visual_assets.course_id 
            AND courses.published = TRUE
        )
    );

-- Allow public read access to bounding boxes for published courses
CREATE POLICY "Public bounding boxes access" ON bounding_boxes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM questions 
            JOIN courses ON courses.id = questions.course_id
            WHERE questions.id = bounding_boxes.question_id 
            AND courses.published = TRUE
        )
    );

-- 7. Create storage bucket for visual assets (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-visuals', 'course-visuals', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Storage policies for course visuals
CREATE POLICY "Public course visual assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-visuals');
