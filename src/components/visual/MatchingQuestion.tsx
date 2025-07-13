import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Move, Shuffle, Link2, ArrowRight } from 'lucide-react';

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
  const [selectedItem, setSelectedItem] = useState<{item: MatchingItem, side: 'left' | 'right'} | null>(null);
  const [itemPositions, setItemPositions] = useState<{ [key: string]: { top: number, left: number, width: number, height: number } }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredItem, setHoveredItem] = useState<{item: MatchingItem, side: 'left' | 'right'} | null>(null);

  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate match colors for visual distinction
  const matchColors = [
    'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-950/20 dark:border-blue-600 dark:text-blue-200',
    'bg-green-100 border-green-500 text-green-800 dark:bg-green-950/20 dark:border-green-600 dark:text-green-200', 
    'bg-purple-100 border-purple-500 text-purple-800 dark:bg-purple-950/20 dark:border-purple-600 dark:text-purple-200',
    'bg-orange-100 border-orange-500 text-orange-800 dark:bg-orange-950/20 dark:border-orange-600 dark:text-orange-200',
    'bg-pink-100 border-pink-500 text-pink-800 dark:bg-pink-950/20 dark:border-pink-600 dark:text-pink-200',
    'bg-cyan-100 border-cyan-500 text-cyan-800 dark:bg-cyan-950/20 dark:border-cyan-600 dark:text-cyan-200',
    'bg-amber-100 border-amber-500 text-amber-800 dark:bg-amber-950/20 dark:border-amber-600 dark:text-amber-200',
    'bg-indigo-100 border-indigo-500 text-indigo-800 dark:bg-indigo-950/20 dark:border-indigo-600 dark:text-indigo-200'
  ];

  const matchLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // Update item positions for drawing connection lines
  useEffect(() => {
    const updatePositions = () => {
      const newPositions: { [key: string]: { top: number, left: number, width: number, height: number } } = {};
      
      [...leftItems, ...rightItems].forEach(item => {
        const element = document.getElementById(`item-${item.id}`);
        if (element && containerRef.current) {
          const rect = element.getBoundingClientRect();
          const containerRect = containerRef.current.getBoundingClientRect();
          newPositions[item.id] = {
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            width: rect.width,
            height: rect.height
          };
        }
      });
      
      setItemPositions(newPositions);
    };

    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, [leftItems, rightItems, userMatches]);

  // Generic drag handlers for both mouse and touch
  const handleDragStart = (clientX: number, clientY: number, item: MatchingItem, side: 'left' | 'right') => {
    if (disabled || isSubmitted) return;
    
    console.log('🔄 Drag start on:', item.content, 'from', side);
    setDraggedItem(item);
    setDraggedFromSide(side);
    setIsDragging(true);
    setMousePosition({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !draggedItem || !draggedFromSide) return;
    
    setMousePosition({ x: clientX, y: clientY });
    
    // Find which item we're currently over
    const elements = document.querySelectorAll('[data-matching-item]');
    let foundHover = false;
    
    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && 
          clientY >= rect.top && clientY <= rect.bottom) {
        const itemId = element.getAttribute('data-item-id');
        const itemSide = element.getAttribute('data-item-side') as 'left' | 'right';
        
        // Find the actual item object
        const item = itemSide === 'left' 
          ? leftItems.find(i => i.id === itemId)
          : rightItems.find(i => i.id === itemId);
        
        if (item && itemSide !== draggedFromSide) {
          setHoveredItem({ item, side: itemSide });
          foundHover = true;
        }
      }
    });
    
    if (!foundHover) {
      setHoveredItem(null);
    }
  };

  const handleDragEnd = () => {
    if (!isDragging || !draggedItem || !draggedFromSide) return;
    
    console.log('🔄 Drag end - finalizing');
    
    // If we're hovering over a valid target, create the match
    if (hoveredItem && hoveredItem.side !== draggedFromSide) {
      createMatch(draggedItem, draggedFromSide, hoveredItem.item, hoveredItem.side);
    }
    
    setDraggedItem(null);
    setDraggedFromSide(null);
    setIsDragging(false);
    setHoveredItem(null);
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, item: MatchingItem, side: 'left' | 'right') => {
    handleDragStart(e.clientX, e.clientY, item, side);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handleDragEnd();
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent, item: MatchingItem, side: 'left' | 'right') => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY, item, side);
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleDragEnd();
    e.preventDefault();
  };

  // Global mouse and touch event handlers
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
        e.preventDefault();
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    if (isDragging) {
      // Mouse events
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      // Touch events
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      document.addEventListener('touchcancel', handleGlobalTouchEnd);
    }

    return () => {
      // Mouse events
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      
      // Touch events
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isDragging, draggedItem, draggedFromSide, hoveredItem]);

  const handleClick = (item: MatchingItem, side: 'left' | 'right') => {
    if (disabled || isSubmitted || isDragging) return;

    if (!selectedItem) {
      // First click - select item
      setSelectedItem({ item, side });
    } else if (selectedItem.item.id === item.id && selectedItem.side === side) {
      // Clicking same item - deselect
      setSelectedItem(null);
    } else if (selectedItem.side === side) {
      // Clicking different item on same side - change selection
      setSelectedItem({ item, side });
    } else {
      // Clicking item on different side - create match
      createMatch(selectedItem.item, selectedItem.side, item, side);
      setSelectedItem(null);
    }
  };

  const createMatch = (sourceItem: MatchingItem, sourceSide: 'left' | 'right', targetItem: MatchingItem, targetSide: 'left' | 'right') => {
    const newMatches = { ...userMatches };
    
    if (sourceSide === 'left' && targetSide === 'right') {
      // Remove any existing match for this left item
      Object.keys(newMatches).forEach(key => {
        if (newMatches[key] === sourceItem.id) {
          delete newMatches[key];
        }
      });
      // Add new match: right item ID -> left item ID
      newMatches[targetItem.id] = sourceItem.id;
    } else if (sourceSide === 'right' && targetSide === 'left') {
      // Remove any existing match for this right item
      delete newMatches[sourceItem.id];
      // Add new match: right item ID -> left item ID
      newMatches[sourceItem.id] = targetItem.id;
    }

    setUserMatches(newMatches);
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

  const getMatchIndex = (leftItemId: string, rightItemId: string): number => {
    return Object.keys(userMatches).findIndex(rightId => 
      userMatches[rightId] === leftItemId && rightId === rightItemId
    );
  };

  const getMatchColor = (leftItemId: string, rightItemId: string): string => {
    const matchIndex = getMatchIndex(leftItemId, rightItemId);
    return matchIndex >= 0 ? matchColors[matchIndex % matchColors.length] : '';
  };

  const getMatchLabel = (leftItemId: string, rightItemId: string): string => {
    const matchIndex = getMatchIndex(leftItemId, rightItemId);
    return matchIndex >= 0 ? matchLabels[matchIndex % matchLabels.length] : '';
  };

  const getItemStyle = (item: MatchingItem, side: 'left' | 'right'): string => {
    let baseClass = "p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 min-h-[80px] flex items-center justify-center text-center relative select-none touch-none";
    
    if (disabled || isSubmitted) {
      baseClass += " cursor-default";
    }

    // Add drag state styling
    if (draggedItem?.id === item.id && draggedFromSide === side) {
      baseClass += " opacity-50 scale-95 shadow-lg border-primary bg-primary/10";
    }

    // Add hover state when dragging
    if (hoveredItem?.item.id === item.id && hoveredItem?.side === side && draggedFromSide !== side) {
      baseClass += " border-primary bg-primary/10 shadow-lg ring-2 ring-primary/50 scale-105";
    }

    // Add selected state styling (for click-to-match)
    if (selectedItem?.item.id === item.id && selectedItem?.side === side && !isDragging) {
      baseClass += " border-primary bg-primary/10 shadow-lg ring-2 ring-primary/50";
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
          baseClass += " border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200 shadow-md";
        } else {
          baseClass += " border-red-200 bg-red-50 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200 shadow-md";
        }
      } else {
        baseClass += " border-gray-300 bg-gray-50 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400";
      }
    } else {
      // Check if this item is matched
      const matchedRightId = side === 'left' 
        ? Object.keys(userMatches).find(rightId => userMatches[rightId] === item.id)
        : undefined;
      const matchedLeftId = side === 'right' 
        ? userMatches[item.id]
        : undefined;
      
      if (matchedRightId || matchedLeftId) {
        const leftId = side === 'left' ? item.id : matchedLeftId!;
        const rightId = side === 'right' ? item.id : matchedRightId!;
        const colorClass = getMatchColor(leftId, rightId);
        baseClass += ` ${colorClass} shadow-md transform scale-105`;
      } else if (!hoveredItem || hoveredItem.item.id !== item.id) {
        baseClass += " bg-background border-border hover:bg-muted/50 hover:border-primary/50 hover:shadow-md";
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
          <span className="text-sm font-medium">{item.content}</span>
        </div>
      );
    }
    
    return <span className="font-medium">{item.content}</span>;
  };

  const getMatchIndicator = (item: MatchingItem, side: 'left' | 'right') => {
    // Always show match labels for active matches
    const matchedRightId = side === 'left' 
      ? Object.keys(userMatches).find(rightId => userMatches[rightId] === item.id)
      : undefined;
    const matchedLeftId = side === 'right' 
      ? userMatches[item.id]
      : undefined;
    
    if (matchedRightId || matchedLeftId) {
      const leftId = side === 'left' ? item.id : matchedLeftId!;
      const rightId = side === 'right' ? item.id : matchedRightId!;
      const label = getMatchLabel(leftId, rightId);
      
      if (label) {
        return (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white dark:bg-gray-800 border-2 border-current rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
            {label}
          </div>
        );
      }
    }

    // Show check/X for submitted answers
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
                ? <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full shadow-lg" />
          : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 absolute -top-2 -right-2 bg-white dark:bg-gray-800 rounded-full shadow-lg" />;
  };

  // Render connection lines between matched items
  const renderConnectionLines = () => {
    if (!containerRef.current) return null;

    return Object.keys(userMatches).map(rightItemId => {
      const leftItemId = userMatches[rightItemId];
      const leftPos = itemPositions[leftItemId];
      const rightPos = itemPositions[rightItemId];
      
      if (!leftPos || !rightPos) return null;

      const startX = leftPos.left + leftPos.width;
      const startY = leftPos.top + leftPos.height / 2;
      const endX = rightPos.left;
      const endY = rightPos.top + rightPos.height / 2;
      
      const label = getMatchLabel(leftItemId, rightItemId);
      const isCorrect = showAnswer || isSubmitted 
        ? pairs.some(p => p.left.id === leftItemId && p.right.id === rightItemId)
        : true;
      
      const lineColor = (showAnswer || isSubmitted) 
        ? (isCorrect ? '#10b981' : '#ef4444')  // green or red
        : '#3b82f6'; // blue for active matches

      return (
        <svg
          key={`${leftItemId}-${rightItemId}`}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10 }}
        >
          <defs>
            <marker
              id={`arrowhead-${leftItemId}-${rightItemId}`}
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={lineColor}
              />
            </marker>
          </defs>
          
          {/* Connection line */}
          <line
            x1={startX}
            y1={startY}
            x2={endX}
            y2={endY}
            stroke={lineColor}
            strokeWidth="3"
            strokeDasharray={isCorrect ? "none" : "5,5"}
            markerEnd={`url(#arrowhead-${leftItemId}-${rightItemId})`}
            className="drop-shadow-sm"
          />
          
          {/* Match label on the line */}
          {label && (
            <circle
              cx={(startX + endX) / 2}
              cy={(startY + endY) / 2}
              r="12"
              fill="white"
              stroke={lineColor}
              strokeWidth="2"
              className="drop-shadow-sm"
            />
          )}
          {label && (
            <text
              x={(startX + endX) / 2}
              y={(startY + endY) / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-xs font-bold"
              fill={lineColor}
            >
              {label}
            </text>
          )}
        </svg>
      );
    });
  };

  const canSubmit = Object.keys(userMatches).length === pairs.length && !isSubmitted;

  return (
    <Card className="w-full max-w-6xl mx-auto border-2 border-primary shadow-2xl animate-pulse-border">
      <CardHeader className="relative">
        <div className="absolute -top-3 -right-3 flex items-center gap-2">
          <div className="animate-pulse">
            <div className="h-3 w-3 bg-primary rounded-full" />
          </div>
          <Badge className="bg-primary text-primary-foreground">Answer to Continue</Badge>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-5 h-5 text-primary animate-pulse" />
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/50">
            Interactive Matching Question
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold">{question}</CardTitle>
        <CardDescription className="text-base font-medium">
          🔗 Connect related items by dragging between columns or clicking to select and match
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div ref={containerRef} className="relative">
          {/* Connection lines overlay */}
          {renderConnectionLines()}
          
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column */}
            <div ref={leftColumnRef} className="space-y-4">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <span>Items to Match</span>
              <Badge variant="secondary" className="text-xs">{leftItems.length}</Badge>
            </h4>
            {leftItems.map((item) => (
              <div 
                key={item.id}
                  id={`item-${item.id}`}
                  className={getItemStyle(item, 'left')}
                data-matching-item
                data-item-id={item.id}
                data-item-side="left"
                onMouseDown={(e) => handleMouseDown(e, item, 'left')}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={(e) => handleTouchStart(e, item, 'left')}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleClick(item, 'left')}
              >
                {renderItem(item)}
                {getMatchIndicator(item, 'left')}
              </div>
            ))}
          </div>

                    {/* Right Column */}
          <div ref={rightColumnRef} className="space-y-4">
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
              <span>Match Targets</span>
              <Badge variant="secondary" className="text-xs">{rightItems.length}</Badge>
            </h4>
            {rightItems.map((item) => (
              <div 
                key={item.id}
                  id={`item-${item.id}`}
                  className={getItemStyle(item, 'right')}
                data-matching-item
                data-item-id={item.id}
                data-item-side="right"
                onMouseDown={(e) => handleMouseDown(e, item, 'right')}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={(e) => handleTouchStart(e, item, 'right')}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={() => handleClick(item, 'right')}
              >
                {renderItem(item)}
                {getMatchIndicator(item, 'right')}
              </div>
            ))}
            </div>
          </div>
        </div>

        {/* Match Summary */}
        {Object.keys(userMatches).length > 0 && !isSubmitted && !showAnswer && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Current Matches ({Object.keys(userMatches).length}/{pairs.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.keys(userMatches).map(rightItemId => {
                const leftItemId = userMatches[rightItemId];
                const leftItem = leftItems.find(item => item.id === leftItemId);
                const rightItem = rightItems.find(item => item.id === rightItemId);
                const label = getMatchLabel(leftItemId, rightItemId);
                
                if (!leftItem || !rightItem) return null;
                
                return (
                  <div key={`${leftItemId}-${rightItemId}`} className="flex items-center gap-2 text-sm">
                    <div className="w-5 h-5 bg-blue-600 dark:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {label}
                    </div>
                    <span className="text-gray-800 dark:text-gray-200">{leftItem.content}</span>
                    <ArrowRight className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span className="text-gray-800 dark:text-gray-200">{rightItem.content}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {!isSubmitted && !showAnswer && (
          <div className="mt-6 flex justify-center">
            <Button 
              onClick={handleSubmit}
              disabled={!canSubmit || disabled}
              className="px-8 py-2"
              size="lg"
            >
              Submit Matches ({Object.keys(userMatches).length}/{pairs.length})
            </Button>
          </div>
        )}

        {/* Answer State */}
        {(showAnswer || isSubmitted) && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {Object.keys(userMatches).length === pairs.length && 
                 pairs.every(pair => userMatches[pair.right.id] === pair.left.id) ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">
                  {Object.keys(userMatches).length === pairs.length && 
                   pairs.every(pair => userMatches[pair.right.id] === pair.left.id)
                    ? 'All matches correct!' 
                    : 'Some matches are incorrect'}
                </p>
                <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">{explanation}</p>
                
                {/* Show correct answers */}
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Correct matches:</p>
                  <div className="space-y-2">
                    {pairs.map((pair, index) => (
                      <div key={pair.id} className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 bg-green-600 dark:bg-green-700 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {matchLabels[index]}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{pair.left.content}</span>
                        <ArrowRight className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-gray-800 dark:text-gray-200">{pair.right.content}</span>
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
          <div className="mt-6 text-sm bg-muted/50 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-3">
              <Shuffle className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">How to match:</span>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-bold">•</span>
                <span><strong>Drag & Drop:</strong> Touch and drag on mobile or click and drag on desktop to connect items</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-bold">•</span>
                <span><strong>Click to Match:</strong> Click an item to select it (cyan border), then click an item in the other column</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-bold">•</span>
                <span><strong>Visual Connections:</strong> Watch for colored arrows, match labels (A, B, C...), and connection lines</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground font-bold">•</span>
                <span>Submit when all {pairs.length} items are paired</span>
              </li>
            </ul>
          </div>
        )}
      </CardContent>

      {/* Ghost element that follows mouse during drag */}
      {isDragging && draggedItem && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 30,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="p-3 bg-primary/10 border-2 border-primary rounded-lg shadow-lg max-w-xs">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary truncate">
                {draggedItem.content}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default MatchingQuestion; 