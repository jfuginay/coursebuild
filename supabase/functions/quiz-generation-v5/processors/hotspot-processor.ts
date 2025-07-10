/**
 * Stage 2: Hotspot Question Processor  
 * 
 * Simplified processor that generates bounding boxes for hotspot questions
 * using the proven approach from enhanced-quiz-service.
 * Question planning is now handled in Stage 1.
 */

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

import { QuestionPlan, HotspotQuestion, QuestionGenerationError } from '../types/interfaces.ts';
import { convertSecondsToBase60 } from '../utils/timestamp-converter.ts';

// =============================================================================
// Simplified Hotspot Generation Function
// =============================================================================

export const generateHotspotQuestion = async (
  plan: QuestionPlan, 
  youtubeUrl: string,
  transcriptContext?: any
): Promise<HotspotQuestion> => {
  try {
    console.log(`🎯 Generating Hotspot Bounding Boxes: ${plan.question_id}`);
    console.log(`   📚 Learning Objective: ${plan.learning_objective}`);
    console.log(`   🎯 Target Objects: ${plan.target_objects?.join(', ') || 'Not specified'}`);
    console.log(`   🎬 Frame Timestamp: ${plan.frame_timestamp || plan.timestamp}s`);
    
    if (transcriptContext && transcriptContext.visualContext) {
      console.log(`   👁️ Visual Context from Transcript: ${transcriptContext.visualContext.substring(0, 100)}...`);
    }
    
    // Add small random delay to prevent rate limiting when processing multiple hotspot questions
    const delay = Math.random() * 1000 + 500; // 500-1500ms random delay
    console.log(`⏳ Adding ${Math.round(delay)}ms delay to prevent rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Validate that we have the required hotspot planning data
    if (!plan.target_objects || plan.target_objects.length === 0) {
      throw new Error('Hotspot question plan missing target_objects from Stage 1 planning');
    }
    
    if (!plan.visual_learning_objective) {
      throw new Error('Hotspot question plan missing visual_learning_objective from Stage 1 planning');
    }
    
    if (!plan.question_context) {
      throw new Error('Hotspot question plan missing question_context from Stage 1 planning');
    }
    
    // Use frame_timestamp from planning, fallback to timestamp
    const frameTimestamp = plan.frame_timestamp || plan.timestamp;
    
    // Generate bounding boxes using the proven enhanced-quiz-service approach
    const boundingBoxes = await generateBoundingBoxes(youtubeUrl, plan, frameTimestamp, transcriptContext);
    
    // Create the hotspot question with pre-planned data + generated content and bounding boxes
    const hotspotQuestion: HotspotQuestion = {
      question_id: plan.question_id,
      timestamp: plan.timestamp,
      type: 'hotspot',
      question: boundingBoxes.question,
      target_objects: plan.target_objects,
      frame_timestamp: frameTimestamp,
      question_context: plan.question_context,
      explanation: boundingBoxes.explanation,
      bloom_level: plan.bloom_level,
      educational_rationale: plan.educational_rationale,
      visual_learning_objective: plan.visual_learning_objective,
      distractor_guidance: {
        expected_distractors: extractExpectedDistractors(plan),
        why_distractors_matter: "These alternatives test understanding versus mere recognition"
      },
      bounding_boxes: boundingBoxes.elements
    };
    
    console.log(`✅ Hotspot generated successfully: ${plan.question_id}`);
    console.log(`   🎯 Question: ${hotspotQuestion.question.substring(0, 60)}...`);
    console.log(`   📦 Target Objects: ${plan.target_objects.join(', ')}`);
    console.log(`   🎬 Frame Timestamp: ${frameTimestamp}s`);
    console.log(`   📍 Bounding Boxes: ${boundingBoxes.elements.length} options generated`);
    
    return hotspotQuestion;
    
  } catch (error: unknown) {
    console.error(`❌ Hotspot generation failed for ${plan.question_id}:`, error);
    throw new QuestionGenerationError(
      `Hotspot generation failed: ${error instanceof Error ? error.message : String(error)}`,
      plan.question_id,
      { plan, stage: 'hotspot_generation' }
    );
  }
};

// =============================================================================
// Bounding Box Generation (Based on enhanced-quiz-service)
// =============================================================================

const generateBoundingBoxes = async (
  youtubeUrl: string,
  plan: QuestionPlan,
  frameTimestamp: number,
  transcriptContext?: any
): Promise<{question: string, explanation: string, elements: any[]}> => {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second base delay
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Generating bounding boxes for: ${plan.target_objects?.join(', ')} (attempt ${attempt}/${maxRetries})`);
      
      // Add progressive delay between attempts to handle rate limiting
      if (attempt > 1) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry attempt ${attempt}...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Create 0.5-second window around the frame timestamp for precise analysis
      const startOffset = Math.max(0, frameTimestamp - 0.5);
      const endOffset = frameTimestamp;
      
      // Convert to base-60 for Gemini
      const startOffsetBase60 = convertSecondsToBase60(startOffset);
      const endOffsetBase60 = convertSecondsToBase60(endOffset);
      
      console.log(`📹 Analyzing video segment: ${startOffset}s to ${endOffset}s (base-60: ${startOffsetBase60} to ${endOffsetBase60})`);
      
      const objectDetectionPrompt = `
You are creating a visual hotspot question for educational purposes. Generate appropriate question text, explanation, and bounding boxes for all visible objects in this frame.

LEARNING OBJECTIVE: ${plan.learning_objective}
VISUAL LEARNING OBJECTIVE: ${plan.visual_learning_objective}
QUESTION CONTEXT: ${plan.question_context}
KEY CONCEPTS: ${plan.key_concepts.join(', ')}
BLOOM LEVEL: ${plan.bloom_level}

${transcriptContext ? `
TRANSCRIPT CONTEXT:
Visual Description at Timestamp: ${transcriptContext.visualContext || 'Not available'}
Content being discussed: ${transcriptContext.formattedContext}

Use this transcript context to:
- Understand what's actually visible in the frame based on the visual description
- Create questions that align with what's being discussed at this moment
- Make the question more contextually relevant to the lesson
` : ''}

Requirements:
1. Generate clear, educational question text that asks students to identify a target object
2. Generate a comprehensive explanation that explains why identifying this object is important
3. Find and mark all other visible objects in the frame with minimal overlap with the target object (minimum 3-5 bounding boxes)
4. Mark the target object as correct answers
5. Choose educational distractors that test understanding

Guidelines for question text:
- Be specific about what to identify
- Connect to the learning objective
- Use appropriate academic language for the ${plan.bloom_level} level

Guidelines for explanation:
- Explain why identifying this object matters
- Connect to broader concepts: ${plan.key_concepts.join(', ')}
- Reinforce the visual learning objective
- Be educational and informative

Guidelines for bounding boxes:
- ALWAYS return at least two bounding boxes minimum for interactive selection
- Mark is_correct_answer=true ONLY for: the target object
- Mark is_correct_answer=false for all other objects
- Choose distractors that test understanding, not random objects
- Each object should be clearly distinguishable, with minimal overlap with other objects
- Keep bounding boxes as small as possible, and do not include objects which take up more than 30% of the frame
- Provide unique descriptive labels for each object
`;

      const geminiRequest = {
        contents: [
          {
            parts: [
              {
                fileData: {
                  fileUri: youtubeUrl
                },
                videoMetadata: {
                  startOffset: `${startOffsetBase60}s`,
                  endOffset: `${endOffsetBase60}s`
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
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Clear, educational question text asking students to identify the target object"
              },
              explanation: {
                type: "string",
                description: "Comprehensive explanation of why identifying this object is educationally important"
              },
              bounding_boxes: {
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
                      description: "Whether this the targetobject that the question is asking for"
                    },
                    confidence_score: {
                      type: "number",
                      description: "Confidence score between 0.0 and 1.0"
                    }
                  },
                  required: ["box_2d", "label", "is_correct_answer"]
                }
              }
            },
            required: ["question", "explanation", "bounding_boxes"]
          }
        }
      };
    
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiRequest)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Gemini API HTTP error (attempt ${attempt}):`, response.status, response.statusText);
        console.error(`📄 Error details:`, errorText);
        
        // Check for rate limiting
        if (response.status === 429) {
          console.log(`⏱️ Rate limited - will retry with longer delay`);
          if (attempt < maxRetries) continue; // Retry with exponential backoff
        }
        
        throw new Error(`Gemini Vision API HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Gemini API response structure:`, {
        hasCandidates: !!data.candidates,
        candidatesLength: data.candidates?.length || 0,
        hasContent: !!data.candidates?.[0]?.content,
        hasPartscontent: !!data.candidates?.[0]?.content?.parts,
        partsLength: data.candidates?.[0]?.content?.parts?.length || 0
      });
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        console.error(`❌ No text content in Gemini response (attempt ${attempt}):`, JSON.stringify(data, null, 2));
        
        // Check for specific error conditions
        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          console.error(`🛡️ Content filtered by safety settings`);
          throw new Error('Content filtered by Gemini safety settings');
        }
        
        if (data.candidates?.[0]?.finishReason === 'RECITATION') {
          console.error(`📝 Content blocked due to recitation concerns`);
          throw new Error('Content blocked by Gemini recitation filter');
        }
        
        // If this is not the last attempt, continue to retry
        if (attempt < maxRetries) {
          console.log(`⚠️ Empty response on attempt ${attempt}, retrying...`);
          continue;
        }
        
        throw new Error('No bounding box response from Gemini Vision API after all retries');
      }

      // Parse structured hotspot response with enhanced error handling
      let hotspotResult;
      try {
        console.log(`📝 Parsing hotspot response (${text.length} chars)`);
        hotspotResult = JSON.parse(text);
        
        if (!hotspotResult || typeof hotspotResult !== 'object') {
          throw new Error('Expected object with question, explanation, and bounding_boxes');
        }
        
        if (!hotspotResult.question || !hotspotResult.explanation || !Array.isArray(hotspotResult.bounding_boxes)) {
          throw new Error('Missing required fields: question, explanation, or bounding_boxes');
        }
        
        console.log(`✅ Successfully parsed hotspot response with ${hotspotResult.bounding_boxes.length} bounding box candidates`);
      } catch (parseError) {
        console.error(`❌ Failed to parse hotspot results (attempt ${attempt}):`, parseError);
        console.log('📄 Raw response length:', text.length);
        console.log('📄 Response start:', text.substring(0, 200));
        console.log('📄 Response end:', text.substring(Math.max(0, text.length - 200)));
        
        // Try fallback JSON extraction
        try {
          console.log('🔧 Attempting fallback JSON extraction for hotspot...');
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            hotspotResult = JSON.parse(jsonMatch[0]);
            console.log('✅ Fallback hotspot extraction successful');
          } else {
            console.log('❌ No JSON object found in response');
            if (attempt < maxRetries) {
              console.log(`⚠️ Parse failed on attempt ${attempt}, retrying...`);
              continue;
            }
            throw new Error('No hotspot question generated');
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback extraction failed (attempt ${attempt}):`, fallbackError);
          if (attempt < maxRetries) {
            console.log(`⚠️ Fallback failed on attempt ${attempt}, retrying...`);
            continue;
          }
          throw new Error('Failed to generate hotspot question after all retries');
        }
      }

      // Convert to normalized format (same as enhanced-quiz-service)
      const normalizedElements = hotspotResult.bounding_boxes.map((bbox: any, index: number) => {
        if (!bbox.box_2d || bbox.box_2d.length !== 4) {
          console.warn(`⚠️ Invalid bounding box format at index ${index}:`, bbox);
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
          educational_significance: `Interactive hotspot element: ${bbox.label}`,
          description: `Detected via Gemini bounding box: ${bbox.label}`
        };
      }).filter(Boolean); // Remove any null entries

      // Quality checks (same as enhanced-quiz-service)
      if (normalizedElements.length < 2) {
        console.warn(`⚠️ Insufficient bounding boxes detected: ${normalizedElements.length} (attempt ${attempt})`);
        if (attempt < maxRetries) {
          console.log(`⚠️ Too few boxes on attempt ${attempt}, retrying...`);
          continue;
        }
        throw new Error(`Insufficient bounding boxes detected: ${normalizedElements.length}. Need at least 2 for meaningful interaction.`);
      }

      // Validate we have exactly one correct answer
      const correctAnswers = normalizedElements.filter((el: any) => el.is_correct_answer);
      if (correctAnswers.length !== 1) {
        console.warn(`⚠️ Expected exactly 1 correct answer, found ${correctAnswers.length}. Adjusting...`);
        
        // Fix correct answer assignment
        if (correctAnswers.length === 0 && plan.target_objects) {
          const targetObjectLabels = plan.target_objects.map((obj: string) => obj.toLowerCase());
          for (const element of normalizedElements) {
            if (element && element.label) {
              const elementLabel = element.label.toLowerCase();
              if (targetObjectLabels.some((target: string) => elementLabel.includes(target))) {
                element.is_correct_answer = true;
                console.log(`✅ Marked "${element.label}" as correct answer`);
                break;
              }
            }
          }
        }
        
        // If multiple correct answers, keep only the first one
        if (correctAnswers.length > 1) {
          correctAnswers.slice(1).forEach((answer: any) => {
            if (answer) {
              answer.is_correct_answer = false;
            }
          });
        }
      }

      // Final validation: Check if we still have no correct answers after adjustment attempts
      const finalCorrectAnswers = normalizedElements.filter((el: any) => el.is_correct_answer);
      if (finalCorrectAnswers.length === 0) {
        console.error(`❌ HOTSPOT QUESTION DISCARDED: No correct answer detected in video frame`);
        console.error(`   🎯 Target objects: ${plan.target_objects?.join(', ')}`);
        console.error(`   📦 Detected objects: ${normalizedElements.map((el: any) => el.label).join(', ')}`);
        console.error(`   🎬 Frame timestamp: ${frameTimestamp}s (${startOffset}s - ${endOffset}s)`);
        console.error(`   📝 Question context: ${plan.question_context}`);
        throw new Error(`Correct answer object(s) '${plan.target_objects?.join(', ')}' not detected in video frame. The target objects are not visible or recognizable at timestamp ${frameTimestamp}s. Hotspot question discarded.`);
      }

      console.log(`✅ Generated ${normalizedElements.length} bounding boxes successfully on attempt ${attempt}`);
      console.log(`📦 Elements: ${normalizedElements.map((el: any) => `${el.label}(${el.is_correct_answer ? 'CORRECT' : 'distractor'})`).join(', ')}`);
      
      return {
        question: hotspotResult.question,
        explanation: hotspotResult.explanation,
        elements: normalizedElements
      };
      
    } catch (error: unknown) {
      console.error(`❌ Error generating bounding boxes (attempt ${attempt}/${maxRetries}):`, error);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Otherwise, log and continue to next attempt
      console.log(`⚠️ Attempt ${attempt} failed, will retry...`);
    }
  }
  
  // This should never be reached due to the throw in the last attempt
  throw new Error('Failed to generate bounding boxes after all retry attempts');
};

