import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface CourseSummaryProps {
  title: string;
  description: string;
  duration: string;
  questionsCount: number;
  segmentsCount: number;
}

export const CourseSummary: React.FC<CourseSummaryProps> = ({
  title,
  description,
  duration,
  questionsCount,
  segmentsCount,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  const titleScale = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
  });

  const contentOpacity = interpolate(
    frame,
    [30, 60],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const statsOpacity = interpolate(
    frame,
    [60, 90],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '60px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 'bold',
          marginBottom: '30px',
          textAlign: 'center',
          transform: `scale(${titleScale})`,
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 24,
          marginBottom: '40px',
          textAlign: 'center',
          opacity: contentOpacity,
          lineHeight: 1.6,
          maxWidth: '800px',
          margin: '0 auto 40px auto',
        }}
      >
        {description}
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          opacity: statsOpacity,
          marginTop: '60px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#FFD700' }}>
            {duration}
          </div>
          <div style={{ fontSize: 18, marginTop: '10px' }}>Duration</div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#FFD700' }}>
            {questionsCount}
          </div>
          <div style={{ fontSize: 18, marginTop: '10px' }}>Questions</div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 'bold', color: '#FFD700' }}>
            {segmentsCount}
          </div>
          <div style={{ fontSize: 18, marginTop: '10px' }}>Segments</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};