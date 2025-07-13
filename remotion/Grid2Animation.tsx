import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Easing,
  Audio,
  staticFile,
} from 'remotion';

interface Grid2AnimationProps {
  primaryColor?: string;
  backgroundColor?: string;
}

// Helper component for the grid background
const GridBackground: React.FC<{ opacity: number }> = ({ opacity }) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      zIndex: 0,
    }}
  >
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 1920 1080"
      style={{ position: 'absolute' }}
    >
      <defs>
        <pattern
          id="grid-pattern"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#333"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="1920" height="1080" fill="url(#grid-pattern)" />
      
      {/* Main axes */}
      <line
        x1="200"
        y1="540"
        x2="1720"
        y2="540"
        stroke="#666"
        strokeWidth="2"
      />
      <line
        x1="960"
        y1="200"
        x2="960"
        y2="880"
        stroke="#666"
        strokeWidth="2"
      />
    </svg>
  </AbsoluteFill>
);

// Helper component for axis labels
const AxisLabels: React.FC<{ opacity: number }> = ({ opacity }) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '160px',
        transform: 'translateX(-50%)',
        color: '#ccc',
        fontSize: '24px',
        fontFamily: 'monospace',
        opacity,
      }}
    >
      Run time
    </div>
    <div
      style={{
        position: 'absolute',
        left: '140px',
        top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        color: '#ccc',
        fontSize: '24px',
        fontFamily: 'monospace',
        opacity,
      }}
    >
      Server
    </div>
    <div
      style={{
        position: 'absolute',
        left: '140px',
        bottom: '160px',
        transform: 'rotate(-90deg) translateX(-50%)',
        color: '#ccc',
        fontSize: '24px',
        fontFamily: 'monospace',
        opacity,
      }}
    >
      Client
    </div>
  </>
);

// Helper component for animated request/response boxes
const AnimatedBox: React.FC<{
  label: string;
  x: number;
  y: number;
  scale: number;
  opacity?: number;
}> = ({ label, x, y, scale, opacity = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${scale})`,
      backgroundColor: '#333',
      border: '2px solid #666',
      borderRadius: '8px',
      padding: '8px 16px',
      color: '#ccc',
      fontSize: '18px',
      fontFamily: 'monospace',
      opacity,
    }}
  >
    {label}
  </div>
);

// Helper component for the render box
const RenderBox: React.FC<{
  x: number;
  y: number;
  scale: number;
  opacity?: number;
  color: string;
  showLoading?: boolean;
  loadingProgress?: number;
}> = ({ x, y, scale, opacity = 1, color, showLoading = false, loadingProgress = 0 }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${scale})`,
      width: '180px',
      height: '100px',
      backgroundColor: '#1a1a1a',
      border: `3px solid ${color}`,
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `0 0 20px ${color}40`,
      opacity,
    }}
  >
    {showLoading ? (
      <div style={{ display: 'flex', gap: '8px' }}>
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: interpolate(loadingProgress % 1, [0, 0.5, 1], [0.3, 1, 0.3]),
          }}
        />
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: interpolate((loadingProgress + 0.33) % 1, [0, 0.5, 1], [0.3, 1, 0.3]),
          }}
        />
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: color,
            opacity: interpolate((loadingProgress + 0.66) % 1, [0, 0.5, 1], [0.3, 1, 0.3]),
          }}
        />
      </div>
    ) : (
      <span
        style={{
          color: '#fff',
          fontSize: '28px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
        }}
      >
        Render
      </span>
    )}
  </div>
);

