import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
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
  MessageSquare,
  Loader2,
  Eye,
  Sparkles,
  FileText,
  Wand2,
  Lightbulb
} from 'lucide-react';
import Header from '@/components/Header';

export default function About() {
  const features = [
    {
      icon: <Youtube className="h-5 w-5" />,
      title: "Connect Any YouTube Video",
      description: "Simply paste any YouTube URL and watch AI transform it instantly",
      color: "bg-red-100 text-red-600"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Analyze with Advanced AI",
      description: "Powerful AI processes video content and builds structured learning paths",
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: <Target className="h-5 w-5" />,
      title: "Create Interactive Questions",
      description: "Generate engaging assessments that test comprehension at perfect moments",
      color: "bg-green-100 text-green-600"
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Segment Content Intelligently",
      description: "Break down videos into digestible learning chunks with optimal timing",
      color: "bg-purple-100 text-purple-600"
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Build Visual Interactions",
      description: "Design hotspot and matching questions that boost engagement",
      color: "bg-orange-100 text-orange-600"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Generate Courses Instantly",
      description: "Transform hours of video content into complete courses in minutes",
      color: "bg-yellow-100 text-yellow-600"
    }
  ];

  const processSteps = [
    {
      step: "1",
      title: "Analyze Video",
      description: "AI transcribes and analyzes YouTube content, extracting key concepts and learning objectives in real-time.",
      icon: <Cpu className="h-6 w-6" />,
      color: "bg-blue-500",
      progress: 100,
      features: ["Full transcript generation", "Concept identification", "Visual frame analysis"]
    },
    {
      step: "2",
      title: "Structure Content",
      description: "AI segments content into logical chapters with precise timestamps and intelligent concept mapping.",
      icon: <BookOpen className="h-6 w-6" />,
      color: "bg-green-500",
      progress: 100,
      features: ["Chapter segmentation", "Timestamp optimization", "Learning path creation"]
    },
    {
      step: "3",
      title: "Generate Questions",
      description: "AI creates engaging questions at optimal moments, including interactive hotspot and matching exercises.",
      icon: <Wand2 className="h-6 w-6" />,
      color: "bg-purple-500",
      progress: 100,
      features: ["Multiple choice questions", "Visual hotspot interactions", "Matching exercises"]
    },
    {
      step: "4",
      title: "Build Course",
      description: "AI combines all elements into an interactive learning experience with progress tracking and navigation.",
      icon: <Sparkles className="h-6 w-6" />,
      color: "bg-orange-500",
      progress: 100,
      features: ["Interactive player", "Progress tracking", "Smart navigation"]
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
    <>
      <Head>
        <title>About - Curio</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mb-4">
              About Curio
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
              How It Works
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Curio transforms YouTube videos into interactive, structured courses 
              using advanced artificial intelligence and machine learning.
            </p>
          </div>

          {/* What It Does Section */}
          <Card className="overflow-hidden relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                How Curio Transforms Learning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Converts Videos Automatically</h4>
                      <p className="text-sm text-muted-foreground">
                        Transform any YouTube video into an interactive course in minutes, not hours
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Analyzes Content Intelligently</h4>
                      <p className="text-sm text-muted-foreground">
                        AI extracts key concepts and identifies the best moments for learning interactions
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Generates Engaging Questions</h4>
                      <p className="text-sm text-muted-foreground">
                        Create interactive assessments that appear at optimal learning moments
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Structures Learning Paths</h4>
                      <p className="text-sm text-muted-foreground">
                        Organize content into logical chapters with clear progression
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Tracks Progress Seamlessly</h4>
                      <p className="text-sm text-muted-foreground">
                        Monitor learning progress and provide personalized feedback
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-semibold text-foreground">Delivers Professional Results</h4>
                      <p className="text-sm text-muted-foreground">
                        Create courses that rival professionally designed educational content
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-center text-muted-foreground">
                  <strong>For educators, students, and lifelong learners</strong> — transform any educational video into a professional-grade course with minimal effort.
                </p>
              </div>
            </CardContent>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-2xl"></div>
          </Card>

          {/* Process Section */}
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Watch AI Transform Your Content</h2>
              <p className="text-muted-foreground">
                See how our AI pipeline processes videos in real-time, creating engaging courses automatically
              </p>
            </div>

            <div className="grid gap-8">
              {processSteps.map((step, index) => (
                <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-6">
                      <div className="flex flex-col items-center">
                        <div className={`flex items-center justify-center w-16 h-16 ${step.color} text-white rounded-full font-bold text-xl shadow-lg`}>
                          {step.step}
                        </div>
                        {index < processSteps.length - 1 && (
                          <div className="w-0.5 h-12 bg-gradient-to-b from-gray-300 to-transparent mt-4" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <CardTitle className="flex items-center gap-3 text-xl">
                            <div className="p-2 bg-muted rounded-lg">
                              {step.icon}
                            </div>
                            {step.title}
                          </CardTitle>
                          <CardDescription className="mt-2 text-base">
                            {step.description}
                          </CardDescription>
                        </div>
                        
                        {/* Visual Progress Animation */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Processing</span>
                            <span className="font-medium">{step.progress}%</span>
                          </div>
                          <Progress value={step.progress} className="h-2" />
                        </div>
                        
                        {/* Feature List */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                          {step.features.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-muted-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Animated Icon */}
                      <div className="hidden lg:block">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <div className="text-gray-600 animate-pulse">
                            {step.icon}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Background Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                </Card>
              ))}
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">What You Can Do</h2>
              <p className="text-muted-foreground">
                Powerful actions that transform passive videos into active learning experiences
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="h-full group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className={`p-3 ${feature.color} rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                        {feature.icon}
                      </div>
                      <span className="group-hover:text-foreground/80 transition-colors">
                        {feature.title}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
                Curio leverages cutting-edge artificial intelligence technologies including:
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
    </>
  );
} 