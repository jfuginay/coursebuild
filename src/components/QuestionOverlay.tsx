import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id?: string;
  question: string;
  options: string[];
  correct: number;
  correct_answer?: string | number;
  explanation: string;
  timestamp: number;
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
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  if (!isVisible) return null;

  const handleAnswerSelect = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    // Handle both formats: correct as index or correct_answer as value
    const correctIndex = question.correct !== undefined ? question.correct : 
                        question.correct_answer !== undefined ? 
                        (typeof question.correct_answer === 'number' ? 
                          question.correct_answer : 
                          parseInt(question.correct_answer as string)) : 0;

    const correct = selectedAnswer === correctIndex;
    setIsCorrect(correct);
    setShowExplanation(true);
    onAnswer(correct);
  };

  const handleContinue = () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setIsCorrect(false);
    onContinue();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Time to Test Your Knowledge!</CardTitle>
          <CardDescription>
            Answer this question to continue watching the video
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <h3 className="text-lg font-medium">
            {question.question}
          </h3>

          <div className="space-y-3">
            {question.options && question.options.length > 0 ? (
              question.options.map((option, index) => {
                const correctIndex = question.correct !== undefined ? question.correct : 
                                    question.correct_answer !== undefined ? 
                                    (typeof question.correct_answer === 'number' ? 
                                      question.correct_answer : 
                                      parseInt(question.correct_answer as string)) : 0;

                const isThisCorrect = index === correctIndex;
                const isSelected = selectedAnswer === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showExplanation}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      showExplanation && isThisCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                        : showExplanation && isSelected && !isThisCorrect
                        ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                        : isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
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
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>This question type is not yet supported in preview mode.</p>
                <p className="text-sm mt-2">Please continue to the next question.</p>
              </div>
            )}
          </div>

          {showExplanation && (
            <Alert className={isCorrect ? 'border-blue-500' : 'border-red-500'}>
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
              question.options && question.options.length > 0 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                >
                  Submit Answer
                </Button>
              ) : (
                <Button onClick={() => {
                  setShowExplanation(true);
                  onAnswer(false); // Count as incorrect for unsupported question types
                }}>
                  Continue
                </Button>
              )
            ) : (
              <Button onClick={handleContinue}>
                Continue Watching
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 