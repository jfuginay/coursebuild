const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserCourseEnrollments() {
  try {
    console.log('🔍 Checking user_course_enrollments table...\n');
    
    const { data, error } = await supabase
      .from('user_course_enrollments')
      .select('*')
      .limit(3);
      
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ user_course_enrollments table exists');
      console.log('Columns:', Object.keys(data[0]));
      
      console.log('\nSample data:');
      data.forEach((row, index) => {
        console.log(`\nRow ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('Table exists but has no data');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserCourseEnrollments();