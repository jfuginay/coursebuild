// Use native fetch API (available in Node.js 18+)
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const envVars = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    envVars.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

loadEnvFile();

async function testEnhancedQuizAnalysis() {
  const youtubeUrl = 'https://www.youtube.com/watch?v=RnWiqO7cFzo&ab_channel=MGBits';
  
  // Create a temporary course for testing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('🎬 Testing enhanced quiz generation for:', youtubeUrl);
  console.log('📡 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key:', supabaseKey ? 'Present' : 'Missing');
  
  try {
    // Create a temporary course
    const courseResponse = await fetch(`${supabaseUrl}/rest/v1/courses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title: 'Test Course - Enhanced Quiz Analysis',
        description: 'Temporary course for testing enhanced quiz generation',
        youtube_url: youtubeUrl,
        published: false
      })
    });
    
    const courseText = await courseResponse.text();
    console.log('Course response status:', courseResponse.status);
    console.log('Course response text:', courseText);
    
    if (!courseResponse.ok) {
      console.error('Course creation failed:', courseResponse.status, courseText);
      throw new Error(`Failed to create course: ${courseResponse.status} - ${courseText}`);
    }
    
    let courseData;
    try {
      courseData = JSON.parse(courseText);
    } catch (e) {
      console.error('Failed to parse course response:', courseText);
      throw new Error('Invalid JSON response from course creation');
    }
    
    // Handle array response from Supabase
    const courseRecord = Array.isArray(courseData) ? courseData[0] : courseData;
    const courseId = courseRecord.id;
    
    console.log('✅ Created temporary course:', courseId);
    
    // Call enhanced-quiz-service
    const enhancedQuizUrl = `${supabaseUrl}/functions/v1/enhanced-quiz-service`;
    
    const analysisResponse = await fetch(enhancedQuizUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        course_id: courseId,
        youtube_url: youtubeUrl,
        max_questions: 5, // Smaller number for testing
        difficulty_level: 'medium',
        enable_visual_questions: true
      })
    });
    
    if (!analysisResponse.ok) {
      const error = await analysisResponse.text();
      console.error('Enhanced quiz service response:', analysisResponse.status, error);
      throw new Error(`Enhanced quiz service failed: ${error}`);
    }
    
    const analysisText = await analysisResponse.text();
    console.log('Analysis response received, length:', analysisText.length);
    
    let analysisData;
    try {
      analysisData = JSON.parse(analysisText);
    } catch (e) {
      console.error('Failed to parse analysis response:', analysisText.substring(0, 500));
      throw new Error('Invalid JSON response from enhanced quiz service');
    }
    
    console.log('\n🎯 ENHANCED QUIZ ANALYSIS RESULTS:');
    console.log('==================================');
    console.log(JSON.stringify(analysisData, null, 2));
    
    // Clean up - delete the temporary course
    await fetch(`${supabaseUrl}/rest/v1/courses?id=eq.${courseId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=representation'
      }
    });
    
    console.log('\n✅ Cleaned up temporary course');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testEnhancedQuizAnalysis(); 