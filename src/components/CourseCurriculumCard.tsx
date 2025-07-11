import React from 'react';
import { Lock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';

interface Question {
  id: string;
  question: string;
  type: string;
  options: string[];
  correct: number;
  explanation: string;
  timestamp: number;
  correct_answer: number;
  visual_context?: string;
  frame_timestamp?: number;
  bounding_boxes?: any[];
  detected_objects?: any[];
  matching_pairs?: any[];
  requires_video_overlay?: boolean;
  video_overlay?: boolean;
  bounding_box_count?: number;
}

interface Segment {
  title: string;
  timestamp: string;
  timestampSeconds: number;
  concepts: string[];
  questions: Question[];
}

interface CourseData {
  title: string;
  description: string;
  duration: string;
  videoId: string;
  segments: Segment[];
}

interface CourseCurriculumCardProps {
  courseData: CourseData;
  answeredQuestions: Set<string>;
  questionResults: Record<string, boolean>;
  expandedExplanations: Set<string>;
  setExpandedExplanations: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowLoginModal: React.Dispatch<React.SetStateAction<boolean>>;
  freeQuestionsLimit: number;
  formatTimestamp: (seconds: number) => string;
}

export default function CourseCurriculumCard({
  courseData,
  answeredQuestions,
  questionResults,
  expandedExplanations,
  setExpandedExplanations,
  setShowLoginModal,
  freeQuestionsLimit,
  formatTimestamp,
}: CourseCurriculumCardProps) {
  const { user } = useAuth();
  
  // Get all questions for progress calculation
  const getAllQuestions = () => {
    return courseData.segments.flatMap(segment => segment.questions);
  };

  const allQuestions = getAllQuestions();

  if (courseData.segments.length === 0) {
    return null;
  }

  return (
    <Card id="course-curriculum">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Course Curriculum</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {user 
              ? `Full Access • ${answeredQuestions.size}/${allQuestions.length} completed`
              : `${Math.min(answeredQuestions.size, freeQuestionsLimit)} of ${freeQuestionsLimit} free questions`
            }
          </Badge>
        </div>
        <CardDescription>
          {user 
            ? "Watch the video and answer questions as they appear"
            : "Complete questions to reveal the curriculum"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {courseData.segments.flatMap((segment, segmentIndex) => 
            segment.questions.map((question, questionIndex) => {
              const questionId = `${segmentIndex}-${questionIndex}`;
              const isAnswered = answeredQuestions.has(questionId);
              const isCorrect = questionResults[questionId];
              const isExpanded = expandedExplanations.has(questionId);
              const globalQuestionIndex = courseData.segments
                .slice(0, segmentIndex)
                .reduce((acc, seg) => acc + seg.questions.length, 0) + questionIndex;
              // If user is logged in, all questions are free. If not, use the limit.
              const isFreeQuestion = user ? true : globalQuestionIndex < freeQuestionsLimit;
              const isLocked = !isFreeQuestion;

              return (
                <div
                  key={questionId}
                  className={`relative p-4 rounded-lg border transition-all ${
                    isAnswered 
                      ? isCorrect 
                        ? 'bg-green-50 border-green-200 text-green-900' 
                        : 'bg-red-50 border-red-200 text-red-900'
                      : isLocked
                      ? 'bg-muted/30 border-muted'
                      : 'bg-background border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {isAnswered ? (
                        isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )
                      ) : isLocked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(question.timestamp)}
                        </span>
                        {isAnswered && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isCorrect 
                                ? 'bg-green-100 text-green-800 border-green-300' 
                                : 'bg-red-100 text-red-800 border-red-300'
                            }`}
                          >
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </Badge>
                        )}
                        {isLocked && (
                          <Badge variant="outline" className="text-xs">
                            Premium
                          </Badge>
                        )}
                      </div>
                      
                      <div className={`text-sm ${isLocked && !isAnswered ? 'relative' : ''}`}>
                        {isAnswered ? (
                          <>
                            <p className={`font-medium ${
                              isCorrect 
                                ? 'text-green-900' 
                                : 'text-red-900'
                            }`}>
                              {question.question}
                            </p>
                            {isAnswered && (
                              <button
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedExplanations(prev => {
                                      const next = new Set(prev);
                                      next.delete(questionId);
                                      return next;
                                    });
                                  } else {
                                    setExpandedExplanations(prev => new Set(prev).add(questionId));
                                  }
                                }}
                                className="text-xs text-primary hover:underline mt-1"
                              >
                                {isExpanded ? 'Hide' : 'Show'} explanation
                              </button>
                            )}
                            {isExpanded && (
                              <div className={`mt-2 p-3 rounded-md border ${
                                isCorrect 
                                  ? 'bg-green-50/70 border-green-200' 
                                  : 'bg-red-50/70 border-red-200'
                              }`}>
                                <p className={`text-sm ${
                                  isCorrect 
                                    ? 'text-green-800' 
                                    : 'text-red-800'
                                }`}>
                                  {question.explanation}
                                </p>
                              </div>
                            )}
                          </>
                        ) : isLocked ? (
                          <>
                            <p className="font-medium blur-sm select-none">
                              {question.question}
                            </p>
                            <button
                              onClick={() => setShowLoginModal(true)}
                              className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px] rounded hover:bg-background/60 transition-colors"
                            >
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                <span className="underline">Sign up to unlock</span>
                              </div>
                            </button>
                          </>
                        ) : (
                          <p className="text-muted-foreground italic">
                            Complete the video to reveal this question
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {!user && allQuestions.length > freeQuestionsLimit && (
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  🎓 Unlock {allQuestions.length - freeQuestionsLimit} more questions
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Get full access to all course content
                </p>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowLoginModal(true)}
              >
                Sign Up
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 