import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Play, BookOpen, Clock, Users, CheckCircle } from 'lucide-react';
import Header from '@/components/Header';

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

export default function Create() {
  const router = useRouter();
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');

  useEffect(() => {
    // Get data from router state
    if (router.query.data && router.query.youtubeUrl) {
      try {
        const parsedData = JSON.parse(router.query.data as string);
        setCourseData(parsedData);
        setYoutubeUrl(router.query.youtubeUrl as string);
        
        // Extract video ID from YouTube URL
        const extractVideoId = (url: string): string => {
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
          return '';
        };
        
        setVideoId(extractVideoId(router.query.youtubeUrl as string));
      } catch (error) {
        console.error('Error parsing course data:', error);
      }
    }
  }, [router.query]);

  const handleBackToHome = () => {
    router.push('/');
  };

  if (!courseData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Alert>
              <AlertDescription>
                No course data found. Please generate a course first.
              </AlertDescription>
            </Alert>
            <Button onClick={handleBackToHome} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = courseData.segments.reduce((total, segment) => total + segment.questions.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={handleBackToHome}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          {/* Course Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              {courseData.title}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {courseData.description}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Duration: {courseData.duration}
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                {courseData.segments.length} Segments
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {totalQuestions} Questions
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Video Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Original Video
                </CardTitle>
                <CardDescription>
                  Watch the source material that was used to generate this course
                </CardDescription>
              </CardHeader>
              <CardContent>
                {videoId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="w-full h-full rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Unable to load video</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Structure */}
            <Card>
              <CardHeader>
                <CardTitle>Course Structure</CardTitle>
                <CardDescription>
                  Interactive segments with questions and concepts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {courseData.segments.map((segment, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        Segment {index + 1}: {segment.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {segment.timestamp}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>
                        <strong>Concepts:</strong> {segment.concepts.length > 0 ? segment.concepts.join(', ') : 'None specified'}
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        {segment.questions.length} interactive question{segment.questions.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    {index < courseData.segments.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Course Details */}
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
              <CardDescription>
                Detailed breakdown of each segment and its interactive elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {courseData.segments.map((segment, segmentIndex) => (
                  <div key={segmentIndex} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {segment.timestamp}
                      </Badge>
                      <h3 className="text-lg font-semibold">{segment.title}</h3>
                    </div>

                    {segment.concepts.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 text-sm">Key Concepts:</h4>
                        <div className="flex flex-wrap gap-2">
                          {segment.concepts.map((concept, conceptIndex) => (
                            <Badge key={conceptIndex} variant="secondary">
                              {concept}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {segment.questions.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3 text-sm">
                          Interactive Questions ({segment.questions.length}):
                        </h4>
                        <div className="space-y-3">
                          {segment.questions.map((question, questionIndex) => (
                            <div key={questionIndex} className="p-4 bg-muted/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {question.type}
                                </Badge>
                                <span className="text-sm font-medium">
                                  Question {questionIndex + 1}
                                </span>
                              </div>
                              <p className="text-sm mb-2">{question.question}</p>
                              {question.options.length > 0 && (
                                <div className="space-y-1">
                                  {question.options.map((option, optionIndex) => (
                                    <div 
                                      key={optionIndex} 
                                      className={`text-xs p-2 rounded ${
                                        optionIndex === question.correct 
                                          ? 'bg-primary/10 border border-primary/20' 
                                          : 'bg-background'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optionIndex)}. {option}
                                      {optionIndex === question.correct && (
                                        <CheckCircle className="inline h-3 w-3 ml-2 text-primary" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {question.explanation && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <strong>Explanation:</strong> {question.explanation}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {segmentIndex < courseData.segments.length - 1 && (
                      <Separator className="my-6" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <Button size="lg" className="px-8">
              <BookOpen className="mr-2 h-4 w-4" />
              Start Learning
            </Button>
            <Button variant="outline" size="lg" className="px-8">
              Export Course
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 