/**
 * Canvas Export Dialog Component
 * 
 * Provides a comprehensive UI for configuring and executing Canvas LMS exports.
 * Features step-by-step wizard, real-time validation, and progress tracking.
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink, 
  Settings, 
  FileText, 
  Video, 
  HelpCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Eye,
  Clock
} from 'lucide-react';
import { CanvasAPI, CanvasConfig } from '@/lib/canvas-api';
import { CanvasTransformer, CanvasExportOptions } from '@/lib/canvas-transformer';
import { CanvasExporter, CanvasExportProgress } from '@/lib/canvas-exporter';

// Component Props
interface CanvasExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    id: string;
    title: string;
    description: string;
    youtube_url: string;
  };
  segments: Array<{
    title: string;
    timestamp: string;
    timestampSeconds: number;
    concepts: string[];
    questions: any[];
  }>;
}

// Step Configuration
interface ExportStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EXPORT_STEPS: ExportStep[] = [
  {
    id: 'canvas-setup',
    title: 'Canvas Connection',
    description: 'Connect to your Canvas LMS instance',
    icon: Settings,
  },
  {
    id: 'export-options',
    title: 'Export Options',
    description: 'Configure what content to export',
    icon: FileText,
  },
  {
    id: 'course-structure',
    title: 'Course Structure',
    description: 'Choose how to organize content',
    icon: Video,
  },
  {
    id: 'review-export',
    title: 'Review & Export',
    description: 'Review settings and start export',
    icon: Upload,
  },
];

// Export State
interface ExportState {
  currentStep: number;
  canvasConfig: CanvasConfig;
  exportOptions: CanvasExportOptions;
  isConnecting: boolean;
  isExporting: boolean;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError?: string;
  exportProgress: number;
  exportStatus: string;
  exportSuccess: boolean;
  canvasCourseUrl?: string;
  validationResult?: {
    isValid: boolean;
    warnings: string[];
    errors: string[];
  };
}

export function CanvasExportDialog({ open, onOpenChange, course, segments }: CanvasExportDialogProps) {
  const [state, setState] = useState<ExportState>({
    currentStep: 0,
    canvasConfig: {
      canvasUrl: '',
      accessToken: '',
      accountId: '',
    },
    exportOptions: {
      createNewCourse: true,
      includeVideos: true,
      includeQuizzes: true,
      moduleStructure: 'segments',
      publishImmediately: false,
      videoIntegration: 'embed',
      quizSettings: {
        allowMultipleAttempts: true,
        showCorrectAnswers: true,
        shuffleAnswers: false,
      },
    },
    isConnecting: false,
    isExporting: false,
    connectionStatus: 'idle',
    exportProgress: 0,
    exportStatus: 'Ready to export',
    exportSuccess: false,
  });

  // Validate course data when dialog opens
  useEffect(() => {
    if (open) {
      const validation = CanvasTransformer.validateCourse(course, segments);
      setState(prev => ({ ...prev, validationResult: validation }));
    }
  }, [open, course, segments]);

  // Test Canvas connection
  const testCanvasConnection = async () => {
    setState(prev => ({ ...prev, isConnecting: true, connectionStatus: 'testing' }));
    
    try {
      // For now, we'll validate through our API endpoint
      const response = await fetch('/api/canvas/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasUrl: state.canvasConfig.canvasUrl,
          accessToken: state.canvasConfig.accessToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Connection failed');
      }

      const result = await response.json();
      
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        connectionStatus: 'success',
        connectionError: undefined 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        connectionStatus: 'error',
        connectionError: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  };

  // Execute Canvas export
  const executeExport = async () => {
    setState(prev => ({ ...prev, isExporting: true, exportProgress: 0 }));
    
    try {
      // Start the export through our API
      const response = await fetch('/api/canvas/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          courseId: course.id,
          canvasConfig: state.canvasConfig,
          exportOptions: state.exportOptions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const { exportId } = await response.json();

      // Poll for progress updates
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`/api/canvas/export/${exportId}/progress`);
          
          if (!progressResponse.ok) {
            clearInterval(pollInterval);
            throw new Error('Failed to get export progress');
          }

          const progress = await progressResponse.json();
          
          setState(prev => ({
            ...prev,
            exportStatus: progress.currentStep,
            exportProgress: (progress.completedSteps / progress.totalSteps) * 100,
          }));

          if (progress.status === 'completed') {
            clearInterval(pollInterval);
            setState(prev => ({ 
              ...prev, 
              isExporting: false,
              exportStatus: 'Export completed successfully!',
              exportProgress: 100,
              exportSuccess: true,
              canvasCourseUrl: progress.canvasCourseUrl
            }));
          } else if (progress.status === 'failed') {
            clearInterval(pollInterval);
            throw new Error(progress.error || 'Export failed');
          }
        } catch (error) {
          clearInterval(pollInterval);
          setState(prev => ({ 
            ...prev, 
            isExporting: false,
            exportStatus: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          }));
        }
      }, 1000); // Poll every second

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isExporting: false,
        exportStatus: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  };

  // Navigation helpers
  const canProceed = () => {
    switch (state.currentStep) {
      case 0: // Canvas setup
        return state.connectionStatus === 'success';
      case 1: // Export options
        return true; // Always can proceed from options
      case 2: // Course structure
        return true; // Always can proceed from structure
      case 3: // Review
        return state.validationResult?.isValid !== false;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (canProceed() && state.currentStep < EXPORT_STEPS.length - 1) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    }
  };

  const prevStep = () => {
    if (state.currentStep > 0) {
      setState(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const updateCanvasConfig = (updates: Partial<CanvasConfig>) => {
    setState(prev => ({
      ...prev,
      canvasConfig: { ...prev.canvasConfig, ...updates },
      connectionStatus: 'idle', // Reset connection status when config changes
    }));
  };

  const updateExportOptions = (updates: Partial<CanvasExportOptions>) => {
    setState(prev => ({
      ...prev,
      exportOptions: { ...prev.exportOptions, ...updates },
    }));
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 0:
        return <CanvasSetupStep 
          config={state.canvasConfig}
          onConfigChange={updateCanvasConfig}
          onTestConnection={testCanvasConnection}
          connectionStatus={state.connectionStatus}
          connectionError={state.connectionError}
          isConnecting={state.isConnecting}
        />;
      
      case 1:
        return <ExportOptionsStep 
          options={state.exportOptions}
          onOptionsChange={updateExportOptions}
          course={course}
          segments={segments}
        />;
      
      case 2:
        return <CourseStructureStep 
          options={state.exportOptions}
          onOptionsChange={updateExportOptions}
          course={course}
          segments={segments}
        />;
      
      case 3:
        return <ReviewExportStep 
          course={course}
          segments={segments}
          canvasConfig={state.canvasConfig}
          exportOptions={state.exportOptions}
          validationResult={state.validationResult}
          isExporting={state.isExporting}
          exportProgress={state.exportProgress}
          exportStatus={state.exportStatus}
          exportSuccess={state.exportSuccess}
          canvasCourseUrl={state.canvasCourseUrl}
          onExport={executeExport}
        />;
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Export to Canvas LMS
          </DialogTitle>
          <DialogDescription>
            Export "{course.title}" to your Canvas LMS instance with interactive elements and assessments.
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {EXPORT_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === state.currentStep;
            const isCompleted = index < state.currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                    isActive ? 'bg-blue-500 border-blue-500 text-white' : 
                    'bg-gray-100 border-gray-300 text-gray-500'}
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {index < EXPORT_STEPS.length - 1 && (
                  <div className={`
                    h-0.5 w-16 mx-2
                    ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                  `} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{EXPORT_STEPS[state.currentStep].title}</h3>
            <p className="text-sm text-gray-600">{EXPORT_STEPS[state.currentStep].description}</p>
          </div>
          
          {renderStepContent()}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={state.currentStep === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {state.currentStep < EXPORT_STEPS.length - 1 ? (
              <Button 
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={executeExport}
                disabled={!canProceed() || state.isExporting}
              >
                {state.isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Start Export
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
function CanvasSetupStep({ 
  config, 
  onConfigChange, 
  onTestConnection, 
  connectionStatus, 
  connectionError, 
  isConnecting 
}: {
  config: CanvasConfig;
  onConfigChange: (updates: Partial<CanvasConfig>) => void;
  onTestConnection: () => void;
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  connectionError?: string;
  isConnecting: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Canvas Instance Configuration</CardTitle>
          <CardDescription>
            Enter your Canvas LMS details to establish a connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="canvas-url">Canvas URL</Label>
            <Input
              id="canvas-url"
              placeholder="https://your-institution.instructure.com"
              value={config.canvasUrl}
              onChange={(e) => onConfigChange({ canvasUrl: e.target.value })}
            />
          </div>
          
          <div>
            <Label htmlFor="access-token">Access Token</Label>
            <Input
              id="access-token"
              type="password"
              placeholder="Your Canvas API access token"
              value={config.accessToken}
              onChange={(e) => onConfigChange({ accessToken: e.target.value })}
            />
            <p className="text-xs text-gray-500 mt-1">
              Generate a token in Canvas: Account → Settings → Approved Integrations → New Access Token
            </p>
          </div>
          
          <div>
            <Label htmlFor="account-id">Account ID (Optional)</Label>
            <Input
              id="account-id"
              placeholder="Leave blank for default account"
              value={config.accountId}
              onChange={(e) => onConfigChange({ accountId: e.target.value })}
            />
          </div>
          
          <Button 
            onClick={onTestConnection}
            disabled={!config.canvasUrl || !config.accessToken || isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing Connection...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
          
          {connectionStatus === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully connected to Canvas! You can proceed to the next step.
              </AlertDescription>
            </Alert>
          )}
          
          {connectionStatus === 'error' && connectionError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Connection failed: {connectionError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExportOptionsStep({ 
  options, 
  onOptionsChange, 
  course, 
  segments 
}: {
  options: CanvasExportOptions;
  onOptionsChange: (updates: Partial<CanvasExportOptions>) => void;
  course: any;
  segments: any[];
}) {
  const totalQuestions = segments.reduce((acc, seg) => acc + seg.questions.length, 0);
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="include-videos">Include Video Content</Label>
                <p className="text-sm text-gray-500">Embed YouTube video in Canvas pages</p>
              </div>
              <Switch
                id="include-videos"
                checked={options.includeVideos}
                onCheckedChange={(checked) => onOptionsChange({ includeVideos: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="include-quizzes">Include Quizzes</Label>
                <p className="text-sm text-gray-500">{totalQuestions} questions total</p>
              </div>
              <Switch
                id="include-quizzes"
                checked={options.includeQuizzes}
                onCheckedChange={(checked) => onOptionsChange({ includeQuizzes: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="publish-immediately">Publish Immediately</Label>
                <p className="text-sm text-gray-500">Make course available to students</p>
              </div>
              <Switch
                id="publish-immediately"
                checked={options.publishImmediately}
                onCheckedChange={(checked) => onOptionsChange({ publishImmediately: checked })}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video Integration</CardTitle>
          </CardHeader>
          <CardContent>
            <Label>Video Integration Method</Label>
            <RadioGroup
              value={options.videoIntegration}
              onValueChange={(value) => onOptionsChange({ videoIntegration: value as any })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="embed" id="embed" />
                <Label htmlFor="embed">Embed Video (Recommended)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="link" id="link" />
                <Label htmlFor="link">External Link</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="external_tool" id="external_tool" />
                <Label htmlFor="external_tool">External Tool</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      </div>
      
      {options.includeQuizzes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quiz Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="multiple-attempts">Allow Multiple Attempts</Label>
              <Switch
                id="multiple-attempts"
                checked={options.quizSettings.allowMultipleAttempts}
                onCheckedChange={(checked) => 
                  onOptionsChange({ 
                    quizSettings: { ...options.quizSettings, allowMultipleAttempts: checked }
                  })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-answers">Show Correct Answers</Label>
              <Switch
                id="show-answers"
                checked={options.quizSettings.showCorrectAnswers}
                onCheckedChange={(checked) => 
                  onOptionsChange({ 
                    quizSettings: { ...options.quizSettings, showCorrectAnswers: checked }
                  })
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="shuffle-answers">Shuffle Answer Options</Label>
              <Switch
                id="shuffle-answers"
                checked={options.quizSettings.shuffleAnswers}
                onCheckedChange={(checked) => 
                  onOptionsChange({ 
                    quizSettings: { ...options.quizSettings, shuffleAnswers: checked }
                  })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CourseStructureStep({ 
  options, 
  onOptionsChange, 
  course, 
  segments 
}: {
  options: CanvasExportOptions;
  onOptionsChange: (updates: Partial<CanvasExportOptions>) => void;
  course: any;
  segments: any[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module Organization</CardTitle>
          <CardDescription>
            Choose how to organize your course content in Canvas modules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={options.moduleStructure}
            onValueChange={(value) => onOptionsChange({ moduleStructure: value as any })}
          >
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="segments" id="segments" />
                  <Label htmlFor="segments" className="font-medium">
                    Segment-based Modules (Recommended)
                  </Label>
                </div>
                <p className="text-sm text-gray-500 mt-2 ml-6">
                  Create {segments.length} modules, one for each video segment. Each module contains the segment video and its questions.
                </p>
              </div>
              
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="linear" id="linear" />
                  <Label htmlFor="linear" className="font-medium">
                    Linear Structure
                  </Label>
                </div>
                <p className="text-sm text-gray-500 mt-2 ml-6">
                  Create a single module with all content in sequence: video first, then comprehensive quiz.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Course Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-3">{course.title}</h4>
            
            {options.moduleStructure === 'segments' ? (
              <div className="space-y-2">
                {segments.map((segment, index) => (
                  <div key={index} className="bg-white rounded p-3 border">
                    <div className="font-medium text-sm">
                      Module {index + 1}: {segment.title || `Segment ${index + 1}`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {options.includeVideos && '📹 Video'} 
                      {options.includeVideos && options.includeQuizzes && ' • '}
                      {options.includeQuizzes && `📝 Quiz (${segment.questions.length} questions)`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="bg-white rounded p-3 border">
                  <div className="font-medium text-sm">Module 1: {course.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {options.includeVideos && '📹 Full Video'} 
                    {options.includeVideos && options.includeQuizzes && ' • '}
                    {options.includeQuizzes && `📝 Comprehensive Quiz (${segments.reduce((acc, seg) => acc + seg.questions.length, 0)} questions)`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewExportStep({ 
  course, 
  segments, 
  canvasConfig, 
  exportOptions, 
  validationResult,
  isExporting,
  exportProgress,
  exportStatus,
  exportSuccess,
  canvasCourseUrl,
  onExport
}: {
  course: any;
  segments: any[];
  canvasConfig: CanvasConfig;
  exportOptions: CanvasExportOptions;
  validationResult?: { isValid: boolean; warnings: string[]; errors: string[] };
  isExporting: boolean;
  exportProgress: number;
  exportStatus: string;
  exportSuccess: boolean;
  canvasCourseUrl?: string;
  onExport: () => void;
}) {
  const totalQuestions = segments.reduce((acc, seg) => acc + seg.questions.length, 0);
  
  if (isExporting || exportSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
          exportSuccess ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {exportSuccess ? (
            <CheckCircle className="w-8 h-8 text-green-600" />
          ) : (
            <Upload className="w-8 h-8 text-blue-600" />
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {exportSuccess ? 'Export Completed!' : 'Exporting to Canvas'}
          </h3>
          <p className="text-gray-600">{exportStatus}</p>
        </div>
        
        {!exportSuccess && (
          <div className="max-w-md mx-auto">
            <Progress value={exportProgress} className="mb-2" />
            <p className="text-sm text-gray-500">{Math.round(exportProgress)}% complete</p>
          </div>
        )}
        
        {exportSuccess && canvasCourseUrl && (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your course has been successfully exported to Canvas!
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => window.open(canvasCourseUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Canvas
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // This will be passed from parent component
                  window.location.reload(); // Simple solution for now
                }}
              >
                Export Another Course
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Canvas Instance:</span>
              <p className="font-medium">{canvasConfig.canvasUrl}</p>
            </div>
            <div>
              <span className="text-gray-500">Course Structure:</span>
              <p className="font-medium capitalize">{exportOptions.moduleStructure}</p>
            </div>
            <div>
              <span className="text-gray-500">Video Segments:</span>
              <p className="font-medium">{segments.length}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Questions:</span>
              <p className="font-medium">{totalQuestions}</p>
            </div>
            <div>
              <span className="text-gray-500">Video Integration:</span>
              <p className="font-medium capitalize">{exportOptions.videoIntegration}</p>
            </div>
            <div>
              <span className="text-gray-500">Publish Status:</span>
              <p className="font-medium">{exportOptions.publishImmediately ? 'Published' : 'Draft'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Export cannot proceed due to errors:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {validationResult.warnings.length > 0 && (
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Warnings (export can still proceed):</div>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            
            {validationResult.isValid && validationResult.warnings.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Course validation passed! Ready to export to Canvas.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What will be created in Canvas?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>New Canvas course: "{course.title}"</span>
            </div>
            
            {exportOptions.includeVideos && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Video content pages with embedded YouTube player</span>
              </div>
            )}
            
            {exportOptions.includeQuizzes && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Interactive quizzes with {totalQuestions} questions</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>
                {exportOptions.moduleStructure === 'segments' ? segments.length : 1} course modules
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Course syllabus with learning objectives</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}