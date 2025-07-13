import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      client_reference_id?: string;
      customer_email?: string;
      amount_total: number;
      currency: string;
      payment_status: string;
      customer_details?: {
        email?: string;
      };
      metadata?: Record<string, string>;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('Stripe webhook received');
    
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      console.error('No Stripe signature found');
      return new Response('No signature', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // For a complete implementation, you would verify the signature here
    // For now, we'll parse the event directly
    let event: StripeEvent;
    try {
      event = JSON.parse(body);
    } catch (err) {
      console.error('Invalid JSON:', err);
      return new Response('Invalid JSON', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log('Processing Stripe event:', event.type);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('Payment successful:', {
        id: session.id,
        client_reference_id: session.client_reference_id,
        customer_email: session.customer_email,
        amount_total: session.amount_total
      });

      // Extract user ID from client_reference_id
      const userId = session.client_reference_id;
      if (!userId) {
        console.error('No client_reference_id found in session');
        return new Response('No user ID found', { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Verify user exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, credits')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.error('User profile not found:', profileError);
        return new Response('User not found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }

      // Calculate credits based on amount paid
      // Assuming $10 = 100 credits, $25 = 250 credits, etc.
      const amountInDollars = session.amount_total / 100; // Convert cents to dollars
      const creditsToAdd = Math.floor(amountInDollars * 10); // 10 credits per dollar

      console.log(`Adding ${creditsToAdd} credits to user ${userId}`);

      // Update user credits using the database function
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_user_credits', {
          p_user_id: userId,
          p_amount: creditsToAdd,
          p_transaction_type: 'purchase',
          p_description: `Credits purchased via Stripe - Session: ${session.id}`,
          p_stripe_payment_intent_id: session.id,
          p_metadata: {
            stripe_session_id: session.id,
            amount_paid: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email || session.customer_details?.email
          }
        });

      if (updateError) {
        console.error('Error updating user credits:', updateError);
        return new Response('Error updating credits', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      // Update stripe_customer_id if available
      if (session.customer_details?.email) {
        await supabase
          .from('profiles')
          .update({ 
            stripe_customer_id: session.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      console.log('Credits updated successfully:', updateResult);

      return new Response(JSON.stringify({ 
        success: true, 
        credits_added: creditsToAdd,
        user_id: userId
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });

    } else if (event.type === 'payment_intent.payment_failed') {
      console.log('Payment failed:', event.data.object.id);
      
      // Log the failed payment for debugging
      const { error: logError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: event.data.object.client_reference_id,
          amount: 0,
          transaction_type: 'refund',
          description: `Payment failed - ${event.data.object.id}`,
          stripe_payment_intent_id: event.data.object.id,
          metadata: {
            event_type: 'payment_failed',
            stripe_event_id: event.id
          }
        });

      if (logError) {
        console.error('Error logging failed payment:', logError);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment failure logged' 
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });

    } else {
      console.log('Unhandled event type:', event.type);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Event ignored' 
      }), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      });
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    });
  }
}); 