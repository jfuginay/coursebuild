import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressTracker } from '@/components/ProgressTracker';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useGuidedTour, hasTourBeenCompleted } from '@/hooks/useGuidedTour';
import { creationPageSteps } from '@/config/tours';

// =============================================================================
// Course Creation with Progress Tracking Demo
// =============================================================================

export default function CreateWithProgress() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const router = useRouter();
  
  // Guided tour state
  const [shouldRunTour, setShouldRunTour] = useState(false);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  // Check if this is part of the newcomer journey and show tour
  useEffect(() => {
    if (!hasTourBeenCompleted('newcomer') && isProcessing) {
      setShouldRunTour(true);
    }
  }, [isProcessing]);
  
  // Initialize guided tour for creation page
  useGuidedTour('newcomer', creationPageSteps, shouldRunTour, {
    delay: 1500, // Wait for progress tracker to render
    onComplete: () => {
      setShouldRunTour(false);
    }
  });

  // =============================================================================
  // Course Creation Handler
  // =============================================================================

  const handleCreateCourse = async () => {
    if (!youtubeUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🚀 Starting course creation with progress tracking...');

      // Step 1: Create a course record
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: `Course from ${youtubeUrl}`,
          youtube_url: youtubeUrl,
          status: 'processing'
        })
        .select()
        .single();

      if (courseError) {
        throw new Error(`Failed to create course: ${courseError.message}`);
      }

      console.log('✅ Course created:', courseData.id);
      setCourseId(courseData.id);

      // Step 2: Generate a unique session ID for progress tracking
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);
      console.log('📊 Session ID generated:', newSessionId);

      // Step 3: Start the quiz generation pipeline with progress tracking
      const response = await fetch('/api/course/analyze-video-with-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: courseData.id,
          youtube_url: youtubeUrl,
          session_id: newSessionId,
          max_questions: 4,
          enable_quality_verification: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start video processing');
      }

      const result = await response.json();
      console.log('🎯 Pipeline started successfully:', result);
      toast.success('Video processing started! Watch the progress below.');

    } catch (error) {
      console.error('❌ Course creation failed:', error);
      toast.error(error instanceof Error ? error.message : 'Course creation failed');
      setIsProcessing(false);
      setSessionId(null);
      setCourseId(null);
    }
  };

  // =============================================================================
  // Progress Event Handlers
  // =============================================================================

  const handleProcessingComplete = (generatedQuestions: any[]) => {
    console.log('🎉 Processing completed with questions:', generatedQuestions);
    setQuestions(generatedQuestions);
    setIsProcessing(false);
    toast.success('Course created successfully!');
    
    // Redirect to the course page after a short delay
    setTimeout(() => {
      if (courseId) {
        router.push(`/course/${courseId}`);
      }
    }, 2000);
  };

  const handleProcessingError = (error: string) => {
    console.error('❌ Processing error:', error);
    setIsProcessing(false);
    toast.error(`Processing failed: ${error}`);
  };

  // =============================================================================
  // Reset Handler
  // =============================================================================

  const handleReset = () => {
    setYoutubeUrl('');
    setIsProcessing(false);
    setSessionId(null);
    setCourseId(null);
    setQuestions([]);
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Course Creation with Progress Tracking
          </h1>
          <p className="text-gray-600">
            Create an interactive course from a YouTube video and watch the AI processing in real-time
          </p>
        </div>

        {/* Course Creation Form */}
        {!isProcessing && !sessionId && (
          <Card className="max-w-2xl mx-auto mb-8">
            <CardHeader>
              <CardTitle>Create New Course</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL
                </label>
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <Button 
                onClick={handleCreateCourse} 
                className="w-full"
                disabled={!youtubeUrl}
              >
                Create Course with Progress Tracking
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Progress Tracking Display */}
        {isProcessing && sessionId && courseId && (
          <div id="progress-tracker" className="space-y-6">
            <ProgressTracker
              courseId={courseId}
              sessionId={sessionId}
              onComplete={handleProcessingComplete}
              onError={handleProcessingError}
            />
            
            {/* Additional Information */}
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Processing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <div><strong>Course ID:</strong> {courseId}</div>
                <div><strong>Session ID:</strong> {sessionId}</div>
                <div><strong>YouTube URL:</strong> {youtubeUrl}</div>
                <div className="pt-2">
                  <Button variant="outline" onClick={handleReset} size="sm">
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completion Summary */}
        {questions.length > 0 && !isProcessing && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Processing Complete! 🎉</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600">
                <div><strong>Generated Questions:</strong> {questions.length}</div>
                <div className="mt-2">
                  <strong>Question Types:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Array.from(new Set(questions.map(q => q.question_type))).map(type => (
                      <span key={type} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={() => router.push(`/course/${courseId}`)}>
                  View Course
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Create Another Course
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Information */}
        <Card className="max-w-4xl mx-auto mt-8">
          <CardHeader>
            <CardTitle>Real-time Progress Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Pipeline Stages</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>🚀 <strong>Initialization:</strong> Setup and validation</li>
                  <li>🧠 <strong>Planning:</strong> Video analysis and question planning</li>
                  <li>⚡ <strong>Generation:</strong> AI-powered question creation</li>
                  <li>👁️ <strong>Quality Verification:</strong> Optional quality assessment</li>
                  <li>💾 <strong>Storage:</strong> Database persistence</li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Question Details</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>📝 <strong>Individual Progress:</strong> Each question's generation status</li>
                  <li>🤖 <strong>AI Provider:</strong> Which AI service is being used</li>
                  <li>💭 <strong>Reasoning:</strong> Why each question type was chosen</li>
                  <li>⏱️ <strong>Timing:</strong> Processing time for each question</li>
                  <li>🎯 <strong>Success/Failure:</strong> Real-time status updates</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 