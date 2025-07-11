import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, onboarding_completed } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  if (typeof onboarding_completed !== 'boolean') {
    return res.status(400).json({ error: 'onboarding_completed must be a boolean' });
  }

  try {
    // First check if user profile exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user_id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (!existingProfile) {
      // Create profile if it doesn't exist
      const { error: createError } = await supabase
        .from('user_profiles')
        .insert({
          user_id,
          onboarding_completed,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (createError) {
        throw createError;
      }

      return res.status(200).json({ 
        success: true, 
        message: 'User profile created with onboarding status' 
      });
    }

    // Update existing profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Onboarding status updated successfully' 
    });
  } catch (error) {
    console.error('Error updating onboarding status:', error);
    return res.status(500).json({ 
      error: 'Failed to update onboarding status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}