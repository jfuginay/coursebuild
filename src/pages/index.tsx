import { useState } from 'react';
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
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState<CourseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CourseGenerationFormData>({
    resolver: zodResolver(courseGenerationSchema)
  });

  const handleGenerateCourse = async (data: CourseGenerationFormData) => {
    setIsLoading(true);
    setError(null);
    setGeneratedCourse(null);

    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl: data.youtubeUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate course');
      }

      const result: ApiResponse = await response.json();
      
      if (result.success) {
        setGeneratedCourse(result.data);
        toast.success('Course generated successfully!');
        reset();
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

                <Button 
                  type="submit" 
                  className="w-full" 
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

          {/* Generated Course Preview */}
          {generatedCourse && (
            <Card className="w-full max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>{generatedCourse.title}</CardTitle>
                <CardDescription>
                  {generatedCourse.description} • Duration: {generatedCourse.duration}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Course Overview</h3>
                    <div className="grid gap-4">
                      {generatedCourse.segments.map((segment, index) => (
                        <div 
                          key={index} 
                          className="p-4 border rounded-lg bg-muted/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{segment.title}</h4>
                            <span className="text-sm text-muted-foreground">
                              {segment.timestamp}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            <strong>Concepts:</strong> {segment.concepts.join(', ') || 'None specified'}
                          </div>
                          <div className="text-sm">
                            <strong>Questions:</strong> {segment.questions.length} interactive questions
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-center text-muted-foreground">
                      Course generated successfully! You can now start learning with interactive questions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 