export const Grid2Animation: React.FC<Grid2AnimationProps> = ({
  primaryColor = '#4ade80',
  backgroundColor = '#1a1a1a',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene 1: Introduction (0-8 seconds / 0-240 frames)
  // "Ever wondered how a web page appears..."
  const titleOpacity = interpolate(
    frame,
    [30, 60, 180, 210],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  const gridOpacity = interpolate(
    frame,
    [150, 180],
    [0, 1],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }
  );

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Audio narration */}
      <Audio src={staticFile('video_narration.mp3')} />
      
      {/* Scene 1: Introduction (0-8s) */}
      <Sequence from={0} durationInFrames={240}>
        <AbsoluteFill style={{ zIndex: 1 }}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '48px',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              opacity: titleOpacity,
              textAlign: 'center',
            }}
          >
            Static vs. Dynamic Rendering
          </div>
          <GridBackground opacity={gridOpacity} />
          <AxisLabels opacity={gridOpacity} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: Static Site Generation (8-20s / 240-600 frames) */}
      {/* "First, Static Rendering. Think of it like a pre-printed book..." */}
      <Sequence from={240} durationInFrames={360}>
        <AbsoluteFill style={{ zIndex: 1 }}>
          <SSGScene frame={frame - 240} fps={fps} primaryColor="#60a5fa" />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: Server-Side Rendering (20-32s / 600-960 frames) */}
      {/* "Next, Dynamic Rendering. This is like ordering a custom meal..." */}
      <Sequence from={600} durationInFrames={360}>
        <AbsoluteFill style={{ zIndex: 1 }}>
          <SSRScene frame={frame - 600} fps={fps} primaryColor={primaryColor} />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 4: Recap/Comparison (32-40s / 960-1200 frames) */}
      {/* "So, to recap: Static is super fast..." */}
      <Sequence from={960} durationInFrames={240}>
        <AbsoluteFill style={{ zIndex: 1 }}>
          <RecapScene frame={frame - 960} fps={fps} primaryColor={primaryColor} />
        </AbsoluteFill>
      </Sequence>

      {/* Persistent grid background after introduction */}
      {frame >= 180 && <GridBackground opacity={1} />}
      {frame >= 180 && <AxisLabels opacity={1} />}
    </AbsoluteFill>
  );
};

// Scene 2: SSG Component
const SSGScene: React.FC<{ frame: number; fps: number; primaryColor: string }> = ({ frame, fps, primaryColor }) => {
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "pre-printed book" appears
  const bookMetaphorOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const buildTimeOpacity = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Build time render animation
  const buildRenderSpring = spring({
    fps,
    frame: frame - 120,
    config: { damping: 15, stiffness: 100 },
  });
  const buildRenderScale = frame >= 120 && frame < 150 ? buildRenderSpring : 0;

  // File appears
  const fileOpacity = frame >= 150 ? interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) : 0;

  // Request animation - "already waiting and sent back instantly"
  const reqProgress = frame >= 200 ? interpolate(frame, [200, 220], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0, 0.4, 1), // Very fast
  }) : 0;

  // Response animation (immediate)
  const resProgress = frame >= 220 ? interpolate(frame, [220, 240], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.2, 0, 0.4, 1), // Very fast
  }) : 0;

  const reqY = interpolate(reqProgress, [0, 1], [720, 540]);
  const resY = interpolate(resProgress, [0, 1], [540, 720]);

  // "incredibly fast" text
  const fastTextOpacity = frame >= 270 ? interpolate(frame, [270, 300], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) : 0;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '80px',
          transform: 'translateX(-50%)',
          color: primaryColor,
          fontSize: '36px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          opacity: titleOpacity,
        }}
      >
        Static Generation (SSG)
      </div>

      {/* Book metaphor */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '140px',
          transform: 'translateX(-50%)',
          color: '#94a3b8',
          fontSize: '24px',
          fontFamily: 'monospace',
          opacity: bookMetaphorOpacity,
          fontStyle: 'italic',
        }}
      >
        "Like a pre-printed book"
      </div>

      <div
        style={{
          position: 'absolute',
          left: '400px',
          top: '300px',
          backgroundColor: '#1e40af',
          borderRadius: '8px',
          padding: '12px 24px',
          color: '#fff',
          fontSize: '20px',
          fontFamily: 'monospace',
          opacity: buildTimeOpacity,
        }}
      >
        Build Time
      </div>

      {/* Build render box */}
      <RenderBox
        x={600}
        y={540}
        scale={buildRenderScale}
        color={primaryColor}
        opacity={frame >= 120 && frame < 150 ? 1 : 0}
      />

      {/* CDN box with file */}
      <div
        style={{
          position: 'absolute',
          left: '960px',
          top: '540px',
          transform: 'translate(-50%, -50%)',
          width: '200px',
          height: '120px',
          backgroundColor: '#1e293b',
          border: `2px solid ${primaryColor}`,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          opacity: fileOpacity,
        }}
      >
        <span style={{ fontSize: '48px' }}>📄</span>
        <span
          style={{
            color: primaryColor,
            fontSize: '20px',
            fontFamily: 'monospace',
          }}
        >
          CDN
        </span>
      </div>

      {/* Request/Response animation */}
      {reqProgress > 0 && (
        <AnimatedBox
          label="REQ"
          x={960}
          y={reqY}
          scale={1}
        />
      )}
      
      {resProgress > 0 && (
        <>
          <AnimatedBox
            label="RES"
            x={960}
            y={resY}
            scale={1}
          />
          <div
            style={{
              position: 'absolute',
              left: '1020px',
              top: resY,
              transform: 'translateY(-50%)',
              fontSize: '32px',
              opacity: resProgress,
            }}
          >
            📄
          </div>
        </>
      )}

      {/* Fast text */}
      <div
        style={{
          position: 'absolute',
          left: '960px',
          bottom: '200px',
          transform: 'translateX(-50%)',
          color: primaryColor,
          fontSize: '28px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          opacity: fastTextOpacity,
        }}
      >
        🚀 Incredibly Fast!
      </div>
    </AbsoluteFill>
  );
};

