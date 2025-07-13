import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, ArrowUpDown, Clock } from 'lucide-react';

interface SequencingItem {
  id: string;
  content: string;
  originalIndex: number;
}

interface SequencingQuestionProps {
  question: string;
  items: string[];
  explanation: string;
  onAnswer: (isCorrect: boolean, userOrder: string[]) => void;
  showAnswer?: boolean;
  disabled?: boolean;
}

const SequencingQuestion: React.FC<SequencingQuestionProps> = ({
  question,
  items,
  explanation,
  onAnswer,
  showAnswer = false,
  disabled = false
}) => {
  // Create sequencing items with shuffled order
  const [sequencingItems] = useState<SequencingItem[]>(() => {
    const shuffled = [...items]
      .map((item, index) => ({ id: `item-${index}`, content: item, originalIndex: index }))
      .sort(() => Math.random() - 0.5);
    return shuffled;
  });

  const [userOrder, setUserOrder] = useState<SequencingItem[]>(sequencingItems);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [draggedItem, setDraggedItem] = useState<SequencingItem | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Generic start handler for both mouse and touch
  const handleDragStart = (clientX: number, clientY: number, item: SequencingItem, index: number) => {
    if (disabled || isSubmitted) return;
    
    console.log('🔄 Drag start on:', item.content, 'at index:', index);
    setDraggedItem(item);
    setDraggedFromIndex(index);
    setIsDragging(true);
    setMousePosition({ x: clientX, y: clientY });
  };

  // Generic move handler for both mouse and touch
  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !draggedItem || draggedFromIndex === null) return;
    
    setMousePosition({ x: clientX, y: clientY });
    
    // Find which item we're currently over
    const elements = document.querySelectorAll('[data-sequencing-item]');
    let hoverIndex = -1;
    
    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        hoverIndex = index;
      }
    });
    
    // If we're over a different item, reorder immediately
    if (hoverIndex !== -1 && hoverIndex !== draggedFromIndex) {
      console.log('🔄 Live reorder: moving from', draggedFromIndex, 'to', hoverIndex);
      
      const newOrder = [...userOrder];
      const [movedItem] = newOrder.splice(draggedFromIndex, 1);
      newOrder.splice(hoverIndex, 0, movedItem);
      
      setUserOrder(newOrder);
      setDraggedFromIndex(hoverIndex); // Update the current position
      
      console.log('🔄 New live order:', newOrder.map(item => item.content));
    }
  };

  // Generic end handler for both mouse and touch
  const handleDragEnd = () => {
    if (!isDragging) return;
    
    console.log('🔄 Drag end - finalizing');
    setDraggedItem(null);
    setDraggedFromIndex(null);
    setIsDragging(false);
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, item: SequencingItem, index: number) => {
    handleDragStart(e.clientX, e.clientY, item, index);
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    handleDragEnd();
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent, item: SequencingItem, index: number) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY, item, index);
    // Prevent scrolling while dragging
    e.preventDefault();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
    // Prevent scrolling while dragging
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    handleDragEnd();
    e.preventDefault();
  };

  // Global mouse and touch move/end handlers
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
        // Prevent scrolling while dragging
        e.preventDefault();
      }
    };

    const handleGlobalTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    if (isDragging) {
      // Add mouse event listeners
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      // Add touch event listeners
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
      document.addEventListener('touchcancel', handleGlobalTouchEnd);
    }

    return () => {
      // Remove mouse event listeners
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      
      // Remove touch event listeners
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('touchcancel', handleGlobalTouchEnd);
    };
  }, [isDragging, draggedItem, draggedFromIndex, userOrder]);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (disabled || isSubmitted) return;
    
    const newOrder = [...userOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    
    setUserOrder(newOrder);
  };

  const handleSubmit = () => {
    if (disabled || isSubmitted) return;
    
    setIsSubmitted(true);
    
    // Check if user order matches correct order
    const isCorrect = userOrder.every((item, index) => item.originalIndex === index);
    const userOrderContent = userOrder.map(item => item.content);
    
    onAnswer(isCorrect, userOrderContent);
  };

  const getItemStyle = (item: SequencingItem, index: number): string => {
    let baseClass = "p-4 border-2 rounded-lg transition-all duration-200 min-h-[60px] flex items-center justify-between bg-background relative select-none";
    
    if (disabled || isSubmitted) {
      baseClass += " cursor-default";
    } else {
      baseClass += " cursor-move touch-none";
    }

    // Add drag state styling
    if (draggedItem?.id === item.id) {
      baseClass += " opacity-50 scale-95 z-10";
    }

    // Add answer state styling
    if (showAnswer || isSubmitted) {
      const isCorrectPosition = item.originalIndex === index;
              if (isCorrectPosition) {
          baseClass += " border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:border-green-800 dark:text-green-200";
        } else {
          baseClass += " border-red-200 bg-red-50 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-200";
        }
    } else {
      // Normal state styling when not being dragged
      if (draggedItem?.id !== item.id) {
        baseClass += " bg-background border-border hover:bg-muted/50 hover:border-primary/50 cursor-pointer";
      } else {
        // Item being dragged - use primary color like selected state
        baseClass += " border-primary bg-primary/10";
      }
    }

    return baseClass;
  };

  const getPositionIcon = (index: number) => {
    if (!showAnswer && !isSubmitted) return null;
    
    const item = userOrder[index];
    const isCorrectPosition = item.originalIndex === index;
    
    return isCorrectPosition 
      ? <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
      : <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
  };

  const canSubmit = userOrder.length === items.length && !isSubmitted;

  return (
    <Card className="w-full max-w-4xl mx-auto border-2 border-primary shadow-2xl animate-pulse-border">
      <CardHeader className="relative">
        <div className="absolute -top-3 -right-3 flex items-center gap-2">
          <div className="animate-pulse">
            <div className="h-3 w-3 bg-primary rounded-full" />
          </div>
          <Badge className="bg-primary text-primary-foreground">Answer to Continue</Badge>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-primary animate-pulse" />
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/50">
            Interactive Sequencing Question
          </Badge>
        </div>
        <CardTitle className="text-xl font-bold">{question}</CardTitle>
        <CardDescription className="text-base font-medium">
          🔄 Drag and drop the items to arrange them in the correct chronological order
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span>Arrange in Order</span>
            <Badge variant="secondary" className="text-xs">{userOrder.length} items</Badge>
          </h4>
          
          <div 
            className="space-y-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
          >
            {userOrder.map((item, index) => (
              <div
                key={item.id}
                className={`relative ${getItemStyle(item, index)}`}
                data-sequencing-item
                onMouseDown={(e) => handleMouseDown(e, item, index)}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={(e) => handleTouchStart(e, item, index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm bg-muted px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="flex-1">{item.content}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {getPositionIcon(index)}
                  {!isSubmitted && !showAnswer && (
                    <div className="flex gap-2 md:flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(index, Math.max(0, index - 1))}
                        disabled={index === 0 || disabled}
                        className="h-8 w-8 md:h-6 md:w-6 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(index, Math.min(userOrder.length - 1, index + 1))}
                        disabled={index === userOrder.length - 1 || disabled}
                        className="h-8 w-8 md:h-6 md:w-6 p-0"
                      >
                        ↓
                      </Button>
                    </div>
                  )}
                </div>
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
              Submit Sequence
            </Button>
          </div>
        )}

        {/* Answer State */}
        {(showAnswer || isSubmitted) && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {userOrder.every((item, index) => item.originalIndex === index) ? (
                                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm mb-2 text-gray-900 dark:text-gray-100">
                  {userOrder.every((item, index) => item.originalIndex === index)
                    ? 'Perfect sequence!' 
                    : 'Sequence needs adjustment'}
                </p>
                                  <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">{explanation}</p>
                
                {/* Show correct sequence */}
                <div className="text-sm">
                                      <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">Correct sequence:</p>
                  <div className="space-y-1">
                    {items.map((item, index) => (
                                              <div key={index} className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200">
                          <span className="font-medium bg-muted px-2 py-1 rounded">
                            {index + 1}
                          </span>
                          <span className="text-gray-800 dark:text-gray-200">{item}</span>
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
          <div className="mt-6 text-sm text-gray-700 dark:text-gray-300 bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
                              <ArrowUpDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">How to sequence:</span>
            </div>
                          <ul className="space-y-1 text-xs text-gray-800 dark:text-gray-200">
                <li>• <strong className="text-gray-900 dark:text-gray-100">Drag & Drop:</strong> Touch and drag items on mobile or click and drag on desktop</li>
                <li>• <strong className="text-gray-900 dark:text-gray-100">Arrow Buttons:</strong> Use ↑ ↓ buttons to move items up or down</li>
              <li>• Items rearrange instantly as you drag over different positions</li>
              <li>• Submit when the sequence is in correct chronological order</li>
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
          <div className="p-2 bg-primary/10 border-2 border-primary rounded-lg shadow-lg max-w-xs">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-primary" />
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

export default SequencingQuestion; 