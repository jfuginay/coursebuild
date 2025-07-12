import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from 'remotion';

interface Grid1AnimationProps {
  primaryColor?: string;
  backgroundColor?: string;
}

export const Grid1Animation: React.FC<Grid1AnimationProps> = ({
  primaryColor = '#4ade80',
  backgroundColor = '#1a1a1a',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grid animation timing
  const gridOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Title animations
  const titleOpacity = interpolate(frame, [25, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Static rendering sequence (40-120)
  const staticBuildOpacity = interpolate(frame, [45, 55], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const staticRenderScale = spring({
    fps,
    frame: frame - 60,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const staticPageScale = spring({
    fps,
    frame: frame - 80,
    config: {
      damping: 12,
      stiffness: 150,
    },
  });

  const staticDeployOpacity = interpolate(frame, [100, 110], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Dynamic rendering sequence (140-220)
  const dynamicReqScale = spring({
    fps,
    frame: frame - 145,
    config: {
      damping: 12,
      stiffness: 150,
    },
  });

  const dynamicDataFetch = interpolate(frame, [160, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dynamicRenderScale = spring({
    fps,
    frame: frame - 175,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const dynamicResScale = spring({
    fps,
    frame: frame - 195,
    config: {
      damping: 12,
      stiffness: 150,
    },
  });

  // Flow animations
  const staticFlowProgress = interpolate(frame, [70, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dynamicFlowProgress1 = interpolate(frame, [150, 165], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dynamicFlowProgress2 = interpolate(frame, [180, 195], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dynamicFlowProgress3 = interpolate(frame, [200, 215], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Grid Background */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: gridOpacity,
        }}
      >
        <svg
          width="1200"
          height="800"
          viewBox="0 0 1200 800"
          style={{ position: 'absolute' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern
              id="grid"
              width="50"
              height="50"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 50 0 L 0 0 0 50"
                fill="none"
                stroke="#333"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#grid)" />
          
          {/* Main axes */}
          <line
            x1="100"
            y1="400"
            x2="1100"
            y2="400"
            stroke="#666"
            strokeWidth="2"
          />
          <line
            x1="600"
            y1="100"
            x2="600"
            y2="700"
            stroke="#666"
            strokeWidth="2"
          />
        </svg>
      </AbsoluteFill>

      {/* Title */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '40px',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: '36px',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          opacity: titleOpacity,
          textAlign: 'center',
        }}
      >
        Static vs Dynamic Rendering in Next.js
      </div>

      {/* Axis Labels */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '120px',
          transform: 'translateX(-50%)',
          color: '#ccc',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          opacity: gridOpacity,
        }}
      >
        Run time
      </div>

      <div
        style={{
          position: 'absolute',
          left: '70px',
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          color: '#ccc',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          opacity: gridOpacity,
        }}
      >
        Server
      </div>

      <div
        style={{
          position: 'absolute',
          left: '70px',
          bottom: '120px',
          transform: 'rotate(-90deg) translateX(-50%)',
          color: '#ccc',
          fontSize: '24px',
          fontFamily: 'Arial, sans-serif',
          opacity: gridOpacity,
        }}
      >
        Client
      </div>

      {/* Static Rendering Section */}
      <Sequence from={40} durationInFrames={80}>
        <AbsoluteFill>
          {/* Static Title */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              top: '180px',
              transform: 'translateX(-50%)',
              color: '#60a5fa',
              fontSize: '28px',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              opacity: staticBuildOpacity,
            }}
          >
            Static Generation (SSG)
          </div>

          {/* Build Time Label */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              top: '250px',
              transform: 'translateX(-50%)',
              backgroundColor: '#1e40af',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#fff',
              fontSize: '18px',
              fontFamily: 'Arial, sans-serif',
              opacity: staticBuildOpacity,
            }}
          >
            Build Time
          </div>

          {/* Static Render Box */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${staticRenderScale})`,
              width: '180px',
              height: '100px',
              backgroundColor,
              border: `3px solid #60a5fa`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px #60a5fa40`,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}
            >
              Pre-render
            </span>
          </div>

          {/* Static HTML Page */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '200px',
              transform: `translateX(-50%) scale(${staticPageScale})`,
              width: '160px',
              height: '80px',
              backgroundColor: '#1e293b',
              border: '2px solid #60a5fa',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <span
              style={{
                color: '#60a5fa',
                fontSize: '16px',
                fontFamily: 'monospace',
              }}
            >
              HTML
            </span>
            <span
              style={{
                color: '#94a3b8',
                fontSize: '14px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Pre-built
            </span>
          </div>

          {/* Deploy Label */}
          <div
            style={{
              position: 'absolute',
              left: '25%',
              bottom: '140px',
              transform: 'translateX(-50%)',
              color: '#94a3b8',
              fontSize: '16px',
              fontFamily: 'Arial, sans-serif',
              opacity: staticDeployOpacity,
            }}
          >
            Deploy to CDN ⚡
          </div>

          {/* Static Flow Arrow */}
          <svg
            width="1200"
            height="800"
            viewBox="0 0 1200 800"
            style={{ position: 'absolute', pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="arrowhead-static"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#60a5fa"
                />
              </marker>
            </defs>
            <path
              d="M 300 400 L 300 520"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="3"
              strokeDasharray="120"
              strokeDashoffset={120 * (1 - staticFlowProgress)}
              markerEnd="url(#arrowhead-static)"
            />
          </svg>
        </AbsoluteFill>
      </Sequence>

      {/* Dynamic Rendering Section */}
      <Sequence from={140} durationInFrames={100}>
        <AbsoluteFill>
          {/* Dynamic Title */}
          <div
            style={{
              position: 'absolute',
              left: '75%',
              top: '180px',
              transform: 'translateX(-50%)',
              color: primaryColor,
              fontSize: '28px',
              fontFamily: 'Arial, sans-serif',
              fontWeight: 'bold',
              opacity: interpolate(frame - 140, [0, 10], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            Server-Side Rendering (SSR)
          </div>

          {/* Request Label */}
          <div
            style={{
              position: 'absolute',
              right: '320px',
              bottom: '250px',
              transform: `scale(${dynamicReqScale})`,
              backgroundColor: '#333',
              border: '2px solid #666',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#ccc',
              fontSize: '18px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            REQ
          </div>

          {/* Data Fetch */}
          <div
            style={{
              position: 'absolute',
              right: '25%',
              top: '320px',
              transform: 'translateX(50%)',
              backgroundColor: '#1e293b',
              border: `2px solid ${primaryColor}`,
              borderRadius: '8px',
              padding: '8px 16px',
              color: primaryColor,
              fontSize: '16px',
              fontFamily: 'monospace',
              opacity: dynamicDataFetch,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: primaryColor,
                borderRadius: '50%',
                animation: 'pulse 1s infinite',
              }}
            />
            Fetch Data
          </div>

          {/* Dynamic Render Box */}
          <div
            style={{
              position: 'absolute',
              right: '25%',
              top: '50%',
              transform: `translate(50%, -50%) scale(${dynamicRenderScale})`,
              width: '180px',
              height: '100px',
              backgroundColor,
              border: `3px solid ${primaryColor}`,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 0 20px ${primaryColor}40`,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: '24px',
                fontFamily: 'Arial, sans-serif',
                fontWeight: 'bold',
              }}
            >
              Render
            </span>
          </div>

          {/* Response Label */}
          <div
            style={{
              position: 'absolute',
              right: '320px',
              bottom: '140px',
              transform: `scale(${dynamicResScale})`,
              backgroundColor: '#333',
              border: '2px solid #666',
              borderRadius: '8px',
              padding: '8px 16px',
              color: '#ccc',
              fontSize: '18px',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            RES
          </div>

          {/* Runtime Label */}
          <div
            style={{
              position: 'absolute',
              right: '25%',
              bottom: '80px',
              transform: 'translateX(50%)',
              color: '#94a3b8',
              fontSize: '16px',
              fontFamily: 'Arial, sans-serif',
              opacity: interpolate(frame - 210, [0, 10], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }),
            }}
          >
            Per Request 🔄
          </div>

          {/* Dynamic Flow Arrows */}
          <svg
            width="1200"
            height="800"
            viewBox="0 0 1200 800"
            style={{ position: 'absolute', pointerEvents: 'none' }}
          >
            <defs>
              <marker
                id="arrowhead-dynamic"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={primaryColor}
                />
              </marker>
            </defs>
            {/* Client to Server */}
            <path
              d="M 880 550 Q 880 400 900 400"
              fill="none"
              stroke={primaryColor}
              strokeWidth="3"
              strokeDasharray="150"
              strokeDashoffset={150 * (1 - dynamicFlowProgress1)}
            />
            {/* Server Fetch */}
            <path
              d="M 900 400 L 900 320"
              fill="none"
              stroke={primaryColor}
              strokeWidth="3"
              strokeDasharray="80"
              strokeDashoffset={80 * (1 - dynamicFlowProgress2)}
              markerEnd="url(#arrowhead-dynamic)"
            />
            {/* Server to Client */}
            <path
              d="M 900 400 Q 880 400 880 600"
              fill="none"
              stroke={primaryColor}
              strokeWidth="3"
              strokeDasharray="200"
              strokeDashoffset={200 * (1 - dynamicFlowProgress3)}
              markerEnd="url(#arrowhead-dynamic)"
            />
          </svg>
        </AbsoluteFill>
      </Sequence>

      <style>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </AbsoluteFill>
  );
};