import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { Player } from '@remotion/player';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Play, Download, Settings, Film } from 'lucide-react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

interface AnimationConfig {
  title: string;
  description: string;
  duration: string;
  questionsCount: number;
  segmentsCount: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  courseName: string;
  progress: number;
  completedSections: number;
  totalSections: number;
}

export default function AnimationPage() {
  const { user } = useAuth();
  const [selectedComposition, setSelectedComposition] = useState<string>('CourseForgeIntro');
  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>({
    title: 'Introduction to React',
    description: 'Learn the fundamentals of React development with interactive examples',
    duration: '45 min',
    questionsCount: 12,
    segmentsCount: 8,
    totalQuestions: 12,
    correctAnswers: 9,
    wrongAnswers: 3,
    accuracy: 75,
    courseName: 'Introduction to React',
    progress: 85,
    completedSections: 7,
    totalSections: 8,
  });

  const compositions = [
    {
      id: 'CourseForgeIntro',
      name: 'CourseForge Intro',
      description: 'Simple animated introduction to CourseForge AI',
      durationInFrames: 90,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {},
    },
    {
      id: 'VectorCafe',
      name: 'Vector Café',
      description: 'Educational animation about vector dot products with interactive dialogue',
      durationInFrames: 960,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {},
    },
    {
      id: 'VectorCafeV2',
      name: 'Vector Café V2',
      description: 'Enhanced version with Alex & Sam - interactive vector dot product learning experience',
      durationInFrames: 510,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {},
    },
    {
      id: 'ParadoxOfLight',
      name: 'Paradox of Light',
      description: 'Interactive story about smart bulb temperature settings and the counter-intuitive nature of color temperature',
      durationInFrames: 750,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {},
    },
    {
      id: 'ParadoxOfLightV2',
      name: 'Paradox of Light V2',
      description: 'Streamlined version with structured sequences - smart bulb temperature paradox explained',
      durationInFrames: 300,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {},
    },
    {
      id: 'CourseSummary',
      name: 'Course Summary',
      description: 'Animated course overview with statistics',
      durationInFrames: 120,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {
        title: animationConfig.title,
        description: animationConfig.description,
        duration: animationConfig.duration,
        questionsCount: animationConfig.questionsCount,
        segmentsCount: animationConfig.segmentsCount,
      },
    },
    {
      id: 'QuestionStats',
      name: 'Question Statistics',
      description: 'Animated visualization of question performance',
      durationInFrames: 150,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {
        totalQuestions: animationConfig.totalQuestions,
        correctAnswers: animationConfig.correctAnswers,
        wrongAnswers: animationConfig.wrongAnswers,
        accuracy: animationConfig.accuracy,
      },
    },
    {
      id: 'ProgressAnimation',
      name: 'Learning Progress',
      description: 'Animated learning progress visualization',
      durationInFrames: 180,
      fps: 30,
      width: 1920,
      height: 1080,
      defaultProps: {
        courseName: animationConfig.courseName,
        progress: animationConfig.progress,
        completedSections: animationConfig.completedSections,
        totalSections: animationConfig.totalSections,
      },
    },
  ];

  const currentComposition = compositions.find(comp => comp.id === selectedComposition);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  const handleDownload = async () => {
    if (!currentComposition) return;

    setIsDownloading(true);
    setDownloadStatus('Starting video render...');

    try {
      const response = await fetch('/api/render-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compositionId: selectedComposition,
          props: currentComposition.defaultProps,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setDownloadStatus('Video rendered successfully! Starting download...');
        
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `${selectedComposition}-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setDownloadStatus('Download completed!');
        setTimeout(() => setDownloadStatus(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to render video');
      }
    } catch (error) {
      console.error('Download error:', error);
      setDownloadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setDownloadStatus(''), 5000);
    } finally {
      setIsDownloading(false);
    }
  };

  const updateConfig = (key: keyof AnimationConfig, value: any) => {
    setAnimationConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Dynamic import to avoid SSR issues with Remotion
  const [RemotionComponents, setRemotionComponents] = useState<any>(null);

  useEffect(() => {
    const loadRemotionComponents = async () => {
      try {
        const [
          { MyComposition },
          { CourseSummary },
          { QuestionStats },
          { ProgressAnimation },
          { VectorCafeScene },
          { VectorCafeSceneV2 },
          { ParadoxOfLight },
          { ParadoxOfLightV2 },
        ] = await Promise.all([
          import('../../remotion/Composition'),
          import('../../remotion/CourseSummary'),
          import('../../remotion/QuestionStats'),
          import('../../remotion/ProgressAnimation'),
          import('../../remotion/VectorCafeScene'),
          import('../../remotion/VectorCafeSceneV2'),
          import('../../remotion/ParadoxOfLight'),
          import('../../remotion/ParadoxOfLightV2'),
        ]);

        setRemotionComponents({
          CourseForgeIntro: MyComposition,
          CourseSummary,
          QuestionStats,
          ProgressAnimation,
          VectorCafe: VectorCafeScene,
          VectorCafeV2: VectorCafeSceneV2,
          ParadoxOfLight,
          ParadoxOfLightV2,
        });
      } catch (error) {
        console.error('Failed to load Remotion components:', error);
      }
    };

    loadRemotionComponents();
  }, []);

  return (
    <>
      <Head>
        <title>Animation Studio - CourseForge AI</title>
        <meta name="description" content="Create animated videos for your courses with AI-powered animations" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
                Animation Studio
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Create engaging animated videos from your course data using AI-powered animations
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Controls Panel */}
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Animation Settings
                    </CardTitle>
                    <CardDescription>
                      Configure your animation parameters
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="composition">Animation Type</Label>
                      <Select value={selectedComposition} onValueChange={setSelectedComposition}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select animation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {compositions.map((comp) => (
                            <SelectItem key={comp.id} value={comp.id}>
                              {comp.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic configuration based on selected composition */}
                    {selectedComposition === 'CourseSummary' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="title">Course Title</Label>
                          <Input
                            id="title"
                            value={animationConfig.title}
                            onChange={(e) => updateConfig('title', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={animationConfig.description}
                            onChange={(e) => updateConfig('description', e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="duration">Duration</Label>
                          <Input
                            id="duration"
                            value={animationConfig.duration}
                            onChange={(e) => updateConfig('duration', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="questions">Questions</Label>
                            <Input
                              id="questions"
                              type="number"
                              value={animationConfig.questionsCount}
                              onChange={(e) => updateConfig('questionsCount', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="segments">Segments</Label>
                            <Input
                              id="segments"
                              type="number"
                              value={animationConfig.segmentsCount}
                              onChange={(e) => updateConfig('segmentsCount', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedComposition === 'QuestionStats' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="total">Total Questions</Label>
                            <Input
                              id="total"
                              type="number"
                              value={animationConfig.totalQuestions}
                              onChange={(e) => updateConfig('totalQuestions', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="correct">Correct</Label>
                            <Input
                              id="correct"
                              type="number"
                              value={animationConfig.correctAnswers}
                              onChange={(e) => updateConfig('correctAnswers', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="wrong">Wrong</Label>
                            <Input
                              id="wrong"
                              type="number"
                              value={animationConfig.wrongAnswers}
                              onChange={(e) => updateConfig('wrongAnswers', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accuracy">Accuracy (%)</Label>
                            <Input
                              id="accuracy"
                              type="number"
                              value={animationConfig.accuracy}
                              onChange={(e) => updateConfig('accuracy', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedComposition === 'ProgressAnimation' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="courseName">Course Name</Label>
                          <Input
                            id="courseName"
                            value={animationConfig.courseName}
                            onChange={(e) => updateConfig('courseName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="progress">Progress (%)</Label>
                          <Input
                            id="progress"
                            type="number"
                            value={animationConfig.progress}
                            onChange={(e) => updateConfig('progress', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="completed">Completed</Label>
                            <Input
                              id="completed"
                              type="number"
                              value={animationConfig.completedSections}
                              onChange={(e) => updateConfig('completedSections', parseInt(e.target.value))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="total">Total Sections</Label>
                            <Input
                              id="total"
                              type="number"
                              value={animationConfig.totalSections}
                              onChange={(e) => updateConfig('totalSections', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-3 pt-4">
                      <Button 
                        onClick={handleDownload} 
                        disabled={isDownloading}
                        className="flex-1"
                      >
                        {isDownloading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Rendering...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Download MP4
                          </>
                        )}
                      </Button>
                      {downloadStatus && (
                        <div className={`text-sm p-2 rounded ${
                          downloadStatus.includes('Error') 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {downloadStatus}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Animation Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Film className="h-5 w-5" />
                      Animation Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {currentComposition && (
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {currentComposition.name}</p>
                        <p><strong>Duration:</strong> {(currentComposition.durationInFrames / currentComposition.fps).toFixed(1)}s</p>
                        <p><strong>Resolution:</strong> {currentComposition.width}x{currentComposition.height}</p>
                        <p><strong>FPS:</strong> {currentComposition.fps}</p>
                        <p><strong>Description:</strong> {currentComposition.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Video Player */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5" />
                      Animation Preview
                    </CardTitle>
                    <CardDescription>
                      Preview your animated video in real-time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                      {RemotionComponents && currentComposition ? (
                        <Player
                          component={RemotionComponents[selectedComposition]}
                          durationInFrames={currentComposition.durationInFrames}
                          compositionWidth={currentComposition.width}
                          compositionHeight={currentComposition.height}
                          fps={currentComposition.fps}
                          style={{
                            width: '100%',
                            height: '100%',
                          }}
                          inputProps={currentComposition.defaultProps}
                          controls
                          loop
                        />
                      ) : (
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-sm text-muted-foreground">Loading animation...</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}