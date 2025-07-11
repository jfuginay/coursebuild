const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserResponsesTable() {
  try {
    console.log('🔍 Checking user_question_responses table structure...\n');
    
    // Get a sample row to see all columns
    const { data, error } = await supabase
      .from('user_question_responses')
      .select('*')
      .limit(3);
      
    if (error) {
      console.error('Error querying table:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Table columns:', Object.keys(data[0]));
      console.log('\nSample data:');
      data.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('Table exists but has no data');
      
      // Try to get column info via raw SQL
      const { data: cols, error: colError } = await supabase.rpc('get_column_info', {
        table_name: 'user_question_responses'
      }).single();
      
      if (colError) {
        console.log('Could not get column info via RPC');
      } else {
        console.log('Column information:', cols);
      }
    }
    
    // Check if course_id column exists
    console.log('\n🔍 Checking for course_id column...');
    const { data: testData, error: testError } = await supabase
      .from('user_question_responses')
      .select('id, enrollment_id')
      .limit(1);
      
    if (!testError) {
      console.log('✅ Can query id and enrollment_id columns');
      console.log('❌ course_id column does not exist in this table');
      console.log('ℹ️  The table uses enrollment_id instead of course_id');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserResponsesTable();