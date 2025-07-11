-- Add skip tracking to user_question_attempts
-- This migration adds support for tracking when users skip questions

-- 1. Add is_skipped column to user_question_attempts table
ALTER TABLE user_question_attempts 
ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE;

-- 2. Update is_correct to allow NULL values for skipped questions
ALTER TABLE user_question_attempts 
ALTER COLUMN is_correct DROP NOT NULL;

-- 3. Add check constraint to ensure logical consistency
-- Either the question is skipped OR it has a correct/incorrect status
ALTER TABLE user_question_attempts
ADD CONSTRAINT check_skip_or_answer CHECK (
    (is_skipped = TRUE AND is_correct IS NULL) OR 
    (is_skipped = FALSE AND is_correct IS NOT NULL)
);

-- 4. Add index for performance when querying skipped questions
CREATE INDEX IF NOT EXISTS idx_user_question_attempts_skipped 
ON user_question_attempts(user_id, course_id, is_skipped) 
WHERE is_skipped = TRUE;

-- 5. Update existing records to set is_skipped = FALSE where not already set
UPDATE user_question_attempts 
SET is_skipped = FALSE 
WHERE is_skipped IS NULL;

-- 6. Function to track skipped questions
CREATE OR REPLACE FUNCTION track_skipped_question(
    p_user_id UUID,
    p_question_id UUID,
    p_course_id UUID,
    p_selected_answer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_response_id UUID;
BEGIN
    INSERT INTO user_question_attempts (
        user_id,
        question_id,
        course_id,
        selected_answer,
        is_correct,
        is_skipped,
        time_spent_seconds,
        attempt_number,
        attempted_at,
        hints_used
    ) VALUES (
        p_user_id,
        p_question_id,
        p_course_id,
        p_selected_answer,
        NULL, -- is_correct is NULL for skipped questions
        TRUE, -- is_skipped
        0, -- No time spent on skipped questions
        1, -- First attempt
        NOW(), -- Current timestamp
        0 -- No hints used
    )
    RETURNING id INTO v_response_id;
    
    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a view to maintain compatibility with code expecting user_question_responses
CREATE OR REPLACE VIEW user_question_responses AS
SELECT 
    id,
    user_id,
    question_id,
    course_id,
    selected_answer,
    is_correct,
    time_spent_seconds as time_spent,
    attempted_at as created_at,
    is_skipped
FROM user_question_attempts;

-- 8. Create instead of triggers for the view to handle inserts/updates
CREATE OR REPLACE FUNCTION handle_user_question_responses_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_question_attempts (
        user_id,
        question_id,
        course_id,
        selected_answer,
        is_correct,
        is_skipped,
        time_spent_seconds,
        attempt_number,
        attempted_at,
        hints_used
    ) VALUES (
        NEW.user_id,
        NEW.question_id,
        NEW.course_id,
        NEW.selected_answer,
        NEW.is_correct,
        COALESCE(NEW.is_skipped, FALSE),
        COALESCE(NEW.time_spent, 0),
        1,
        COALESCE(NEW.created_at, NOW()),
        0
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_question_responses_insert_trigger
INSTEAD OF INSERT ON user_question_responses
FOR EACH ROW
EXECUTE FUNCTION handle_user_question_responses_insert();

-- 9. Grant permissions
GRANT SELECT, INSERT ON user_question_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_question_attempts TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN user_question_attempts.is_skipped IS 'Indicates if the user skipped this question without answering';
COMMENT ON FUNCTION track_skipped_question IS 'Records when a user skips a question without answering';
COMMENT ON VIEW user_question_responses IS 'Compatibility view for code expecting user_question_responses table';

-- 10. Grant necessary permissions
GRANT EXECUTE ON FUNCTION track_skipped_question TO authenticated;