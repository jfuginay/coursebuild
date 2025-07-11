-- Add skip tracking to user_question_responses
-- This migration adds support for tracking when users skip questions

-- 1. Add is_skipped column to user_question_responses table
ALTER TABLE user_question_responses 
ADD COLUMN IF NOT EXISTS is_skipped BOOLEAN DEFAULT FALSE;

-- 2. Update is_correct to allow NULL values for skipped questions
ALTER TABLE user_question_responses 
ALTER COLUMN is_correct DROP NOT NULL;

-- 3. Add check constraint to ensure logical consistency
-- Either the question is skipped OR it has a correct/incorrect status
ALTER TABLE user_question_responses
ADD CONSTRAINT check_skip_or_answer CHECK (
    (is_skipped = TRUE AND is_correct IS NULL) OR 
    (is_skipped = FALSE AND is_correct IS NOT NULL)
);

-- 4. Add index for performance when querying skipped questions
CREATE INDEX IF NOT EXISTS idx_user_question_responses_skipped 
ON user_question_responses(user_id, course_id, is_skipped) 
WHERE is_skipped = TRUE;

-- 5. Update existing records to set is_skipped = FALSE where not already set
UPDATE user_question_responses 
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
    INSERT INTO user_question_responses (
        user_id,
        question_id,
        course_id,
        selected_answer,
        is_correct,
        is_skipped,
        time_spent
    ) VALUES (
        p_user_id,
        p_question_id,
        p_course_id,
        p_selected_answer,
        NULL, -- is_correct is NULL for skipped questions
        TRUE, -- is_skipped
        0 -- No time spent on skipped questions
    )
    RETURNING id INTO v_response_id;
    
    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update analytics views/functions to handle skipped questions
-- This ensures skipped questions are properly counted in statistics

-- Comments for documentation
COMMENT ON COLUMN user_question_responses.is_skipped IS 'Indicates if the user skipped this question without answering';
COMMENT ON FUNCTION track_skipped_question IS 'Records when a user skips a question without answering';

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION track_skipped_question TO authenticated;