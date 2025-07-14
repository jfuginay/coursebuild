import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Play, ThumbsUp, ThumbsDown } from 'lucide-react';
import VideoOverlayQuestion from '@/components/visual/VideoOverlayQuestion';
import MatchingQuestion from '@/components/visual/MatchingQuestion';
import SequencingQuestion from '@/components/visual/SequencingQuestion';
import { useAuth } from '@/contexts/AuthContext';
import { parseCorrectAnswer, isAnswerCorrect } from '@/utils/questionHelpers';

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
  courseId?: string; // For progress tracking
  segmentIndex?: number; // For progress tracking
  isInline?: boolean; // Render inline instead of as overlay
  onAuthRequired?: () => void; // Callback when authentication is required
  freeQuestionsRemaining?: number; // Number of free questions left for unauthenticated users
}

export default function QuestionOverlay({ 
  question, 
  onAnswer, 
  onContinue, 
  isVisible,
  player,
  courseId,
  segmentIndex,
  isInline = false,
  onAuthRequired,
  freeQuestionsRemaining
}: QuestionOverlayProps) {
  const { user, supabase } = useAuth();
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [rating, setRating] = useState<number>(0); // 0 = no rating, 1 = thumbs up, -1 = thumbs down
  const ratingRef = useRef<number>(0); // Store immediate rating value to avoid async state issues
  const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 50) => {
    let timer: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };
  
  // Debounced function to commit rating changes to state
  const commitRating = useCallback(
    debounce((newRating: number) => {
      setRating(newRating);
    }, 50),
    []
  );
  
  // Toggle thumb rating and update both ref and state
  const toggleThumb = useCallback((thumbValue: -1 | 1) => {
    const newRating = ratingRef.current === thumbValue ? 0 : thumbValue;
    ratingRef.current = newRating;
    commitRating(newRating);
  }, [commitRating]);
  
  
  // Define trackProgress function before it's used
  const trackProgress = async (questionAnswered: boolean, isCorrect: boolean) => {
    if (!user || !supabase || !courseId || segmentIndex === undefined) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/user/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          courseId,
          segmentIndex,
          segmentTitle: `Segment ${segmentIndex + 1}`,
          questionId: question.id,
          selectedAnswer: selectedAnswer,
          isCorrect,
          timeSpent: 0, // Default to 0 since we're not tracking start time here
          explanationViewed: showExplanation
        })
      });
    } catch (error) {
      console.error('Failed to track progress:', error);
    }
  };

  // Handle skipping a question
  const handleSkip = async () => {
    // Check if user needs to authenticate (same as handleSubmit)
    if (!user && freeQuestionsRemaining !== undefined && freeQuestionsRemaining <= 0) {
      if (onAuthRequired) {
        onAuthRequired();
        return;
      }
    }

    // If user is authenticated, try to save the skip to database
    if (user && supabase && question.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Mirror handleSubmit functionality with comprehensive data
          const skipPayload = {
            course_id: courseId,
            question_id: question.id,
            selected_answer: null, // No answer selected
            response_text: 'skipped',
            is_correct: null, // Skipped questions have null correctness
            points_earned: 0,
            max_points: 1,
            is_skipped: true,
            attempt_number: 1,
            is_final_attempt: true,
            response_time_ms: null, // Could track time if needed
            rating: ratingRef.current // Use ref to get immediate value
          };
          
          console.log('🚀 Frontend sending SKIP data:', {
            is_skipped: skipPayload.is_skipped,
            rating: skipPayload.rating,
            ratingState: rating,
            ratingRef: ratingRef.current,
            question_id: skipPayload.question_id,
            course_id: skipPayload.course_id
          });
          
          await fetch('/api/user-question-responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(skipPayload)
          });

          // Track progress for authenticated users
          await trackProgress(true, false); // Track as answered but incorrect
        }
      } catch (error) {
        console.error('Failed to record skipped question:', error);
        // Don't return here - still allow continuing even if tracking fails
      }
    }

    // Always allow skipping regardless of authentication status
    setHasAnswered(true);
    setShowExplanation(false); // Don't show explanation for skipped questions
    onAnswer(false, 'skipped');
    onContinue();
  };

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
      hasValidBoundingBoxes: hasValidBoundingBoxes,
      isInline: isInline
    });
    
    // Video overlay questions always need to be overlaid on the video, even when isInline is true
    return (
      <div className="fixed inset-0 z-50">
        {/* Dim overlay to focus attention - no blur for video overlay questions */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none animate-fade-in" />
        
        {/* Question UI positioned at bottom - not covering video */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-auto animate-slide-up">
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
              onAnswer={async (isCorrect, selectedBox) => {
                const selectedAnswer = selectedBox ? `${selectedBox.label || 'Element'} (${selectedBox.x}, ${selectedBox.y})` : 'hotspot-interaction';
                onAnswer(isCorrect, selectedAnswer);
                setHasAnswered(true);
                setShowExplanation(true);
                await trackProgress(true, isCorrect);
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
            {!hasAnswered && (
              <div className="mt-4 flex justify-between items-center">
                <Button variant="outline" onClick={handleSkip}>
                  Skip Question
                </Button>
                <div></div>
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
    
    const matchingContent = (
      <div className="w-full">
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
          onAnswer={async (isCorrect, userMatches) => {
            console.log('🎯 Matching question answered:', { isCorrect, questionId: question.id });
            const selectedAnswer = userMatches ? JSON.stringify(userMatches) : 'matching-answer';
            onAnswer(isCorrect, selectedAnswer);
            setHasAnswered(true);
            setShowExplanation(true);
            await trackProgress(true, isCorrect);
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
        {!hasAnswered && (
          <div className="mt-4 flex justify-between items-center">
            <Button variant="outline" onClick={handleSkip}>
              Skip Question
            </Button>
            <div></div>
          </div>
        )}
      </div>
    );

    if (isInline) {
      return matchingContent;
    }

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-4xl mx-auto animate-scale-in">
          {matchingContent}
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
    
    const sequencingContent = (
      <div className="w-full">
        <SequencingQuestion
          question={question.question}
          items={question.sequence_items}
          explanation={question.explanation}
          onAnswer={async (isCorrect, userOrder) => {
            console.log('🎯 Sequencing question answered:', { isCorrect, questionId: question.id });
            const selectedAnswer = userOrder ? userOrder.join(' → ') : 'sequencing-answer';
            onAnswer(isCorrect, selectedAnswer);
            setHasAnswered(true);
            setShowExplanation(true);
            await trackProgress(true, isCorrect);
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
        {!hasAnswered && (
          <div className="mt-4 flex justify-between items-center">
            <Button variant="outline" onClick={handleSkip}>
              Skip Question
            </Button>
            <div></div>
          </div>
        )}
      </div>
    );

    if (isInline) {
      return sequencingContent;
    }

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-4xl mx-auto animate-scale-in">
          {sequencingContent}
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

  const handleSubmit = async () => {
    if (selectedAnswer === null) return;

    // Check if user needs to authenticate
    if (!user && freeQuestionsRemaining !== undefined && freeQuestionsRemaining <= 0) {
      if (onAuthRequired) {
        onAuthRequired();
        return;
      }
    }

    // Use the helper function to parse correct_answer properly
    const correctIndex = question.correct !== undefined 
      ? question.correct 
      : parseCorrectAnswer(question.correct_answer, question.type);

    const correct = selectedAnswer === correctIndex;
    setIsCorrect(correct);
    setShowExplanation(true);
    setHasAnswered(true);
    
    // Send the response with rating to the API
    if (user && supabase && question.id) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const selectedAnswerText = finalOptions[selectedAnswer] || `Option ${selectedAnswer + 1}`;
          const submitPayload = {
            course_id: courseId,
            question_id: question.id,
            selected_answer: selectedAnswer,
            response_text: selectedAnswerText,
            is_correct: correct,
            points_earned: correct ? 1 : 0,
            max_points: 1,
            is_skipped: false,
            attempt_number: 1,
            is_final_attempt: true,
            response_time_ms: null,
            rating: ratingRef.current // Use ref to get immediate value
          };
          
          console.log('🚀 Frontend sending SUBMIT data:', {
            is_skipped: submitPayload.is_skipped,
            rating: submitPayload.rating,
            ratingState: rating,
            ratingRef: ratingRef.current,
            question_id: submitPayload.question_id,
            course_id: submitPayload.course_id,
            is_correct: submitPayload.is_correct,
            selected_answer: submitPayload.selected_answer
          });
          
          await fetch('/api/user-question-responses', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(submitPayload)
          });
        }
      } catch (error) {
        console.error('Failed to record question response:', error);
      }
    }
    
    await trackProgress(true, correct);
    // Pass the selected answer text
    const selectedAnswerText = finalOptions[selectedAnswer] || `Option ${selectedAnswer + 1}`;
    onAnswer(correct, selectedAnswerText);
  };

  const handleContinue = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsCorrect(false);
    setHasAnswered(false);
    setRating(0); // Reset rating for next question
    ratingRef.current = 0; // Reset ref as well
    onContinue();
  };

  const correctIndex = question.correct !== undefined 
    ? question.correct 
    : parseCorrectAnswer(question.correct_answer, question.type);

  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle hotspot questions without player (fallback)
  if (question.type === 'hotspot' && !player && (hasValidBoundingBoxes || hasValidDetectedObjects)) {
    console.log('🔍 Hotspot question detected but no player available - showing error with continue option');
    const hotspotErrorCard = (
      <Card className={isInline ? "w-full" : "w-full max-w-2xl mx-auto border-2 border-primary/50 shadow-xl"}>
        <CardHeader className="relative">
          <div className="absolute -top-3 -right-3 flex items-center gap-2">
            <div className="animate-pulse">
              <div className="h-3 w-3 bg-primary rounded-full" />
            </div>
            <Badge className="bg-primary text-primary-foreground">Answer to Continue</Badge>
          </div>
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
    );

    if (isInline) {
      return hotspotErrorCard;
    }

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {hotspotErrorCard}
      </div>
    );
  }

  // Handle case where no options are available
  if (finalOptions.length === 0) {
    const errorCard = (
      <Card className={isInline ? "w-full" : "w-full max-w-2xl mx-auto border-2 border-primary/50 shadow-xl"}>
        <CardHeader className="relative">
          <div className="absolute -top-3 -right-3 flex items-center gap-2">
            <div className="animate-pulse">
              <div className="h-3 w-3 bg-primary rounded-full" />
            </div>
            <Badge className="bg-primary text-primary-foreground">Answer to Continue</Badge>
          </div>
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
    );

    if (isInline) {
      return errorCard;
    }

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        {errorCard}
      </div>
    );
  }

  // Standard multiple choice / true-false question UI
  const questionCard = (
    <Card className={isInline ? "w-full relative" : "w-full max-w-2xl mx-auto relative"}>
      <CardContent className="space-y-6 pt-6">
        {/* Show free questions remaining banner for unauthenticated users */}
        {!user && freeQuestionsRemaining !== undefined && freeQuestionsRemaining > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-center">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {freeQuestionsRemaining} free {freeQuestionsRemaining === 1 ? 'question' : 'questions'} remaining. Sign up to access all course content!
            </p>
          </div>
        )}
        
        <div>
          <p className="text-lg font-medium mb-4">{question.question}</p>
          
          <div className="space-y-3">
            {finalOptions.map((option, index) => {
              const isThisCorrect = index === correctIndex;
              const isSelected = selectedAnswer === index;
              
              let buttonClass = "w-full text-left p-4 rounded-lg border transition-all duration-200 ";
              
              if (showExplanation) {
                if (isThisCorrect) {
                  buttonClass += "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200";
                } else if (isSelected && !isThisCorrect) {
                  buttonClass += "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200";
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

        <div className="flex justify-between items-center gap-3 pt-4">
          <div className="flex gap-3">
            {!showExplanation && (
              <Button variant="outline" onClick={handleSkip}>
                Skip Question
              </Button>
            )}
          </div>
          
          {/* Rating buttons positioned at the bottom center */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleThumb(1)}
              className={`p-2 rounded-lg transition-colors ${
                rating === 1 
                  ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="Thumbs up"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => toggleThumb(-1)}
              className={`p-2 rounded-lg transition-colors ${
                rating === -1 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400' 
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
              title="Thumbs down"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex gap-3">
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
        </div>
      </CardContent>
    </Card>
  );

  // Return inline or overlay based on isInline prop
  if (isInline) {
    return questionCard;
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="animate-scale-in">
        {questionCard}
      </div>
    </div>
  );
}