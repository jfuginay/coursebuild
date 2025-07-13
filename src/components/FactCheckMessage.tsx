import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, ExternalLink, BookOpen, Quote } from 'lucide-react';

interface FactCheckResult {
  isCorrect: boolean;
  confidence: number;
  analysis: string;
  citations: Array<{
    url: string;
    title: string;
    quote?: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  actualAnswer?: string;
  userAnswerEvaluation?: string;
  supposedAnswerEvaluation?: string;
  userAnswerCorrect?: boolean;
  supposedAnswerCorrect?: boolean;
  nuances?: string;
  videoContext?: {
    title: string;
    summary: string;
  };
}

interface FactCheckMessageProps {
  result: FactCheckResult;
  question: string;
  supposedAnswer: string;
  userAnswer?: string;
}

export const FactCheckMessage: React.FC<FactCheckMessageProps> = ({ 
  result, 
  question, 
  supposedAnswer,
  userAnswer 
}) => {
  const { isCorrect, confidence, analysis, citations, actualAnswer, userAnswerEvaluation, supposedAnswerEvaluation, nuances, videoContext, supposedAnswerCorrect } = result;

  // Determine if the course's answer needs correction
  // Use supposedAnswerCorrect if available, otherwise check the evaluation text
  const courseAnswerNeedsCorrection = supposedAnswerCorrect !== undefined 
    ? !supposedAnswerCorrect 
    : (supposedAnswerEvaluation && (
        supposedAnswerEvaluation.toLowerCase().includes('incorrect') ||
        supposedAnswerEvaluation.toLowerCase().includes('wrong') ||
        supposedAnswerEvaluation.toLowerCase().includes('inaccurate')
      ));

  const getRelevanceBadgeVariant = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getRelevanceLabel = (relevance: string) => {
    switch (relevance) {
      case 'high': return 'Highly Relevant';
      case 'medium': return 'Relevant';
      case 'low': return 'Related';
      default: return relevance;
    }
  };

  return (
    <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
          {courseAnswerNeedsCorrection ? (
            <>
              <XCircle className="h-5 w-5 text-red-600" />
              Answer Needs Correction
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 text-green-600" />
              Answer Verified Online
            </>
          )}
          <Badge variant="outline" className="ml-auto">
            {Math.round(confidence * 100)}% Confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {videoContext && (
          <div className="bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 mt-0.5 text-purple-600" />
              <div>
                <h5 className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                  Video Context
                </h5>
                <p className="text-xs text-muted-foreground mt-1">
                  From: "{videoContext.title}"
                </p>
                {videoContext.summary && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {videoContext.summary}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        <div>
          <h4 className="font-semibold mb-2">Question:</h4>
          <p className="text-sm text-muted-foreground">{question}</p>
        </div>
        
        {userAnswer && userAnswer !== 'N/A' && (
          <div>
            <h4 className="font-semibold mb-2">Your Answer:</h4>
            <p className="text-sm text-muted-foreground">{userAnswer}</p>
          </div>
        )}
        
        <div>
          <h4 className="font-semibold mb-2">Course's Answer:</h4>
          <p className="text-sm text-muted-foreground">{supposedAnswer}</p>
        </div>

        {userAnswerEvaluation && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <h4 className="font-semibold mb-1 text-blue-800 dark:text-blue-200">
              Your Answer Assessment:
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">{userAnswerEvaluation}</p>
          </div>
        )}

        {supposedAnswerEvaluation && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <h4 className="font-semibold mb-1 text-purple-800 dark:text-purple-200">
              Course Answer Assessment:
            </h4>
            <p className="text-sm text-purple-700 dark:text-purple-300">{supposedAnswerEvaluation}</p>
          </div>
        )}

        {(!isCorrect || actualAnswer) && actualAnswer && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <h4 className="font-semibold mb-1 text-green-800 dark:text-green-200">
              Most Accurate Answer:
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">{actualAnswer}</p>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-2">Fact Check Analysis:</h4>
          <p className="text-sm whitespace-pre-wrap">{analysis}</p>
        </div>

        {nuances && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <h4 className="font-semibold mb-1 text-amber-800 dark:text-amber-200">
              Important Nuances:
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">{nuances}</p>
          </div>
        )}

        {citations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Verified Sources:</h4>
            <ul className="space-y-3">
              {citations.map((source, index) => (
                <li key={index} className="border-l-2 border-purple-200 dark:border-purple-700 pl-3">
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {source.title}
                        </a>
                        <Badge 
                          variant={getRelevanceBadgeVariant(source.relevance)} 
                          className="text-xs"
                        >
                          {getRelevanceLabel(source.relevance)}
                        </Badge>
                      </div>
                      {source.quote && (
                        <div className="flex items-start gap-1 text-xs text-muted-foreground italic">
                          <Quote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>"{source.quote}"</span>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              This fact check is based on web search results and the video's context. 
              Always consider the course material and instructor guidance as the primary source.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 