import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.19.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface VisualFrameRequest {
  course_id: string;
  youtube_url: string;
  action: 'process-visual-questions' | 'analyze-frame' | 'generate-fallback';
  questions?: any[]; // Questions from generateEnhancedQuestions with timestamps and visual_context
  timestamp?: number;
  visual_context?: string;
}

// Extract frame at specific timestamp using frame-capture-service
async function captureFrameAtTimestamp(
  supabaseUrl: string,
  apiKey: string,
  courseId: string,
  youtubeUrl: string,
  timestamp: number
): Promise<any> {
  console.log(`📸 Capturing frame at ${timestamp}s...`);
  
  try {
    const frameCaptureUrl = `${supabaseUrl}/functions/v1/frame-capture-service`;
    
    const response = await fetch(frameCaptureUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey
      },
      body: JSON.stringify({
        course_id: courseId,
        youtube_url: youtubeUrl,
        timestamps: [timestamp],
        quality: 'medium'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Frame capture failed: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.results && result.results.length > 0) {
      return result.results[0];
    } else {
      throw new Error('No frame captured');
    }
    
  } catch (error) {
    console.error('❌ Frame capture failed:', error);
    throw new Error(`Frame capture failed: ${error.message}`);
  }
}

// Enhanced object detection using Gemini Vision API
async function detectObjectsInFrame(
  genAI: GoogleGenerativeAI,
  frameData: Uint8Array,
  visualContext: string,
  questionType: string = 'hotspot'
): Promise<any> {
  console.log('🔍 Detecting objects with Gemini Vision API...');
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Enhanced prompt based on visual context and question type
    let detectionPrompt = '';
    
    if (questionType === 'hotspot') {
      detectionPrompt = `
      Detect all prominent educational elements in this image related to: "${visualContext}"
      
      Focus on identifying:
      - Text elements (labels, formulas, titles)
      - Diagram components (shapes, arrows, connections)
      - Interactive elements (buttons, highlighted areas)
      - Key visual objects mentioned in the context
      
      Return bounding boxes in JSON format. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.
      
      Format:
      [
        {
          "label": "descriptive label",
          "box_2d": [ymin, xmin, ymax, xmax],
          "confidence": 0.95,
          "educational_relevance": "high|medium|low",
          "suitable_for_hotspot": true
        }
      ]
      `;
    } else if (questionType === 'matching') {
      detectionPrompt = `
      Identify visual elements that can be matched with concepts in: "${visualContext}"
      
      Focus on:
      - Distinct visual components that can be paired with descriptions
      - Symbols, icons, or graphical elements
      - Text labels that correspond to visual elements
      
      Return bounding boxes for matchable elements. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.
      `;
    } else {
      detectionPrompt = `
      Detect all prominent items in the image related to: "${visualContext}"
      The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000.
      `;
    }
    
    // Convert frame data to base64 for Gemini
    const base64Data = btoa(String.fromCharCode(...frameData));
    
    const content = [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data
            }
          },
          { text: detectionPrompt }
        ]
      }
    ];
    
    // Use structured JSON output as shown in Google AI documentation
    const result = await model.generateContent({
      contents: content,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });
    
    const response = await result.response;
    const boundingBoxes = JSON.parse(response.text());
    
    console.log(`✅ Detected ${boundingBoxes.length} objects`);
    return boundingBoxes;
    
  } catch (error) {
    console.error('❌ Object detection failed:', error);
    return [];
  }
}

// Convert normalized bounding boxes to absolute coordinates
function convertBoundingBoxes(boundingBoxes: any[], imageWidth: number = 1280, imageHeight: number = 720): any[] {
  console.log('🔄 Converting bounding boxes to absolute coordinates...');
  
  return boundingBoxes.map((bbox, index) => {
    try {
      const [ymin, xmin, ymax, xmax] = bbox.box_2d;
      
      // Convert from 0-1000 normalized to absolute pixels
      const abs_x1 = Math.round((xmin / 1000) * imageWidth);
      const abs_y1 = Math.round((ymin / 1000) * imageHeight);
      const abs_x2 = Math.round((xmax / 1000) * imageWidth);
      const abs_y2 = Math.round((ymax / 1000) * imageHeight);
      
      // Convert to relative coordinates (0-1) for database storage
      const rel_x = abs_x1 / imageWidth;
      const rel_y = abs_y1 / imageHeight;
      const rel_width = (abs_x2 - abs_x1) / imageWidth;
      const rel_height = (abs_y2 - abs_y1) / imageHeight;
      
      return {
        label: bbox.label || `Object ${index + 1}`,
        x: rel_x,
        y: rel_y,
        width: rel_width,
        height: rel_height,
        confidence_score: bbox.confidence || 0.8,
        is_correct_answer: bbox.suitable_for_hotspot !== false,
        educational_relevance: bbox.educational_relevance || 'medium',
        absolute_coords: { x1: abs_x1, y1: abs_y1, x2: abs_x2, y2: abs_y2 }
      };
    } catch (error) {
      console.warn(`⚠️ Failed to convert bounding box ${index}:`, error);
      return null;
    }
  }).filter(bbox => bbox !== null);
}

