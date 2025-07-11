import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface ProgressAnimationProps {
  courseName: string;
  progress: number;
  completedSections: number;
  totalSections: number;
}

export const ProgressAnimation: React.FC<ProgressAnimationProps> = ({
  courseName,
  progress,
  completedSections,
  totalSections,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleScale = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
  });

  const progressBarWidth = interpolate(
    frame,
    [30, 90],
    [0, progress],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const sectionOpacity = interpolate(
    frame,
    [60, 90],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const celebrationScale = progress >= 100 ? spring({
    fps,
    frame: frame - 120,
    config: {
      damping: 200,
    },
  }) : 1;

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #a8e6cf 0%, #dcedc8 100%)',
        padding: '60px',
        color: '#2d3436',
        fontFamily: 'Arial, sans-serif',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 'bold',
          marginBottom: '50px',
          textAlign: 'center',
          transform: `scale(${titleScale})`,
        }}
      >
        Learning Progress
      </div>

      {/* Course Name */}
      <div
        style={{
          fontSize: 32,
          marginBottom: '40px',
          textAlign: 'center',
          color: '#636e72',
        }}
      >
        {courseName}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '600px',
          height: '40px',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderRadius: '20px',
          margin: '0 auto 30px auto',
          overflow: 'hidden',
          border: '2px solid #00b894',
        }}
      >
        <div
          style={{
            width: `${progressBarWidth}%`,
            height: '100%',
            backgroundColor: '#00b894',
            borderRadius: '20px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Progress Text */}
      <div
        style={{
          fontSize: 48,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: '30px',
          color: '#00b894',
        }}
      >
        {Math.round(progressBarWidth)}%
      </div>

      {/* Sections Progress */}
      <div
        style={{
          textAlign: 'center',
          opacity: sectionOpacity,
        }}
      >
        <div style={{ fontSize: 24, marginBottom: '10px' }}>
          Completed Sections
        </div>
        <div style={{ fontSize: 36, fontWeight: 'bold', color: '#00b894' }}>
          {completedSections} / {totalSections}
        </div>
      </div>

      {/* Celebration */}
      {progress >= 100 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) scale(${celebrationScale})`,
            fontSize: 72,
            textAlign: 'center',
          }}
        >
          🎉 Congratulations! 🎉
        </div>
      )}
    </AbsoluteFill>
  );
};