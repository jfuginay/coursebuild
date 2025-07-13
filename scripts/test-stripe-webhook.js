#!/usr/bin/env node

/**
 * Test script for Stripe webhook functionality
 * 
 * This script simulates a Stripe webhook event to test the edge function
 * without requiring actual Stripe payments during development.
 */

import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/stripe-webhook`;

// Test user ID - replace with actual user ID from your database
const TEST_USER_ID = process.env.TEST_USER_ID || 'your-user-id-here';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

// Mock Stripe webhook event for successful payment
const mockSuccessfulPayment = {
  id: 'evt_test_webhook',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_' + Date.now(),
      client_reference_id: TEST_USER_ID,
      customer_email: TEST_EMAIL,
      amount_total: 2500, // $25.00 in cents
      currency: 'usd',
      payment_status: 'paid',
      customer_details: {
        email: TEST_EMAIL
      }
    }
  }
};

// Mock Stripe webhook event for failed payment
const mockFailedPayment = {
  id: 'evt_test_webhook_failed',
  type: 'payment_intent.payment_failed',
  data: {
    object: {
      id: 'pi_test_' + Date.now(),
      client_reference_id: TEST_USER_ID,
      amount_total: 2500,
      currency: 'usd',
      payment_status: 'failed'
    }
  }
};

async function testWebhook(event, eventType) {
  console.log(`\n🧪 Testing ${eventType}...`);
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`👤 Test User ID: ${TEST_USER_ID}`);
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature', // Mock signature
      },
      body: JSON.stringify(event)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Webhook processed successfully:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.credits_added) {
        console.log(`💰 Credits added: ${result.credits_added}`);
      }
    } else {
      console.log('❌ Webhook failed:');
      console.log(`Status: ${response.status}`);
      console.log(JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('💥 Error testing webhook:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Stripe webhook tests...');
  
  // Test 1: Successful payment
  await testWebhook(mockSuccessfulPayment, 'Successful Payment');
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Failed payment
  await testWebhook(mockFailedPayment, 'Failed Payment');
  
  console.log('\n✨ Testing complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Check your Supabase dashboard for the credit transactions');
  console.log('2. Verify the user\'s credit balance was updated');
  console.log('3. Check the edge function logs for any errors');
}

// Check if required environment variables are set
if (!process.env.SUPABASE_URL) {
  console.warn('⚠️  SUPABASE_URL not set, using default: http://localhost:54321');
}

if (!process.env.TEST_USER_ID || process.env.TEST_USER_ID === 'your-user-id-here') {
  console.error('❌ Please set TEST_USER_ID environment variable to a valid user ID');
  console.log('Example: TEST_USER_ID=123e4567-e89b-12d3-a456-426614174000 node scripts/test-stripe-webhook.js');
  process.exit(1);
}

if (!process.env.TEST_EMAIL || process.env.TEST_EMAIL === 'test@example.com') {
  console.warn('⚠️  TEST_EMAIL not set, using default: test@example.com');
}

main().catch(console.error); 