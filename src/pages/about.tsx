import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Brain, 
  BookOpen, 
  Zap, 
  Target, 
  Users, 
  Clock, 
  CheckCircle,
  ArrowRight,
  Youtube,
  Cpu,
  MessageSquare
} from 'lucide-react';
import Header from '@/components/Header';

export default function About() {
  const features = [
    {
      icon: <Youtube className="h-5 w-5" />,
      title: "YouTube Integration",
      description: "Simply paste any YouTube URL and let AI do the rest"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "AI-Powered Analysis",
      description: "Advanced AI analyzes video content and generates structured courses"
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Interactive Questions",
      description: "Automatically generated questions test comprehension at key moments"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Smart Segmentation",
      description: "Content is intelligently broken into digestible learning segments"
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Visual Quizzes",
      description: "Hotspot and matching questions for enhanced engagement"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Instant Generation",
      description: "Transform hours of video into structured courses in minutes"
    }
  ];

  const processSteps = [
    {
      step: "1",
      title: "Video Analysis",
      description: "AI transcribes and analyzes the YouTube video content, identifying key concepts and learning objectives.",
      icon: <Cpu className="h-6 w-6" />
    },
    {
      step: "2",
      title: "Content Structuring",
      description: "The content is automatically segmented into logical chapters with timestamps and concept mapping.",
      icon: <BookOpen className="h-6 w-6" />
    },
    {
      step: "3",
      title: "Question Generation",
      description: "AI generates relevant questions for each segment, including multiple choice, hotspot, and matching questions.",
      icon: <Target className="h-6 w-6" />
    },
    {
      step: "4",
      title: "Course Creation",
      description: "All elements are combined into an interactive course with navigation and progress tracking.",
      icon: <CheckCircle className="h-6 w-6" />
    }
  ];

  const benefits = [
    "Transform passive video watching into active learning",
    "Automatically identify key concepts and learning objectives",
    "Generate comprehension questions at optimal intervals",
    "Create structured, navigable course content",
    "Save hours of manual course creation time",
    "Enhance retention through interactive elements"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mb-4">
              About CourseForge AI
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              How It Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              CourseForge AI transforms YouTube videos into interactive, structured courses 
              using advanced artificial intelligence and machine learning.
            </p>
          </div>

          {/* What It Does Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                What CourseForge AI Does
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                CourseForge AI revolutionizes online learning by automatically converting YouTube videos 
                into comprehensive, interactive courses. Our AI analyzes video content, extracts key concepts, 
                and generates engaging questions to create a structured learning experience.
              </p>
              <p className="text-muted-foreground">
                Whether you're an educator, student, or lifelong learner, CourseForge AI makes it easy 
                to transform any educational video into a professional-grade course with minimal effort.
              </p>
            </CardContent>
          </Card>

          {/* Process Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">The Process</h2>
              <p className="text-muted-foreground">
                Our AI-powered pipeline transforms raw video content into structured courses in four key steps
              </p>
            </div>

            <div className="grid gap-6">
              {processSteps.map((step, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full font-bold text-lg">
                        {step.step}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {step.icon}
                          {step.title}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {step.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {index < processSteps.length - 1 && (
                    <div className="absolute left-6 top-20 w-0.5 h-8 bg-border" />
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Key Features</h2>
              <p className="text-muted-foreground">
                Powerful features that make learning more engaging and effective
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {feature.icon}
                      </div>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Benefits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Why Choose CourseForge AI?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Technology Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Powered by Advanced AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                CourseForge AI leverages cutting-edge artificial intelligence technologies including:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Natural Language Processing</h4>
                  <p className="text-sm text-muted-foreground">
                    Advanced NLP models analyze video transcripts to identify key concepts and learning objectives.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Machine Learning</h4>
                  <p className="text-sm text-muted-foreground">
                    ML algorithms segment content optimally and generate contextually relevant questions.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Computer Vision</h4>
                  <p className="text-sm text-muted-foreground">
                    CV technology enables visual quiz generation and frame-based question creation.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Content Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Sophisticated analysis engines extract meaningful insights from video content.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Call to Action */}
          <div className="text-center space-y-4 py-8">
            <h2 className="text-2xl font-bold">Ready to Transform Your Learning?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start creating interactive courses from YouTube videos today. 
              Simply paste a URL and let our AI do the rest.
            </p>
            <div className="flex justify-center">
              <a 
                href="/"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 