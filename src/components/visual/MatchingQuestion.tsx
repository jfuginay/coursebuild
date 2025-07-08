import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Move, Shuffle } from 'lucide-react';

interface MatchingItem {
  id: string;
  content: string;
  imageUrl?: string;
  altText?: string;
  type: 'text' | 'image' | 'frame_crop';
}

interface MatchingPair {
  id: string;
  left: MatchingItem;
  right: MatchingItem;
}

interface MatchingQuestionProps {
  question: string;
  pairs: MatchingPair[];
  explanation: string;
  onAnswer: (isCorrect: boolean, userMatches: { [key: string]: string }) => void;
  showAnswer?: boolean;
  disabled?: boolean;
}

const MatchingQuestion: React.FC<MatchingQuestionProps> = ({
  question,
  pairs,
  explanation,
  onAnswer,
  showAnswer = false,
  disabled = false
}) => {
  const [leftItems] = useState(pairs.map(p => p.left));
  const [rightItems] = useState(pairs.map(p => p.right).sort(() => Math.random() - 0.5));
  const [userMatches, setUserMatches] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [draggedItem, setDraggedItem] = useState<MatchingItem | null>(null);
  const [draggedFromSide, setDraggedFromSide] = useState<'left' | 'right' | null>(null);

  const handleDragStart = (item: MatchingItem, side: 'left' | 'right') => {
    if (disabled || isSubmitted) return;
    
    setDraggedItem(item);
    setDraggedFromSide(side);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetItem: MatchingItem, targetSide: 'left' | 'right') => {
    if (!draggedItem || !draggedFromSide || targetSide === draggedFromSide || disabled || isSubmitted) {
      return;
    }

    const newMatches = { ...userMatches };
    
    if (draggedFromSide === 'left' && targetSide === 'right') {
      // Remove any existing match for this left item
      Object.keys(newMatches).forEach(key => {
        if (newMatches[key] === draggedItem.id) {
          delete newMatches[key];
        }
      });
      // Add new match
      newMatches[targetItem.id] = draggedItem.id;
    } else if (draggedFromSide === 'right' && targetSide === 'left') {
      // Remove any existing match for this right item
      delete newMatches[draggedItem.id];
      // Add new match
      newMatches[draggedItem.id] = targetItem.id;
    }

    setUserMatches(newMatches);
    setDraggedItem(null);
    setDraggedFromSide(null);
  };

  const handleSubmit = () => {
    if (disabled || isSubmitted) return;
    
    setIsSubmitted(true);
    
    // Check if all pairs are matched correctly
    const correctPairs = pairs.reduce((acc, pair) => {
      acc[pair.right.id] = pair.left.id;
      return acc;
    }, {} as { [key: string]: string });

    const isCorrect = Object.keys(correctPairs).every(
      rightId => userMatches[rightId] === correctPairs[rightId]
    ) && Object.keys(userMatches).length === pairs.length;

    onAnswer(isCorrect, userMatches);
  };

  const getItemStyle = (item: MatchingItem, side: 'left' | 'right'): string => {
    let baseClass = "p-3 border-2 rounded-lg cursor-move transition-all duration-200 min-h-[80px] flex items-center justify-center text-center";
    
    if (disabled || isSubmitted) {
      baseClass += " cursor-default";
    }

    if (showAnswer || isSubmitted) {
      const isCorrectlyMatched = side === 'left' 
        ? Object.values(userMatches).includes(item.id)
        : userMatches[item.id] !== undefined;
      
      if (isCorrectlyMatched) {
        const correctMatch = side === 'left'
          ? pairs.find(p => p.left.id === item.id)?.right.id
          : pairs.find(p => p.right.id === item.id)?.left.id;
        
        const userMatch = side === 'left'
          ? Object.keys(userMatches).find(key => userMatches[key] === item.id)
          : userMatches[item.id];
        
        if (correctMatch === userMatch) {
          baseClass += " border-green-500 bg-green-50 text-green-800";
        } else {
          baseClass += " border-red-500 bg-red-50 text-red-800";
        }
      } else {
        baseClass += " border-gray-300 bg-gray-50 text-gray-600";
      }
    } else {
      const isMatched = side === 'left' 
        ? Object.values(userMatches).includes(item.id)
        : userMatches[item.id] !== undefined;
      
      if (isMatched) {
        baseClass += " border-blue-500 bg-blue-50 text-blue-800";
      } else {
        baseClass += " border-gray-300 bg-white text-gray-800 hover:border-blue-400 hover:bg-blue-50";
      }
    }

    return baseClass;
  };

  const renderItem = (item: MatchingItem) => {
    if (item.type === 'image' || item.type === 'frame_crop') {
      return (
        <div className="flex flex-col items-center gap-2">
          <img 
            src={item.imageUrl} 
            alt={item.altText || item.content}
            className="w-16 h-16 object-cover rounded"
          />
          <span className="text-sm">{item.content}</span>
        </div>
      );
    }
    
    return <span>{item.content}</span>;
  };

  const getMatchIndicator = (item: MatchingItem, side: 'left' | 'right') => {
    if (!showAnswer && !isSubmitted) return null;
    
    const isCorrectlyMatched = side === 'left' 
      ? Object.values(userMatches).includes(item.id)
      : userMatches[item.id] !== undefined;
    
    if (!isCorrectlyMatched) return null;
    
    const correctMatch = side === 'left'
      ? pairs.find(p => p.left.id === item.id)?.right.id
      : pairs.find(p => p.right.id === item.id)?.left.id;
    
    const userMatch = side === 'left'
      ? Object.keys(userMatches).find(key => userMatches[key] === item.id)
      : userMatches[item.id];
    
    return correctMatch === userMatch 
      ? <CheckCircle className="w-4 h-4 text-green-600 absolute -top-1 -right-1" />
      : <XCircle className="w-4 h-4 text-red-600 absolute -top-1 -right-1" />;
  };

  const canSubmit = Object.keys(userMatches).length === pairs.length && !isSubmitted;

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Move className="w-5 h-5 text-purple-600" />
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Matching Question
          </Badge>
        </div>
        <CardTitle>{question}</CardTitle>
        <CardDescription>
          Drag items from the left column to match them with the correct items on the right.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span>Items to Match</span>
              <Badge variant="secondary" className="text-xs">{leftItems.length}</Badge>
            </h4>
            {leftItems.map((item) => (
              <div 
                key={item.id}
                className={`relative ${getItemStyle(item, 'left')}`}
                draggable={!disabled && !isSubmitted}
                onDragStart={() => handleDragStart(item, 'left')}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(item, 'left')}
              >
                {renderItem(item)}
                {getMatchIndicator(item, 'left')}
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span>Match Targets</span>
              <Badge variant="secondary" className="text-xs">{rightItems.length}</Badge>
            </h4>
            {rightItems.map((item) => (
              <div 
                key={item.id}
                className={`relative ${getItemStyle(item, 'right')}`}
                draggable={!disabled && !isSubmitted}
                onDragStart={() => handleDragStart(item, 'right')}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(item, 'right')}
              >
                {renderItem(item)}
                {getMatchIndicator(item, 'right')}
                
                {/* Match Connection Line */}
                {userMatches[item.id] && (
                  <div className="absolute -left-4 top-1/2 transform -translate-y-1/2">
                    <div className="w-3 h-0.5 bg-blue-500"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        {!isSubmitted && !showAnswer && (
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit || disabled}
              className="px-8"
            >
              Submit Matches
            </Button>
          </div>
        )}

        {/* Answer State */}
        {(showAnswer || isSubmitted) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {Object.keys(userMatches).length === pairs.length && 
                 pairs.every(pair => userMatches[pair.right.id] === pair.left.id) ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm mb-2">
                  {Object.keys(userMatches).length === pairs.length && 
                   pairs.every(pair => userMatches[pair.right.id] === pair.left.id)
                    ? 'All matches correct!' 
                    : 'Some matches are incorrect'}
                </p>
                <p className="text-sm text-gray-700 mb-3">{explanation}</p>
                
                {/* Show correct answers */}
                <div className="text-sm">
                  <p className="font-medium text-gray-700 mb-2">Correct matches:</p>
                  <div className="space-y-1">
                    {pairs.map((pair) => (
                      <div key={pair.id} className="flex items-center gap-2 text-xs">
                        <span className="font-medium">{pair.left.content}</span>
                        <span className="text-gray-500">→</span>
                        <span>{pair.right.content}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isSubmitted && !showAnswer && (
          <div className="mt-6 text-sm text-gray-600 bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4 text-purple-600" />
              <span>Drag and drop items between columns to create matches. Submit when all items are paired.</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchingQuestion; 