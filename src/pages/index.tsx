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
import { Switch } from '@/components/ui/switch';
import { Loader2, Play, BookOpen, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/Header';
import CoursesShowcase from '@/components/CoursesShowcase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useGuidedTour, hasTourBeenCompleted } from '@/hooks/useGuidedTour';
import { newcomerTourSteps } from '@/config/tours';
import { BorderTrail } from '@/components/ui/border-trail';
import { HoverBorderTrail, useHoverBorderTrail } from '@/components/ui/hover-border-trail';
import { BackgroundGradient } from '@/components/ui/background-gradient';

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
  processing_summary?: {
    total_questions: number;
    visual_questions: number;
    segments_created: number;
    video_duration: string;
    cached?: boolean;
    original_course_id?: string;
    service_used: string;
  };
}

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  averageRating?: number;
  totalRatings?: number;
  questionCount?: number;
}
interface ConceptData {
  concept: string;
  count: number;
  courses: Array<{
    course_id: string;
    course_title: string;
    youtube_url: string;
  }>;
}

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [useCache, setUseCache] = useState(true);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [concepts, setConcepts] = useState<ConceptData[]>([]);
  const [isMainCardHovered, setIsMainCardHovered] = useState(false);
  const [mainCardRandomStart, setMainCardRandomStart] = useState<number | null>(null);
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
  
  // Guided tour state
  const [shouldRunTour, setShouldRunTour] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<CourseGenerationFormData>({
    resolver: zodResolver(courseGenerationSchema)
  });

  // Check for URL parameters on load
  useEffect(() => {
    if (router.query.url) {
      const urlParam = router.query.url as string;
      // Auto-fill the form with the URL parameter
      reset({ youtubeUrl: urlParam });
    }
    
    // Check for cache parameter
    if (router.query.cache === 'false') {
      setUseCache(false);
    } else if (router.query.cache === 'true') {
      setUseCache(true);
    }
  }, [router.query.url, router.query.cache, reset]);

  // Helper function to track course creation for logged-in users
  const trackCourseCreation = async (courseId: string, courseData: CourseData, youtubeUrl: string) => {
    if (!user) return; // Only track for logged-in users
    
    try {
      const response = await fetch('/api/user-course-creations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          course_id: courseId,
          youtube_url: youtubeUrl,
          course_title: courseData.title,
          course_description: courseData.description,
        }),
      });

      if (!response.ok) {
        console.error('Failed to track course creation:', await response.text());
      } else {
        const result = await response.json();
        console.log('Course creation tracked successfully:', result);
      }
    } catch (error) {
      console.error('Error tracking course creation:', error);
    }
  };

  const generateCourse = async (data: CourseGenerationFormData, useEnhanced: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    // Set initial status based on cache setting
    if (useCache) {
      setGeneratingStatus('Checking for existing analysis...');
    } else {
      setGeneratingStatus('Analyzing video content...');
    }
    
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

      // Simulate status updates based on cache setting
      const statusUpdates = useCache ? [
        { delay: 1000, message: 'Searching for cached analysis...' },
        { delay: 2000, message: 'Extracting video transcript...' },
        { delay: 4000, message: 'Identifying key concepts...' },
        { delay: 6000, message: 'Generating interactive questions...' },
        { delay: 8000, message: 'Creating visual elements...' },
        { delay: 10000, message: 'Finalizing course structure...' }
      ] : [
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

      // Use the smart analysis endpoint that supports segmentation
      const response = await fetch('/api/course/analyze-video-smart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          course_id: null, // Will be created by the endpoint
          youtube_url: data.youtubeUrl,
          session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          max_questions: 10, // 10 questions per segment for longer videos
          enable_quality_verification: false,
          segment_duration: 300, // 5 minutes per segment
          useCache: useCache,
          useEnhanced: useEnhanced
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Check if it's a video duration error
        if (errorData.video_duration && errorData.max_duration) {
          const videoDurationMinutes = Math.floor(errorData.video_duration / 60);
          const maxDurationMinutes = Math.floor(errorData.max_duration / 60);
          throw new Error(`This video is ${videoDurationMinutes} minutes long. Maximum allowed duration is ${maxDurationMinutes} minutes. Please choose a shorter video.`);
        }
        
        throw new Error(errorData.error || 'Failed to generate course');
      }

      const result = await response.json();
      
      if (result.success) {
        // Handle background processing (timeout scenario)
        if (result.background_processing) {
          toast.info('Processing started in background. You will be redirected to track progress.');
          
          // Navigate to course page to watch progress
          if (result.course_id) {
            router.push(`/course/${result.course_id}`);
          }
          return;
        }
        
        // For segmented processing, redirect directly to course page
        if (result.segmented) {
          toast.info(`Video will be processed in ${result.total_segments} segments in the background.`);
          
          // Track course creation for logged-in users
          if (result.course_id && result.data) {
            await trackCourseCreation(result.course_id, result.data, data.youtubeUrl);
          }
          
          // Navigate directly to course page
          if (result.course_id) {
            router.push(`/course/${result.course_id}`);
          }
        } else {
          // Non-segmented processing completed immediately
          if (result.cached) {
            toast.success('Course loaded from cache! ⚡');
          } else {
            toast.success('Course generated successfully!');
          }
          
          reset();
          
          // Track course creation for logged-in users
          if (result.course_id && result.data) {
            await trackCourseCreation(result.course_id, result.data, data.youtubeUrl);
          }
          
          // Navigate to course page
          if (result.course_id) {
            router.push(`/course/${result.course_id}`);
          }
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
  
  // Check if tour should run
  useEffect(() => {
    if (!hasTourBeenCompleted('newcomer') && !isLoading) {
      setShouldRunTour(true);
    }
  }, [isLoading]);
  
  // Initialize guided tour
  useGuidedTour('newcomer', newcomerTourSteps, shouldRunTour, {
    delay: 1000, // Wait 1 second after page load
    onComplete: () => {
      setShouldRunTour(false);
      // Optionally track tour completion in analytics
      console.log('Newcomer tour completed');
    }
  });

  // Fetch courses for quick access buttons
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch('/api/courses');
        const data = await response.json();
        if (data.success) {
          setCourses(data.courses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };
    
    fetchCourses();
  }, []);
  useEffect(() => {
    const fetchConcepts = async () => {
      try {
        const response = await fetch('/api/common-concepts');
        const data = await response.json();
        if (data.success && data.concepts) {
          setConcepts(data.concepts);
        }
      } catch (error) {
        console.error('Error fetching concepts:', error);
      }
    };
    
    fetchConcepts();
  }, []);

  // Extract first 3 words from course title
  const getButtonTitle = (title: string) => {
    return title.split(' ').slice(0, 3).join(' ');
  };

  // Handle quick course button click
  const handleQuickCourseClick = async (course: Course) => {
    setValue('youtubeUrl', course.youtube_url);
    await generateCourse({ youtubeUrl: course.youtube_url }, true);
  };
  const handleQuickConceptClick = async (concept: ConceptData) => {
    if (concept.courses && concept.courses.length > 0) {
      const firstCourse = concept.courses[0];
      router.push(`/course/${firstCourse.course_id}`);
    }
  };
  return (
    <>
      <Head>
        <title>Curio - Transform YouTube Videos into Interactive Courses</title>
        <meta name="description" content="Transform any YouTube video into an interactive, structured course with AI-powered analysis, timestamps, and quiz questions" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Show loading screen when generating */}
      {isLoading ? (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <Header />
          
          <div className="container mx-auto px-4 py-8">
            <div className="w-full max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <Loader2 className="h-12 w-12 animate-spin mx-auto mb-6 text-primary" />
                <h1 className="text-3xl font-bold mb-3">
                  {generatingStatus.includes('existing') || generatingStatus.includes('cached') ? 
                    'Checking Cache' : 'Generating Your Course'}
                </h1>
                <p className="text-lg text-[#E1E1E1] mb-2">{generatingStatus}</p>
                <p className="text-sm text-[#E1E1E1]">
                  {generatingStatus.includes('existing') || generatingStatus.includes('cached') ? 
                    'This should be very fast...' : 'This usually takes 15-30 seconds'}
                </p>
                {useCache && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#E1E1E1]">
                    <Zap className="h-4 w-4 text-[#02cced]" />
                    Cache enabled - faster results if video was previously analyzed
                  </div>
                )}
              </div>
              
              {/* Fun facts or tips while waiting */}
              {tips && tips.length > 0 && currentTipIndex < tips.length ? (
                <Card className="max-w-3xl mx-auto mb-8 transition-all duration-500 relative overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg transition-opacity duration-500">
                      {tips[currentTipIndex].title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#E1E1E1] transition-opacity duration-500">
                      {tips[currentTipIndex].content}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="max-w-3xl mx-auto mb-8">
                  <CardHeader>
                    <CardTitle className="text-lg">Loading facts...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[#E1E1E1]">
                      Fetching interesting facts about your video...
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Progress indicators */}
              <div className="max-w-3xl mx-auto mb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      generatingStatus.includes('Analyzing') ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {generatingStatus.includes('Analyzing') ? '✓' : '1'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Video Analysis</p>
                      <p className="text-sm text-[#E1E1E1]">Processing video content and metadata</p>
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
                      <p className="text-sm text-[#E1E1E1]">Extracting and analyzing spoken content</p>
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
                      <p className="text-sm text-[#E1E1E1]">Finding key learning points</p>
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
                      <p className="text-sm text-[#E1E1E1]">Creating interactive assessments</p>
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
                      <p className="text-sm text-[#E1E1E1]">Organizing your complete course</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Preview skeleton */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Video Player Skeleton */}
                <Card className="relative overflow-hidden">
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="aspect-video w-full rounded-lg" />
                  </CardContent>
                </Card>
                
                {/* Course Structure Skeleton */}
                <Card className="relative overflow-hidden">
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
        <div className="min-h-screen bg-gradient-to-b from-background to-background relative overflow-hidden">
          {/* Network pattern background */}
          <div className="absolute inset-0 network-pattern opacity-10" />
          
          <Header />
          
          <div className="container mx-auto px-6 pt-24 relative">
            <div className="max-w-6xl mx-auto">
              {/* Hero Section - Single Column */}
              <div className="relative mb-16">
                {/* Main Content */}
                <div className="text-center space-y-6 mb-4">
                  <h1 id="main-headline" className="text-5xl font-bold tracking-tight lg:text-7xl">
                  YouTube, 
                    <span className="text-[#02cced]"> meet Curio</span>
                  </h1>
                  <p className="text-xl text-[#E1E1E1] max-w-2xl mx-auto">
                    Curio uses AI to transform any YouTube video into an interactive learning experience with smart questions at just the right moments.
                  </p>
                </div>

                {/* Course Generation Form */}
                <Card 
                  className="relative overflow-hidden border border-[#02cced]/20 max-w-3xl mx-auto shadow-lg bg-card/90 backdrop-blur-sm rounded-xl hover:shadow-xl hover:border-[#02cced]/40 transition-all duration-300"
                  onMouseEnter={() => {
                    setIsMainCardHovered(true);
                    // Generate random start position if not already set
                    if (mainCardRandomStart === null) {
                      setMainCardRandomStart(Math.random());
                    }
                  }}
                  onMouseLeave={() => setIsMainCardHovered(false)}
                >
                  {/* Subtle animated border on hover */}
                  {isMainCardHovered && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#02cced]/20 via-[#fdd686]/10 to-[#02cced]/20 animate-pulse" />
                  )}
                  
                  {/* Enhanced geometric pattern overlay */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-0 right-0 w-32 h-32 border-4 border-[#02cced]/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 border-4 border-[#fdd686]/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                    <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-[#02cced]/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                  </div>

                  <CardContent className="relative z-10 pt-8">
                    <form onSubmit={handleSubmit(handleGenerateCourse)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="youtubeUrl" className="text-foreground font-semibold flex items-center gap-2 text-sm">
                          <Zap className="h-4 w-4 text-[#02cced] animate-pulse" />
                          YouTube Link
                        </Label>
                        <div className="relative group">
                          <Input
                            id="youtube-url-input"
                            type="url"
                            placeholder="Paste any YouTube link…"
                            {...register('youtubeUrl')}
                            disabled={isLoading}
                            className="border-[#02cced]/20 focus:border-[#02cced]/60 bg-background/80 backdrop-blur-sm transition-all placeholder:text-muted-foreground/70 placeholder:font-medium text-base shadow-sm focus:shadow-md focus:ring-2 focus:ring-[#02cced]/20"
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-[#02cced]/0 via-[#02cced]/10 to-[#fdd686]/5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                        {errors.youtubeUrl && (
                          <p className="text-sm text-destructive flex items-center gap-1">
                            <span className="inline-block w-1 h-1 bg-destructive rounded-full" />
                            {errors.youtubeUrl.message}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          id="generate-course-button"
                          type="button"
                          onClick={handleSubmit(handleGenerateCoursePro)}
                          className="flex-1 bg-gradient-to-r from-[#02cced] to-[#02cced]/90 hover:from-[#02cced]/90 hover:to-[#02cced] text-white font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] border-0" 
                          disabled={isLoading}
                          size="lg"
                        >
                          Turn Video Into a Course →
                        </Button>
                      </div>

                      {/* Quick Access Concept Buttons - Infinite Scroll */}
                      {concepts.length > 0 && (
                        <div className="relative overflow-hidden">
                          <div className="flex gap-2 animate-infinite-scroll">
                            {/* First set of buttons */}
                            {concepts.map((conceptData) => (
                              
                              <Button
                                key={`first-${conceptData.concept}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleQuickConceptClick(conceptData)}
                                className="whitespace-nowrap flex-shrink-0 border-[#02cced]/30 hover:border-[#02cced]/60 hover:bg-[#02cced]/10 text-[#02cced]/80 hover:text-[#02cced] transition-all duration-200"
                                title={`${conceptData.count} courses with this concept`}
                              >
                                {conceptData.concept}
                              </Button>
                              
                            ))}
                            {/* Duplicate set for seamless loop */}
                            {concepts.map((conceptData) => (
                              <Button
                                key={`second-${conceptData.concept}`}
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleQuickConceptClick(conceptData)}
                                className="whitespace-nowrap flex-shrink-0 border-[#02cced]/30 hover:border-[#02cced]/60 hover:bg-[#02cced]/10 text-[#02cced]/80 hover:text-[#02cced] transition-all duration-200"
                                title={`${conceptData.count} courses with this concept`}
                              >
                                {conceptData.concept}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* Curio Character - Positioned absolutely */}
                <div className="hidden lg:block absolute -right-20 bottom-0 translate-y-8">
                  <div className="relative">
                    {/* Glow effect behind Curio */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#02cced]/20 via-[#02cced]/10 to-[#02cced]/20 blur-2xl scale-110" />
                    
                    {/* Curio image - 30% smaller */}
                    <img 
                      src="/Curio.gif" 
                      alt="Curio - Your AI Learning Companion" 
                      className="relative z-10 w-64 h-auto drop-shadow-2xl"
                    />
                    
                    {/* Floating elements around Curio */}
                    <div className="absolute top-8 -right-2 w-6 h-6 bg-[#02cced] rounded-full animate-pulse" />
                    <div className="absolute bottom-20 -left-2 w-5 h-5 bg-[#02cced] rounded-full animate-pulse animation-delay-200" />
                    <div className="absolute top-1/3 -left-4 w-3 h-3 bg-[#02cced] rounded-full animate-pulse animation-delay-400" />
                    
                    {/* Speech bubble - positioned above Curio */}
                    <div className="absolute -top-16 left-8 bg-card/90 backdrop-blur-sm border border-[#02cced]/20 rounded-lg p-3 max-w-[200px] animate-bounce shadow-lg">
                      <div className="absolute -bottom-2 left-12 w-4 h-4 bg-card/90 border-r border-b border-[#02cced]/20 transform rotate-45" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Display with enhanced styling */}
              {error && (
                <Alert variant="destructive" className="max-w-3xl mx-auto border-destructive/20 bg-destructive/5">
                  <AlertDescription className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Courses Showcase */}
              <div className="mt-16 mb-24">
                <CoursesShowcase limit={6} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}