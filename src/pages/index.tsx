import React, { useState } from "react";
import Head from "next/head";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, BookOpen, Clock, Users, CheckCircle, Sparkles, Youtube, ArrowRight, Loader2 } from "lucide-react";
import { isValidYouTubeUrl, CourseData } from "@/lib/gemini";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube URL",
        variant: "destructive"
      });
      return;
    }

    if (!isValidYouTubeUrl(youtubeUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setCourseData(null);

    try {
      const response = await fetch('/api/analyze-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to analyze video');
      }

      setCourseData(result.data);
      toast({
        title: "Course Generated!",
        description: "Your course structure has been created successfully.",
      });

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate course. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>CourseForge AI - Transform YouTube Videos into Structured Courses</title>
        <meta name="description" content="Transform any YouTube video into a comprehensive, structured course with AI-powered analysis" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          
          <div className="container mx-auto px-4 py-16 lg:py-24">
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="mb-6">
                <Badge variant="secondary" className="mb-4 px-4 py-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Powered by Gemini AI
                </Badge>
              </motion.div>

              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent"
              >
                CourseForge AI
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed"
              >
                Transform any YouTube video into a comprehensive, structured course with AI-powered analysis
              </motion.p>

              <motion.div variants={fadeInUp} className="mb-12">
                <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <Input
                        type="url"
                        placeholder="Paste YouTube URL here..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="pl-12 h-14 text-lg border-2 focus:border-primary/50 transition-colors"
                        disabled={isLoading}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="h-14 px-8 text-lg font-semibold"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          Generate Course
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>

              {/* Features */}
              <motion.div 
                variants={fadeInUp}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
              >
                <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Play className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Video Analysis</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    AI analyzes video content to extract key learning points
                  </p>
                </div>

                <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Course Structure</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Generates organized modules with topics and learning outcomes
                  </p>
                </div>

                <div className="flex flex-col items-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Ready to Teach</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Complete course outline ready for educational use
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Course Results */}
        {courseData && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="container mx-auto px-4 py-16"
          >
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 border-primary/20">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-3xl font-bold mb-4">{courseData.title}</CardTitle>
                  <CardDescription className="text-lg leading-relaxed">
                    {courseData.description}
                  </CardDescription>
                  
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <Badge variant="outline" className="px-4 py-2">
                      <Clock className="w-4 h-4 mr-2" />
                      {courseData.duration}
                    </Badge>
                    <Badge variant="outline" className="px-4 py-2">
                      {courseData.difficulty}
                    </Badge>
                    <Badge variant="outline" className="px-4 py-2">
                      {courseData.modules.length} Modules
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-8">
                  {/* Prerequisites */}
                  {courseData.prerequisites.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Prerequisites</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {courseData.prerequisites.map((prereq, index) => (
                          <div key={index} className="flex items-center">
                            <CheckCircle className="w-4 h-4 text-primary mr-2 flex-shrink-0" />
                            <span className="text-sm">{prereq}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Modules */}
                  <div>
                    <h3 className="text-xl font-semibold mb-6">Course Modules</h3>
                    <div className="space-y-6">
                      {courseData.modules.map((module, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="border border-border/50">
                            <CardHeader>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-lg">
                                    Module {index + 1}: {module.title}
                                  </CardTitle>
                                  <CardDescription className="mt-2">
                                    {module.description}
                                  </CardDescription>
                                </div>
                                <Badge variant="secondary" className="ml-4">
                                  {module.duration}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                  Topics Covered
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {module.topics.map((topic, topicIndex) => (
                                    <Badge key={topicIndex} variant="outline" className="text-xs">
                                      {topic}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Learning Outcomes */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Learning Outcomes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {courseData.learningOutcomes.map((outcome, index) => (
                        <div key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-sm leading-relaxed">{outcome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <footer className="border-t bg-muted/30 py-8">
          <div className="container mx-auto px-4 text-center">
            <p className="text-muted-foreground">
              Built with Next.js, TypeScript, and Gemini AI
            </p>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, hsl(var(--muted-foreground)) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
      <Toaster />
    </>
  );
}