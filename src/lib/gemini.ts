import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

export interface CourseModule {
  title: string;
  description: string;
  duration: string;
  topics: string[];
}

export interface CourseData {
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  modules: CourseModule[];
  prerequisites: string[];
  learningOutcomes: string[];
}

export async function generateCourseFromVideo(youtubeUrl: string): Promise<CourseData> {
  const prompt = `
    Analyze this YouTube video URL: ${youtubeUrl}
    
    Based on the video content, create a comprehensive course structure. Return a JSON object with the following structure:
    
    {
      "title": "Course title based on video content",
      "description": "Detailed course description",
      "duration": "Estimated total duration (e.g., '4 weeks', '20 hours')",
      "difficulty": "Beginner|Intermediate|Advanced",
      "modules": [
        {
          "title": "Module title",
          "description": "Module description",
          "duration": "Module duration",
          "topics": ["Topic 1", "Topic 2", "Topic 3"]
        }
      ],
      "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
      "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
    }
    
    Make sure the course is well-structured, educational, and comprehensive. Include 4-6 modules with relevant topics for each module.
  `;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const courseData = JSON.parse(jsonMatch[0]);
    return courseData as CourseData;
  } catch (error) {
    console.error('Error generating course:', error);
    throw new Error('Failed to generate course from video');
  }
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractVideoId(url) !== null;
}