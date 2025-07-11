-- Add onboarding_completed field to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add an index for efficient querying
CREATE INDEX idx_user_profiles_onboarding_completed 
ON user_profiles(user_id, onboarding_completed);

-- Add a comment for documentation
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Tracks whether the user has completed the onboarding guided tour for first-time course visitors';