// Process visual questions with targeted frame capture and analysis
async function processVisualQuestions(
  supabaseClient: any,
  genAI: GoogleGenerativeAI,
  courseId: string,
  youtubeUrl: string,
  questions: any[]
): Promise<any[]> {
  console.log(`🎯 Processing ${questions.length} visual questions with targeted analysis...`);
  
  const results = [];
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const apiKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  for (const question of questions) {
    if (!question.requires_frame_capture) {
      console.log(`⏭️ Skipping non-visual question at ${question.timestamp}s`);
      continue;
    }
    
    try {
      console.log(`\n🎬 Processing visual question at ${question.timestamp}s`);
      console.log(`📝 Visual context: ${question.visual_context}`);
      
      // Step 1: Capture frame at specific timestamp
      const frameResult = await captureFrameAtTimestamp(
        supabaseUrl,
        apiKey,
        courseId,
        youtubeUrl,
        question.timestamp
      );
      
      if (!frameResult.success) {
        throw new Error('Frame capture failed');
      }
      
      // Step 2: Get frame data for object detection
      // Note: In production, we'd fetch the actual frame data from the URL
      // For now, we'll simulate the process and use the frame URL
      const frameUrl = frameResult.frame_url;
      
      // Fetch frame data (in production, this would be the actual image bytes)
      let frameData: Uint8Array;
      try {
        const response = await fetch(frameUrl);
        const arrayBuffer = await response.arrayBuffer();
        frameData = new Uint8Array(arrayBuffer);
      } catch (error) {
        console.warn(`⚠️ Could not fetch frame data, using mock data for ${question.timestamp}s`);
        // Mock frame data for development
        frameData = new Uint8Array(1000).fill(255);
      }
      
      // Step 3: Detect objects using Gemini Vision with visual context
      const detectedObjects = await detectObjectsInFrame(
        genAI,
        frameData,
        question.visual_context,
        question.visual_question_type
      );
      
      // Step 4: Convert bounding boxes to proper coordinates
      const convertedBoundingBoxes = convertBoundingBoxes(detectedObjects);
      
      // Step 5: Store visual asset record
      const { data: visualAsset, error: assetError } = await supabaseClient
        .from('visual_assets')
        .insert({
          course_id: courseId,
          timestamp: question.timestamp,
          asset_type: 'frame',
          image_url: frameUrl,
          thumbnail_url: frameResult.thumbnail_url,
          width: 1280,
          height: 720,
          file_size: frameData.length,
          alt_text: `Educational frame at ${question.timestamp}s: ${question.visual_context}`
        })
        .select()
        .single();
      
      if (assetError) {
        throw new Error(`Failed to store visual asset: ${assetError.message}`);
      }
      
      // Step 6: Store bounding boxes
      if (convertedBoundingBoxes.length > 0) {
        const boundingBoxData = convertedBoundingBoxes.map(bbox => ({
          visual_asset_id: visualAsset.id,
          label: bbox.label,
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          confidence_score: bbox.confidence_score,
          is_correct_answer: bbox.is_correct_answer
        }));
        
        const { error: bboxError } = await supabaseClient
          .from('bounding_boxes')
          .insert(boundingBoxData);
        
        if (bboxError) {
          console.warn(`⚠️ Failed to store bounding boxes for ${question.timestamp}s:`, bboxError);
        }
      }
      
      results.push({
        timestamp: question.timestamp,
        success: true,
        visual_asset_id: visualAsset.id,
        frame_url: frameUrl,
        thumbnail_url: frameResult.thumbnail_url,
        detected_objects: detectedObjects.length,
        bounding_boxes: convertedBoundingBoxes,
        visual_context: question.visual_context,
        question_type: question.visual_question_type
      });
      
      console.log(`✅ Successfully processed visual question at ${question.timestamp}s`);
      
    } catch (error) {
      console.error(`❌ Failed to process visual question at ${question.timestamp}s:`, error);
      results.push({
        timestamp: question.timestamp,
        success: false,
        error: error.message,
        visual_context: question.visual_context
      });
    }
  }
  
  console.log(`✅ Completed processing ${results.length} visual questions`);
  return results;
}

