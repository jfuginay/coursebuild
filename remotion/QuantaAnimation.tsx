import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
  staticFile,
  Easing,
} from 'remotion';

interface QuantaAnimationProps {
  primaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
}

export const QuantaAnimation: React.FC<QuantaAnimationProps> = ({
  primaryColor = '#2563eb',
  accentColor = '#dc2626',
  backgroundColor = '#f8fafc',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Global background with subtle grid
  const bgOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Audio narration */}
      <Audio src={staticFile('quanta.mp3')} />
      
      {/* Subtle background grid */}
      <AbsoluteFill style={{ opacity: bgOpacity * 0.1 }}>
        <svg width="1920" height="1080" style={{ position: 'absolute' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1920" height="1080" fill="url(#grid)" />
        </svg>
      </AbsoluteFill>

      {/* Persistent graph background after scene 2 */}
      {frame >= 210 && (
        <GraphBackground 
          opacity={interpolate(frame, [210, 240], [0, 0.15], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })}
        />
      )}
      
      {/* Scene 1: Introduction (0-5s / 0-150 frames) */}
      <Sequence from={0} durationInFrames={150}>
        <Scene1 frame={frame} fps={fps} primaryColor={primaryColor} />
      </Sequence>

      {/* Scene 2: The Old Theory (5-12s / 150-360 frames) */}
      <Sequence from={150} durationInFrames={210}>
        <Scene2 frame={frame - 150} fps={fps} primaryColor={primaryColor} accentColor={accentColor} />
      </Sequence>

      {/* Scene 3: The Problem (12-20s / 360-600 frames) */}
      <Sequence from={360} durationInFrames={240}>
        <Scene3 frame={frame - 360} fps={fps} primaryColor={primaryColor} accentColor={accentColor} />
      </Sequence>

      {/* Scene 4: The Challenge (20-30s / 600-900 frames) */}
      <Sequence from={600} durationInFrames={300}>
        <Scene4 frame={frame - 600} fps={fps} primaryColor={primaryColor} accentColor={accentColor} />
      </Sequence>
    </AbsoluteFill>
  );
};

// Graph background component
const GraphBackground: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill style={{ opacity }}>
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: 'absolute' }}>
      <g transform="translate(560, 340)">
        {/* Axes */}
        <line x1="0" y1="400" x2="800" y2="400" stroke="#94a3b8" strokeWidth="2" />
        <line x1="0" y1="0" x2="0" y2="400" stroke="#94a3b8" strokeWidth="2" />
        
        {/* Axis labels */}
        <text x="400" y="440" textAnchor="middle" fill="#64748b" fontSize="20" fontFamily="Arial">
          Wavelength
        </text>
        <text x="-40" y="200" textAnchor="middle" fill="#64748b" fontSize="20" fontFamily="Arial" transform="rotate(-90, -40, 200)">
          Intensity
        </text>
      </g>
    </svg>
  </AbsoluteFill>
);

