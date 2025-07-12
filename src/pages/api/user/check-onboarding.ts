import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found, treat as not completed
        return res.status(200).json({ 
          onboarding_completed: false,
          profile_exists: false 
        });
      }
      throw error;
    }

    // Check onboarding status from direct boolean column
    const onboardingCompleted = data?.onboarding_completed || false;

    return res.status(200).json({ 
      onboarding_completed: onboardingCompleted,
      profile_exists: true 
    });
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return res.status(500).json({ 
      error: 'Failed to check onboarding status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}