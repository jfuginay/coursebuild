import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
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
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const [tips, setTips] = useState([
    {
      title: "Did you know?",
      content: "Our AI analyzes video transcripts, identifies key concepts, and creates interactive questions that enhance learning retention by up to 40%."
    },
    {
      title: "Pro tip!",
      content: "Courses work best with educational videos that have clear explanations and well-structured content. Tutorial videos are perfect!"
    },
    {
      title: "Fun fact!",
      content: "The average course generates 8-12 interactive questions, perfectly timed to appear when key concepts are introduced."
    },
    {
      title: "Learning science",
      content: "Interactive questions during video watching can improve comprehension by 30% compared to passive viewing."
    },
    {
      title: "Coming soon!",
      content: "We're working on visual questions that can identify objects, diagrams, and text directly from video frames."
    }
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<CourseGenerationFormData>({
    resolver: zodResolver(courseGenerationSchema)
  });

  // Check for URL parameter on load
  useEffect(() => {
    if (router.query.url) {
      const urlParam = router.query.url as string;
      // Auto-fill the form with the URL parameter
      reset({ youtubeUrl: urlParam });
    }
  }, [router.query.url, reset]);

  const generateCourse = async (data: CourseGenerationFormData, useEnhanced: boolean = false) => {
    setIsLoading(true);
    setError(null);
    setGeneratingStatus('Analyzing video content...');
    
    // Clear any existing timeouts
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current = [];

    try {
      // Fetch dynamic facts immediately
      console.log('Fetching facts for URL:', data.youtubeUrl);
      try {
        const factsResponse = await fetch('/api/quick-facts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ youtubeUrl: data.youtubeUrl }),
        });
        
        console.log('Facts API response status:', factsResponse.status);
        const factsData = await factsResponse.json();
        console.log('Facts API response data:', factsData);
        
        if (factsData.facts && factsData.facts.length > 0) {
          console.log('Setting new tips:', factsData.facts);
          setTips(factsData.facts);
          setCurrentTipIndex(0); // Reset index when updating tips
        }
      } catch (err) {
        console.error('Error fetching facts:', err);
        // Keep default facts if fetch fails
      }

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
        
        // Try main branch approach first (with courseId)
        if (result.course_id) {
          // Navigate to create page with course data and courseId
          router.push({
            pathname: '/create',
            query: {
              data: JSON.stringify(result.data),
              youtubeUrl: data.youtubeUrl,
              courseId: result.course_id
            }
          });
        } else {
          // Fallback to sessionStorage approach (feature branch compatibility)
          sessionStorage.setItem('courseData', JSON.stringify(result.data));
          sessionStorage.setItem('youtubeUrl', data.youtubeUrl);
          
          // Navigate with clean URL
          router.push('/create');
        }
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

  const handleGenerateCourse = async (data: CourseGenerationFormData) => {
    await generateCourse(data, false);
  };

  const handleGenerateCoursePro = async (data: CourseGenerationFormData) => {
    await generateCourse(data, true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);
  
  // Rotate tips during loading
  useEffect(() => {
    if (isLoading && tips.length > 0) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [isLoading, tips.length]);

  return (
    <>
      <Head>
        <title>CourseBuilder - Transform YouTube Videos into Interactive Courses</title>
      </Head>

      {/* Show loading screen when generating */}
      {isLoading ? (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <Header />
          
          <div className="container mx-auto px-4 py-8">
            <div className="w-full max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
                <h1 className="text-3xl font-bold mb-3">Generating Your Course</h1>
                <p className="text-lg text-muted-foreground mb-2">{generatingStatus}</p>
                <p className="text-sm text-muted-foreground">This usually takes 15-30 seconds</p>
              </div>
              
              {/* Fun facts or tips while waiting */}
              {tips && tips.length > 0 && currentTipIndex < tips.length ? (
                <Card className="max-w-2xl mx-auto mb-8 transition-all duration-500">
                  <CardHeader>
                    <CardTitle className="text-lg transition-opacity duration-500">
                      {tips[currentTipIndex].title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground transition-opacity duration-500">
                      {tips[currentTipIndex].content}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="max-w-2xl mx-auto mb-8">
                  <CardHeader>
                    <CardTitle className="text-lg">Loading facts...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      Fetching interesting facts about your video...
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Progress indicators */}
              <div className="max-w-2xl mx-auto mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      generatingStatus.includes('Analyzing') ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {generatingStatus.includes('Analyzing') ? '✓' : '1'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Video Analysis</p>
                      <p className="text-sm text-muted-foreground">Processing video content and metadata</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      generatingStatus.includes('transcript') ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {generatingStatus.includes('transcript') ? '✓' : '2'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Transcript Processing</p>
                      <p className="text-sm text-muted-foreground">Extracting and analyzing spoken content</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      generatingStatus.includes('concepts') ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {generatingStatus.includes('concepts') ? '✓' : '3'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Concept Identification</p>
                      <p className="text-sm text-muted-foreground">Finding key learning points</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      generatingStatus.includes('questions') ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {generatingStatus.includes('questions') ? '✓' : '4'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Question Generation</p>
                      <p className="text-sm text-muted-foreground">Creating interactive assessments</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      generatingStatus.includes('Finalizing') ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {generatingStatus.includes('Finalizing') ? '✓' : '5'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Course Assembly</p>
                      <p className="text-sm text-muted-foreground">Organizing your complete course</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Preview skeleton */}
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
            </div>
          </div>
        </div>
      ) : (
        /* Normal home page content */
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
                        <BookOpen className="mr-2 h-4 w-4" />
                        Generate Course
                      </Button>

                      <Button 
                        type="button"
                        onClick={handleSubmit(handleGenerateCoursePro)}
                        className="flex-1" 
                        disabled={isLoading}
                        size="lg"
                        variant="outline"
                      >
                        <BookOpen className="mr-2 h-4 w-4" />
                        Generate Course (PRO)
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
        </div>
      )}
    </>
  );
}