// =============================================================================
// Helper Functions for Question Creation
// =============================================================================

const extractExpectedDistractors = (plan: QuestionPlan): string[] => {
  // Extract potential distractors from planning notes or key concepts
  const distractors: string[] = [];
  
  if (plan.planning_notes.includes('distractor')) {
    // Try to extract distractors from planning notes
    const distractorMatch = plan.planning_notes.match(/distractor[s]?[:\-\s]+([^.]+)/i);
    if (distractorMatch) {
      distractors.push(...distractorMatch[1].split(/[,;]/).map(d => d.trim()));
    }
  }
  
  // Add related concepts as potential distractors
  const relatedConcepts = plan.key_concepts.filter(concept => 
    !plan.target_objects?.some(target => target.toLowerCase().includes(concept.toLowerCase()))
  );
  distractors.push(...relatedConcepts);
  
  return distractors.slice(0, 3); // Limit to 3 distractors
};

// =============================================================================
// Export Configuration
// =============================================================================

export const hotspotProcessorConfig = {
  questionType: 'hotspot',
  processorName: 'Simplified Hotspot Processor v5.0',
  stage: 2,
  requiresVideoAnalysis: true,
  supports: {
    visualLearning: true,
    frameTimingOptimization: true,
    objectIdentification: true,
    educationalIntegration: true,
    boundingBoxGeneration: true
  }
}; 