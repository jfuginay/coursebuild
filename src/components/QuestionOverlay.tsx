import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play } from 'lucide-react';
import HotspotQuestion from '@/components/visual/HotspotQuestion';
import MatchingQuestion from '@/components/visual/MatchingQuestion';

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[] | string; // Can be array or JSON string
  correct_answer: string | number;
  explanation: string;
  timestamp: number;
  visual_context?: string;
  frame_url?: string;
  bounding_boxes?: any[];
  detected_objects?: any[];
  visual_asset_id?: string;
  matching_pairs?: any[];
  has_visual_asset?: boolean;
  visual_question_type?: string;
}

interface QuestionOverlayProps {
  question: Question;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
  isVisible: boolean;
}

export default function QuestionOverlay({ 
  question, 
  onAnswer, 
  onContinue, 
  isVisible 
}: QuestionOverlayProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!isVisible) return null;

  // Handle visual question types
  if (question.type === 'hotspot' && question.frame_url && question.bounding_boxes) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <HotspotQuestion
            question={question.question}
            imageUrl={question.frame_url}
            altText={question.visual_context || 'Interactive hotspot question'}
            boundingBoxes={question.bounding_boxes.map((box, index) => ({
              id: box.id || `box-${index}`,
              label: box.label || 'Element',
              x: box.x || 0,
              y: box.y || 0,
              width: box.width || 0.1,
              height: box.height || 0.1,
              isCorrectAnswer: box.is_correct_answer || false,
              confidenceScore: box.confidence_score || 0.5
            }))}
            explanation={question.explanation}
            onAnswer={(isCorrect) => {
              onAnswer(isCorrect);
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

  if (question.type === 'matching' && question.matching_pairs) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto">
          <MatchingQuestion
            question={question.question}
            pairs={question.matching_pairs.map((pair, index) => {
              // Handle different pair formats from the API
              if (typeof pair.left === 'string' && typeof pair.right === 'string') {
                // Simple string format
                return {
                  id: `pair-${index}`,
                  left: {
                    id: `left-${index}`,
                    content: pair.left,
                    type: 'text' as const
                  },
                  right: {
                    id: `right-${index}`,
                    content: pair.right,
                    type: 'text' as const
                  }
                };
              } else if (pair.visual && pair.match) {
                // Visual matching format from demo-targeted-visual
                return {
                  id: `pair-${index}`,
                  left: {
                    id: `left-${index}`,
                    content: pair.visual,
                    type: pair.bbox ? 'frame_crop' as const : 'text' as const,
                    imageUrl: pair.bbox && question.frame_url ? question.frame_url : undefined
                  },
                  right: {
                    id: `right-${index}`,
                    content: pair.match,
                    type: 'text' as const
                  }
                };
              } else {
                // Default fallback
                return {
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
                };
              }
            })}
            explanation={question.explanation}
            onAnswer={(isCorrect) => {
              onAnswer(isCorrect);
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

  const handleAnswerSelect = (optionIndex: number) => {
    if (hasAnswered) return;
    
    setSelectedAnswer(optionIndex);
    setHasAnswered(true);
    setShowExplanation(true);
    
    // Determine correct answer index with proper error handling
    let correctIndex: number;
    if (typeof question.correct_answer === 'string') {
      const parsed = parseInt(question.correct_answer);
      correctIndex = isNaN(parsed) ? 0 : parsed;
    } else if (typeof question.correct_answer === 'number') {
      correctIndex = question.correct_answer;
    } else {
      // Fallback for undefined or null
      correctIndex = 0;
    }
    
    const isCorrect = optionIndex === correctIndex;
    onAnswer(isCorrect);
  };

  const handleContinue = () => {
    setSelectedAnswer(null);
    setHasAnswered(false);
    setShowExplanation(false);
    onContinue();
  };

  // Helper function to get correct answer index consistently
  const getCorrectAnswerIndex = (correct_answer: string | number): number => {
    if (typeof correct_answer === 'string') {
      const parsed = parseInt(correct_answer);
      return isNaN(parsed) ? 0 : parsed;
    } else if (typeof correct_answer === 'number') {
      return correct_answer;
    } else {
      return 0;
    }
  };
  
  const correctIndex = getCorrectAnswerIndex(question.correct_answer);

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle case where no options are available
  if (parsedOptions.length === 0) {
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Interactive Question</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {formatTimestamp(question.timestamp)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-lg font-medium mb-4">{question.question}</p>
            
            <div className="space-y-3">
              {parsedOptions.map((option, index) => {
                let buttonClass = "w-full text-left p-4 rounded-lg border transition-all duration-200 ";
                
                if (hasAnswered) {
                  if (index === correctIndex) {
                    buttonClass += "bg-green-50 border-green-200 text-green-800";
                  } else if (index === selectedAnswer && index !== correctIndex) {
                    buttonClass += "bg-red-50 border-red-200 text-red-800";
                  } else {
                    buttonClass += "bg-muted/50 border-border opacity-60";
                  }
                } else {
                  buttonClass += "bg-background border-border hover:bg-muted/50 cursor-pointer";
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={hasAnswered}
                    className={buttonClass}
                  >
                    <div className="flex items-center">
                      {hasAnswered && index === correctIndex && (
                        <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      )}
                      {hasAnswered && index === selectedAnswer && index !== correctIndex && (
                        <XCircle className="h-4 w-4 mr-2 text-red-600" />
                      )}
                      <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                      <span>{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {showExplanation && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                {selectedAnswer === correctIndex ? (
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                )}
                <span className="font-medium">
                  {selectedAnswer === correctIndex ? 'Correct!' : 'Incorrect'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{question.explanation}</p>
            </div>
          )}

          {hasAnswered && (
            <div className="flex justify-end">
              <Button onClick={handleContinue} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Continue Video
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 