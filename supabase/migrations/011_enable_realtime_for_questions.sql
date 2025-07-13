-- Enable real-time for questions table to support live question generation updates
-- This is required for the live question generation feature to work properly

-- Drop existing publication if it exists
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication with the necessary tables
CREATE PUBLICATION supabase_realtime FOR TABLE 
  questions,
  course_segments,
  question_plans;

-- Note: The above ensures real-time events are sent for INSERT, UPDATE, and DELETE operations
-- on these tables. This is crucial for the live question generation feature. 