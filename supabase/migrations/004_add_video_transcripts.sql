-- Migration: Add video transcripts table for storing full video transcriptions
-- This stores the complete transcript data generated during Stage 1 planning in quiz-generation-v5

-- 1. Create video_transcripts table
CREATE TABLE IF NOT EXISTS video_transcripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_summary TEXT,
    total_duration INTEGER, -- Total video duration in seconds
    
    -- Full transcript as JSONB array
    full_transcript JSONB NOT NULL,
    -- Structure: [{timestamp, end_timestamp, text, visual_description, is_salient_event, event_type}, ...]
    
    -- Key concepts timeline as JSONB array  
    key_concepts_timeline JSONB,
    -- Structure: [{concept, first_mentioned, explanation_timestamps}, ...]
    
    -- Metadata
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
    processing_time_ms INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_video_transcripts_course_id ON video_transcripts(course_id);
CREATE INDEX IF NOT EXISTS idx_video_transcripts_video_url ON video_transcripts(video_url);
CREATE INDEX IF NOT EXISTS idx_video_transcripts_generated_at ON video_transcripts(generated_at);

-- 3. Create GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_video_transcripts_full_transcript ON video_transcripts USING GIN (full_transcript);
CREATE INDEX IF NOT EXISTS idx_video_transcripts_key_concepts ON video_transcripts USING GIN (key_concepts_timeline);

-- 4. Create updated_at trigger
CREATE TRIGGER update_video_transcripts_updated_at BEFORE UPDATE
    ON video_transcripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Add RLS policies (Row Level Security)
ALTER TABLE video_transcripts ENABLE ROW LEVEL SECURITY;

-- Allow public read access to transcripts for published courses
CREATE POLICY "Public video transcripts access" ON video_transcripts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = video_transcripts.course_id 
            AND courses.published = TRUE
        )
    );

-- 6. Add transcript reference to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS transcript_segment_id INTEGER, -- Reference to specific segment in transcript
ADD COLUMN IF NOT EXISTS transcript_context TEXT; -- Relevant transcript text for this question

-- 7. Create helper function to extract transcript segment by timestamp
CREATE OR REPLACE FUNCTION get_transcript_segment(
    p_course_id UUID,
    p_timestamp INTEGER
) RETURNS JSONB AS $$
DECLARE
    v_segment JSONB;
BEGIN
    SELECT segment
    INTO v_segment
    FROM video_transcripts vt,
         LATERAL jsonb_array_elements(vt.full_transcript) AS segment
    WHERE vt.course_id = p_course_id
      AND (segment->>'timestamp')::INTEGER <= p_timestamp
      AND (segment->>'end_timestamp')::INTEGER >= p_timestamp
    ORDER BY (segment->>'timestamp')::INTEGER DESC
    LIMIT 1;
    
    RETURN v_segment;
END;
$$ LANGUAGE plpgsql;

-- 8. Create view for easy transcript access
CREATE OR REPLACE VIEW transcript_segments AS
SELECT 
    vt.id as transcript_id,
    vt.course_id,
    vt.video_url,
    segment->>'timestamp' as timestamp,
    segment->>'end_timestamp' as end_timestamp,
    segment->>'text' as text,
    segment->>'visual_description' as visual_description,
    segment->>'is_salient_event' as is_salient_event,
    segment->>'event_type' as event_type
FROM video_transcripts vt,
     LATERAL jsonb_array_elements(vt.full_transcript) AS segment;

-- 9. Create view for key concepts
CREATE OR REPLACE VIEW transcript_key_concepts AS
SELECT 
    vt.id as transcript_id,
    vt.course_id,
    concept->>'concept' as concept,
    (concept->>'first_mentioned')::INTEGER as first_mentioned,
    concept->'explanation_timestamps' as explanation_timestamps
FROM video_transcripts vt,
     LATERAL jsonb_array_elements(vt.key_concepts_timeline) AS concept; 

-- 10. Add metadata column if not exists (for segment tracking)
ALTER TABLE video_transcripts
ADD COLUMN IF NOT EXISTS metadata JSONB; 