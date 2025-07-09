import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play } from 'lucide-react';
import VideoOverlayQuestion from '@/components/visual/VideoOverlayQuestion';
import MatchingQuestion from '@/components/visual/MatchingQuestion';
import SequencingQuestion from '@/components/visual/SequencingQuestion';

interface Question {
  id?: string;
  question: string;
  type: string;
  options?: string[] | string; // Can be array or JSON string
  correct?: number; // Legacy support from feature branch
  correct_answer: number; // Index for multiple choice, 1/0 for true/false
  explanation: string;
  timestamp: number;
  visual_context?: string;
  frame_timestamp?: number; // For video overlay timing
  bounding_boxes?: any[];
  detected_objects?: any[];
  matching_pairs?: any[];
  sequence_items?: string[];
  requires_video_overlay?: boolean;
  video_overlay?: boolean;
}

interface QuestionOverlayProps {
  question: Question;
  onAnswer: (correct: boolean, selectedAnswer?: string) => void;
  onContinue: () => void;
  isVisible: boolean;
  player?: any; // YouTube player instance
}

export default function QuestionOverlay({ 
  question, 
  onAnswer, 
  onContinue, 
  isVisible,
  player 
}: QuestionOverlayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  if (!isVisible) return null;

  // Debug logging for all questions
  console.log('🎯 QuestionOverlay received question:', {
    id: question.id,
    type: question.type,
    hasOptions: !!question.options,
    optionsLength: Array.isArray(question.options) ? question.options.length : 'not array',
    hasBoundingBoxes: !!question.bounding_boxes,
    boundingBoxCount: question.bounding_boxes?.length || 0,
    hasDetectedObjects: !!question.detected_objects,
    detectedObjectsCount: question.detected_objects?.length || 0,
    hasFrameTimestamp: !!question.frame_timestamp,
    hasPlayer: !!player,
    requiresVideoOverlay: question.requires_video_overlay
  });

  // Handle video overlay questions - check for bounding boxes and video overlay capability
  const hasValidBoundingBoxes = question.bounding_boxes && question.bounding_boxes.length > 0;
  const hasValidDetectedObjects = question.detected_objects && question.detected_objects.length > 0;
  const isVideoOverlayQuestion = question.requires_video_overlay || 
    (hasValidBoundingBoxes && question.frame_timestamp) ||
    (question.type === 'hotspot' && (hasValidBoundingBoxes || hasValidDetectedObjects)); // Only show hotspot if it has interactive elements

  // Log if hotspot question is being filtered out
  if (question.type === 'hotspot' && !hasValidBoundingBoxes && !hasValidDetectedObjects) {
    console.warn('⚠️ Invalid hotspot question reached component - this should have been filtered at API level:', {
      questionId: question.id,
      boundingBoxCount: question.bounding_boxes?.length || 0,
      detectedObjectsCount: question.detected_objects?.length || 0
    });
    return null;
  }
  
  if (isVideoOverlayQuestion && player) {
    console.log('🎬 Rendering video overlay question:', {
      questionId: question.id,
      frameTimestamp: question.frame_timestamp,
      boundingBoxCount: question.bounding_boxes?.length || 0,
      timestamp: question.timestamp,
      type: question.type,
      isHotspot: question.type === 'hotspot',
      requiresVideoOverlay: question.requires_video_overlay,
      hasValidBoundingBoxes: hasValidBoundingBoxes
    });
    
    return (
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Question UI positioned at bottom - not covering video */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto">
          <div className="max-w-4xl mx-auto">
            <VideoOverlayQuestion
              question={question.question}
              frameTimestamp={question.frame_timestamp || question.timestamp}
              boundingBoxes={(question.bounding_boxes || []).map((box, index) => ({
                id: box.id || `box-${index}`,
                label: box.label || 'Element',
                x: box.x || 0,
                y: box.y || 0,
                width: box.width || 0.1,
                height: box.height || 0.1,
                isCorrectAnswer: box.isCorrectAnswer || false,
                confidenceScore: box.confidenceScore || 0.5
              }))}
              explanation={question.explanation}
              player={player}
              onAnswer={(isCorrect, selectedBox) => {
                const selectedAnswer = selectedBox ? `${selectedBox.label || 'Element'} (${selectedBox.x}, ${selectedBox.y})` : 'hotspot-interaction';
                onAnswer(isCorrect, selectedAnswer);
                setHasAnswered(true);
                setShowExplanation(true);
              }}
              showAnswer={hasAnswered}
              disabled={hasAnswered}
            />
            {hasAnswered && (
              <div className="mt-4 flex justify-center">
                <Button onClick={onContinue} className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Continue Video
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle matching questions
  if (question.matching_pairs && question.matching_pairs.length > 0) {
    console.log('🔗 Rendering matching question:', {
      questionId: question.id,
      matchingPairs: question.matching_pairs,
      pairsCount: question.matching_pairs.length
    });
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <MatchingQuestion
            question={question.question}
            pairs={question.matching_pairs.map((pair, index) => ({
              id: `pair-${index}`,
              left: {
                id: `left-${index}`,
                content: pair.left || 'Item',
                type: 'text' as const
              },
              right: {
                id: `right-${index}`,
                content: pair.right || 'Match',
                type: 'text' as const
              }
            }))}
            explanation={question.explanation}
            onAnswer={(isCorrect, userMatches) => {
              console.log('🎯 Matching question answered:', { isCorrect, questionId: question.id });
              const selectedAnswer = userMatches ? JSON.stringify(userMatches) : 'matching-answer';
              onAnswer(isCorrect, selectedAnswer);
              setHasAnswered(true);
              setShowExplanation(true);
            }}
            showAnswer={hasAnswered}
            disabled={hasAnswered}
          />
          {hasAnswered && (
            <div className="mt-4 flex justify-center">
              <Button onClick={onContinue} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Continue Video
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle sequencing questions
  if (question.sequence_items && question.sequence_items.length > 0) {
    console.log('🔄 Rendering sequencing question:', {
      questionId: question.id,
      sequenceItems: question.sequence_items,
      itemsCount: question.sequence_items.length
    });
    
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <SequencingQuestion
            question={question.question}
            items={question.sequence_items}
            explanation={question.explanation}
            onAnswer={(isCorrect, userOrder) => {
              console.log('🎯 Sequencing question answered:', { isCorrect, questionId: question.id });
              const selectedAnswer = userOrder ? userOrder.join(' → ') : 'sequencing-answer';
              onAnswer(isCorrect, selectedAnswer);
              setHasAnswered(true);
              setShowExplanation(true);
            }}
            showAnswer={hasAnswered}
            disabled={hasAnswered}
          />
          {hasAnswered && (
            <div className="mt-4 flex justify-center">
              <Button onClick={onContinue} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Continue Video
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Parse options - handle both array and JSON string formats
  const parseOptions = (options: string[] | string): string[] => {
    if (Array.isArray(options)) {
      return options;
    }
    
    if (typeof options === 'string') {
      try {
        const parsed = JSON.parse(options);
        return Array.isArray(parsed) ? parsed : [options];
      } catch (e) {
        // If parsing fails, treat as a single option
        return [options];
      }
    }
    
    return [];
  };

  const parsedOptions = parseOptions(question.options || []);
  
  // Handle true/false questions that might not have options set
  const finalOptions = parsedOptions.length === 0 && (question.type === 'true-false' || question.type === 'true_false') 
    ? ['True', 'False'] 
    : parsedOptions;

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    // Handle both formats: correct as index or correct_answer as value
    // Support legacy 'correct' field from feature branch
    const correctIndex = question.correct !== undefined ? question.correct : 
                        question.correct_answer !== undefined ? 
                        (typeof question.correct_answer === 'number' ? 
                          question.correct_answer : 
                          parseInt(question.correct_answer as string)) : 0;

    const correct = selectedAnswer === correctIndex;
    setIsCorrect(correct);
    setShowExplanation(true);
    setHasAnswered(true);
    
    // Pass the selected answer text
    const selectedAnswerText = finalOptions[selectedAnswer] || `Option ${selectedAnswer + 1}`;
    onAnswer(correct, selectedAnswerText);
  };

  const handleContinue = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsCorrect(false);
    setHasAnswered(false);
    onContinue();
  };

  const correctIndex = question.correct !== undefined ? question.correct : question.correct_answer;

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle hotspot questions without player (fallback)
  if (question.type === 'hotspot' && !player && (hasValidBoundingBoxes || hasValidDetectedObjects)) {
    console.log('🔍 Hotspot question detected but no player available - showing error with continue option');
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Hotspot Question</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {formatTimestamp(question.timestamp)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg font-medium mb-4">{question.question}</p>
              <p className="text-sm text-muted-foreground">
                This is a hotspot question that requires video interaction. Please ensure the video player is loaded.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={onContinue} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Continue Video
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle case where no options are available
  if (finalOptions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Question Error</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {formatTimestamp(question.timestamp)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg font-medium mb-4">{question.question}</p>
              <p className="text-sm text-muted-foreground">
                No answer options available for this question.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleContinue} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Continue Video
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Standard multiple choice / true-false question UI
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Time to Test Your Knowledge!</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {formatTimestamp(question.timestamp)}
            </Badge>
          </div>
          <CardDescription>
            Answer this question to continue watching the video
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-lg font-medium mb-4">{question.question}</p>
            
            <div className="space-y-3">
              {finalOptions.map((option, index) => {
                const isThisCorrect = index === correctIndex;
                const isSelected = selectedAnswer === index;
                
                let buttonClass = "w-full text-left p-4 rounded-lg border transition-all duration-200 ";
                
                if (showExplanation) {
                  if (isThisCorrect) {
                    buttonClass += "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800";
                  } else if (isSelected && !isThisCorrect) {
                    buttonClass += "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800";
                  } else {
                    buttonClass += "bg-muted/50 border-border opacity-60";
                  }
                } else {
                  if (isSelected) {
                    buttonClass += "border-primary bg-primary/10";
                  } else {
                    buttonClass += "bg-background border-border hover:bg-muted/50 cursor-pointer hover:border-primary/50";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                    className={buttonClass}
                  >
                    <div className="flex items-center justify-between">
                      <span>{option}</span>
                      {showExplanation && isThisCorrect && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {showExplanation && isSelected && !isThisCorrect && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {showExplanation && (
            <Alert className={`${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
              <AlertDescription>
                <strong className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                  {isCorrect ? 'Correct!' : 'Not quite right.'}
                </strong>
                <p className="mt-2">{question.explanation}</p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3 pt-4">
            {!showExplanation ? (
              <Button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleContinue} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Continue Watching
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}