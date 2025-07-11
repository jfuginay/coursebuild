-- Migration: Rename user_question_attempts to user_question_responses
-- This aligns the table name with what's being used in the API and other migrations

-- 1. Rename the table
ALTER TABLE user_question_attempts RENAME TO user_question_responses;

-- 2. Rename the primary key constraint
ALTER TABLE user_question_responses 
RENAME CONSTRAINT user_question_attempts_pkey TO user_question_responses_pkey;

-- 3. Update indexes with new names
DROP INDEX IF EXISTS idx_user_question_attempts_user_id;
DROP INDEX IF EXISTS idx_user_question_attempts_question_id;
DROP INDEX IF EXISTS idx_user_question_attempts_course_id;

CREATE INDEX IF NOT EXISTS idx_user_question_responses_user_id ON user_question_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_responses_question_id ON user_question_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_responses_course_id ON user_question_responses(course_id);

-- 4. Update RLS policies
DROP POLICY IF EXISTS "Users can view own question attempts" ON user_question_responses;
DROP POLICY IF EXISTS "Users can insert own question attempts" ON user_question_responses;

CREATE POLICY "Users can view own question responses" ON user_question_responses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question responses" ON user_question_responses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Add service role policy if not exists
CREATE POLICY IF NOT EXISTS "Service role full access to question responses" ON user_question_responses
    FOR ALL USING (auth.role() = 'service_role');

-- 6. Update the calculate_course_completion function to use the new table name
CREATE OR REPLACE FUNCTION calculate_course_completion(user_id_param UUID, course_id_param UUID)
RETURNS FLOAT AS $$
DECLARE
    total_questions INTEGER;
    completed_questions INTEGER;
    completion_percentage FLOAT;
BEGIN
    -- Get total questions for the course
    SELECT COUNT(*) INTO total_questions
    FROM questions
    WHERE course_id = course_id_param;
    
    -- Get questions correctly answered by user
    SELECT COUNT(*) INTO completed_questions
    FROM user_question_responses
    WHERE user_id = user_id_param 
    AND course_id = course_id_param 
    AND is_correct = TRUE;
    
    -- Calculate percentage
    IF total_questions = 0 THEN
        completion_percentage := 0.0;
    ELSE
        completion_percentage := (completed_questions::FLOAT / total_questions::FLOAT) * 100.0;
    END IF;
    
    -- Update enrollment record
    UPDATE user_course_enrollments
    SET completion_percentage = completion_percentage,
        completed_at = CASE WHEN completion_percentage >= 80.0 THEN NOW() ELSE NULL END,
        last_accessed_at = NOW()
    WHERE user_id = user_id_param AND course_id = course_id_param;
    
    RETURN completion_percentage;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update the user_dashboard_stats view
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    p.id as user_id,
    p.email,
    p.display_name,
    p.subscription_tier,
    COUNT(DISTINCT uce.course_id) as courses_enrolled,
    COUNT(DISTINCT CASE WHEN uce.completion_percentage >= 80 THEN uce.course_id END) as courses_completed,
    COALESCE(SUM(uqr.is_correct::INTEGER), 0) as total_correct_answers,
    COUNT(DISTINCT uqr.question_id) as total_questions_attempted,
    COALESCE(SUM(ua.points_awarded), 0) as total_points,
    COUNT(ua.id) as total_achievements
FROM profiles p
LEFT JOIN user_course_enrollments uce ON p.id = uce.user_id
LEFT JOIN user_question_responses uqr ON p.id = uqr.user_id
LEFT JOIN user_achievements ua ON p.id = ua.user_id
GROUP BY p.id, p.email, p.display_name, p.subscription_tier;

-- 8. Add comment for documentation
COMMENT ON TABLE user_question_responses IS 'Tracks user responses to quiz questions, including correctness and timing';