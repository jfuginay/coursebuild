import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// In-memory storage for export progress (in production, use Redis or database)
const exportProgress = new Map<string, any>();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { courseId, canvasConfig, exportOptions } = req.body;

    // Validate required fields
    if (!courseId || !canvasConfig || !exportOptions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch course data from Supabase
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Fetch questions for the course
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('course_id', courseId)
      .order('timestamp', { ascending: true });

    if (questionsError) {
      return res.status(500).json({ error: 'Failed to fetch questions' });
    }

    // Create export ID
    const exportId = uuidv4();

    // Initialize export progress
    exportProgress.set(exportId, {
      id: exportId,
      courseId,
      status: 'in_progress',
      currentStep: 'Initializing export...',
      totalSteps: 10,
      completedSteps: 0,
      startedAt: new Date(),
    });

    // Start the export process asynchronously
    processCanvasExport(exportId, course, questions || [], canvasConfig, exportOptions)
      .catch(error => {
        console.error('Export process error:', error);
        const progress = exportProgress.get(exportId);
        if (progress) {
          progress.status = 'failed';
          progress.error = error.message;
        }
      });

    // Return export ID immediately
    return res.status(200).json({ 
      exportId,
      message: 'Export started successfully' 
    });

  } catch (error) {
    console.error('Canvas export error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to start export' 
    });
  }
}

// Process Canvas export asynchronously
async function processCanvasExport(
  exportId: string,
  course: any,
  questions: any[],
  canvasConfig: any,
  exportOptions: any
) {
  const updateProgress = (updates: any) => {
    const current = exportProgress.get(exportId);
    if (current) {
      exportProgress.set(exportId, { ...current, ...updates });
    }
  };

  try {
    // Step 1: Transform data
    updateProgress({ 
      currentStep: 'Transforming course data...', 
      completedSteps: 1 
    });

    // Group questions into segments
    const segments = groupQuestionsIntoSegments(questions);

    // Import the transformer dynamically to avoid build issues
    const { CanvasTransformer } = await import('@/lib/canvas-transformer');
    const transformedData = CanvasTransformer.transformCourse(course, segments, exportOptions);

    // Step 2: Validate Canvas connection
    updateProgress({ 
      currentStep: 'Validating Canvas connection...', 
      completedSteps: 2 
    });

    const apiUrl = `${canvasConfig.canvasUrl.replace(/\/$/, '')}/api/v1/users/self`;
    const testResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${canvasConfig.accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!testResponse.ok) {
      throw new Error('Canvas connection failed');
    }

    // Step 3: Create Canvas course
    updateProgress({ 
      currentStep: 'Creating Canvas course...', 
      completedSteps: 3 
    });

    // For now, simulate the export process
    // In production, this would use the actual Canvas API
    await simulateExportSteps(exportId, updateProgress);

    // Mark as completed
    updateProgress({
      status: 'completed',
      completedSteps: 10,
      currentStep: 'Export completed successfully!',
      canvasCourseUrl: `${canvasConfig.canvasUrl}/courses/12345`, // Mock URL
      completedAt: new Date(),
    });

  } catch (error) {
    updateProgress({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Export failed',
      completedAt: new Date(),
    });
    throw error;
  }
}

// Helper function to group questions into segments
function groupQuestionsIntoSegments(questions: any[]) {
  if (questions.length === 0) return [];

  // Simple segmentation - group every 5 questions or by timestamp gaps
  const segments = [];
  let currentSegment = {
    title: 'Introduction',
    timestamp: '00:00',
    timestampSeconds: 0,
    concepts: [],
    questions: [] as any[],
  };

  questions.forEach((question, index) => {
    // Start new segment every 5 questions
    if (currentSegment.questions.length >= 5) {
      segments.push(currentSegment);
      currentSegment = {
        title: `Segment ${segments.length + 1}`,
        timestamp: formatTimestamp(question.timestamp || 0),
        timestampSeconds: question.timestamp || 0,
        concepts: [],
        questions: [],
      };
    }

    // Transform question format if needed
    const transformedQuestion = {
      ...question,
      correct_answer: question.correct_answer ?? question.correct ?? 0,
      type: question.type || 'multiple-choice',
    };

    currentSegment.questions.push(transformedQuestion);
  });

  // Add the last segment
  if (currentSegment.questions.length > 0) {
    segments.push(currentSegment);
  }

  return segments.length > 0 ? segments : [{
    title: 'Course Content',
    timestamp: '00:00',
    timestampSeconds: 0,
    concepts: [],
    questions: [],
  }];
}

// Helper function to format timestamp
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Simulate export steps for demo
async function simulateExportSteps(exportId: string, updateProgress: Function) {
  const steps = [
    { step: 4, message: 'Creating course structure...' },
    { step: 5, message: 'Setting up modules...' },
    { step: 6, message: 'Uploading video content...' },
    { step: 7, message: 'Creating quizzes...' },
    { step: 8, message: 'Adding quiz questions...' },
    { step: 9, message: 'Finalizing course settings...' },
  ];

  for (const { step, message } of steps) {
    updateProgress({ 
      currentStep: message, 
      completedSteps: step 
    });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
  }
}

// Export progress getter for separate endpoint
export { exportProgress };