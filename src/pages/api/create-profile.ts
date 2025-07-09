import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface CreateProfileRequest {
  userId: string;
  email: string;
  displayName?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email, displayName }: CreateProfileRequest = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email are required' });
    }

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is the "no rows returned" error, which is expected
      console.error('Error checking existing profile:', checkError);
      return res.status(500).json({ error: 'Error checking existing profile' });
    }

    if (existingProfile) {
      // Profile already exists, don't create a duplicate
      return res.status(200).json({ message: 'Profile already exists' });
    }

    // Create the profile
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: email,
          display_name: displayName || null,
          avatar_url: null,
          bio: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          preferred_difficulty: 'medium',
          notification_preferences: {
            email: true,
            new_features: false,
            course_updates: true
          },
          total_courses_taken: 0,
          total_courses_created: 0,
          total_questions_answered: 0,
          total_questions_correct: 0,
          current_streak: 0,
          longest_streak: 0
        }
      ])
      .select();

    if (error) {
      console.error('Error creating profile:', error);
      return res.status(500).json({ error: 'Error creating profile' });
    }

    return res.status(201).json({ 
      message: 'Profile created successfully',
      profile: data?.[0] 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 