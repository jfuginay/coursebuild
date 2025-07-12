import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import OpenAI from 'openai';
import { EdgeFunctionContext, ChatMessage, TranscriptSegment, OpenAIResponse, EnhancedAIResponse } from './types.ts';
import { VisualGenerator } from './visual-generator.ts';
import { langsmithLogger, logOpenAICall } from '../quiz-generation-v5/utils/langsmith-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const context: EdgeFunctionContext = await req.json();
    console.log('📥 Received chat context:', {
      messageLength: context.message.length,
      conversationLength: context.conversationHistory.length,
      courseId: context.courseContext.courseId,
      currentVideoTime: context.courseContext.currentVideoTime,
      segmentsWatched: context.courseContext.playedTranscriptSegments.length,
      totalSegments: context.courseContext.totalSegments
    });

    // Log available environment variables (for debugging)
    console.log('🔍 Checking environment variables...');
    console.log('  - OPENAI_API_KEY exists:', !!Deno.env.get('OPENAI_API_KEY'));
    console.log('  - GEMINI_API_KEY exists:', !!Deno.env.get('GEMINI_API_KEY'));
    console.log('  - SUPABASE_URL exists:', !!Deno.env.get('SUPABASE_URL'));
    console.log('  - LANGSMITH_API_KEY exists:', !!Deno.env.get('LANGSMITH_API_KEY'));
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('❌ Missing OpenAI API key in edge function');
      console.error('  Available env vars:', Object.keys(Deno.env.toObject()).filter(k => !k.includes('KEY')));
      return new Response(JSON.stringify({
        error: 'Missing OpenAI API key'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Initialize visual generator (it will get API key from environment)
    const visualGenerator = new VisualGenerator('');

    // Generate the enhanced response with visuals
    const response = await generateEnhancedChatResponse(openai, context, visualGenerator);

    console.log('✅ Generated enhanced response:', {
      responseLength: response.response.length,
      visualsCount: response.visuals?.length || 0,
      usage: response.usage
    });

    return new Response(JSON.stringify({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in AI chat assistant:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Internal server error',
      response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function generateEnhancedChatResponse(
  openai: OpenAI, 
  context: EdgeFunctionContext,
  visualGenerator: VisualGenerator
): Promise<EnhancedAIResponse> {
  // First, generate the text response
  const textResponse = await generateChatResponse(openai, context);
  
  // Detect if a visual would be helpful
  console.log('🔍 Checking if visual generation would be helpful...');
  const visualContext = await visualGenerator.detectVisualNeed(
    context.message,
    context
  );
  
  console.log('📊 Visual detection result:', visualContext);
  
  // Generate visual if needed
  let visuals = [];
  if (visualContext.shouldGenerate && visualContext.confidence > 0.8) {  // Increased from 0.6 to 0.8
    console.log(`🎨 Generating ${visualContext.visualType} diagram...`);
    console.log(`📝 Justification: ${visualContext.justification || 'No justification provided'}`);
    
    try {
      const visualGenerationContext = visualGenerator.extractVisualContext(context);
      const visual = await visualGenerator.generateVisual(
        visualGenerationContext,
        visualContext.visualType,
        context  // Pass the full EdgeFunctionContext
      );
      
      visuals.push(visual);
      console.log('✅ Visual generated successfully');
    } catch (error) {
      console.error('❌ Error generating visual:', error);
      // Continue without visual on error
    }
  } else if (visualContext.shouldGenerate) {
    console.log(`⏭️ Skipping visual generation - confidence too low: ${visualContext.confidence}`);
    console.log(`📝 Would have generated: ${visualContext.visualType}`);
  }
  
  return {
    ...textResponse,
    visuals,
    visualContext: visualContext.shouldGenerate ? {
      shouldGenerateVisual: visualContext.shouldGenerate,
      suggestedVisualType: visualContext.visualType,
      confidence: visualContext.confidence
    } : undefined
  };
}

async function generateChatResponse(
  openai: OpenAI, 
  context: EdgeFunctionContext
): Promise<OpenAIResponse> {
  const { message, conversationHistory, courseContext } = context;
  const { playedTranscriptSegments, currentVideoTime, totalSegments } = courseContext;

  // Build context for the AI
  const systemPrompt = buildSystemPrompt(courseContext);
  const conversationContext = buildConversationContext(conversationHistory);
  const transcriptContext = buildTranscriptContext(playedTranscriptSegments, currentVideoTime);

  // Determine the type of request
  const requestType = determineRequestType(message);
  const userPrompt = buildUserPrompt(message, requestType, transcriptContext);

  console.log('🧠 Request type detected:', requestType);
  console.log('📝 Transcript segments available:', playedTranscriptSegments.length);
  console.log('⏱️ Current video time:', currentVideoTime, 'seconds');
  console.log('📊 Progress:', `${playedTranscriptSegments.length}/${totalSegments} segments watched`);

  try {
    // Prepare the request body
    const requestBody = {
      model: "gpt-4o-mini", // Using the efficient model for chat
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        ...conversationContext,
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    };

    // Use LangSmith logging for the OpenAI call
    const response = await logOpenAICall(
      'https://api.openai.com/v1/chat/completions',
      requestBody,
      `AI Chat - ${requestType} (${playedTranscriptSegments.length} segments watched)`,
      Deno.env.get('OPENAI_API_KEY')
    );

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    
    return {
      response: responseText.trim(),
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

function buildSystemPrompt(courseContext: EdgeFunctionContext['courseContext']): string {
  const { currentVideoTime, totalSegments, playedTranscriptSegments } = courseContext;
  const progressPercentage = totalSegments > 0 ? Math.round((playedTranscriptSegments.length / totalSegments) * 100) : 0;
  
  return `You are CourseForge AI, an intelligent learning assistant helping students understand educational video content.

CONTEXT:
- The student is watching an educational video course
- Current video position: ${Math.floor(currentVideoTime / 60)}:${Math.floor(currentVideoTime % 60).toString().padStart(2, '0')}
- Progress: ${progressPercentage}% watched (${playedTranscriptSegments.length}/${totalSegments} segments)
- You have access to the transcript of content they've watched so far

YOUR ROLE:
- Provide helpful, educational responses based on the video content they've seen
- Focus on learning concepts, not video production details
- Be concise but thorough in explanations
- Encourage active learning and understanding
- Don't reveal future content they haven't watched yet

RESPONSE GUIDELINES:
- Keep responses under 150 words for general questions
- For explanations, be clear and structured
- For question hints, guide without giving away answers
- Use encouraging, supportive tone
- Reference specific concepts from the transcript when relevant`;
}

function buildConversationContext(conversationHistory: ChatMessage[]): Array<{role: "user" | "assistant", content: string}> {
  // Include last 6 messages for context (3 exchanges)
  const recentHistory = conversationHistory.slice(-6);
  
  return recentHistory.map(msg => ({
    role: msg.isUser ? "user" as const : "assistant" as const,
    content: msg.text
  }));
}

function buildTranscriptContext(segments: TranscriptSegment[], currentTime: number): string {
  console.log('📜 Building transcript context:', {
    segmentsCount: segments.length,
    currentTime,
    firstSegment: segments[0] ? {
      timestamp: segments[0].timestamp,
      end_timestamp: segments[0].end_timestamp,
      text: segments[0].text.substring(0, 50) + '...'
    } : null
  });
  
  if (segments.length === 0) {
    return `No video content has been watched yet. Current video time: ${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`;
  }

  // Group segments into logical chunks and summarize
  const transcriptText = segments
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(segment => {
      const timestamp = Math.floor(segment.timestamp / 60) + ":" + Math.floor(segment.timestamp % 60).toString().padStart(2, '0');
      return `[${timestamp}] ${segment.text}`;
    })
    .join('\n');

  return `TRANSCRIPT OF WATCHED CONTENT (${segments.length} segments up to ${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}):\n${transcriptText}`;
}

function determineRequestType(message: string): 'explain_video' | 'question_hint' | 'general_chat' {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('explain what has happened in the video')) {
    return 'explain_video';
  }
  
  if (lowerMessage.includes('help me with this question') || lowerMessage.includes('provide a hint')) {
    return 'question_hint';
  }
  
  return 'general_chat';
}

function buildUserPrompt(message: string, requestType: string, transcriptContext: string): string {
  const basePrompt = `${transcriptContext}\n\nSTUDENT REQUEST:\n${message}`;
  
  switch (requestType) {
    case 'explain_video':
      return `${basePrompt}

Please provide a succinct explanation of what has happened in the video content so far. Focus on:
- Key concepts and learning objectives covered
- Main ideas and how they connect
- Important details for understanding
- Avoid video production details or unrelated background information

Structure your explanation clearly and help the student understand the core learning material.`;

    case 'question_hint':
      return `${basePrompt}

The student needs help with a question but doesn't want the answer given away. Provide a helpful hint that:
- Guides their thinking process
- Points them toward the relevant concepts
- Encourages them to reason through the problem
- Does NOT directly solve the question
- References relevant content from the video transcript if applicable

Be supportive and educational in your guidance.`;

    case 'general_chat':
    default:
      return `${basePrompt}

Please provide a helpful response based on the video content they've watched and their question. Be educational, supportive, and focus on enhancing their learning experience.`;
  }
} 