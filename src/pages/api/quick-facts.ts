import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractVideoId } from '@/lib/youtube';

// Only initialize Gemini if API key exists
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// Cache for video metadata to avoid repeated calls
const metadataCache = new Map<string, any>();

async function getVideoMetadata(videoId: string) {
  // Check cache first
  if (metadataCache.has(videoId)) {
    return metadataCache.get(videoId);
  }

  try {
    // Use YouTube oEmbed API (no API key needed!)
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch video metadata');
    }
    
    const data = await response.json();
    metadataCache.set(videoId, data);
    return data;
  } catch (error) {
    console.error('Error fetching video metadata:', error);
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { youtubeUrl } = req.body;
    const videoId = extractVideoId(youtubeUrl);
    
    if (!videoId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Get video metadata quickly
    const metadata = await getVideoMetadata(videoId);
    
    if (!metadata) {
      // Fallback to generic learning facts if metadata fails
      return res.status(200).json({
        facts: [
          {
            title: "Did you know?",
            content: "Interactive learning can improve retention by up to 40% compared to passive video watching."
          },
          {
            title: "Pro tip!",
            content: "Taking notes while watching educational videos helps reinforce key concepts."
          },
          {
            title: "Fun fact!",
            content: "The average person forgets 50% of new information within an hour without active engagement."
          }
        ]
      });
    }

    // For now, return contextual facts based on metadata without using Gemini
    const facts = [
      {
        title: "Now analyzing",
        content: `"${metadata.title}" by ${metadata.author_name}. Get ready for an interactive learning experience!`
      },
      {
        title: "Did you know?",
        content: `This video from ${metadata.author_name} will be transformed into an interactive course with questions at key moments.`
      },
      {
        title: "Pro tip!",
        content: "Pay attention to the main concepts - they'll become interactive questions to test your understanding."
      },
      {
        title: "Fun fact!",
        content: "Interactive courses like this one can boost retention by 40% compared to just watching videos."
      },
      {
        title: "Learning mode activated!",
        content: `We're analyzing "${metadata.title}" to identify the best moments for interactive questions.`
      }
    ];

    // If Gemini is available, try to generate better facts
    if (genAI && process.env.GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `
        Based on this YouTube video:
        Title: "${metadata.title}"
        Channel: "${metadata.author_name}"
        
        Generate 5 engaging fun facts, tips, or interesting information related to:
        1. The video's topic or subject matter
        2. Learning tips specific to this type of content
        3. Interesting trivia related to the field
        4. Study techniques that work well for this subject
        5. Why this topic is important or interesting
        
        Format each fact as JSON with "title" (e.g., "Did you know?", "Pro tip!", "Fun fact!") and "content" (the fact itself, max 2 sentences).
        Return only a JSON array of facts, no other text.
        
        Make the facts educational, engaging, and specific to the video's topic when possible.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        // Parse the generated facts
        try {
          // Clean up the response to ensure it's valid JSON
          const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const generatedFacts = JSON.parse(cleanedResponse);
          
          // Add video-specific fact at the beginning
          generatedFacts.unshift({
            title: "Now analyzing",
            content: `"${metadata.title}" by ${metadata.author_name}. Get ready for an interactive learning experience!`
          });
          
          return res.status(200).json({ facts: generatedFacts, metadata });
        } catch (parseError) {
          console.error('Error parsing Gemini response:', parseError);
          // Return the non-AI facts if parsing fails
          return res.status(200).json({ facts, metadata });
        }
      } catch (geminiError) {
        console.error('Error with Gemini API:', geminiError);
        // Return the non-AI facts if Gemini fails
        return res.status(200).json({ facts, metadata });
      }
    }

    return res.status(200).json({ facts, metadata });
  } catch (error) {
    console.error('Error in quick-facts endpoint:', error);
    return res.status(500).json({ 
      error: 'Failed to generate facts',
      facts: [
        {
          title: "Getting ready!",
          content: "We're preparing your interactive course. This usually takes about 30 seconds."
        }
      ]
    });
  }
} 