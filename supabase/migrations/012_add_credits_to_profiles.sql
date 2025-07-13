-- Migration: Add credits field to profiles table
-- Description: Adds a credits field to track user credits for premium features

-- Add credits column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits INTEGER DEFAULT 0 NOT NULL;

-- Add constraint to ensure credits cannot be negative
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_credits_positive CHECK (credits >= 0);

-- Add index for efficient querying of credits
CREATE INDEX IF NOT EXISTS idx_profiles_credits ON public.profiles(credits);

-- Add a stripe_customer_id column for linking with Stripe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add unique constraint on stripe_customer_id
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_stripe_customer_id_unique UNIQUE (stripe_customer_id);

-- Add index for efficient querying of stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Add column for tracking credit transactions
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'admin_adjustment')),
  description TEXT,
  stripe_payment_intent_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for credit transactions
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_stripe_payment_intent ON public.credit_transactions(stripe_payment_intent_id);

-- Add RLS policies for credit transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own credit transactions
CREATE POLICY "Users can view their own credit transactions" ON public.credit_transactions
FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all credit transactions
CREATE POLICY "Service role can manage all credit transactions" ON public.credit_transactions
FOR ALL USING (auth.role() = 'service_role');

-- Create function to safely update user credits
CREATE OR REPLACE FUNCTION public.update_user_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_transaction_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_credits INTEGER;
  new_credits INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE id = p_user_id;
  
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate new credits
  new_credits := current_credits + p_amount;
  
  -- Ensure credits don't go negative
  IF new_credits < 0 THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Update user credits
  UPDATE public.profiles
  SET credits = new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO public.credit_transactions (
    user_id,
    amount,
    transaction_type,
    description,
    stripe_payment_intent_id,
    metadata
  ) VALUES (
    p_user_id,
    p_amount,
    p_transaction_type,
    p_description,
    p_stripe_payment_intent_id,
    p_metadata
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.update_user_credits(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO service_role; 