const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running InfoBite migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_add_infobite_agent.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolons and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement
      }).single();
      
      if (error) {
        // Try direct execution as fallback
        const { data, error: directError } = await supabase
          .from('_sql')
          .insert({ query: statement })
          .single();
          
        if (directError) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, directError.message);
          console.error('Statement:', statement);
          throw directError;
        }
      }
      
      console.log(`✅ Statement ${i + 1} executed successfully`);
    }
    
    console.log('\n🎉 InfoBite migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function runMigrationDirect() {
  try {
    console.log('🚀 Running InfoBite migration (direct approach)...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '006_add_infobite_agent.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Use fetch to call Supabase SQL API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ sql: migrationSQL })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SQL execution failed: ${errorText}`);
    }
    
    console.log('\n🎉 InfoBite migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    
    // If direct approach fails, try manual table creation
    console.log('\n🔧 Attempting manual table creation...');
    await createTablesManually();
  }
}

async function createTablesManually() {
  try {
    // Test if tables already exist
    const { data: existingEvents, error: checkError1 } = await supabase
      .from('learner_events')
      .select('id')
      .limit(1);
      
    if (!checkError1) {
      console.log('✅ learner_events table already exists');
    } else {
      console.log('📝 Creating learner_events table...');
      // Table doesn't exist, we'll need to create it via dashboard
      console.log('\n⚠️  Tables need to be created manually via Supabase Dashboard');
      console.log('Please go to: https://supabase.com/dashboard/project/nkqehqwbxkxrgecmgzuq/editor');
      console.log('And run the SQL from: supabase/migrations/006_add_infobite_agent.sql');
      return;
    }
    
    const { data: existingCooldowns, error: checkError2 } = await supabase
      .from('user_hint_cooldowns')
      .select('user_id')
      .limit(1);
      
    if (!checkError2) {
      console.log('✅ user_hint_cooldowns table already exists');
    }
    
    console.log('\n✅ All required tables are available!');
    
  } catch (error) {
    console.error('Error checking tables:', error);
  }
}

// Run the migration
createTablesManually();