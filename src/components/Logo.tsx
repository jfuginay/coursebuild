import React from 'react';

interface LogoProps {
  variant?: 'full' | 'compact' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ variant = 'full', size = 'md' }) => {
  const sizeClasses = {
    sm: { svg: 'w-8 h-8', text: 'text-lg', subtext: 'text-xs' },
    md: { svg: 'w-10 h-10', text: 'text-xl', subtext: 'text-xs' },
    lg: { svg: 'w-12 h-12', text: 'text-2xl', subtext: 'text-sm' }
  };

  const { svg, text, subtext } = sizeClasses[size];

  // Icon only version
  if (variant === 'icon') {
    return (
      <div className="relative">
        <svg 
          className={`${svg} transition-transform duration-300 hover:scale-110`}
          viewBox="0 0 40 40"
        >
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-cyan-400" />
              <stop offset="50%" className="stop-color-cyan-500" />
              <stop offset="100%" className="stop-color-cyan-600" />
            </linearGradient>
            <linearGradient id="playGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-cyan-300" />
              <stop offset="100%" className="stop-color-cyan-500" />
            </linearGradient>
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-cyan-500" />
              <stop offset="100%" className="stop-color-cyan-600" />
            </linearGradient>
          </defs>
          
          {/* Neural network background pattern */}
          <circle cx="20" cy="20" r="18" fill="url(#bgGradient)" opacity="0.1" />
          
          {/* Circuit lines - subtle AI theme */}
          <g stroke="currentColor" strokeWidth="0.5" opacity="0.3" className="text-cyan-400">
            <line x1="8" y1="12" x2="32" y2="12" />
            <line x1="8" y1="28" x2="32" y2="28" />
            <circle cx="8" cy="12" r="1" fill="currentColor" />
            <circle cx="32" cy="12" r="1" fill="currentColor" />
            <circle cx="8" cy="28" r="1" fill="currentColor" />
            <circle cx="32" cy="28" r="1" fill="currentColor" />
          </g>
          
          {/* Main transformation symbol: Play button morphing into graduation cap */}
          <g className="transition-all duration-500 hover:scale-105">
            {/* Play button base (YouTube homage) */}
            <path 
              d="M16 14 L24 20 L16 26 Z" 
              fill="url(#playGradient)" 
              className="drop-shadow-sm"
            />
            
            {/* Graduation cap overlay (education symbol) */}
            <path 
              d="M12 16 L20 12 L28 16 L20 18 Z" 
              fill="url(#capGradient)" 
              opacity="0.8"
              className="drop-shadow-sm"
            />
            
            {/* Cap tassel */}
            <circle cx="26" cy="15" r="1.5" fill="url(#capGradient)" />
            <line x1="26" y1="16.5" x2="26" y2="19" stroke="url(#capGradient)" strokeWidth="1" />
          </g>
          
          {/* AI/Tech accent dots */}
          <g className="animate-pulse">
            <circle cx="14" cy="8" r="0.5" fill="currentColor" className="text-cyan-400" />
            <circle cx="26" cy="8" r="0.5" fill="currentColor" className="text-cyan-500" />
            <circle cx="14" cy="32" r="0.5" fill="currentColor" className="text-cyan-400" />
            <circle cx="26" cy="32" r="0.5" fill="currentColor" className="text-cyan-500" />
          </g>
        </svg>
      </div>
    );
  }

  // Compact version - just "CF" with icon
  if (variant === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <div className="relative">
          <svg 
            className={`${svg} transition-transform duration-300 hover:scale-110`}
            viewBox="0 0 40 40"
          >
            <defs>
              <linearGradient id="bgGradient-compact" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="stop-color-cyan-400" />
                <stop offset="50%" className="stop-color-cyan-500" />
                <stop offset="100%" className="stop-color-cyan-600" />
              </linearGradient>
              <linearGradient id="playGradient-compact" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="stop-color-cyan-300" />
                <stop offset="100%" className="stop-color-cyan-500" />
              </linearGradient>
              <linearGradient id="capGradient-compact" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" className="stop-color-cyan-500" />
                <stop offset="100%" className="stop-color-cyan-600" />
              </linearGradient>
            </defs>
            
            <circle cx="20" cy="20" r="18" fill="url(#bgGradient-compact)" opacity="0.1" />
            
            <g className="transition-all duration-500 hover:scale-105">
              <path 
                d="M16 14 L24 20 L16 26 Z" 
                fill="url(#playGradient-compact)" 
                className="drop-shadow-sm"
              />
              
              <path 
                d="M12 16 L20 12 L28 16 L20 18 Z" 
                fill="url(#capGradient-compact)" 
                opacity="0.8"
                className="drop-shadow-sm"
              />
              
              <circle cx="26" cy="15" r="1.5" fill="url(#capGradient-compact)" />
              <line x1="26" y1="16.5" x2="26" y2="19" stroke="url(#capGradient-compact)" strokeWidth="1" />
            </g>
          </svg>
        </div>
        
        <div className={`${text} font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent`}>
          CB
        </div>
      </div>
    );
  }

  // Full version - complete logo with text
  return (
    <div className="flex items-center space-x-3">
      {/* Main Logo SVG */}
      <div className="relative">
        <svg 
          className={`${svg} transition-transform duration-300 hover:scale-110`}
          viewBox="0 0 40 40"
        >
          {/* Background gradient circle */}
          <defs>
            <linearGradient id="bgGradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-cyan-400" />
              <stop offset="50%" className="stop-color-cyan-500" />
              <stop offset="100%" className="stop-color-cyan-600" />
            </linearGradient>
            <linearGradient id="playGradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-cyan-300" />
              <stop offset="100%" className="stop-color-cyan-500" />
            </linearGradient>
            <linearGradient id="capGradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" className="stop-color-cyan-500" />
              <stop offset="100%" className="stop-color-cyan-600" />
            </linearGradient>
          </defs>
          
          {/* Neural network background pattern */}
          <circle cx="20" cy="20" r="18" fill="url(#bgGradient-full)" opacity="0.1" />
          
          {/* Circuit lines - subtle AI theme */}
          <g stroke="currentColor" strokeWidth="0.5" opacity="0.3" className="text-cyan-400">
            <line x1="8" y1="12" x2="32" y2="12" />
            <line x1="8" y1="28" x2="32" y2="28" />
            <circle cx="8" cy="12" r="1" fill="currentColor" />
            <circle cx="32" cy="12" r="1" fill="currentColor" />
            <circle cx="8" cy="28" r="1" fill="currentColor" />
            <circle cx="32" cy="28" r="1" fill="currentColor" />
          </g>
          
          {/* Main transformation symbol: Play button morphing into graduation cap */}
          <g className="transition-all duration-500 hover:scale-105">
            {/* Play button base (YouTube homage) */}
            <path 
              d="M16 14 L24 20 L16 26 Z" 
              fill="url(#playGradient-full)" 
              className="drop-shadow-sm"
            />
            
            {/* Graduation cap overlay (education symbol) */}
            <path 
              d="M12 16 L20 12 L28 16 L20 18 Z" 
              fill="url(#capGradient-full)" 
              opacity="0.8"
              className="drop-shadow-sm"
            />
            
            {/* Cap tassel */}
            <circle cx="26" cy="15" r="1.5" fill="url(#capGradient-full)" />
            <line x1="26" y1="16.5" x2="26" y2="19" stroke="url(#capGradient-full)" strokeWidth="1" />
          </g>
          
          {/* AI/Tech accent dots */}
          <g className="animate-pulse">
            <circle cx="14" cy="8" r="0.5" fill="currentColor" className="text-cyan-400" />
            <circle cx="26" cy="8" r="0.5" fill="currentColor" className="text-cyan-500" />
            <circle cx="14" cy="32" r="0.5" fill="currentColor" className="text-cyan-400" />
            <circle cx="26" cy="32" r="0.5" fill="currentColor" className="text-cyan-500" />
          </g>
        </svg>
      </div>
      
      {/* Logo Text */}
      <div className="flex flex-col">
        <div className={`${text} font-bold bg-gradient-to-r from-cyan-500 to-cyan-600 bg-clip-text text-transparent`}>
          Curio
        </div>
      </div>
    </div>
  );
};

export default Logo;
