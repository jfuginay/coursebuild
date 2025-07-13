import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logOpenAICall } from '../quiz-generation-v5/utils/langsmith-logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// =============================================================================
// Types and Interfaces
// =============================================================================

interface FactCheckRequest {
  question: string;
  userAnswer: string;
  supposedCorrectAnswer: string;
  explanation: string;
  courseContext?: {
    courseId: string;
    courseTitle?: string;
    videoUrl?: string;
  };
}

interface FactCheckResponse {
  isCorrect: boolean;
  confidence: number;
  analysis: string;
  citations: Array<{
    url: string;
    title: string;
    quote?: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  actualAnswer?: string;
  userAnswerEvaluation?: string;
  supposedAnswerEvaluation?: string;
  userAnswerCorrect?: boolean;
  supposedAnswerCorrect?: boolean;
  nuances?: string;
  videoContext?: {
    title: string;
    summary: string;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

async function fetchVideoContext(supabase: any, courseId: string): Promise<{title: string, summary: string} | null> {
  try {
    const { data: course } = await supabase
      .from('courses')
      .select('title, youtube_url')
      .eq('id', courseId)
      .single();

    if (!course) return null;

    // Try to get video transcript data for better context
    const { data: transcript } = await supabase
      .from('video_transcripts')
      .select('title, summary')
      .eq('youtube_url', course.youtube_url)
      .single();

    return {
      title: transcript?.title || course.title,
      summary: transcript?.summary || ''
    };
  } catch (error) {
    console.error('Error fetching video context:', error);
    return null;
  }
}

// =============================================================================
// Main Function
// =============================================================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const context: FactCheckRequest = await req.json();
    
    // Fetch video context if courseId is provided
    let videoContext = null;
    if (context.courseContext?.courseId) {
      videoContext = await fetchVideoContext(supabase, context.courseContext.courseId);
    }

    // Build comprehensive prompt
    const systemPrompt = `You are an expert fact-checker and educational content validator. Your task is to compare two answers to a quiz question and determine which is more accurate, using web search to verify facts.

${videoContext ? `Video Context:
Title: ${videoContext.title}
Summary: ${videoContext.summary}

` : ''}

CRITICAL INSTRUCTION FOR TRUE/FALSE QUESTIONS:
When evaluating true/false questions, you must understand that:
- The question presents a statement
- The correct answer is whether that statement is TRUE or FALSE
- If the statement is factually incorrect, then "False" IS the correct answer
- If the statement is factually correct, then "True" IS the correct answer
- Never confuse the factual accuracy of the statement with the correct answer to the question

Your response MUST be a valid JSON object with this exact structure:
{
  "isCorrect": boolean (true if the supposed correct answer is indeed correct, false if the user's answer is actually better),
  "confidence": number (0-1),
  "analysis": "detailed comparison of both answers with evidence",
  "citations": [
    {
      "url": "source URL",
      "title": "source title",
      "quote": "relevant quote from source",
      "relevance": "high" | "medium" | "low"
    }
  ],
  "actualAnswer": "the most accurate answer based on your research",
  "userAnswerEvaluation": "assessment of the user's answer accuracy",
  "supposedAnswerEvaluation": "assessment of the supposed correct answer accuracy",
  "userAnswerCorrect": boolean (true if the user's answer is correct, false otherwise),
  "supposedAnswerCorrect": boolean (true if the quiz's supposed answer is correct, false otherwise),
  "nuances": "any edge cases or contextual factors"
}`;

    const userPrompt = `Compare these two answers to determine which is more accurate:

Question: ${context.question}
User's Answer: ${context.userAnswer}
Quiz's Supposed Correct Answer: ${context.supposedCorrectAnswer}
Explanation Provided: ${context.explanation}

IMPORTANT: For true/false questions, remember that:
- If the statement in the question is factually FALSE, then "False" is the CORRECT answer
- If the statement in the question is factually TRUE, then "True" is the CORRECT answer
- The "actualAnswer" should be which response (True or False) correctly identifies whether the statement is true or false

Please:
1. Search the web to verify which answer is actually more accurate
2. Compare both answers for factual correctness
3. Find authoritative sources to support your assessment
4. Consider any recent developments or changes that might affect the answers
5. Evaluate if there are any nuances or edge cases
6. Return your findings in the specified JSON format

Note: If the user answered "${context.userAnswer}" and it matches the supposed correct answer, then check the absolute correctness of that answer.`;

    // Create the combined prompt for the Responses API
    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    // Use LangSmith logging for the OpenAI call
    const description = `Fact Check - ${context.courseContext?.courseTitle || 'Unknown Course'} - ${context.question.substring(0, 50)}...`;

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const requestBody = {
      model: "gpt-4o-mini",  // Using gpt-4o-mini which is shown in the docs
      tools: [{ 
        type: "web_search_preview"  // Fixed: use web_search_preview
      }],
      input: fullPrompt,
      temperature: 0.3
    };

    // Call the OpenAI Responses API with web search
    const apiResponse = await logOpenAICall(
      'https://api.openai.com/v1/responses',
      requestBody,
      description,
      openaiApiKey
    );

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('OpenAI API error:', apiResponse.status, errorText);
      throw new Error(`OpenAI API error: ${apiResponse.status} - ${errorText}`);
    }

    const responseData = await apiResponse.json();
    console.log('API Response:', JSON.stringify(responseData, null, 2));

    // Extract the text output from the response
    let outputText = '';
    
    // The Responses API returns output as an array
    if (responseData.output && Array.isArray(responseData.output)) {
      // Find the final message output
      const finalOutput = responseData.output.find(item => 
        item.type === 'message' && item.content && Array.isArray(item.content)
      );
      
      if (finalOutput && finalOutput.content) {
        // Extract text from content array
        const textContent = finalOutput.content.find(c => c.type === 'output_text' || c.type === 'text');
        outputText = textContent?.text || '';
      }
    } else if (responseData.output_text) {
      // Fallback to direct output_text if available
      outputText = responseData.output_text;
    }

    if (!outputText) {
      console.error('No output text found in response:', responseData);
      throw new Error('No output text in API response');
    }

    // Parse the JSON response
    let factCheckResult: FactCheckResponse;
    try {
      // Extract JSON from the response text
      // The model might include additional text, so we need to find the JSON part
      const jsonMatch = outputText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      factCheckResult = JSON.parse(jsonMatch[0]);
      
      // Add video context if available
      if (videoContext) {
        factCheckResult.videoContext = videoContext;
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw output:', outputText);
      
      // Fallback response
      factCheckResult = {
        isCorrect: true,
        confidence: 0.5,
        analysis: "Unable to parse fact-check response. The supposed answer appears to be correct based on the provided explanation.",
        citations: [],
        nuances: "Fact-checking encountered a technical issue."
      };
    }

    return new Response(
      JSON.stringify(factCheckResult),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Fact check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        isCorrect: true,
        confidence: 0.5,
        analysis: "Fact-checking service encountered an error. Defaulting to the provided answer.",
        citations: []
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
}); 