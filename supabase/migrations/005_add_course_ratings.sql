-- Course Rating System Migration
-- Creates tables and views for 5-star course rating functionality

-- Main ratings table
CREATE TABLE course_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context about when/how the rating was given
    rating_context VARCHAR(50) DEFAULT 'completion' CHECK (rating_context IN ('completion', 'mid_course', 'question_success', 'manual')),
    
    -- Engagement metrics for quality scoring
    engagement_score FLOAT DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    questions_answered INTEGER DEFAULT 0,
    completion_percentage FLOAT DEFAULT 0,
    
    -- Prevent duplicate ratings per user per course
    UNIQUE(user_id, course_id)
);

-- Indexes for performance
CREATE INDEX idx_course_ratings_course_id ON course_ratings(course_id);
CREATE INDEX idx_course_ratings_rating ON course_ratings(rating);
CREATE INDEX idx_course_ratings_user_id ON course_ratings(user_id);
CREATE INDEX idx_course_ratings_created_at ON course_ratings(created_at);

-- Materialized view for fast rating aggregations
CREATE MATERIALIZED VIEW course_rating_stats AS
SELECT 
    course_id,
    ROUND(AVG(rating)::numeric, 2) as average_rating,
    COUNT(*) as total_ratings,
    COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
    COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
    COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
    COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
    COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
    COUNT(*) FILTER (WHERE rating >= 4) as four_plus_star_count,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rating) as median_rating,
    MAX(created_at) as last_rated_at,
    ROUND(AVG(engagement_score)::numeric, 2) as avg_engagement_score
FROM course_ratings 
GROUP BY course_id;

-- Unique index for materialized view
CREATE UNIQUE INDEX idx_course_rating_stats_course_id ON course_rating_stats(course_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_course_rating_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY course_rating_stats;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-refresh stats when ratings change
CREATE OR REPLACE FUNCTION trigger_refresh_rating_stats()
RETURNS trigger AS $$
BEGIN
    -- Schedule a refresh of the materialized view
    PERFORM refresh_course_rating_stats();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger on rating changes
CREATE TRIGGER rating_stats_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON course_ratings
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_rating_stats();

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
    time_spent INTEGER,
    questions_answered INTEGER,
    completion_percentage FLOAT,
    rating_context VARCHAR(50)
)
RETURNS FLOAT AS $$
DECLARE
    score FLOAT := 0;
BEGIN
    -- Base score from time spent (max 30 points)
    score := score + LEAST(time_spent * 0.5, 30);
    
    -- Questions answered bonus (max 25 points)
    score := score + LEAST(questions_answered * 5, 25);
    
    -- Completion percentage (max 30 points)
    score := score + (completion_percentage * 30);
    
    -- Context bonus
    CASE rating_context
        WHEN 'completion' THEN score := score + 15;
        WHEN 'question_success' THEN score := score + 10;
        WHEN 'mid_course' THEN score := score + 5;
        ELSE score := score + 0;
    END CASE;
    
    RETURN LEAST(score, 100); -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate engagement score on insert/update
CREATE OR REPLACE FUNCTION auto_calculate_engagement_score()
RETURNS trigger AS $$
BEGIN
    NEW.engagement_score := calculate_engagement_score(
        NEW.time_spent_minutes,
        NEW.questions_answered,
        NEW.completion_percentage,
        NEW.rating_context
    );
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_engagement_score_trigger
    BEFORE INSERT OR UPDATE ON course_ratings
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_engagement_score();

-- RLS (Row Level Security) policies
ALTER TABLE course_ratings ENABLE ROW LEVEL SECURITY;

-- Users can read all ratings
CREATE POLICY "Anyone can view course ratings" ON course_ratings
    FOR SELECT USING (true);

-- Users can only insert their own ratings
CREATE POLICY "Users can insert their own ratings" ON course_ratings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own ratings
CREATE POLICY "Users can update their own ratings" ON course_ratings
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own ratings
CREATE POLICY "Users can delete their own ratings" ON course_ratings
    FOR DELETE USING (auth.uid() = user_id);

-- Allow anonymous users to view rating stats
ALTER TABLE course_rating_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view rating statistics" ON course_rating_stats
    FOR SELECT USING (true);

-- Initial refresh of materialized view
SELECT refresh_course_rating_stats();

-- Comments for documentation
COMMENT ON TABLE course_ratings IS 'User ratings for courses (1-5 stars) with engagement tracking';
COMMENT ON TABLE course_rating_stats IS 'Materialized view with aggregated rating statistics for fast queries';
COMMENT ON FUNCTION calculate_engagement_score IS 'Calculates engagement score based on user behavior during course';
COMMENT ON FUNCTION refresh_course_rating_stats IS 'Refreshes the rating statistics materialized view';