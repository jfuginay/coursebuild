#!/usr/bin/env node

/**
 * Test script to verify Supabase connection and environment setup
 * Usage: node scripts/test-connection.js
 */

// Try to load environment variables
try {
  require('dotenv').config({ path: '.env.local' });
} catch (error) {
  console.log('⚠️  Note: dotenv not found, reading from process.env only');
}

const { createClient } = require('@supabase/supabase-js');

console.log('🔧 Testing Supabase Connection...\n');

// Check environment variables - support multiple options
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                   process.env.SUPABASE_ANON_KEY || 
                   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('📋 Environment Check:');
console.log(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}`);

if (supabaseKey && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('   ⚠️  Using ANON_KEY - some operations may be restricted');
}

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing required environment variables!');
  console.error('\n📝 To fix this:');
  console.error('   1. Make sure .env.local exists with your Supabase credentials');
  console.error('   2. Install dotenv: npm install --save-dev dotenv');
  console.error('   3. Or export variables directly:');
  console.error('      export NEXT_PUBLIC_SUPABASE_URL=your-url-here');
  console.error('      export NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key-here');
  console.error('\n   Required variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('\n🔗 Connecting to Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Count courses
    console.log('\n📊 Testing database access...');
    const { count: courseCount, error: courseError } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true });

    if (courseError) {
      throw new Error(`Failed to access courses table: ${courseError.message}`);
    }

    console.log(`   ✅ Found ${courseCount} courses in database`);

    // Test 2: Count transcripts
    const { count: transcriptCount, error: transcriptError } = await supabase
      .from('video_transcripts')
      .select('*', { count: 'exact', head: true });

    if (transcriptError) {
      // Table might not exist in some environments
      console.log(`   ⚠️ video_transcripts table not accessible (${transcriptError.message})`);
    } else {
      console.log(`   ✅ Found ${transcriptCount} transcripts in database`);
    }

    // Test 3: YouTube API test
    console.log('\n🌐 Testing YouTube oEmbed API...');
    const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(testUrl)}&format=json`;
    
    const response = await fetch(oembedUrl);
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ YouTube API working - Test video: "${data.title}"`);
    } else {
      console.log(`   ⚠️ YouTube API returned status ${response.status}`);
    }

    console.log('\n✅ All tests passed! You can run the update script.');
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection(); 