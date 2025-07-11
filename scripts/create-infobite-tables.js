const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Hardcode the values from .env.local
const supabaseUrl = 'https://nkqehqwbxkxrgecmgzuq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcWVocXdieGt4cmdlY21nenVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTYxODAsImV4cCI6MjA2NzU3MjE4MH0.mOOF0r4u2WFgcEHdvn-3laDCR5IK_8Z49ZSuOVyXDv8';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcWVocXdieGt4cmdlY21nenVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk5NjE4MCwiZXhwIjoyMDY3NTcyMTgwfQ.bWXToInycb2-1gEFKROXNnmYmu_m5GMAb3LPZzgUuRw';

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
  console.log('   https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/sql/new\n');
  console.log('2. Copy ALL the SQL below and paste it into the editor:\n');
  console.log('===============================================\n');
  console.log(migrationSQL);
  console.log('\n===============================================\n');
  console.log('3. Click "Run" to execute the migration\n');
  console.log('4. Then come back here and we\'ll deploy the edge function!\n');
}

createTables();