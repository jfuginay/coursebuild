#!/usr/bin/env node

/**
 * Test script for checkout API route
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/stripe/create-checkout-session';

// Mock JWT token for testing - replace with a real token
const TEST_JWT_TOKEN = 'your-jwt-token-here';

async function testCheckoutAPI() {
  console.log('🧪 Testing checkout API...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_JWT_TOKEN}`
      },
      body: JSON.stringify({
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        returnUrl: 'http://localhost:3000/dashboard'
      })
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', data);
    
    if (response.ok) {
      console.log('✅ API test successful!');
      console.log('🔗 Generated URL:', data.url);
    } else {
      console.log('❌ API test failed:', data.error);
    }
    
  } catch (error) {
    console.error('💥 Error testing API:', error.message);
  }
}

// Simple test without auth
async function testWithoutAuth() {
  console.log('🧪 Testing without auth (should fail)...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: 'test-user-id',
        userEmail: 'test@example.com',
        returnUrl: 'http://localhost:3000/dashboard'
      })
    });

    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Data:', data);
    
    if (response.status === 401) {
      console.log('✅ Auth check working correctly!');
    } else {
      console.log('❌ Auth check failed');
    }
    
  } catch (error) {
    console.error('💥 Error testing API:', error.message);
  }
}

async function main() {
  await testWithoutAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  
  if (TEST_JWT_TOKEN === 'your-jwt-token-here') {
    console.log('⚠️  Skipping auth test - no JWT token provided');
    console.log('To test with auth, get a JWT token from your browser and update TEST_JWT_TOKEN');
  } else {
    await testCheckoutAPI();
  }
}

main().catch(console.error); 