// Scene 1: Introduction with animated kiln
const Scene1: React.FC<{ frame: number; fps: number; primaryColor: string }> = ({ frame, fps, primaryColor }) => {
  // Staggered entrance
  const alexEnter = spring({
    fps,
    frame: frame - 10,
    config: { damping: 15, stiffness: 100 },
  });

  const kilnEnter = spring({
    fps,
    frame: frame - 20,
    config: { damping: 15, stiffness: 100 },
  });

  const fireScale = spring({
    fps,
    frame: frame - 30,
    config: { damping: 10, stiffness: 80 },
  });

  // Fire flicker
  const fireFlicker = Math.sin(frame * 0.3) * 0.05 + 1;

  // Text fade
  const textOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Glow effect around kiln
  const glowOpacity = interpolate(frame, [40, 80], [0, 0.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Kiln glow effect */}
      <div
        style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 70%)`,
          opacity: glowOpacity,
          filter: 'blur(40px)',
        }}
      />

      {/* Character and kiln setup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '80px' }}>
        {/* Alex */}
        <div
          style={{
            transform: `translateY(${(1 - alexEnter) * 50}px) scale(${alexEnter})`,
            opacity: alexEnter,
          }}
        >
          <span style={{ fontSize: '120px' }}>🧑‍🎨</span>
        </div>

        {/* Kiln with fire */}
        <div
          style={{
            position: 'relative',
            transform: `translateY(${(1 - kilnEnter) * 50}px) scale(${kilnEnter})`,
            opacity: kilnEnter,
          }}
        >
          <span style={{ fontSize: '120px' }}>🧱</span>
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: `translateX(-50%) scale(${fireScale * fireFlicker})`,
              opacity: fireScale,
            }}
          >
            <span style={{ fontSize: '80px' }}>🔥</span>
          </div>
        </div>
      </div>

      {/* Text with better styling */}
      <div
        style={{
          position: 'absolute',
          bottom: '180px',
          fontSize: '36px',
          fontFamily: 'Arial, sans-serif',
          color: '#1e293b',
          textAlign: 'center',
          opacity: textOpacity,
          fontWeight: '500',
        }}
      >
        This is Alex, a potter, and their kiln.
      </div>
    </AbsoluteFill>
  );
};

// Scene 2: The Old Theory with graph
const Scene2: React.FC<{ frame: number; fps: number; primaryColor: string; accentColor: string }> = ({ 
  frame, 
  fps, 
  primaryColor,
  accentColor 
}) => {
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Graph container animation
  const graphScale = spring({
    fps,
    frame: frame - 40,
    config: { damping: 15, stiffness: 100 },
  });

  // Classical curve drawing
  const curveProgress = interpolate(frame, [60, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Arrow animation
  const arrowOpacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          top: '100px',
          fontSize: '32px',
          fontFamily: 'Arial, sans-serif',
          color: '#1e293b',
          textAlign: 'center',
          opacity: titleOpacity,
          maxWidth: '80%',
          fontWeight: '500',
        }}
      >
        An old physics book predicts the kiln's energy will do this:
      </div>

      {/* Graph container */}
      <div
        style={{
          transform: `scale(${graphScale})`,
          opacity: graphScale,
        }}
      >
        <svg width="800" height="400" viewBox="0 0 800 400">
          {/* Axes */}
          <g transform="translate(80, 20)">
            <line x1="0" y1="300" x2="600" y2="300" stroke="#475569" strokeWidth="3" />
            <line x1="0" y1="0" x2="0" y2="300" stroke="#475569" strokeWidth="3" />
            
            {/* Axis labels */}
            <text x="300" y="340" textAnchor="middle" fill="#475569" fontSize="24" fontFamily="Arial">
              Wavelength →
            </text>
            <text x="-40" y="150" textAnchor="middle" fill="#475569" fontSize="24" fontFamily="Arial" transform="rotate(-90, -40, 150)">
              Intensity
            </text>

            {/* UV region label */}
            <text x="500" y="290" fill="#7c3aed" fontSize="20" fontFamily="Arial" fontWeight="bold">
              UV
            </text>

            {/* Classical prediction curve */}
            <defs>
              <clipPath id="classicalClip">
                <rect x="0" y="0" width={600 * curveProgress} height="300" />
              </clipPath>
            </defs>
            
            <path
              d="M 0 300 Q 200 280, 400 100 T 600 -100"
              stroke={accentColor}
              strokeWidth="4"
              fill="none"
              clipPath="url(#classicalClip)"
              strokeDasharray="none"
            />

            {/* Arrow pointing up */}
            {arrowOpacity > 0 && (
              <g opacity={arrowOpacity}>
                <path
                  d="M 580 20 L 600 0 L 620 20"
                  stroke={accentColor}
                  strokeWidth="4"
                  fill="none"
                />
                <text x="550" y="-10" fill={accentColor} fontSize="24" fontFamily="Arial" fontWeight="bold">
                  ∞
                </text>
              </g>
            )}

            {/* "Wrong!" label */}
            {frame > 160 && (
              <text
                x="450"
                y="50"
                fill={accentColor}
                fontSize="28"
                fontFamily="Arial"
                fontWeight="bold"
                opacity={interpolate(frame, [160, 180], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}
              >
                Wrong!
              </text>
            )}
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: The Reality with correct curve
const Scene3: React.FC<{ frame: number; fps: number; primaryColor: string; accentColor: string }> = ({ 
  frame, 
  fps, 
  primaryColor,
  accentColor 
}) => {
  // Alex's reaction
  const alexScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 15, stiffness: 100 },
  });

  const textOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Graph animation
  const graphScale = spring({
    fps,
    frame: frame - 70,
    config: { damping: 15, stiffness: 100 },
  });

  // Planck curve drawing
  const planckProgress = interpolate(frame, [90, 180], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Peak highlight
  const peakOpacity = interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Alex thinking */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: '50%',
          transform: `translateX(-50%) scale(${alexScale})`,
          opacity: alexScale,
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <span style={{ fontSize: '80px' }}>🧑‍🎨</span>
        <span style={{ fontSize: '80px' }}>🤔</span>
      </div>

      {/* Text */}
      <div
        style={{
          position: 'absolute',
          top: '200px',
          fontSize: '32px',
          fontFamily: 'Arial, sans-serif',
          color: '#1e293b',
          opacity: textOpacity,
          fontWeight: '500',
        }}
      >
        But Alex measures this instead:
      </div>

      {/* Real measurement graph */}
      <div
        style={{
          marginTop: '100px',
          transform: `scale(${graphScale})`,
          opacity: graphScale,
        }}
      >
        <svg width="800" height="400" viewBox="0 0 800 400">
          <g transform="translate(80, 20)">
            {/* Axes */}
            <line x1="0" y1="300" x2="600" y2="300" stroke="#475569" strokeWidth="3" />
            <line x1="0" y1="0" x2="0" y2="300" stroke="#475569" strokeWidth="3" />
            
            {/* Faded classical curve for comparison */}
            <path
              d="M 0 300 Q 200 280, 400 100 T 600 -100"
              stroke={accentColor}
              strokeWidth="2"
              fill="none"
              opacity="0.2"
              strokeDasharray="5 5"
            />

            {/* Planck's law curve */}
            <defs>
              <clipPath id="planckClip">
                <rect x="0" y="0" width={600 * planckProgress} height="300" />
              </clipPath>
            </defs>
            
            <path
              d="M 0 299 Q 100 250, 200 100 C 250 50, 300 60, 400 150 Q 500 220, 600 280"
              stroke={primaryColor}
              strokeWidth="5"
              fill="none"
              clipPath="url(#planckClip)"
            />

            {/* Peak indicator */}
            <g opacity={peakOpacity}>
              <circle cx="200" cy="100" r="12" fill={primaryColor} />
              <text x="200" y="70" textAnchor="middle" fill={primaryColor} fontSize="20" fontFamily="Arial" fontWeight="bold">
                Peak
              </text>
            </g>

            {/* "Correct!" label */}
            {frame > 200 && (
              <text
                x="450"
                y="200"
                fill={primaryColor}
                fontSize="28"
                fontFamily="Arial"
                fontWeight="bold"
                opacity={interpolate(frame, [200, 220], [0, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                })}
              >
                Real data!
              </text>
            )}
          </g>
        </svg>
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: The Challenge with interactive feel
const Scene4: React.FC<{ frame: number; fps: number; primaryColor: string; accentColor: string }> = ({ 
  frame, 
  fps, 
  primaryColor,
  accentColor 
}) => {
  // Central elements
  const mainScale = spring({
    fps,
    frame: frame - 20,
    config: { damping: 10, stiffness: 60, mass: 1.5 },
  });

  const textOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Quantum hints animation
  const hintsOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Floating animation for hints
  const floatY = Math.sin(frame * 0.02) * 10;

  // Key concepts reveal
  const concept1 = interpolate(frame, [180, 200], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concept2 = interpolate(frame, [200, 220], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const concept3 = interpolate(frame, [220, 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {/* Background curves for visual interest */}
      <div style={{ position: 'absolute', opacity: 0.1 }}>
        <svg width="1920" height="1080" viewBox="0 0 1920 1080">
          <path
            d="M 0 540 Q 480 440, 960 540 T 1920 540"
            stroke={primaryColor}
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M 0 640 Q 480 740, 960 640 T 1920 640"
            stroke={accentColor}
            strokeWidth="3"
            fill="none"
          />
        </svg>
      </div>

      {/* Main content */}
      <div
        style={{
          transform: `scale(${mainScale})`,
          opacity: mainScale,
          textAlign: 'center',
        }}
      >
        {/* Question mark with glow */}
        <div style={{ position: 'relative', marginBottom: '40px' }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '200px',
              background: `radial-gradient(circle, ${primaryColor}30 0%, transparent 70%)`,
              filter: 'blur(30px)',
            }}
          />
          <span style={{ fontSize: '150px', position: 'relative' }}>❓</span>
        </div>

        {/* Main call to action */}
        <div
          style={{
            fontSize: '38px',
            fontFamily: 'Arial, sans-serif',
            color: '#1e293b',
            opacity: textOpacity,
            fontWeight: '600',
            marginBottom: '40px',
          }}
        >
          Your turn! Explain to Alex what's really happening.
        </div>

        {/* Prompting questions */}
        <div
          style={{
            fontSize: '26px',
            fontFamily: 'Arial, sans-serif',
            color: '#64748b',
            opacity: hintsOpacity,
            lineHeight: '1.8',
            transform: `translateY(${floatY}px)`,
          }}
        >
          Why does the old theory fail?<br />
          How does "quantized energy" explain the real curve?
        </div>
      </div>

      {/* Key concepts floating around */}
      <div
        style={{
          position: 'absolute',
          left: '200px',
          top: '300px',
          opacity: concept1,
          transform: `translateY(${-floatY}px)`,
        }}
      >
        <div
          style={{
            background: `${primaryColor}10`,
            border: `2px solid ${primaryColor}`,
            borderRadius: '20px',
            padding: '12px 24px',
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: primaryColor,
            fontWeight: '500',
          }}
        >
          Energy packets
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: '200px',
          top: '400px',
          opacity: concept2,
          transform: `translateY(${floatY}px)`,
        }}
      >
        <div
          style={{
            background: `${accentColor}10`,
            border: `2px solid ${accentColor}`,
            borderRadius: '20px',
            padding: '12px 24px',
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: accentColor,
            fontWeight: '500',
          }}
        >
          Max Planck
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: '300px',
          bottom: '200px',
          opacity: concept3,
          transform: `translateY(${-floatY * 0.7}px)`,
        }}
      >
        <div
          style={{
            background: '#f8fafc',
            border: `2px solid #94a3b8`,
            borderRadius: '20px',
            padding: '12px 24px',
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#475569',
            fontWeight: '500',
          }}
        >
          E = hν
        </div>
      </div>
    </AbsoluteFill>
  );
};