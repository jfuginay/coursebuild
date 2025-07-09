-- Migration: Add comprehensive user management system
-- This adds user profiles, course enrollments, and progress tracking

-- 1. Create profiles table for additional user data (standard Supabase pattern)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create user_course_enrollments table for tracking course access
CREATE TABLE IF NOT EXISTS user_course_enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    completion_percentage FLOAT DEFAULT 0.0 CHECK (completion_percentage >= 0.0 AND completion_percentage <= 100.0),
    completed_at TIMESTAMP WITH TIME ZONE,
    enrollment_type VARCHAR(20) DEFAULT 'free' CHECK (enrollment_type IN ('free', 'purchased', 'gifted', 'admin')),
    UNIQUE(user_id, course_id)
);

-- 3. Create user_question_attempts table for tracking question responses
CREATE TABLE IF NOT EXISTS user_question_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    selected_answer INTEGER,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER,
    attempt_number INTEGER DEFAULT 1,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hints_used INTEGER DEFAULT 0,
    explanation_viewed BOOLEAN DEFAULT FALSE
);

-- 4. Create user_course_progress table for detailed progress tracking
CREATE TABLE IF NOT EXISTS user_course_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL,
    segment_title TEXT,
    questions_answered INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    last_question_timestamp INTEGER DEFAULT 0,
    video_progress_seconds INTEGER DEFAULT 0,
    segment_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id, segment_index)
);

-- 5. Create user_achievements table for gamification
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT,
    points_awarded INTEGER DEFAULT 0,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 6. Create user_sessions table for session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_end TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    pages_visited TEXT[],
    device_info JSONB,
    ip_address INET
);

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_user_id ON user_course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_course_id ON user_course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_user_enrollments_enrollment_type ON user_course_enrollments(enrollment_type);
CREATE INDEX IF NOT EXISTS idx_user_question_attempts_user_id ON user_question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_attempts_question_id ON user_question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_user_question_attempts_course_id ON user_question_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_user_id ON user_course_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_progress_course_id ON user_course_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_course_id ON user_sessions(course_id);

-- 8. Create updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE
    ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_course_progress_updated_at BEFORE UPDATE
    ON user_course_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 11. Create RLS policies for user_course_enrollments
CREATE POLICY "Users can view own enrollments" ON user_course_enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments" ON user_course_enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments" ON user_course_enrollments
    FOR UPDATE USING (auth.uid() = user_id);

-- 12. Create RLS policies for user_question_attempts
CREATE POLICY "Users can view own question attempts" ON user_question_attempts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question attempts" ON user_question_attempts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 13. Create RLS policies for user_course_progress
CREATE POLICY "Users can view own progress" ON user_course_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_course_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_course_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- 14. Create RLS policies for user_achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON user_achievements
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 15. Create RLS policies for user_sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- 16. Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. Create function to calculate course completion percentage
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
    FROM user_question_attempts
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

-- 19. Create function to award achievements
CREATE OR REPLACE FUNCTION award_achievement(
    user_id_param UUID,
    achievement_type_param VARCHAR(50),
    achievement_name_param TEXT,
    description_param TEXT DEFAULT NULL,
    icon_name_param TEXT DEFAULT NULL,
    points_param INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    achievement_id UUID;
BEGIN
    -- Check if user already has this achievement
    SELECT id INTO achievement_id
    FROM user_achievements
    WHERE user_id = user_id_param AND achievement_type = achievement_type_param;
    
    -- Only award if not already earned
    IF achievement_id IS NULL THEN
        INSERT INTO user_achievements (
            user_id, achievement_type, achievement_name, description, icon_name, points_awarded
        ) VALUES (
            user_id_param, achievement_type_param, achievement_name_param, 
            description_param, icon_name_param, points_param
        ) RETURNING id INTO achievement_id;
    END IF;
    
    RETURN achievement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 20. Create view for user dashboard stats
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
    p.id as user_id,
    p.email,
    p.display_name,
    p.subscription_tier,
    COUNT(DISTINCT uce.course_id) as courses_enrolled,
    COUNT(DISTINCT CASE WHEN uce.completion_percentage >= 80 THEN uce.course_id END) as courses_completed,
    COALESCE(SUM(uqa.is_correct::INTEGER), 0) as total_correct_answers,
    COUNT(DISTINCT uqa.question_id) as total_questions_attempted,
    COALESCE(SUM(ua.points_awarded), 0) as total_points,
    COUNT(ua.id) as total_achievements
FROM profiles p
LEFT JOIN user_course_enrollments uce ON p.id = uce.user_id
LEFT JOIN user_question_attempts uqa ON p.id = uqa.user_id
LEFT JOIN user_achievements ua ON p.id = ua.user_id
GROUP BY p.id, p.email, p.display_name, p.subscription_tier;

-- 21. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;