const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEnrollments() {
  try {
    console.log('🔍 Checking for enrollments table...\n');
    
    // Check course_enrollments table
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('*')
      .limit(1);
      
    if (!enrollError) {
      console.log('✅ course_enrollments table exists');
      if (enrollments && enrollments.length > 0) {
        console.log('Columns:', Object.keys(enrollments[0]));
      }
    } else {
      console.log('❌ course_enrollments table not found');
    }
    
    // Check user_enrollments table
    const { data: userEnrollments, error: userEnrollError } = await supabase
      .from('user_enrollments')
      .select('*')
      .limit(1);
      
    if (!userEnrollError) {
      console.log('✅ user_enrollments table exists');
      if (userEnrollments && userEnrollments.length > 0) {
        console.log('Columns:', Object.keys(userEnrollments[0]));
      }
    } else {
      console.log('❌ user_enrollments table not found');
    }
    
    // Check enrollments table
    const { data: simpleEnrollments, error: simpleError } = await supabase
      .from('enrollments')
      .select('*')
      .limit(1);
      
    if (!simpleError) {
      console.log('✅ enrollments table exists');
      if (simpleEnrollments && simpleEnrollments.length > 0) {
        console.log('Columns:', Object.keys(simpleEnrollments[0]));
      }
    } else {
      console.log('❌ enrollments table not found');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkEnrollments();