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

  const handleMouseDown = (e: React.MouseEvent, item: SequencingItem, index: number) => {
    if (disabled || isSubmitted) return;
    
    console.log('🔄 Mouse down on:', item.content, 'at index:', index);
    setDraggedItem(item);
    setDraggedFromIndex(index);
    setIsDragging(true);
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // Prevent text selection and other default behaviors
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedItem || draggedFromIndex === null) return;
    
    setMousePosition({ x: e.clientX, y: e.clientY });
    
    // Find which item we're currently over
    const elements = document.querySelectorAll('[data-sequencing-item]');
    let hoverIndex = -1;
    
    elements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
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

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    console.log('🔄 Mouse up - finalizing drag');
    setDraggedItem(null);
    setDraggedFromIndex(null);
    setIsDragging(false);
  };

  // Global mouse move and up handlers
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !draggedItem || draggedFromIndex === null) return;
      
      setMousePosition({ x: e.clientX, y: e.clientY });
      
      // Find which item we're currently over
      const elements = document.querySelectorAll('[data-sequencing-item]');
      let hoverIndex = -1;
      
      elements.forEach((element, index) => {
        const rect = element.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
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

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        console.log('🔄 Global mouse up - finalizing drag');
        setDraggedItem(null);
        setDraggedFromIndex(null);
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
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
    let baseClass = "p-4 border-2 rounded-lg transition-all duration-200 min-h-[60px] flex items-center justify-between bg-white relative";
    
    if (disabled || isSubmitted) {
      baseClass += " cursor-default";
    } else {
      baseClass += " cursor-move";
    }

    // Add drag state styling
    if (draggedItem?.id === item.id) {
      baseClass += " opacity-50 scale-95 z-10";
    }

    // Add answer state styling
    if (showAnswer || isSubmitted) {
      const isCorrectPosition = item.originalIndex === index;
      if (isCorrectPosition) {
        baseClass += " border-green-500 bg-green-50 text-green-800";
      } else {
        baseClass += " border-red-500 bg-red-50 text-red-800";
      }
    } else {
      // Normal state styling when not being dragged
      if (draggedItem?.id !== item.id) {
        baseClass += " border-gray-300 text-gray-800 hover:border-gray-400 hover:bg-gray-50";
      }
    }

    return baseClass;
  };

  const getPositionIcon = (index: number) => {
    if (!showAnswer && !isSubmitted) return null;
    
    const item = userOrder[index];
    const isCorrectPosition = item.originalIndex === index;
    
    return isCorrectPosition 
      ? <CheckCircle className="w-4 h-4 text-green-600" />
      : <XCircle className="w-4 h-4 text-red-600" />;
  };

  const canSubmit = userOrder.length === items.length && !isSubmitted;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            Sequencing Question
          </Badge>
        </div>
        <CardTitle>{question}</CardTitle>
        <CardDescription>
          Drag and drop the items to arrange them in the correct chronological order.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
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
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm bg-gray-100 px-2 py-1 rounded">
                      {index + 1}
                    </span>
                    <ArrowUpDown className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="flex-1">{item.content}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {getPositionIcon(index)}
                  {!isSubmitted && !showAnswer && (
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(index, Math.max(0, index - 1))}
                        disabled={index === 0 || disabled}
                        className="h-6 w-6 p-0"
                      >
                        ↑
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => moveItem(index, Math.min(userOrder.length - 1, index + 1))}
                        disabled={index === userOrder.length - 1 || disabled}
                        className="h-6 w-6 p-0"
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
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {userOrder.every((item, index) => item.originalIndex === index) ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm mb-2 text-gray-900">
                  {userOrder.every((item, index) => item.originalIndex === index)
                    ? 'Perfect sequence!' 
                    : 'Sequence needs adjustment'}
                </p>
                <p className="text-sm text-gray-800 mb-3">{explanation}</p>
                
                {/* Show correct sequence */}
                <div className="text-sm">
                  <p className="font-medium text-gray-900 mb-2">Correct sequence:</p>
                  <div className="space-y-1">
                    {items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-gray-800">
                        <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <span className="text-gray-800">{item}</span>
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
          <div className="mt-6 text-sm text-gray-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpDown className="w-4 h-4 text-orange-600" />
              <span className="font-medium text-gray-900">How to sequence:</span>
            </div>
            <ul className="space-y-1 text-xs text-gray-800">
              <li>• <strong className="text-gray-900">Live Drag:</strong> Click and drag items to reorder them in real-time</li>
              <li>• <strong className="text-gray-900">Arrow Buttons:</strong> Use ↑ ↓ buttons to move items up or down</li>
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
          <div className="p-2 bg-blue-100 border-2 border-blue-500 rounded-lg shadow-lg max-w-xs">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 truncate">
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