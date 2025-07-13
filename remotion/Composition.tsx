import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const MyComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({
    fps,
    frame,
    config: {
      damping: 200,
    },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'linear-gradient(to bottom, #1a1a1a, #0a0a0a)',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: 80,
        color: 'white',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ transform: `scale(${scale})` }}>
        Curio
      </div>
    </AbsoluteFill>
  );
};