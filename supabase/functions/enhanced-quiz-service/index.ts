import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const ENHANCED_QUIZ_GENERATION_PROMPT = `
You are an educational content creator analyzing this video to generate diverse quiz questions.

Task: Create 6-8 engaging questions that test video comprehension, spaced throughout the content.

Question Types Available:
- MULTIPLE-CHOICE: Standard questions with 4 options
- TRUE-FALSE: Simple true/false questions  
- HOTSPOT: Visual questions requiring object detection on video frames
- MATCHING: Connect related concepts or items
- SEQUENCING: Order steps or events chronologically

Guidelines:
- Include accurate timestamps (seconds from video start)
- Generate at least 2 visual hotspot questions with clear target objects
- Provide detailed explanations for learning reinforcement
- Ensure answers are determinable from video content
- Space questions throughout video duration (avoid clustering)

For HOTSPOT questions: Specify 2-3 target objects and precise frame timing for detection.
For MATCHING questions: Provide pairs of related items to connect.
For SEQUENCING questions: List items in correct chronological order.

Focus on educational value and visual recognition skills.`;

interface EnhancedQuizRequest {
  course_id: string;
  youtube_url: string;
  max_questions?: number;
  difficulty_level?: string;
  focus_topics?: string[];
  enable_visual_questions?: boolean;
}

// Generate enhanced questions with Gemini (Stage 1: Questions only, no bounding boxes)
async function generateEnhancedQuestions(
  youtubeUrl: string,
  maxQuestions: number = 10,
  difficulty: string = 'medium',
  enableVisualQuestions: boolean = true
) {
  console.log('🎓 Generating enhanced questions...');
  
  const focusTopics = enableVisualQuestions ? 
    'Include visual hotspot questions with clear target objects for detection.' : 
    'Focus on comprehension and analysis questions.';

  const prompt = ENHANCED_QUIZ_GENERATION_PROMPT
    .replace('{maxQuestions}', maxQuestions.toString())
    .replace('{difficulty}', difficulty)
    .replace('{focusTopics}', focusTopics);

  try {
    const geminiRequest = {
      contents: [
        {
          parts: [
    {
      fileData: {
                fileUri: youtubeUrl
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192, // Further reduced to prevent truncation
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            video_summary: {
              type: "string",
              description: "Brief 2-3 sentence summary of the video content and main topics"
            },
            total_duration: {
              type: "number",
              description: "Video length in seconds"
            },
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  timestamp: { 
                    type: "number", 
                    description: "When question should appear (seconds)" 
                  },
                  question: { 
                    type: "string", 
                    description: "The question text" 
                  },
                  type: { 
                    type: "string", 
                    enum: ["multiple-choice", "true-false", "hotspot", "matching", "sequencing"] 
                  },
                  options: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Answer options for multiple-choice questions and true/false questions"
                  },
                  correct_answer: { 
                    type: "number", 
                    description: "Answer index for multiple-choice (0-based), 0 for true/1 for false" 
                  },
                  explanation: { 
                    type: "string", 
                    description: "One sentence explanation" 
                  },
                  frame_timestamp: { 
                    type: "number", 
                    description: "Precise timing for visual analysis (seconds)" 
                  },
                  target_objects: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "Objects to detect for hotspot questions"
                  },
                  question_context: { 
                    type: "string", 
                    description: "Additional one sentence context for object detection" 
                  },
                  matching_pairs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        left: { type: "string", description: "Left item" },
                        right: { type: "string", description: "Right item" }
                      },
                      required: ["left", "right"]
                    },
                    description: "Pairs for matching questions"
                  },
                  sequence_items: {
                    type: "array",
                    items: { type: "string" },
                    description: "Items in correct chronological order for sequencing questions"
                  }
                },
                required: ["timestamp", "question", "type", "correct_answer", "explanation"]
              }
            }
          },
          required: ["video_summary", "total_duration", "questions"]
        }
      }
    };

    const response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY2')}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiRequest)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini API');
  }

    // Parse the structured JSON response
    let analysisResult;
  try {
      // With structured output, the response should be direct JSON
      analysisResult = JSON.parse(text);
      
      // Validate the required structure
      if (!analysisResult.questions || !Array.isArray(analysisResult.questions)) {
        throw new Error('Invalid response structure: missing questions array');
      }
      
      if (!analysisResult.video_summary || !analysisResult.total_duration) {
        throw new Error('Invalid response structure: missing video_summary or total_duration');
      }
  } catch (parseError) {
      console.error('Failed to parse structured Gemini response:', parseError);
      console.log('Response length:', text.length);
      console.log('Response start:', text.substring(0, 500));
      console.log('Response end:', text.substring(Math.max(0, text.length - 500)));
      
      // Try to extract JSON from the response as fallback
      try {
        console.log('🔧 Attempting fallback JSON extraction...');
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          analysisResult = JSON.parse(jsonMatch[0]);
          console.log('✅ Fallback JSON extraction successful');
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (fallbackError) {
        console.error('Fallback JSON extraction also failed:', fallbackError);
        throw new Error(`Failed to parse structured Gemini response: ${parseError}`);
  }
    }

    console.log(`✅ Generated ${analysisResult.questions?.length || 0} questions using structured output`);
    console.log(`🎬 Visual questions: ${analysisResult.questions?.filter((q: any) => ['hotspot', 'matching', 'sequencing'].includes(q.type))?.length || 0}`);

    return {
      success: true,
      ...analysisResult
    };

  } catch (error) {
    console.error('Error generating enhanced questions:', error);
    return {
      success: false,
      error: `Failed to generate questions: ${error}`
    };
  }
}

