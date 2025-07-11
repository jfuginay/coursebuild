const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Get values from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease ensure these are set in your .env.local file');
  process.exit(1);
}

async function createTables() {
  console.log('🚀 Creating InfoBite tables via Supabase REST API...\n');
  
  // Read the migration file
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_add_infobite_agent.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  // Extract individual CREATE TABLE statements and other DDL
  const statements = migrationSQL
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  console.log(`📝 Found ${statements.length} SQL statements\n`);
  
  // Execute via REST API
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement) continue;
    
    console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
    console.log(`   ${statement.substring(0, 60)}...`);
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          query: statement
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed: ${errorText}`);
      }
      
      console.log(`✅ Success\n`);
    } catch (error) {
      console.log(`⚠️  Failed: ${error.message}\n`);
    }
  }
  
  // Since direct SQL execution might not work, let's provide manual instructions
  console.log('\n📋 MANUAL SETUP REQUIRED:');
  console.log('===============================================\n');
  console.log('The tables need to be created manually. Please:');
  console.log('\n1. Go to your Supabase SQL Editor:');
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new\n`);
  console.log('2. Copy ALL the SQL below and paste it into the editor:\n');
  console.log('===============================================\n');
  console.log(migrationSQL);
  console.log('\n===============================================\n');
  console.log('3. Click "Run" to execute the migration\n');
  console.log('4. Then come back here and we\'ll deploy the edge function!\n');
}

createTables();