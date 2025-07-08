import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is not set in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });

export interface Question {
  type: 'multiple_choice';
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface CourseSegment {
  title: string;
  timestamp: string;
  concepts: string[];
  questions: Question[];
}

export interface CourseData {
  title: string;
  description: string;
  duration: string;
  segments: CourseSegment[];
}

export async function generateCourseFromVideo(youtubeUrl: string): Promise<CourseData> {
  const prompt = `
    Analyze this YouTube video URL: ${youtubeUrl}
    
    Based on the video content, create a comprehensive course structure with the following requirements:
    
    1. Extract the video title and create a course title
    2. Write a 2-sentence course description
    3. Estimate the video duration
    4. Break the video into 5-8 logical segments with timestamps
    5. For each segment, identify 2-3 key concepts
    6. Generate 2-3 multiple choice questions per segment to test understanding
    
    Return ONLY a valid JSON object with this exact structure:
    
    {
      "title": "Course title based on video content",
      "description": "Two sentence description of what students will learn from this video course.",
      "duration": "Estimated duration (e.g., '15 minutes', '1 hour 30 minutes')",
      "segments": [
        {
          "title": "Introduction to Topic",
          "timestamp": "00:00",
          "concepts": ["concept1", "concept2", "concept3"],
          "questions": [
            {
              "type": "multiple_choice",
              "question": "What is the main topic discussed in this segment?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct": 0,
              "explanation": "Option A is correct because..."
            },
            {
              "type": "multiple_choice",
              "question": "Which concept is most important for beginners?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct": 1,
              "explanation": "Option B is correct because..."
            }
          ]
        }
      ]
    }
    
    Important guidelines:
    - Make timestamps realistic and progressive (00:00, 02:30, 05:15, etc.)
    - Ensure questions are relevant to the segment content
    - Make explanations clear and educational
    - Keep concepts concise but descriptive
    - Ensure the correct answer index (0-3) matches the right option
    - Generate meaningful, educational content based on typical video topics
    
    Return ONLY the JSON object, no additional text or formatting.
  `;

  try {
    const result = await geminiModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text to extract JSON
    let cleanedText = text.trim();
    
    // Remove any markdown code block formatting
    cleanedText = cleanedText.replace(/```json\s*/, '').replace(/```\s*$/, '');
    
    // Find the JSON object in the response
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }
    
    const courseData = JSON.parse(jsonMatch[0]);
    
    // Validate the structure
    if (!courseData.title || !courseData.description || !courseData.duration || !courseData.segments) {
      throw new Error('Invalid course data structure');
    }
    
    // Validate segments
    if (!Array.isArray(courseData.segments) || courseData.segments.length === 0) {
      throw new Error('Invalid segments data');
    }
    
    // Validate each segment
    courseData.segments.forEach((segment: any, index: number) => {
      if (!segment.title || !segment.timestamp || !Array.isArray(segment.concepts) || !Array.isArray(segment.questions)) {
        throw new Error(`Invalid segment structure at index ${index}`);
      }
      
      // Validate questions
      segment.questions.forEach((question: any, qIndex: number) => {
        if (!question.question || !Array.isArray(question.options) || 
            question.options.length !== 4 || typeof question.correct !== 'number' ||
            question.correct < 0 || question.correct > 3 || !question.explanation) {
          throw new Error(`Invalid question structure at segment ${index}, question ${qIndex}`);
        }
      });
    });
    
    return courseData as CourseData;
  } catch (error) {
    console.error('Error generating course:', error);
    
    // Return a fallback structure if API fails
    return {
      title: "Sample Course from Video",
      description: "This is a sample course generated from the provided video. The AI analysis will provide more detailed content based on the actual video content.",
      duration: "30 minutes",
      segments: [
        {
          title: "Introduction",
          timestamp: "00:00",
          concepts: ["Basic concepts", "Overview", "Learning objectives"],
          questions: [
            {
              type: "multiple_choice",
              question: "What is the main focus of this video?",
              options: ["Introduction to the topic", "Advanced techniques", "Conclusion", "References"],
              correct: 0,
              explanation: "The introduction segment typically focuses on introducing the main topic and setting learning objectives."
            }
          ]
        },
        {
          title: "Main Content",
          timestamp: "05:00",
          concepts: ["Core principles", "Key techniques", "Practical examples"],
          questions: [
            {
              type: "multiple_choice",
              question: "Which principle is most fundamental?",
              options: ["Advanced theory", "Basic foundation", "Complex applications", "Future trends"],
              correct: 1,
              explanation: "Basic foundation is most fundamental as it provides the groundwork for understanding more complex concepts."
            }
          ]
        }
      ]
    };
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

export function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  } else if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
  }
  return 0;
}