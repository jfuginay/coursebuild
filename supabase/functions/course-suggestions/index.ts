import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.19.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { videoUrl } = await req.json();
    console.log('📥 Received request with videoUrl:', videoUrl);
    if (!videoUrl) {
      return new Response(JSON.stringify({
        error: 'Video URL is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SERPAPI_KEY = Deno.env.get('SERPAPI_API_KEY');
    if (!GEMINI_API_KEY || !SERPAPI_KEY) {
      console.error('❌ Missing API keys');
      return new Response(JSON.stringify({
        error: 'Missing required API keys'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🔑 Gemini and SerpAPI keys loaded');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash'
    });
    const prompt = `You are an expert educational guide.

Your task is to watch and analyze the following YouTube video:
${videoUrl}

Step 1: Determine the main topic being taught. Keep it concise — no more than 4–8 words.

Step 2: Suggest 2 logical next-step learning topics.

Return JSON in this format ONLY:
{
  "mainTopic": "Short summary",
  "nextSteps": ["Topic 1", "Topic 2"]
};`;
    console.log('🧠 Sending prompt to Gemini...');
    const result = await model.generateContent([
      {
        text: prompt
      },
      {
        fileData: {
          fileUri: videoUrl,
          mimeType: 'video/*'
        }
      }
    ]);
    const response = await result.response;
    const textContent = await response.text();
    console.log('📥 Gemini response:', textContent);
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in Gemini response');
    const geminiData = JSON.parse(jsonMatch[0]);
    console.log('✅ Parsed Gemini response:', geminiData);
    if (!geminiData.nextSteps || !Array.isArray(geminiData.nextSteps)) {
      throw new Error('Invalid Gemini output structure');
    }
    const topicsWithVideos = [];
    for (const topic of geminiData.nextSteps){
      console.log('🔍 Querying SerpAPI for topic:', topic);
      const query = encodeURIComponent(topic);
      const serpApiUrl = `https://serpapi.com/search.json?engine=youtube&search_query=${query}&api_key=${SERPAPI_KEY}`;
      const serpResponse = await fetch(serpApiUrl);
      const serpJson = await serpResponse.json();
      const videoResults = serpJson.video_results || [];
      console.log(`📊 Found ${videoResults.length} videos for topic: ${topic}`);
      const video = videoResults.find((v)=>{
        if (!v.length || v.link == videoUrl) return false;
        const [min, sec] = v.length.split(':').map(Number);
        return min * 60 + sec >= 150; // 2 min 30 sec
      });
      if (video) {
        topicsWithVideos.push({
          topic,
          video: video.link
        });
        break; // Stop after the first valid topic + video
      }
    }
    console.log('✅ Final topic suggestion with video:', topicsWithVideos);
    return new Response(JSON.stringify({
      topics: topicsWithVideos
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
