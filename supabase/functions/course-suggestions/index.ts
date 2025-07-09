import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { videoUrl } = await req.json()

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Video URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const prompt = `Given this video ${videoUrl}, give me 2 youtube video links each for 2 potential next step topics that could be covered. Return as structured output in json format exactly matching the following:
{
  "topics": [
    {
      "nextStep": "Advanced continuity techniques for film editing",
      "video1": "https://www.youtube.com/watch?v=MbUSMaWDBGU",
      "video2": "https://www.youtube.com/watch?v=U6B4COAnizc"
    },
    {
      "nextStep": "Introduction to continuation-passing style (CPS) in programming",
      "video1": "https://www.youtube.com/watch?v=2GfFlfToBCo",
      "video2": "https://www.youtube.com/watch?v=WT7oxiiFYt8"
    }
  ]
}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API')
    }

    const textContent = data.candidates[0].content.parts[0].text

    // Try to parse the JSON from the response
    let suggestions
    try {
      // Extract JSON from the response text
      const jsonMatch = textContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError)
      throw new Error('Failed to parse suggestions from Gemini response')
    }

    // Validate the structure
    if (!suggestions.topics || !Array.isArray(suggestions.topics)) {
      throw new Error('Invalid suggestions structure')
    }

    return new Response(
      JSON.stringify({ suggestions }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error generating course suggestions:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate course suggestions' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 