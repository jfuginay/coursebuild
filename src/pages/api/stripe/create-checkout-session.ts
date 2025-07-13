import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the JWT token from the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    // Verify the token and get user info
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('Auth error:', userError);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const { userId, userEmail, returnUrl } = req.body;

    console.log('Auth user ID:', user.id);
    console.log('Requested user ID:', userId);
    console.log('User email:', userEmail);

    // Use the authenticated user's ID instead of the passed userId for security
    const profileUserId = user.id;

    // Get user profile from database using the authenticated user's ID
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, display_name, subscription_tier')
      .eq('id', profileUserId)
      .single();

    console.log('Profile lookup result:', { profile, profileError });

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      
      // If profile doesn't exist, create one with basic fields
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: profileUserId,
          email: user.email || userEmail,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          subscription_tier: 'free'
        })
        .select('id, email, display_name, subscription_tier')
        .single();

      if (createError) {
        console.error('Failed to create profile:', createError);
        
        // If profile creation fails, we can still proceed with user data
        console.log('Using user data directly instead of profile');
        profile = {
          id: profileUserId,
          email: user.email || userEmail,
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          subscription_tier: 'free'
        };
      } else {
        console.log('Created new profile:', newProfile);
        profile = newProfile;
      }
    }

    // Create the Stripe payment URL with user context
    const baseUrl = 'https://buy.stripe.com/28EbJ0fyZ2XO7Dj11ucIE01';
    
    // Get the return URL from the request or use the current origin
    const baseReturnUrl = req.body.returnUrl || `${req.headers.origin || 'http://localhost:3000'}`;
    const successUrl = `${baseReturnUrl}?payment_success=true`;
    
    // Store user context for webhook (you might want to use a more robust session storage)
    const params = new URLSearchParams({
      'client_reference_id': profileUserId,
      'prefilled_email': profile.email,
      'success_url': successUrl
    });

    const checkoutUrl = `${baseUrl}?${params.toString()}`;

    // Log the checkout attempt
    console.log('API endpoint reached successfully');
    console.log('Checkout session created for user:', profileUserId, profile.email);
    console.log('Generated checkout URL:', checkoutUrl);
    console.log('User profile found:', profile.email);

    return res.status(200).json({
      success: true,
      url: checkoutUrl,
      userId: profileUserId
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
} 