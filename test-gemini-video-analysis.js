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

// This is the exact prompt from enhanced-quiz-service
const ENHANCED_QUIZ_GENERATION_PROMPT = `
You are an expert educational content creator. Analyze this YouTube video and generate engaging quiz questions with enhanced visual capabilities.

Guidelines:
1. Watch the entire video and understand the key concepts presented
2. Create questions that leverage visual elements when appropriate
3. Include accurate timestamps where each question should appear (in seconds from video start)
4. Mix question types: multiple choice, true/false, visual hotspot, matching, and sequencing
5. For visual questions, identify specific timestamps with rich visual content
6. Make questions educational and engaging, not trivial
7. Provide clear explanations for answers
8. Pay attention to visual elements like diagrams, charts, demonstrations, or on-screen text

Enhanced Visual Question Types:
- HOTSPOT: Questions about specific visual elements (requires bounding box annotations)
- MATCHING: Match visual elements with concepts or terms
- SEQUENCING: Order visual steps or processes shown in the video
- ANNOTATION: Identify and label parts of diagrams or visual content

IMPORTANT TIMING REQUIREMENTS:
- Use "timestamp" for when the question should appear to the student (usually after explanation)
- Use "frame_timestamp" for when to capture the frame with visual content (usually during explanation)
- Frame capture should happen 3-10 seconds BEFORE the question appears
- This ensures we capture the visual content while it's being explained, not after

Requirements:
- Generate 5 questions maximum
- Difficulty level: medium
- Questions should be spaced throughout the video duration
- Each question should have an accurate timestamp within the video
- For visual questions, provide both timestamp (question appearance) and frame_timestamp (visual capture)
- Frame_timestamp should be 3-10 seconds earlier than timestamp for optimal visual content
- Include a variety of question types with emphasis on visual learning

Cover the main topics presented in the video

Return your response in the following JSON format:
{
  "video_summary": "Brief summary of the video content and main topics covered",
  "total_duration": "Duration in seconds",
  "visual_moments": [
    {
      "timestamp": 120,
      "description": "Circuit diagram showing component relationships",
      "visual_complexity": "high",
      "educational_value": "excellent for hotspot questions"
    }
  ],
  "questions": [
    {
      "timestamp": 120,
      "question": "What is the main concept being explained at this point in the video?",
      "type": "mcq",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "The correct answer is A because at 2:00 the speaker explains...",
      "visual_context": "Description of what's shown on screen at this timestamp",
      "visual_question_type": null,
      "requires_frame_capture": false
    },
    {
      "timestamp": 240,
      "frame_timestamp": 235,
      "question": "Identify the resistor component in the circuit diagram.",
      "type": "hotspot",
      "visual_context": "Circuit diagram with multiple electronic components labeled",
      "visual_question_type": "hotspot",
      "requires_frame_capture": true,
      "correct_answer": "resistor",
      "explanation": "The resistor is the zigzag component shown in the diagram...",
      "hotspot_elements": [
        {
          "label": "resistor",
          "description": "The main component to identify",
          "is_correct": true
        },
        {
          "label": "capacitor", 
          "description": "Distractor component",
          "is_correct": false
        }
      ]
    }
  ]
}
`;

async function testGeminiVideoAnalysis() {
  const youtubeUrl = 'https://www.youtube.com/watch?v=RnWiqO7cFzo&ab_channel=MGBits';
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  console.log('🎬 Testing Gemini video analysis for:', youtubeUrl);
  console.log('🔑 Gemini API Key:', geminiApiKey ? 'Present' : 'Missing');
  
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  try {
    const finalPrompt = `${ENHANCED_QUIZ_GENERATION_PROMPT}\n\nWatch the entire video and generate enhanced quiz questions with visual capabilities.\n\nIMPORTANT: Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure all strings are properly escaped and quoted.`;
    
    // Call Gemini API directly (using same model as enhanced-quiz-service)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: finalPrompt },
            {
              fileData: {
                fileUri: youtubeUrl,
                mimeType: "video/*"
              }
            }
          ]
        }]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', response.status, error);
      throw new Error(`Gemini API failed: ${response.status} - ${error}`);
    }
    
    const geminiResponse = await response.json();
    console.log('\n🤖 GEMINI API RESPONSE:');
    console.log('======================');
    console.log(JSON.stringify(geminiResponse, null, 2));
    
    // Extract the text content
    const text = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('No text content in Gemini response');
      return;
    }
    
    console.log('\n📝 RAW TEXT FROM GEMINI:');
    console.log('========================');
    console.log(text);
    
    // Try to extract and parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response');
      return;
    }

    let parsedJson;
    try {
      let cleanJson = jsonMatch[0].trim();
      cleanJson = cleanJson
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      
      parsedJson = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.error('Raw JSON text:', jsonMatch[0]);
      return;
    }

    console.log('\n🎯 PARSED VIDEO ANALYSIS JSON:');
    console.log('==============================');
    console.log(JSON.stringify(parsedJson, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testGeminiVideoAnalysis(); 