'use client';
import { useState } from 'react';
import { BorderTrail } from './border-trail';

interface HoverBorderTrailProps {
  className?: string;
  size?: number;
  delay?: number;
}

export function HoverBorderTrail({
  className = "bg-red-500",
  size = 120,
  delay = 0,
}: HoverBorderTrailProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isHovered) return null;

  return (
    <BorderTrail
      className={className}
      size={size}
      delay={delay}
    />
  );
}

export function useHoverBorderTrail() {
  const [isHovered, setIsHovered] = useState(false);
  
  return {
    isHovered,
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  };
}