// Scene 3: SSR Component
const SSRScene: React.FC<{ frame: number; fps: number; primaryColor: string }> = ({ frame, fps, primaryColor }) => {
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // "custom meal" metaphor
  const mealMetaphorOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Request animation - "When your request hits the server"
  const reqProgress = frame >= 120 ? interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  }) : 0;

  const reqY = interpolate(reqProgress, [0, 1], [720, 540]);

  // Render box appears - "it runs code"
  const renderSpring = spring({
    fps,
    frame: frame - 150,
    config: { damping: 15, stiffness: 100 },
  });
  const renderScale = frame >= 150 ? renderSpring : 0;

  // Loading animation - "fetches the latest data"
  const loadingProgress = frame >= 170 && frame <= 250 ? 
    (frame - 170) / 30 : 0;

  // Database animation
  const dbOpacity = frame >= 180 && frame <= 240 ? 1 : 0;
  const arrowProgress = frame >= 180 ? interpolate(frame, [180, 200], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) : 0;

  // Response animation - "generates a unique page just for you"
  const resProgress = frame >= 260 ? interpolate(frame, [260, 290], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  }) : 0;

  const resY = interpolate(resProgress, [0, 1], [540, 720]);

  // "Always fresh" text
  const freshTextOpacity = frame >= 310 ? interpolate(frame, [310, 340], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  }) : 0;

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '80px',
          transform: 'translateX(-50%)',
          color: primaryColor,
          fontSize: '36px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          opacity: titleOpacity,
        }}
      >
        Server-Side Rendering (SSR)
      </div>

      {/* Meal metaphor */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '140px',
          transform: 'translateX(-50%)',
          color: '#94a3b8',
          fontSize: '24px',
          fontFamily: 'monospace',
          opacity: mealMetaphorOpacity,
          fontStyle: 'italic',
        }}
      >
        "Like ordering a custom meal"
      </div>

      {/* Request */}
      {reqProgress > 0 && reqProgress < 1 && (
        <AnimatedBox
          label="REQ"
          x={960}
          y={reqY}
          scale={1}
        />
      )}

      {/* Render box with loading */}
      {renderScale > 0 && (
        <RenderBox
          x={960}
          y={540}
          scale={renderScale}
          color={primaryColor}
          showLoading={frame >= 170 && frame <= 250}
          loadingProgress={loadingProgress}
        />
      )}

      {/* Database */}
      <div
        style={{
          position: 'absolute',
          left: '1200px',
          top: '540px',
          transform: 'translate(-50%, -50%)',
          width: '80px',
          height: '80px',
          backgroundColor: '#1e293b',
          border: `2px solid ${primaryColor}`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: dbOpacity,
        }}
      >
        <span
          style={{
            color: primaryColor,
            fontSize: '20px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          DB
        </span>
      </div>

      {/* Arrow from DB to Render */}
      {arrowProgress > 0 && (
        <svg
          width="1920"
          height="1080"
          viewBox="0 0 1920 1080"
          style={{ position: 'absolute', pointerEvents: 'none' }}
        >
          <defs>
            <marker
              id="arrowhead-db"
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
          <path
            d={`M 1160 540 L ${1160 - 100 * arrowProgress} 540`}
            fill="none"
            stroke={primaryColor}
            strokeWidth="3"
            markerEnd="url(#arrowhead-db)"
          />
        </svg>
      )}

      {/* Response */}
      {resProgress > 0 && (
        <AnimatedBox
          label="RES"
          x={960}
          y={resY}
          scale={1}
        />
      )}

      {/* Fresh text */}
      <div
        style={{
          position: 'absolute',
          left: '960px',
          bottom: '200px',
          transform: 'translateX(-50%)',
          color: primaryColor,
          fontSize: '28px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          opacity: freshTextOpacity,
        }}
      >
        🔄 Always Fresh!
      </div>
    </AbsoluteFill>
  );
};