// Ensure visual questions have diverse frame capture timestamps
function ensureDiverseFrameTimestamps(questions: any[]): any[] {
  console.log('🎯 Ensuring diverse frame capture timestamps for visual questions...');
  
  const visualQuestions = questions.filter(q => ['hotspot', 'matching', 'sequencing'].includes(q.type));
  
  if (visualQuestions.length <= 1) {
    console.log('⏭️ Only one or no visual questions, no timestamp adjustment needed');
    return questions;
  }
  
  // Sort visual questions by timestamp to spread them out
  visualQuestions.sort((a, b) => a.timestamp - b.timestamp);
  
  // Ensure minimum 15-second spacing between frame captures
  const MIN_FRAME_SPACING = 15;
  
  let lastFrameTimestamp = 0;
  
  const updatedQuestions = questions.map(question => {
    if (!['hotspot', 'matching', 'sequencing'].includes(question.type)) return question;
    
    // Calculate optimal frame capture timestamp
    const preferredFrameTime = question.frame_timestamp || Math.max(0, question.timestamp - 5);
    
    // Ensure minimum spacing from previous frame capture
    const adjustedFrameTime = Math.max(preferredFrameTime, lastFrameTimestamp + MIN_FRAME_SPACING);
    
    // Don't capture frames after the question timestamp
    const finalFrameTime = Math.min(adjustedFrameTime, question.timestamp - 2);
    
    lastFrameTimestamp = finalFrameTime;
    
    console.log(`📸 Question at ${question.timestamp}s: frame capture adjusted to ${finalFrameTime}s (original: ${preferredFrameTime}s)`);
    
    return {
      ...question,
      frame_timestamp: finalFrameTime
    };
  });
  
  console.log(`✅ Adjusted ${visualQuestions.length} visual questions for diverse frame capture`);
  return updatedQuestions;
}

