-- Migration: Add Chat Insights and Learning Profiles for Enhanced Recommendations
-- Description: Creates tables for storing extracted insights from AI chat conversations
-- and user learning profiles for personalized course recommendations

-- =====================================================================================
-- CHAT INSIGHTS TABLE
-- =====================================================================================
-- Stores raw insights extracted from each chat interaction

CREATE TABLE IF NOT EXISTS chat_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  
  -- Insight categorization
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'struggling_concept',
    'learning_preference', 
    'interest_expression',
    'goal_statement',
    'confusion_point',
    'understanding_confirmation',
    'engagement_pattern',
    'frustration_indicator',
    'success_moment'
  )),
  
  -- Extracted insight data
  insight_content JSONB NOT NULL,
  confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Context from the conversation
  user_message TEXT NOT NULL,
  assistant_response TEXT,
  conversation_context JSONB,
  
  -- Metadata
  extracted_concepts TEXT[],
  extracted_topics TEXT[],
  sentiment_score FLOAT CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient querying
  CONSTRAINT unique_message_insight UNIQUE(message_id, insight_type)
);

-- Create indexes for performance
CREATE INDEX idx_chat_insights_user_id ON chat_insights(user_id);
CREATE INDEX idx_chat_insights_course_id ON chat_insights(course_id);
CREATE INDEX idx_chat_insights_session_id ON chat_insights(session_id);
CREATE INDEX idx_chat_insights_type ON chat_insights(insight_type);
CREATE INDEX idx_chat_insights_created_at ON chat_insights(created_at DESC);
CREATE INDEX idx_chat_insights_concepts ON chat_insights USING GIN(extracted_concepts);
CREATE INDEX idx_chat_insights_topics ON chat_insights USING GIN(extracted_topics);

-- =====================================================================================
-- USER LEARNING PROFILES TABLE
-- =====================================================================================
-- Aggregated learning profile built from chat insights and performance data

CREATE TABLE IF NOT EXISTS user_learning_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Learning style preferences (derived from chat insights)
  learning_style JSONB DEFAULT '{}',
  -- Example structure:
  -- {
  --   "visual": 0.8,
  --   "sequential": 0.6,
  --   "conceptual": 0.7,
  --   "practical": 0.9,
  --   "collaborative": 0.4,
  --   "independent": 0.6
  -- }
  
  -- Difficulty preferences
  preferred_difficulty JSONB DEFAULT '{}',
  -- Example: {"beginner": 0.2, "intermediate": 0.7, "advanced": 0.1}
  
  -- Topic interests (weighted by frequency and recency)
  topic_interests JSONB DEFAULT '{}',
  -- Example: {"machine learning": 0.9, "web development": 0.6, "data science": 0.8}
  
  -- Struggling areas
  struggling_concepts JSONB DEFAULT '[]',
  -- Array of: {"concept": "recursion", "severity": 0.8, "last_seen": "2024-01-01", "frequency": 3}
  
  -- Mastered concepts
  mastered_concepts JSONB DEFAULT '[]',
  -- Array of: {"concept": "loops", "confidence": 0.9, "last_demonstrated": "2024-01-01"}
  
  -- Learning goals
  stated_goals JSONB DEFAULT '[]',
  -- Array of: {"goal": "become a data scientist", "priority": 1, "mentioned_at": "2024-01-01"}
  
  -- Engagement patterns
  engagement_metrics JSONB DEFAULT '{}',
  -- {
  --   "avg_session_duration": 1800,
  --   "questions_per_session": 5.2,
  --   "clarification_rate": 0.3,
  --   "frustration_events": 2,
  --   "success_celebrations": 8
  -- }
  
  -- Time preferences
  time_preferences JSONB DEFAULT '{}',
  -- {"preferred_session_length": 30, "best_time_of_day": "evening", "frequency": "daily"}
  
  -- Content format preferences
  content_preferences JSONB DEFAULT '{}',
  -- {"video": 0.8, "text": 0.5, "interactive": 0.9, "audio": 0.3}
  
  -- Profile metadata
  profile_version INT DEFAULT 1,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_insights_processed INT DEFAULT 0,
  profile_confidence FLOAT DEFAULT 0.5,
  
  -- Constraints
  CONSTRAINT unique_user_profile UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX idx_learning_profiles_user_id ON user_learning_profiles(user_id);
CREATE INDEX idx_learning_profiles_updated ON user_learning_profiles(last_updated DESC);

-- =====================================================================================
-- RECOMMENDATION HISTORY TABLE
-- =====================================================================================
-- Track recommendations made and their effectiveness

