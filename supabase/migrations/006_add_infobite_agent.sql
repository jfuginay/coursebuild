-- InfoBite Agent Migration
-- Adds learner event tracking and hint cooldown management

-- 1. Create learner_events table for behavioral tracking
CREATE TABLE IF NOT EXISTS learner_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('WATCH', 'QUIZ_WRONG', 'HINT_SHOWN')),
    video_timestamp INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_hint_cooldowns table for managing hint frequency
CREATE TABLE IF NOT EXISTS user_hint_cooldowns (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    last_hint_timestamp TIMESTAMPTZ,
    hint_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, course_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_learner_events_user_course ON learner_events(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_learner_events_type ON learner_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learner_events_created_at ON learner_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learner_events_composite ON learner_events(user_id, course_id, event_type, created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE learner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hint_cooldowns ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for learner_events
CREATE POLICY "Users can view own events" ON learner_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON learner_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role full access to learner_events" ON learner_events
    FOR ALL USING (auth.role() = 'service_role');

-- 6. RLS Policies for user_hint_cooldowns
CREATE POLICY "Users can view own cooldowns" ON user_hint_cooldowns
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cooldowns" ON user_hint_cooldowns
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cooldowns" ON user_hint_cooldowns
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to cooldowns" ON user_hint_cooldowns
    FOR ALL USING (auth.role() = 'service_role');

-- 7. Function to get wrong answer streak
CREATE OR REPLACE FUNCTION get_wrong_answer_streak(
    p_user_id UUID,
    p_course_id UUID,
    p_time_window INTERVAL DEFAULT '10 minutes'
)
RETURNS INTEGER AS $$
DECLARE
    streak INTEGER := 0;
    last_correct_time TIMESTAMPTZ;
BEGIN
    -- Find the last correct answer time
    SELECT MAX(created_at) INTO last_correct_time
    FROM user_question_responses
    WHERE user_id = p_user_id 
    AND course_id = p_course_id
    AND is_correct = true
    AND created_at > NOW() - p_time_window;

    -- Count wrong answers since last correct (or in time window)
    SELECT COUNT(*) INTO streak
    FROM learner_events
    WHERE user_id = p_user_id
    AND course_id = p_course_id
    AND event_type = 'QUIZ_WRONG'
    AND created_at > COALESCE(last_correct_time, NOW() - p_time_window);

    RETURN streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to check hint cooldown
CREATE OR REPLACE FUNCTION check_hint_cooldown(
    p_user_id UUID,
    p_course_id UUID,
    p_cooldown_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    last_hint TIMESTAMPTZ;
BEGIN
    SELECT last_hint_timestamp INTO last_hint
    FROM user_hint_cooldowns
    WHERE user_id = p_user_id AND course_id = p_course_id;

    IF last_hint IS NULL THEN
        RETURN TRUE; -- No previous hint, allowed
    END IF;

    RETURN (EXTRACT(EPOCH FROM (NOW() - last_hint)) >= p_cooldown_seconds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to update hint cooldown
CREATE OR REPLACE FUNCTION update_hint_cooldown(
    p_user_id UUID,
    p_course_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_hint_cooldowns (user_id, course_id, last_hint_timestamp, hint_count)
    VALUES (p_user_id, p_course_id, NOW(), 1)
    ON CONFLICT (user_id, course_id)
    DO UPDATE SET 
        last_hint_timestamp = NOW(),
        hint_count = user_hint_cooldowns.hint_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Enable realtime for learner_events (optional, for live monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE learner_events;

-- Comments for documentation
COMMENT ON TABLE learner_events IS 'Event stream for tracking learner behavior (watching, wrong answers, hints shown)';
COMMENT ON TABLE user_hint_cooldowns IS 'Tracks last hint timestamp to prevent spam';
COMMENT ON FUNCTION get_wrong_answer_streak IS 'Returns the current wrong answer streak for a user in a course';
COMMENT ON FUNCTION check_hint_cooldown IS 'Checks if enough time has passed since the last hint';
COMMENT ON FUNCTION update_hint_cooldown IS 'Updates the last hint timestamp for cooldown management';