// Generate precise bounding boxes for hotspot questions using cropped video segments
async function generatePreciseBoundingBoxes(
  youtubeUrl: string,
  allQuestions: any[]
): Promise<any[]> {
  const hotspotQuestions = allQuestions.filter(q => q.type === 'hotspot');
  console.log(`🎯 Generating precise bounding boxes for ${hotspotQuestions.length} hotspot questions...`);
  
  const updatedQuestions = [];
  
  for (const question of allQuestions) {
    // Only process hotspot questions for bounding box generation
    if (question.type !== 'hotspot' || !question.target_objects || !question.frame_timestamp) {
      // For non-hotspot questions, add metadata for matching/sequencing
      if (question.type === 'matching' && question.matching_pairs) {
        const updatedQuestion = {
          ...question,
          metadata: JSON.stringify({
            matching_pairs: question.matching_pairs,
            video_overlay: true
          })
        };
        updatedQuestions.push(updatedQuestion);
      } else if (question.type === 'sequencing' && question.sequence_items) {
        const updatedQuestion = {
          ...question,
          metadata: JSON.stringify({
            sequence_items: question.sequence_items,
            video_overlay: true
          })
        };
        updatedQuestions.push(updatedQuestion);
      } else {
        updatedQuestions.push(question);
      }
      continue;
    }

    try {
      // Create 1-second window around the frame timestamp for precise analysis
      const startOffset = Math.max(0, question.frame_timestamp - 0.5);
      const endOffset = question.frame_timestamp + 0.5;
      
      const objectDetectionPrompt = `
Return bounding boxes as an array with labels for the target objects.
Never return masks. Limit to 10 objects maximum.
If an object is present multiple times, give each object a unique label according to its distinct characteristics (colors, size, position, etc.).

QUESTION CONTEXT: ${question.question_context}
TARGET OBJECTS TO FIND: ${question.target_objects.join(', ')}

For the question "${question.question}", identify and return bounding boxes for each target object that is clearly visible in this video segment.

Mark objects as correct answers based on what the question is specifically asking for.
`;

      console.log(`🔍 Detecting objects for question: "${question.question.substring(0, 50)}..."`);
      console.log(`📹 Analyzing video segment: ${startOffset}s to ${endOffset}s`);

      const geminiRequest = {
        contents: [
          {
            parts: [
              {
                fileData: {
                  fileUri: youtubeUrl
                },
                videoMetadata: {
                  startOffset: `${startOffset}s`,
                  endOffset: `${endOffset}s`
                }
              },
              {
                text: objectDetectionPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent object detection
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                box_2d: {
                  type: "array",
                  items: { type: "integer" },
                  description: "Bounding box coordinates in [y_min, x_min, y_max, x_max] format, normalized to 0-1000"
                },
                label: {
                  type: "string",
                  description: "Descriptive label for the detected object"
                },
                is_correct_answer: {
                  type: "boolean",
                  description: "Whether this object is what the question is asking for"
                },
                confidence_score: {
                  type: "number",
                  description: "Confidence score between 0.0 and 1.0"
                }
              },
              required: ["box_2d", "label", "is_correct_answer"]
            }
          }
        }
      };
    
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get('GEMINI_API_KEY2')}`,
        {
      method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiRequest)
        }
      );

      if (!response.ok) {
        console.error(`❌ Gemini API error for question ${question.timestamp}:`, response.status);
        updatedQuestions.push(question);
        continue;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.error(`❌ No response from Gemini for question ${question.timestamp}`);
        updatedQuestions.push(question);
        continue;
      }

      // Parse structured bounding box results
      let detectionResults;
      try {
        // With structured output, the response should be direct JSON
        detectionResults = JSON.parse(text);
        
        // Validate it's an array
        if (!Array.isArray(detectionResults)) {
          throw new Error('Expected array of bounding boxes');
        }
      } catch (parseError) {
        console.error(`❌ Failed to parse bounding box results:`, parseError);
        console.log('Response length:', text.length);
        console.log('Response start:', text.substring(0, 500));
        console.log('Response end:', text.substring(Math.max(0, text.length - 500)));
        
        // Try fallback JSON extraction
        try {
          console.log('🔧 Attempting fallback JSON extraction for bounding boxes...');
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            detectionResults = JSON.parse(jsonMatch[0]);
            console.log('✅ Fallback bounding box extraction successful');
          } else {
            console.log('❌ No array found in bounding box response, skipping...');
            updatedQuestions.push(question);
            continue;
          }
        } catch (fallbackError) {
          console.error('Fallback bounding box extraction failed:', fallbackError);
          updatedQuestions.push(question);
          continue;
        }
      }

      // Convert Gemini's bounding box format to our normalized format
      const normalizedElements = detectionResults.map((bbox: any) => {
        if (!bbox.box_2d || bbox.box_2d.length !== 4) {
          console.warn('Invalid bounding box format:', bbox);
          return null;
        }
        
        // Gemini returns [y_min, x_min, y_max, x_max] normalized to 0-1000
        const [y_min, x_min, y_max, x_max] = bbox.box_2d;
        
        // Convert to our format: normalize to 0-1 and convert to top-left + width/height
        const x = x_min / 1000; // Left edge (0-1)
        const y = y_min / 1000; // Top edge (0-1)
        const width = (x_max - x_min) / 1000; // Width (0-1)
        const height = (y_max - y_min) / 1000; // Height (0-1)
        
        return {
          label: bbox.label || 'Unknown Object',
          x: Math.max(0, Math.min(1, x)),
          y: Math.max(0, Math.min(1, y)),
          width: Math.max(0, Math.min(1, width)),
          height: Math.max(0, Math.min(1, height)),
          confidence_score: bbox.confidence_score || 0.8,
          is_correct_answer: bbox.is_correct_answer || false,
          description: `Detected via Gemini bounding box: ${bbox.label}`
        };
      }).filter(Boolean); // Remove any null entries

      // Update question with detected bounding boxes
      const updatedQuestion = {
        ...question,
        metadata: JSON.stringify({
          detected_elements: normalizedElements,
          video_overlay: true,
          gemini_bounding_boxes: true, // Flag to indicate we used Gemini's built-in detection
          video_dimensions: { width: 1000, height: 1000 } // Gemini's coordinate space
        })
      };

      console.log(`✅ Detected ${normalizedElements.length} objects for question at ${question.timestamp}s using Gemini bounding boxes`);
      updatedQuestions.push(updatedQuestion);

  } catch (error) {
      console.error(`❌ Error generating bounding boxes for question ${question.timestamp}:`, error);
      updatedQuestions.push(question);
    }
  }

  return updatedQuestions;
}

// Map Gemini question types to database types
function mapGeminiTypeToDbType(geminiType: string): string {
  switch(geminiType) {
    case 'mcq':
      return 'multiple-choice';
    case 'true_false':
      return 'true-false';
    case 'hotspot':
      return 'hotspot';
    case 'matching':
      return 'matching';
    case 'sequencing':
      return 'sequencing';
    default:
      return 'multiple-choice';
  }
}

// Store enhanced questions with visual data
async function storeEnhancedQuestions(
  supabaseClient: any,
  courseId: string,
  questions: any[]
): Promise<any[]> {
  console.log('💾 Storing enhanced questions with precise bounding boxes...');

  const questionsToInsert = questions.map((q: any) => {
    // Ensure true/false questions have proper options
    let options = q.options;
    let correctAnswer = q.correct_answer;
    
    if (q.type === 'true_false') {
      options = options || ["True", "False"];
      // Convert boolean to array index
      if (typeof correctAnswer === 'boolean') {
        correctAnswer = correctAnswer ? 1 : 0;
      }
    }
    
    return {
      course_id: courseId,
      timestamp: q.timestamp,
      question: q.question,
      type: mapGeminiTypeToDbType(q.type),
      options: options ? JSON.stringify(options) : null,
      correct_answer: typeof correctAnswer === 'string' ? parseInt(correctAnswer) || 0 : correctAnswer,
      explanation: q.explanation,
      has_visual_asset: ['hotspot', 'matching', 'sequencing'].includes(q.type),
      fallback_prompt: q.type === 'hotspot' ? `Generate simple diagram showing objects` : null,
      frame_timestamp: q.frame_timestamp || null,
      metadata: q.metadata || null
    };
  });

  const { data: createdQuestions, error: questionsError } = await supabaseClient
    .from('questions')
    .insert(questionsToInsert)
    .select();

  if (questionsError) {
    throw new Error(`Failed to create questions: ${questionsError.message}`);
  }

  console.log(`✅ Created ${createdQuestions.length} questions`);

  // Now create bounding boxes for questions with detection results
  let totalBoundingBoxes = 0;
  
  for (const question of createdQuestions) {
    if (question.metadata) {
      try {
        const metadata = JSON.parse(question.metadata);
        const detectedElements = metadata.detected_elements || [];

        if (detectedElements.length > 0) {
          console.log(`🎯 Creating ${detectedElements.length} bounding boxes for question ${question.id}`);
          
          const boundingBoxesToInsert = detectedElements.map((element: any) => ({
            question_id: question.id,
            visual_asset_id: null, // No visual assets needed for video overlay
            label: element.label || 'Unknown Object',
            x: parseFloat(element.x.toFixed(4)),
            y: parseFloat(element.y.toFixed(4)),
            width: parseFloat(element.width.toFixed(4)),
            height: parseFloat(element.height.toFixed(4)),
            confidence_score: element.confidence_score || 0.8,
            is_correct_answer: element.is_correct_answer || false
      }));

          const { data: createdBoxes, error: boxError } = await supabaseClient
        .from('bounding_boxes')
            .insert(boundingBoxesToInsert)
            .select();

          if (boxError) {
            console.error(`❌ Error creating bounding boxes for question ${question.id}:`, boxError);
          } else {
            totalBoundingBoxes += createdBoxes.length;
            console.log(`✅ Created ${createdBoxes.length} bounding boxes for question ${question.id}`);
          }
        }
      } catch (parseError) {
        console.error(`❌ Error parsing metadata for question ${question.id}:`, parseError);
      }
    }
  }

  console.log(`🎯 Total bounding boxes created: ${totalBoundingBoxes}`);
  return createdQuestions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

      const geminiApiKey = Deno.env.get('GEMINI_API_KEY2');
    if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY2 environment variable is not set');
    }

    const {
      course_id,
      youtube_url,
      max_questions = 10,
      difficulty_level = 'medium',
      focus_topics = [],
      enable_visual_questions = true
    }: EnhancedQuizRequest = await req.json();

    if (!course_id || !youtube_url) {
      throw new Error('Course ID and YouTube URL are required');
    }

    console.log('🎬 Starting enhanced quiz generation for course:', course_id);

    // Verify course exists
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id, title')
      .eq('id', course_id)
      .single();

    if (courseError) {
      throw new Error(`Course not found: ${courseError.message}`);
    }

    console.log('✅ Course found:', course.title);

    // Step 1: Generate enhanced questions with rich analysis
    const analysisResult = await generateEnhancedQuestions(
      youtube_url,
      Math.min(max_questions || 7, 8), // Cap at 8 questions to prevent token overflow
      difficulty_level || 'medium',
      enable_visual_questions !== false
    );

    if (!analysisResult.success) {
      throw new Error(analysisResult.error || 'Failed to generate enhanced questions');
    }

    // Step 2: For hotspot questions only, generate precise bounding boxes using cropped video segments
    const hotspotQuestions = analysisResult.questions.filter((q: any) => q.type === 'hotspot');
    let processedQuestions = analysisResult.questions;
    
    if (hotspotQuestions.length > 0) {
      console.log(`🎯 Found ${hotspotQuestions.length} hotspot questions - generating precise bounding boxes...`);
      processedQuestions = await generatePreciseBoundingBoxes(youtube_url, analysisResult.questions);
    }

    // Step 3: Store enhanced questions in database with integrated bounding box creation
    const storedQuestions = await storeEnhancedQuestions(
      supabaseClient,
      course_id,
      processedQuestions
    );

    console.log(`✅ Complete enhanced quiz generation finished for course ${course_id}`);

    // Return enhanced response
    return new Response(
      JSON.stringify({
        success: true,
        course_id: course_id,
        video_summary: analysisResult.video_summary,
        total_duration: analysisResult.total_duration,
        questions: storedQuestions.map((q: any) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null
        })),
        enhanced_features: {
          visual_questions_enabled: enable_visual_questions,
          visual_questions_count: analysisResult.questions.filter(q => ['hotspot', 'matching', 'sequencing'].includes(q.type)).length,
          frame_capture_available: true,
          direct_bounding_box_detection: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in enhanced-quiz-service:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
}); 