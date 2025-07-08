import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Eye, Target } from 'lucide-react';

interface BoundingBox {
  id: string;
  label: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
  isCorrectAnswer: boolean;
  confidenceScore: number;
}

interface HotspotQuestionProps {
  question: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText: string;
  boundingBoxes: BoundingBox[];
  explanation: string;
  onAnswer: (isCorrect: boolean, selectedBox?: BoundingBox) => void;
  showAnswer?: boolean;
  disabled?: boolean;
}

const HotspotQuestion: React.FC<HotspotQuestionProps> = ({
  question,
  imageUrl,
  thumbnailUrl,
  altText,
  boundingBoxes,
  explanation,
  onAnswer,
  showAnswer = false,
  disabled = false
}) => {
  const [selectedBox, setSelectedBox] = useState<BoundingBox | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track image loading and dimensions
  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete) {
      handleImageLoad();
    }
  }, [imageUrl]);

  const handleImageLoad = () => {
    if (imageRef.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      setImageDimensions({
        width: containerRect.width,
        height: containerRect.height
      });
      setImageLoaded(true);
      setImageError(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleBoxClick = (box: BoundingBox) => {
    if (disabled || isSubmitted) return;
    
    setSelectedBox(box);
    setIsSubmitted(true);
    
    const isCorrect = box.isCorrectAnswer;
    onAnswer(isCorrect, box);
  };

  const getBoundingBoxStyle = (box: BoundingBox): React.CSSProperties => {
    const container = containerRef.current;
    if (!container || !imageLoaded) return {};

    const containerRect = container.getBoundingClientRect();
    
    return {
      position: 'absolute',
      left: `${box.x * 100}%`,
      top: `${box.y * 100}%`,
      width: `${box.width * 100}%`,
      height: `${box.height * 100}%`,
      border: getBoxBorderStyle(box),
      backgroundColor: getBoxBackgroundColor(box),
      cursor: disabled || isSubmitted ? 'default' : 'pointer',
      transition: 'all 0.2s ease-in-out',
      zIndex: 10
    };
  };

  const getBoxBorderStyle = (box: BoundingBox): string => {
    if (!isSubmitted && !showAnswer) {
      return selectedBox?.id === box.id ? '3px solid #3b82f6' : '2px solid rgba(59, 130, 246, 0.6)';
    }
    
    if (showAnswer || isSubmitted) {
      if (box.isCorrectAnswer) {
        return '3px solid #10b981'; // Green for correct
      } else if (selectedBox?.id === box.id && !box.isCorrectAnswer) {
        return '3px solid #ef4444'; // Red for incorrect selection
      } else {
        return '2px solid rgba(156, 163, 175, 0.6)'; // Gray for other boxes
      }
    }
    
    return '2px solid rgba(59, 130, 246, 0.6)';
  };

  const getBoxBackgroundColor = (box: BoundingBox): string => {
    if (!isSubmitted && !showAnswer) {
      return selectedBox?.id === box.id ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
    }
    
    if (showAnswer || isSubmitted) {
      if (box.isCorrectAnswer) {
        return 'rgba(16, 185, 129, 0.2)'; // Green background for correct
      } else if (selectedBox?.id === box.id && !box.isCorrectAnswer) {
        return 'rgba(239, 68, 68, 0.2)'; // Red background for incorrect selection
      } else {
        return 'rgba(156, 163, 175, 0.1)'; // Gray background for other boxes
      }
    }
    
    return 'rgba(59, 130, 246, 0.1)';
  };

  const getBoxIcon = (box: BoundingBox) => {
    if (!isSubmitted && !showAnswer) return null;
    
    if (box.isCorrectAnswer) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (selectedBox?.id === box.id && !box.isCorrectAnswer) {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
    
    return null;
  };

  const renderBoxLabel = (box: BoundingBox) => {
    if (!showAnswer && !isSubmitted) return null;
    
    return (
      <div className="absolute -top-6 left-0 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
        {box.label}
        {getBoxIcon(box) && (
          <span className="ml-1 inline-flex">
            {getBoxIcon(box)}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-blue-600" />
          <Badge variant="outline">Hotspot Question</Badge>
        </div>
        <CardTitle>{question}</CardTitle>
        <CardDescription>
          Click on the area of the image that answers the question. 
          {!imageLoaded && !imageError && " Loading image..."}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Image Container */}
        <div 
          ref={containerRef}
          className="relative w-full bg-gray-100 rounded-lg overflow-hidden"
          style={{ minHeight: '400px' }}
        >
          {/* Main Image */}
          <img
            ref={imageRef}
            src={imageLoaded ? imageUrl : (thumbnailUrl || imageUrl)}
            alt={altText}
            className="w-full h-auto max-h-96 object-contain"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: imageError ? 'none' : 'block' }}
          />
          
          {/* Error State */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Unable to load image</p>
                <p className="text-sm">Please try again later</p>
              </div>
            </div>
          )}
          
          {/* Loading State */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading visual content...</p>
              </div>
            </div>
          )}
          
          {/* Bounding Boxes */}
          {imageLoaded && boundingBoxes.map((box) => (
            <div
              key={box.id}
              style={getBoundingBoxStyle(box)}
              onClick={() => handleBoxClick(box)}
              className="group"
              role="button"
              tabIndex={disabled || isSubmitted ? -1 : 0}
              aria-label={`Clickable area: ${box.label}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBoxClick(box);
                }
              }}
            >
              {/* Hover effect */}
              <div className="absolute inset-0 group-hover:bg-white group-hover:bg-opacity-20 transition-all duration-200" />
              
              {/* Box Label */}
              {renderBoxLabel(box)}
            </div>
          ))}
        </div>
        
        {/* Answer State */}
        {(showAnswer || isSubmitted) && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              {selectedBox?.isCorrectAnswer ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium text-sm mb-2">
                  {selectedBox?.isCorrectAnswer ? 'Correct!' : 'Incorrect'}
                  {selectedBox && ` - You selected: ${selectedBox.label}`}
                </p>
                <p className="text-sm text-gray-700">{explanation}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructions */}
        {!isSubmitted && !showAnswer && imageLoaded && (
          <div className="mt-4 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span>Click on the highlighted areas to answer the question</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HotspotQuestion; 