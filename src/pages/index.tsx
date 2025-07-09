import { useState } from 'react';
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

    try {
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
        toast.success(`Course generated successfully${useEnhanced ? ' (PRO)' : ''}!`);
        reset();
        
        // Navigate to create page with course data
        router.push({
          pathname: '/create',
          query: {
            data: JSON.stringify(result.data),
            youtubeUrl: data.youtubeUrl,
            courseId: result.course_id
          }
        });
      } else {
        throw new Error('Failed to generate course');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCourse = (data: CourseGenerationFormData) => generateCourse(data, false);
  const handleGenerateCoursePro = (data: CourseGenerationFormData) => generateCourse(data, true);

  return (
    <>
      <Head>
        <title>CourseBuilder - Transform YouTube Videos into Interactive Courses</title>
      </Head>
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
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Courses Showcase Section */}
        <div className="mt-16">
          <CoursesShowcase limit={6} />
        </div>
      </div>
    </div>
    </>
  );
}