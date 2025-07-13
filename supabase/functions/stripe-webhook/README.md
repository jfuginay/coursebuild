# Stripe Webhook Integration

This Supabase Edge Function handles Stripe webhooks for processing credit purchases in the CourseForge application.

## Setup Instructions

### 1. Database Migration

First, run the migration to add credits support to the database:

```bash
supabase migration up
```

This will add:
- `credits` column to the `profiles` table
- `stripe_customer_id` column to the `profiles` table
- `credit_transactions` table for tracking credit history
- `update_user_credits` function for safely updating user credits

### 2. Environment Variables

Add the following environment variables to your Supabase project:

```bash
# In Supabase Dashboard > Settings > Edge Functions
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 3. Deploy the Edge Function

Deploy the function to Supabase:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

Note: We use `--no-verify-jwt` because this function receives webhooks from Stripe, not authenticated user requests.

### 4. Configure Stripe Webhook

1. Go to your Stripe Dashboard > Webhooks
2. Add a new webhook endpoint pointing to:
   ```
   https://your-project-id.supabase.co/functions/v1/stripe-webhook
   ```
3. Select the following events:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
4. Copy the webhook signing secret and add it to your environment variables

### 5. Test the Integration

You can test the webhook locally using the Stripe CLI:

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

## How It Works

1. **User clicks "Buy Credits"** → Redirects to Stripe checkout with user context
2. **Payment successful** → Stripe sends webhook to our edge function
3. **Edge function** → Verifies payment and credits user account
4. **User returns** → Dashboard shows updated credit balance

## Credit Calculation

The current implementation uses:
- **$10 = 100 credits** (10 credits per dollar)
- You can modify this in the edge function by changing the calculation

## Security Features

- JWT token verification for checkout session creation
- User ID validation to prevent unauthorized credit additions
- Stripe webhook signature verification (implement in production)
- Database constraints to prevent negative credits
- Transaction logging for audit trail

## Monitoring

Check the Supabase Edge Function logs for:
- Successful credit additions
- Failed payments
- Webhook processing errors

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**: Check the webhook URL and endpoint configuration
2. **Credits not added**: Check the edge function logs for errors
3. **Invalid signature**: Ensure the webhook secret is correctly configured

### Database Queries

Check recent credit transactions:
```sql
SELECT * FROM credit_transactions 
WHERE user_id = 'user-id-here' 
ORDER BY created_at DESC;
```

Check user credits:
```sql
SELECT id, email, credits FROM profiles 
WHERE id = 'user-id-here';
```

## Future Enhancements

- Add support for different credit packages
- Implement subscription-based credits
- Add credit expiration dates
- Create admin dashboard for credit management
- Add credit usage tracking for different features 