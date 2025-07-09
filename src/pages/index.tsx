import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import CoursesShowcase from '@/components/CoursesShowcase';
import { Skeleton } from '@/components/ui/skeleton';

// YouTube URL validation schema
const courseGenerationSchema = z.object({
  youtubeUrl: z
    .string()
    .min(1, 'YouTube URL is required')
    .refine((url) => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      return patterns.some(pattern => pattern.test(url));
    }, 'Please enter a valid YouTube URL')
});

type CourseGenerationFormData = z.infer<typeof courseGenerationSchema>;

interface CourseData {
  title: string;
  description: string;
  duration: string;
  segments: Array<{
    title: string;
    timestamp: string;
    concepts: string[];
    questions: Array<{
      type: string;
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }>;
  }>;
}

interface ApiResponse {
  success: boolean;
  data: CourseData;
  course_id: string;
}

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CourseGenerationFormData>({
    resolver: zodResolver(courseGenerationSchema)
  });

  const generateCourse = async (data: CourseGenerationFormData, useEnhanced: boolean = false) => {
    setIsLoading(true);
    setError(null);
    setGeneratingStatus('Analyzing video content...');
    
    // Clear any existing timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];

    try {
      // Simulate status updates
      const statusUpdates = [
        { delay: 2000, message: 'Extracting video transcript...' },
        { delay: 4000, message: 'Identifying key concepts...' },
        { delay: 6000, message: 'Generating interactive questions...' },
        { delay: 8000, message: 'Creating visual elements...' },
        { delay: 10000, message: 'Finalizing course structure...' }
      ];
      
      statusUpdates.forEach(({ delay, message }) => {
        const timeout = setTimeout(() => {
          setGeneratingStatus(message);
        }, delay);
        timeoutRefs.current.push(timeout);
      });

      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: data.youtubeUrl,
          useEnhanced: useEnhanced,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate course');
      }

      const result: ApiResponse = await response.json();
      
      if (result.success) {
        toast.success('Course generated successfully!');
        reset();
        
        // Store the data in sessionStorage instead of URL
        sessionStorage.setItem('courseData', JSON.stringify(result.data));
        sessionStorage.setItem('youtubeUrl', data.youtubeUrl);
        
        // Navigate with clean URL
        router.push('/create');
      } else {
        throw new Error('Failed to generate course');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      // Clear all timeouts when done
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current = [];
    }
  };

  const handleGenerateCourse = (data: CourseGenerationFormData) => generateCourse(data, false);
  const handleGenerateCoursePro = (data: CourseGenerationFormData) => generateCourse(data, true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              Transform YouTube Videos into 
              <span className="text-primary"> Interactive Courses</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Paste any YouTube URL and let AI generate an engaging, interactive course 
              with questions and segments automatically.
            </p>
          </div>

          {/* Course Generation Form */}
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Generate Course from YouTube
              </CardTitle>
              <CardDescription>
                Enter a YouTube URL to start creating your AI-powered course
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleGenerateCourse)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="youtubeUrl">YouTube URL</Label>
                  <Input
                    id="youtubeUrl"
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    {...register('youtubeUrl')}
                    disabled={isLoading}
                  />
                  {errors.youtubeUrl && (
                    <p className="text-sm text-destructive">
                      {errors.youtubeUrl.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button"
                    onClick={handleSubmit(handleGenerateCourse)}
                    className="flex-1" 
                    disabled={isLoading}
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Course...
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Generate Course
                      </>
                    )}
                  </Button>

                  <Button 
                    type="button"
                    onClick={handleSubmit(handleGenerateCoursePro)}
                    className="flex-1" 
                    disabled={isLoading}
                    size="lg"
                    variant="outline"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Course...
                      </>
                    ) : (
                      <>
                        <BookOpen className="mr-2 h-4 w-4" />
                        Generate Course (PRO)
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive" className="max-w-2xl mx-auto">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Courses Showcase */}
          <CoursesShowcase limit={6} />
        </div>
      </div>
      
      {/* Loading Overlay with Skeleton */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-full max-w-6xl mx-auto p-8">
            <div className="text-center mb-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Generating Your Course</h2>
              <p className="text-muted-foreground">{generatingStatus}</p>
            </div>
            
            {/* Skeleton Layout mimicking final page */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Video Player Skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="aspect-video w-full rounded-lg" />
                </CardContent>
              </Card>
              
              {/* Course Structure Skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            
            {/* Course Details Skeleton */}
            <Card className="mt-6">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4 mt-1" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-32 mb-2" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-start gap-2">
                          <Skeleton className="h-4 w-4 mt-0.5" />
                          <Skeleton className="h-3 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}