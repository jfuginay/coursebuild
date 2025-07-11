const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  try {
    console.log('🔍 Checking for tables containing "question"...\n');
    
    // Query to get all tables with "question" in the name
    const { data: tables, error } = await supabase
      .rpc('get_tables_with_question', {});
      
    if (error) {
      // Try a different approach
      console.log('Trying alternative method...');
      
      // List all tables using information_schema
      const { data, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%question%');
        
      if (schemaError) {
        console.log('Schema query failed, trying direct table queries...\n');
        
        // Try to query known possible table names directly
        const possibleTables = [
          'questions',
          'user_question_responses',
          'user_question_attempts',
          'question_attempts',
          'quiz_responses'
        ];
        
        for (const tableName of possibleTables) {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
            
          if (!error) {
            console.log(`✅ Table exists: ${tableName}`);
            
            // Get column information
            const { data: sample } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);
              
            if (sample && sample.length > 0) {
              console.log(`   Columns: ${Object.keys(sample[0]).join(', ')}`);
            }
          } else if (error.message.includes('not found')) {
            console.log(`❌ Table does not exist: ${tableName}`);
          }
        }
      } else {
        console.log('Tables found:', data);
      }
    } else {
      console.log('Tables with "question" in name:', tables);
    }
    
    // Also check the questions table structure
    console.log('\n📊 Checking questions table structure...');
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1);
      
    if (!questionsError && questionsData && questionsData.length > 0) {
      console.log('Questions table columns:', Object.keys(questionsData[0]));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();