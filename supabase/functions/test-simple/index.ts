import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Simple provider test function
async function testGemini(prompt: string, questionType: string) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const schema = {
    type: "object",
    properties: {
      question: { type: "string" },
      explanation: { type: "string" }
    },
    required: ["question", "explanation"]
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
          responseSchema: schema
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.candidates[0].content.parts[0].text);
  
  return {
    provider: 'gemini',
    content,
    usage: {
      totalTokens: data.usageMetadata?.totalTokenCount || 0
    }
  };
}

async function testOpenAI(prompt: string, questionType: string) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const schema = {
    type: "object",
    properties: {
      question: { type: "string" },
      explanation: { type: "string" }
    },
    required: ["question", "explanation"],
    additionalProperties: false
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-2024-08-06',
      messages: [
        { role: 'system', content: 'You are an expert quiz creator.' },
        { role: 'user', content: prompt }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'quiz_question',
          schema: schema,
          strict: true
        }
      },
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);
  
  return {
    provider: 'openai',
    content,
    usage: {
      totalTokens: data.usage?.total_tokens || 0
    }
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    if (req.url.endsWith('/health')) {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        providers: ['gemini', 'openai']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (req.url.endsWith('/test-gemini')) {
      const body = await req.json();
      const result = await testGemini(body.prompt, body.questionType || 'general');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (req.url.endsWith('/test-openai')) {
      const body = await req.json();
      const result = await testOpenAI(body.prompt, body.questionType || 'general');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (req.url.endsWith('/compare')) {
      const body = await req.json();
      const prompt = body.prompt || 'Create a simple quiz question about science.';
      
      const [geminiResult, openaiResult] = await Promise.allSettled([
        testGemini(prompt, 'general'),
        testOpenAI(prompt, 'general')
      ]);
      
      return new Response(JSON.stringify({
        gemini: geminiResult.status === 'fulfilled' ? geminiResult.value : { error: geminiResult.reason.message },
        openai: openaiResult.status === 'fulfilled' ? openaiResult.value : { error: openaiResult.reason.message }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not found', { status: 404, headers: corsHeaders });
    
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 