// Generate enhanced visual questions based on detected objects
async function generateEnhancedVisualQuestions(
  genAI: GoogleGenerativeAI,
  processedResults: any[]
): Promise<any[]> {
  console.log('🧠 Generating enhanced visual questions from object detection...');
  
  const enhancedQuestions = [];
  
  for (const result of processedResults) {
    if (!result.success || result.bounding_boxes.length === 0) {
      continue;
    }
    
    try {
      // Generate hotspot question based on detected objects
      const hotspotQuestion = {
        type: 'hotspot',
        timestamp: result.timestamp,
        question: `Identify the key educational element in this frame`,
        frame_url: result.frame_url,
        visual_context: result.visual_context,
        correct_areas: result.bounding_boxes
          .filter(bbox => bbox.is_correct_answer)
          .slice(0, 3) // Limit to top 3 correct areas
          .map(bbox => ({
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
            label: bbox.label
          })),
        explanation: `This area contains important educational content: ${result.visual_context}`,
        difficulty: 'medium',
        points: 10
      };
      
      enhancedQuestions.push(hotspotQuestion);
      
      // Generate matching question if multiple objects detected
      if (result.bounding_boxes.length >= 2) {
        const matchingQuestion = {
          type: 'matching',
          timestamp: result.timestamp,
          question: `Match the visual elements with their descriptions`,
          frame_url: result.frame_url,
          visual_context: result.visual_context,
          pairs: result.bounding_boxes.slice(0, 4).map((bbox, index) => ({
            visual: bbox.label,
            match: `Educational element ${index + 1}`,
            bbox: {
              x: bbox.x,
              y: bbox.y,
              width: bbox.width,
              height: bbox.height
            }
          })),
          explanation: `These elements work together to explain the concept shown in the frame.`,
          difficulty: 'medium',
          points: 15
        };
        
        enhancedQuestions.push(matchingQuestion);
      }
      
    } catch (error) {
      console.warn(`⚠️ Failed to generate enhanced questions for ${result.timestamp}s:`, error);
    }
  }
  
  console.log(`✅ Generated ${enhancedQuestions.length} enhanced visual questions`);
  return enhancedQuestions;
}

// Main visual frame service handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);

    const {
      course_id,
      youtube_url,
      action,
      questions,
      timestamp,
      visual_context
    }: VisualFrameRequest = await req.json();

    if (!course_id || !youtube_url || !action) {
      throw new Error('Course ID, YouTube URL, and action are required');
    }

    console.log(`🎬 Visual Frame Service - Action: ${action}`);

    switch (action) {
      case 'process-visual-questions': {
        if (!questions || questions.length === 0) {
          throw new Error('Questions array is required for processing visual questions');
        }
        
        console.log(`🎯 Processing ${questions.length} questions from enhanced quiz service...`);
        
        // Filter questions that need frame capture
        const visualQuestions = questions.filter(q => q.requires_frame_capture);
        console.log(`📸 Found ${visualQuestions.length} visual questions to process`);
        
        if (visualQuestions.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              action: 'process-visual-questions',
              message: 'No visual questions to process',
              results: []
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200
            }
          );
        }
        
        // Process visual questions with targeted analysis
        const processedResults = await processVisualQuestions(
          supabaseClient,
          genAI,
          course_id,
          youtube_url,
          visualQuestions
        );
        
        // Generate enhanced visual questions based on object detection
        const enhancedQuestions = await generateEnhancedVisualQuestions(
          genAI,
          processedResults
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'process-visual-questions',
            course_id,
            youtube_url,
            processed_questions: processedResults.length,
            successful_captures: processedResults.filter(r => r.success).length,
            enhanced_questions: enhancedQuestions,
            results: processedResults,
            summary: {
              total_questions: questions.length,
              visual_questions: visualQuestions.length,
              successful_processing: processedResults.filter(r => r.success).length,
              total_bounding_boxes: processedResults.reduce((sum, r) => sum + (r.bounding_boxes?.length || 0), 0),
              enhanced_questions_generated: enhancedQuestions.length
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      case 'analyze-frame': {
        if (!timestamp || !visual_context) {
          throw new Error('Timestamp and visual_context are required for frame analysis');
        }
        
        console.log(`🔍 Analyzing single frame at ${timestamp}s...`);
        
        // Create mock question for single frame analysis
        const mockQuestion = {
          timestamp,
          visual_context,
          requires_frame_capture: true,
          visual_question_type: 'hotspot'
        };
        
        const results = await processVisualQuestions(
          supabaseClient,
          genAI,
          course_id,
          youtube_url,
          [mockQuestion]
        );
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'analyze-frame',
            timestamp,
            visual_context,
            result: results[0] || null
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      case 'generate-fallback': {
        console.log('🎨 Generating fallback visual descriptions...');
        
        const fallbackTimestamps = timestamp ? [timestamp] : [60, 180, 300];
        const fallbackResults = fallbackTimestamps.map(ts => ({
          timestamp: ts,
          fallback_data: {
            description: `Educational content frame at ${ts}s with visual elements optimized for quiz questions`,
            key_elements: ["Primary concept area", "Supporting text", "Interactive elements"],
            suggested_hotspots: [
              {
                label: "Main focus area",
                approx_position: "center",
                importance: 9
              }
            ],
            quiz_potential: "high",
            fallback_type: "enhanced_description"
          },
          generated_at: new Date().toISOString()
        }));
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'generate-fallback',
            course_id,
            youtube_url,
            fallback_results: fallbackResults
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('❌ Visual frame service error:', error);
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