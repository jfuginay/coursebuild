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
ON user_question_responses(user_id, enrollment_id, is_skipped) 
WHERE is_skipped = TRUE;

-- 5. Update existing records to set is_skipped = FALSE where not already set
UPDATE user_question_responses 
SET is_skipped = FALSE 
WHERE is_skipped IS NULL;

-- 6. Function to track skipped questions (using enrollment_id)
CREATE OR REPLACE FUNCTION track_skipped_question(
    p_user_id UUID,
    p_question_id UUID,
    p_enrollment_id UUID,
    p_selected_answer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_response_id UUID;
BEGIN
    INSERT INTO user_question_responses (
        user_id,
        question_id,
        enrollment_id,
        selected_answer,
        response_text,
        is_correct,
        is_skipped,
        points_earned,
        max_points,
        response_time_ms,
        attempted_at,
        attempt_number,
        is_final_attempt
    ) VALUES (
        p_user_id,
        p_question_id,
        p_enrollment_id,
        p_selected_answer,
        'Question skipped',
        NULL, -- is_correct is NULL for skipped questions
        TRUE, -- is_skipped
        0, -- No points for skipped questions
        1, -- Max points would have been 1
        0, -- No time spent
        NOW(),
        1, -- First attempt
        TRUE -- Final attempt since it's skipped
    )
    RETURNING id INTO v_response_id;
    
    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Alternative function that takes course_id and finds enrollment
CREATE OR REPLACE FUNCTION track_skipped_question_by_course(
    p_user_id UUID,
    p_question_id UUID,
    p_course_id UUID,
    p_selected_answer TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_enrollment_id UUID;
    v_response_id UUID;
BEGIN
    -- Find the enrollment_id for this user and course
    SELECT id INTO v_enrollment_id
    FROM course_enrollments
    WHERE user_id = p_user_id 
    AND course_id = p_course_id
    ORDER BY enrolled_at DESC
    LIMIT 1;
    
    IF v_enrollment_id IS NULL THEN
        -- Create enrollment if it doesn't exist
        INSERT INTO course_enrollments (user_id, course_id)
        VALUES (p_user_id, p_course_id)
        RETURNING id INTO v_enrollment_id;
    END IF;
    
    -- Now track the skipped question
    SELECT track_skipped_question(
        p_user_id,
        p_question_id,
        v_enrollment_id,
        p_selected_answer
    ) INTO v_response_id;
    
    RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant necessary permissions
GRANT EXECUTE ON FUNCTION track_skipped_question TO authenticated;
GRANT EXECUTE ON FUNCTION track_skipped_question_by_course TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN user_question_responses.is_skipped IS 'Indicates if the user skipped this question without answering';
COMMENT ON FUNCTION track_skipped_question IS 'Records when a user skips a question without answering (requires enrollment_id)';
COMMENT ON FUNCTION track_skipped_question_by_course IS 'Records when a user skips a question without answering (takes course_id and finds/creates enrollment)';