CREATE TABLE IF NOT EXISTS recommendation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recommendation details
  recommended_courses JSONB NOT NULL,
  -- Array of: {"course_id": "...", "title": "...", "score": 0.95, "reasons": [...]}
  
  recommendation_context JSONB NOT NULL,
  -- {
  --   "trigger": "course_completion|manual_request|chat_conversation",
  --   "previous_course_id": "...",
  --   "user_state": {...},
  --   "algorithm_version": "2.0"
  -- }
  
  -- Insights used for this recommendation
  insights_snapshot JSONB,
  performance_snapshot JSONB,
  
  -- User interaction
  user_feedback TEXT CHECK (user_feedback IN ('helpful', 'not_helpful', 'neutral')),
  courses_enrolled UUID[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  feedback_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  CONSTRAINT fk_recommendation_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE INDEX idx_recommendation_history_user ON recommendation_history(user_id);
CREATE INDEX idx_recommendation_history_created ON recommendation_history(created_at DESC);

-- =====================================================================================
-- FUNCTIONS FOR PROFILE UPDATES
-- =====================================================================================

-- Function to update user learning profile based on new insights
CREATE OR REPLACE FUNCTION update_user_learning_profile(
  p_user_id UUID,
  p_new_insights JSONB[]
)
RETURNS VOID AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_current_profile RECORD;
  v_insight JSONB;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM user_learning_profiles WHERE user_id = p_user_id)
  INTO v_profile_exists;
  
  -- Create profile if it doesn't exist
  IF NOT v_profile_exists THEN
    INSERT INTO user_learning_profiles (
      user_id,
      learning_style,
      preferred_difficulty,
      topic_interests,
      struggling_concepts,
      mastered_concepts,
      engagement_metrics,
      time_preferences,
      content_preferences
    ) VALUES (
      p_user_id,
      '{}',
      '{"intermediate": 0.7}',
      '{}',
      '[]',
      '[]',
      '{}',
      '{}',
      '{"video": 0.8, "interactive": 0.7}'
    );
  END IF;
  
  -- Get current profile
  SELECT * INTO v_current_profile FROM user_learning_profiles WHERE user_id = p_user_id;
  
  -- Process each insight
  FOREACH v_insight IN ARRAY p_new_insights
  LOOP
    -- Update topic interests based on insight type
    IF v_insight->>'insight_type' = 'interest_expression' THEN
      UPDATE user_learning_profiles
      SET topic_interests = topic_interests || (v_insight->'extracted_topics')::jsonb
      WHERE user_id = p_user_id;
    END IF;
    
    -- Update struggling concepts
    IF v_insight->>'insight_type' IN ('struggling_concept', 'confusion_point') THEN
      UPDATE user_learning_profiles
      SET struggling_concepts = struggling_concepts || 
        jsonb_build_array(jsonb_build_object(
          'concept', v_insight->'insight_content'->>'description',
          'severity', COALESCE((v_insight->'insight_content'->>'severity')::float, 0.7),
          'last_seen', NOW(),
          'frequency', 1
        ))
      WHERE user_id = p_user_id;
    END IF;
    
    -- Update mastered concepts
    IF v_insight->>'insight_type' = 'understanding_confirmation' THEN
      UPDATE user_learning_profiles
      SET mastered_concepts = mastered_concepts || 
        jsonb_build_array(jsonb_build_object(
          'concept', v_insight->'insight_content'->>'description',
          'confidence', COALESCE((v_insight->'insight_content'->>'confidence')::float, 0.8),
          'last_demonstrated', NOW()
        ))
      WHERE user_id = p_user_id;
    END IF;
  END LOOP;
  
  -- Update metadata
  UPDATE user_learning_profiles
  SET 
    last_updated = NOW(),
    total_insights_processed = total_insights_processed + array_length(p_new_insights, 1),
    profile_confidence = LEAST(0.95, profile_confidence + (array_length(p_new_insights, 1) * 0.01))
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

-- Enable RLS
ALTER TABLE chat_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_history ENABLE ROW LEVEL SECURITY;

-- Chat insights policies
CREATE POLICY "Users can view their own chat insights"
  ON chat_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all chat insights"
  ON chat_insights FOR ALL
  USING (auth.role() = 'service_role');

-- Learning profiles policies
CREATE POLICY "Users can view their own learning profile"
  ON user_learning_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all learning profiles"
  ON user_learning_profiles FOR ALL
  USING (auth.role() = 'service_role');

-- Recommendation history policies
CREATE POLICY "Users can view their own recommendations"
  ON recommendation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all recommendations"
  ON recommendation_history FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================================================
-- ANALYTICS VIEWS
-- =====================================================================================

-- View for most common struggling concepts across all users
CREATE OR REPLACE VIEW v_common_struggling_concepts AS
SELECT 
  concept,
  COUNT(DISTINCT user_id) as affected_users,
  AVG((value->>'severity')::FLOAT) as avg_severity,
  MAX((value->>'last_seen')::TIMESTAMP) as most_recent
FROM 
  user_learning_profiles,
  LATERAL jsonb_array_elements(struggling_concepts) as value(concept)
GROUP BY concept
ORDER BY affected_users DESC, avg_severity DESC;

-- View for popular topic interests
CREATE OR REPLACE VIEW v_popular_topics AS
SELECT 
  topic.key as topic_name,
  AVG((topic.value)::FLOAT) as avg_interest,
  COUNT(*) as interested_users
FROM 
  user_learning_profiles,
  LATERAL jsonb_each(topic_interests) as topic
WHERE (topic.value)::FLOAT > 0.5
GROUP BY topic.key
ORDER BY interested_users DESC, avg_interest DESC;

COMMENT ON TABLE chat_insights IS 'Stores insights extracted from AI chat conversations using LLM analysis';
COMMENT ON TABLE user_learning_profiles IS 'Aggregated learning profiles built from chat insights and user behavior';
COMMENT ON TABLE recommendation_history IS 'History of course recommendations and their effectiveness'; 