// Scene 4: Recap
const RecapScene: React.FC<{ frame: number; fps: number; primaryColor: string }> = ({ frame, fps, primaryColor }) => {
  const fadeIn = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const staticSummaryOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const dynamicSummaryOpacity = interpolate(frame, [90, 120], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: fadeIn }}>
      {/* Title */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '120px',
          transform: 'translateX(-50%)',
          color: '#fff',
          fontSize: '40px',
          fontFamily: 'monospace',
          fontWeight: 'bold',
        }}
      >
        To Recap:
      </div>

      {/* Divider line */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '250px',
          bottom: '200px',
          width: '2px',
          backgroundColor: '#666',
        }}
      />

      {/* Static side */}
      <div style={{ position: 'absolute', left: 0, width: '50%', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '220px',
            transform: 'translateX(-50%)',
            color: '#60a5fa',
            fontSize: '32px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          STATIC
        </div>

        {/* Static icon */}
        <div
          style={{
            position: 'absolute',
            left: '480px',
            top: '350px',
            transform: 'translate(-50%, -50%)',
            fontSize: '64px',
            opacity: staticSummaryOpacity,
          }}
        >
          📄
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '450px',
            transform: 'translateX(-50%)',
            color: '#94a3b8',
            fontSize: '24px',
            fontFamily: 'monospace',
            textAlign: 'center',
            opacity: staticSummaryOpacity,
            padding: '0 40px',
          }}
        >
          ⚡ Super fast<br />
          Work done beforehand
        </div>
      </div>

      {/* Dynamic side */}
      <div style={{ position: 'absolute', left: '50%', width: '50%', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '220px',
            transform: 'translateX(-50%)',
            color: primaryColor,
            fontSize: '32px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }}
        >
          DYNAMIC
        </div>

        {/* Dynamic icon */}
        <div
          style={{
            position: 'absolute',
            left: '1440px',
            top: '350px',
            transform: 'translate(-50%, -50%)',
            fontSize: '64px',
            opacity: dynamicSummaryOpacity,
          }}
        >
          🔄
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '450px',
            transform: 'translateX(-50%)',
            color: '#94a3b8',
            fontSize: '24px',
            fontFamily: 'monospace',
            textAlign: 'center',
            opacity: dynamicSummaryOpacity,
            padding: '0 40px',
          }}
        >
          🆕 Always up-to-date<br />
          Slower but fresh
        </div>
      </div>
    </AbsoluteFill>
  );
};