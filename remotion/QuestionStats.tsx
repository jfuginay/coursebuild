import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface QuestionStatsProps {
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
}

export const QuestionStats: React.FC<QuestionStatsProps> = ({
  totalQuestions,
  correctAnswers,
  wrongAnswers,
  accuracy,
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

  const barProgress = interpolate(
    frame,
    [30, 90],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const accuracyProgress = interpolate(
    frame,
    [60, 120],
    [0, accuracy / 100],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)',
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
          marginBottom: '50px',
          textAlign: 'center',
          transform: `scale(${titleScale})`,
        }}
      >
        Question Statistics
      </div>

      {/* Stats Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '40px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {/* Correct Answers */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#00b894' }}>
            {Math.round(correctAnswers * barProgress)}
          </div>
          <div style={{ fontSize: 24, marginTop: '10px' }}>Correct</div>
        </div>

        {/* Wrong Answers */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 72, fontWeight: 'bold', color: '#e17055' }}>
            {Math.round(wrongAnswers * barProgress)}
          </div>
          <div style={{ fontSize: 24, marginTop: '10px' }}>Wrong</div>
        </div>
      </div>

      {/* Accuracy Bar */}
      <div style={{ marginTop: '80px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: '20px' }}>
          Accuracy: {Math.round(accuracyProgress * 100)}%
        </div>
        <div
          style={{
            width: '600px',
            height: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '10px',
            margin: '0 auto',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${accuracyProgress * 100}%`,
              height: '100%',
              backgroundColor: '#00b894',
              borderRadius: '10px',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};