import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FlippableCardProps {
  isFlipped: boolean;
  frontContent: ReactNode;
  backContent: ReactNode;
  className?: string;
  flipDuration?: number; // in milliseconds
}

export default function FlippableCard({
  isFlipped,
  frontContent,
  backContent,
  className,
  flipDuration = 600
}: FlippableCardProps) {
  // Use opacity and pointer-events to preserve YouTube player state
  return (
    <div className={cn("flip-card-container", className)} style={{ position: 'relative', minHeight: '600px' }}>
      {/* Front Face - Video Player - Always rendered and visible */}
      <div 
        className="flip-card-front transition-opacity"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: isFlipped ? 0 : 1,
          pointerEvents: isFlipped ? 'none' : 'auto',
          zIndex: isFlipped ? 0 : 1,
          transition: `opacity ${flipDuration}ms ease-in-out`
        }}
      >
        {frontContent}
      </div>

      {/* Back Face - Question */}
      <div 
        className="flip-card-back bg-background transition-opacity"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          minHeight: '100%',
          opacity: isFlipped ? 1 : 0,
          pointerEvents: isFlipped ? 'auto' : 'none',
          zIndex: isFlipped ? 1 : 0,
          overflow: 'auto',
          transition: `opacity ${flipDuration}ms ease-in-out`
        }}
      >
        {backContent}
      </div>
    </div>
  );
}

// Add global styles for the flip card
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .flip-card-container {
      width: 100%;
      height: 100%;
      position: relative;
      perspective: 1000px;
    }
    
    /* Ensure smooth transitions */
    .flip-card-front, .flip-card-back {
      will-change: opacity;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    /* Prevent any flickering during transitions */
    .transition-opacity {
      -webkit-transform: translateZ(0);
      transform: translateZ(0);
    }
  `;
  
  if (!document.head.querySelector('style[data-flip-card]')) {
    style.setAttribute('data-flip-card', 'true');
    document.head.appendChild(style);
  }
}