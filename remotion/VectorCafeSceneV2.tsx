import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';

// Main Scene Component
export const VectorCafeSceneV2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#2C1810', fontFamily: 'Arial, sans-serif' }}>
      {/* Cafe Background */}
      <CafeBackground />
      
      {/* Character Introductions */}
      <Sequence from={0} durationInFrames={90}>
        <CharacterIntroduction />
      </Sequence>
      
      {/* Vector Explanation Scene */}
      <Sequence from={90} durationInFrames={120}>
        <VectorExplanation />
      </Sequence>
      
      {/* Dot Product Demonstration */}
      <Sequence from={210} durationInFrames={150}>
        <DotProductDemo />
      </Sequence>
      
      {/* Interactive Quiz */}
      <Sequence from={360} durationInFrames={90}>
        <InteractiveQuiz />
      </Sequence>
      
      {/* Conclusion */}
      <Sequence from={450} durationInFrames={60}>
        <Conclusion />
      </Sequence>
    </AbsoluteFill>
  );
};

// Cafe Background Component
const CafeBackground: React.FC = () => {
  const frame = useCurrentFrame();
  
  // Subtle background animation
  const backgroundShift = Math.sin(frame * 0.02) * 2;
  
  return (
    <AbsoluteFill>
      <Img
        src={staticFile('/images/cafebackground.png')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateX(${backgroundShift}px)`,
          filter: 'brightness(0.7) contrast(1.1)',
        }}
      />
      {/* Warm overlay */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(255,180,120,0.1) 0%, transparent 60%)',
        }}
      />
    </AbsoluteFill>
  );
};

// Character Introduction
const CharacterIntroduction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Character 1 (bearded guy) EXPLOSIVE entrance
  const char1Scale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 100, stiffness: 500 },
  });
  
  const char1X = interpolate(frame, [0, 20], [-400, 0], {
    extrapolateRight: 'clamp',
  });
  
  // Character 2 (younger guy) EXPLOSIVE entrance
  const char2Scale = spring({
    frame: frame - 25,
    fps,
    config: { damping: 100, stiffness: 500 },
  });
  
  const char2X = interpolate(frame, [20, 40], [400, 0], {
    extrapolateRight: 'clamp',
  });
  
  // Dialogue bubbles with bounce
  const bubble1Scale = spring({
    frame: frame - 35,
    fps,
    config: { damping: 150, stiffness: 400 },
  });
  
  const bubble2Scale = spring({
    frame: frame - 55,
    fps,
    config: { damping: 150, stiffness: 400 },
  });
  
  // Flash effect for dramatic entrance
  const flashOpacity = interpolate(frame, [0, 5, 10], [0.3, 0, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill>
      {/* Flash effect */}
      <AbsoluteFill
        style={{
          background: 'linear-gradient(45deg, #FFD700, #FF6B6B, #4ECDC4)',
          opacity: flashOpacity,
        }}
      />
      
      {/* Character 1 - Bearded guy (Alex) - MUCH BIGGER */}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          top: '10%',
          transform: `translateX(${char1X}px) scale(${char1Scale * 1.3})`,
          filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8))',
        }}
      >
        <Img
          src={staticFile('/images/image.png')}
          style={{
            width: '450px',
            height: '580px',
            objectFit: 'cover',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            border: '8px solid rgba(255,215,0,0.8)',
            filter: 'brightness(1.2) contrast(1.1) saturate(1.3)',
          }}
        />
        
        {/* Character 1 dialogue - STABLE AND READABLE */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '480px',
            transform: `scale(${Math.min(bubble1Scale, 1)})`,
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '35px',
            borderRadius: '35px',
            maxWidth: '400px',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            border: '4px solid #333',
          }}
        >
          🚀 Hey Sam! Ready to MASTER vector dot products?! 🤓
        </div>
      </div>
      
      {/* Character 2 - Younger guy (Sam) - MUCH BIGGER */}
      <div
        style={{
          position: 'absolute',
          right: '8%',
          top: '10%',
          transform: `translateX(${char2X}px) scale(${char2Scale * 1.3})`,
          filter: 'drop-shadow(0 0 20px rgba(255,107,107,0.8))',
        }}
      >
        <Img
          src={staticFile('/images/image (1).png')}
          style={{
            width: '450px',
            height: '580px',
            objectFit: 'cover',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
            border: '8px solid rgba(255,107,107,0.8)',
            filter: 'brightness(1.2) contrast(1.1) saturate(1.3)',
          }}
        />
        
        {/* Character 2 dialogue - STABLE AND READABLE */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            left: '-420px',
            transform: `scale(${Math.min(bubble2Scale, 1)})`,
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '35px',
            borderRadius: '35px',
            maxWidth: '400px',
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
            border: '4px solid #333',
          }}
        >
          🔥 ABSOLUTELY! Show me the VISUAL magic! 🎯
        </div>
      </div>
      
      {/* Explosive particle effects */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const distance = 200 + Math.sin(frame * 0.1 + i) * 50;
        const x = Math.cos(angle + frame * 0.03) * distance;
        const y = Math.sin(angle + frame * 0.03) * distance;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) scale(${1 + Math.sin(frame * 0.1 + i) * 0.5})`,
              fontSize: '40px',
              opacity: 0.4 + Math.sin(frame * 0.1 + i) * 0.4,
              filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.8))',
            }}
          >
            {['🌟', '💫', '✨', '🎯', '🔥', '💥', '⚡', '🚀', '🎊', '🎉', '💪', '🧠'][i]}
          </div>
        );
      })}
      
      {/* Floating coffee cups - BIGGER */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${10 + i * 20}%`,
            left: `${85 + Math.sin(frame * 0.05 + i) * 8}%`,
            fontSize: '48px',
            opacity: 0.4 + Math.sin(frame * 0.1 + i) * 0.3,
            transform: `rotate(${Math.sin(frame * 0.03 + i) * 15}deg) scale(${1 + Math.sin(frame * 0.1 + i) * 0.3})`,
            filter: 'drop-shadow(0 0 15px rgba(139,69,19,0.5))',
          }}
        >
          ☕
        </div>
      ))}
    </AbsoluteFill>
  );
};

// Vector Explanation Scene
const VectorExplanation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Alex explaining with DRAMATIC gestures
  const alexBounce = 1 + Math.sin(frame * 0.3) * 0.15;
  const alexGlow = Math.sin(frame * 0.2) * 0.5 + 0.5;
  
  // Vector visualization with EXPLOSIVE effects
  const vectorAScale = spring({
    frame: frame - 15,
    fps,
    config: { damping: 100, stiffness: 400 },
  });
  
  const vectorBScale = spring({
    frame: frame - 35,
    fps,
    config: { damping: 100, stiffness: 400 },
  });
  
  const explanationScale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 150, stiffness: 300 },
  });

  return (
    <AbsoluteFill>
      {/* Alex with EXPLOSIVE animated gestures - BIGGER */}
      <div
        style={{
          position: 'absolute',
          left: '5%',
          top: '15%',
          transform: `scale(${alexBounce * 1.1})`,
          filter: `drop-shadow(0 0 ${20 + alexGlow * 30}px rgba(255,215,0,0.8))`,
        }}
      >
        <Img
          src={staticFile('/images/image.png')}
          style={{
            width: '400px',
            height: '520px',
            objectFit: 'cover',
            borderRadius: '30px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            filter: 'brightness(1.3) contrast(1.2) saturate(1.4)',
            border: '8px solid rgba(255,215,0,0.8)',
          }}
        />
        
        {/* Alex's explanation bubble - STABLE AND READABLE */}
        <div
          style={{
            position: 'absolute',
            top: '-140px',
            left: '430px',
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '40px',
            borderRadius: '40px',
            maxWidth: '500px',
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#333',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            border: '4px solid #333',
          }}
        >
          🏹 Think of vectors as <strong>POWER ARROWS</strong>! They have both <strong>magnitude</strong> (length) and <strong>direction</strong>! 💥
        </div>
      </div>
      
      {/* Vector Visualization Area - BIGGER AND MORE DRAMATIC */}
      <div
        style={{
          position: 'absolute',
          right: '3%',
          top: '8%',
          width: '650px',
          height: '550px',
          backgroundColor: 'rgba(20,20,20,0.9)',
          borderRadius: '30px',
          padding: '50px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          border: '8px solid #FFD700',
          background: 'linear-gradient(135deg, rgba(20,20,20,0.9), rgba(255,215,0,0.05))',
        }}
      >
        {/* Vector A - EXPLOSIVE ENTRANCE */}
        <div
          style={{
            position: 'absolute',
            top: '120px',
            left: '120px',
            transform: `scale(${vectorAScale * 1.5})`,
            filter: 'drop-shadow(0 0 25px rgba(255,107,107,0.8))',
          }}
        >
          <Img
            src={staticFile('/images/vectorA.png')}
            style={{
              width: '180px',
              height: '120px',
              filter: 'brightness(1.3) contrast(1.2) saturate(1.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#FF6B6B',
              background: 'rgba(255,255,255,0.95)',
              padding: '15px 25px',
              borderRadius: '20px',
              border: '4px solid #FF6B6B',
              textShadow: '0 0 10px rgba(255,107,107,0.5)',
              boxShadow: '0 0 20px rgba(255,107,107,0.3)',
            }}
          >
            🔥 Vector A 🔥
          </div>
        </div>
        
        {/* Vector B - EXPLOSIVE ENTRANCE */}
        <div
          style={{
            position: 'absolute',
            top: '250px',
            left: '320px',
            transform: `scale(${vectorBScale * 1.5})`,
            filter: 'drop-shadow(0 0 25px rgba(76,205,196,0.8))',
          }}
        >
          <Img
            src={staticFile('/images/VectorB.png')}
            style={{
              width: '150px',
              height: '150px',
              filter: 'brightness(1.3) contrast(1.2) saturate(1.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-50px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#4ECDC4',
              background: 'rgba(255,255,255,0.95)',
              padding: '15px 25px',
              borderRadius: '20px',
              border: '4px solid #4ECDC4',
              textShadow: '0 0 10px rgba(76,205,196,0.5)',
              boxShadow: '0 0 20px rgba(76,205,196,0.3)',
            }}
          >
            ⚡ Vector B ⚡
          </div>
        </div>
        
        {/* Explanation text - STABLE AND READABLE */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '30px',
            right: '30px',
            fontSize: '28px',
            color: '#333',
            textAlign: 'center',
            transform: `scale(${Math.min(explanationScale, 1)})`,
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.95)',
            padding: '25px',
            borderRadius: '20px',
            border: '4px solid #333',
            boxShadow: '0 0 20px rgba(0,0,0,0.3)',
          }}
        >
          🎯 Each vector has components (x, y) that determine its POWER and DIRECTION! 🎯
        </div>
      </div>
      
      {/* Sam observing with excitement - BIGGER */}
      <div
        style={{
          position: 'absolute',
          right: '2%',
          bottom: '5%',
          transform: `scale(${0.9 + Math.sin(frame * 0.2) * 0.1})`,
          filter: 'drop-shadow(0 0 15px rgba(255,107,107,0.6))',
        }}
      >
        <Img
          src={staticFile('/images/image (1).png')}
          style={{
            width: '300px',
            height: '380px',
            objectFit: 'cover',
            borderRadius: '20px',
            filter: 'brightness(1.2) contrast(1.1)',
            border: '6px solid rgba(255,107,107,0.6)',
          }}
        />
      </div>
      
      {/* Floating math symbols */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const radius = 150 + Math.sin(frame * 0.1 + i) * 30;
        const x = Math.cos(angle + frame * 0.02) * radius;
        const y = Math.sin(angle + frame * 0.02) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '75%',
              top: '40%',
              transform: `translate(${x}px, ${y}px) scale(${1 + Math.sin(frame * 0.1 + i) * 0.3})`,
              fontSize: '32px',
              opacity: 0.3 + Math.sin(frame * 0.1 + i) * 0.3,
              filter: 'drop-shadow(0 0 8px rgba(255,215,0,0.6))',
            }}
          >
            {['📐', '📏', '🔢', '➕', '✖️', '🧮', '📊', '⚡'][i]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Dot Product Demo
const DotProductDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Sam is now SUPER engaged with explosive energy
  const samScale = 1.2 + Math.sin(frame * 0.25) * 0.2;
  const samGlow = Math.sin(frame * 0.3) * 0.5 + 0.5;
  
  // Formula reveal with EXPLOSIVE effects
  const formulaScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 80, stiffness: 500 },
  });
  
  // Calculation steps with DRAMATIC timing
  const step1Scale = spring({
    frame: frame - 50,
    fps,
    config: { damping: 120, stiffness: 400 },
  });
  
  const step2Scale = spring({
    frame: frame - 80,
    fps,
    config: { damping: 120, stiffness: 400 },
  });
  
  const resultScale = spring({
    frame: frame - 110,
    fps,
    config: { damping: 100, stiffness: 300 },
  });

  return (
    <AbsoluteFill>
      {/* Sam is now the MAIN CHARACTER - MUCH BIGGER */}
      <div
        style={{
          position: 'absolute',
          left: '3%',
          top: '8%',
          transform: `scale(${samScale})`,
          filter: `drop-shadow(0 0 ${25 + samGlow * 35}px rgba(255,107,107,0.8))`,
        }}
      >
        <Img
          src={staticFile('/images/image (1).png')}
          style={{
            width: '480px',
            height: '620px',
            objectFit: 'cover',
            borderRadius: '30px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
            filter: 'brightness(1.3) contrast(1.3) saturate(1.4)',
            border: '8px solid rgba(255,107,107,0.8)',
          }}
        />
        
        {/* Sam's question bubble - STABLE AND READABLE */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            left: '520px',
            backgroundColor: 'rgba(255,255,255,0.95)',
            padding: '40px',
            borderRadius: '40px',
            maxWidth: '550px',
            fontSize: '38px',
            fontWeight: 'bold',
            color: '#333',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
            border: '4px solid #333',
          }}
        >
          🧮 Show me the MATHEMATICAL MAGIC! How do we calculate this DOT PRODUCT?! 🔥
        </div>
      </div>
      
      {/* Math Demonstration Board - MASSIVE AND DRAMATIC */}
      <div
        style={{
          position: 'absolute',
          right: '2%',
          top: '5%',
          width: '750px',
          height: '650px',
          backgroundColor: 'rgba(10,10,10,0.95)',
          borderRadius: '35px',
          padding: '60px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
          border: '10px solid #FFD700',
          background: 'linear-gradient(135deg, rgba(10,10,10,0.95), rgba(255,215,0,0.05))',
        }}
      >
        {/* Formula - STABLE AND READABLE */}
        <div
          style={{
            transform: `scale(${Math.min(formulaScale, 1)})`,
            fontSize: '52px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: '50px',
            background: 'rgba(255,255,255,0.95)',
            padding: '25px',
            borderRadius: '25px',
            border: '4px solid #333',
          }}
        >
          🎯 A · B = |A| |B| cos(θ) 🎯
        </div>
        
        {/* Alternative formula - STABLE */}
        <div
          style={{
            transform: `scale(${Math.min(formulaScale, 1)})`,
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: '40px',
            background: 'rgba(255,255,255,0.95)',
            padding: '20px',
            borderRadius: '20px',
            border: '4px solid #333',
          }}
        >
          ⚡ A · B = Ax×Bx + Ay×By ⚡
        </div>
        
        {/* Step 1 - STABLE */}
        <div
          style={{
            transform: `scale(${Math.min(step1Scale, 1)})`,
            fontSize: '36px',
            color: '#333',
            marginBottom: '30px',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.95)',
            padding: '20px',
            borderRadius: '15px',
            border: '3px solid #333',
          }}
        >
          🔥 Step 1: A = (3, 4), B = (2, 1)
        </div>
        
        {/* Step 2 - STABLE */}
        <div
          style={{
            transform: `scale(${Math.min(step2Scale, 1)})`,
            fontSize: '36px',
            color: '#333',
            marginBottom: '30px',
            fontWeight: 'bold',
            background: 'rgba(255,255,255,0.95)',
            padding: '20px',
            borderRadius: '15px',
            border: '3px solid #333',
          }}
        >
          ⚡ Step 2: (3×2) + (4×1) = 6 + 4
        </div>
        
        {/* Result - STABLE BUT HIGHLIGHTED */}
        <div
          style={{
            transform: `scale(${Math.min(resultScale, 1)})`,
            fontSize: '56px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.95)',
            padding: '30px',
            borderRadius: '25px',
            border: '6px solid #333',
            boxShadow: '0 0 40px rgba(0,0,0,0.3)',
          }}
        >
          🎉 A · B = 10 🎉
        </div>
      </div>
      
      {/* Alex giving ENTHUSIASTIC thumbs up - BIGGER */}
      <div
        style={{
          position: 'absolute',
          left: '1%',
          bottom: '2%',
          transform: `scale(${0.8 + Math.sin(frame * 0.3) * 0.1})`,
          filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.6))',
        }}
      >
        <Img
          src={staticFile('/images/image.png')}
          style={{
            width: '320px',
            height: '400px',
            objectFit: 'cover',
            borderRadius: '20px',
            filter: 'brightness(1.2) contrast(1.1)',
            border: '6px solid rgba(255,215,0,0.6)',
          }}
        />
      </div>
      
      {/* Floating calculation symbols */}
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 10;
        const radius = 200 + Math.sin(frame * 0.1 + i) * 40;
        const x = Math.cos(angle + frame * 0.03) * radius;
        const y = Math.sin(angle + frame * 0.03) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '70%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) scale(${1 + Math.sin(frame * 0.1 + i) * 0.4})`,
              fontSize: '40px',
              opacity: 0.4 + Math.sin(frame * 0.1 + i) * 0.4,
              filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.8))',
            }}
          >
            {['✖️', '➕', '🔢', '🧮', '📊', '⚡', '💥', '🎯', '🔥', '✨'][i]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Interactive Quiz
const InteractiveQuiz: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Both characters SUPER excited with bouncing energy
  const alexScale = 1.1 + Math.sin(frame * 0.4) * 0.2;
  const samScale = 1.1 + Math.sin(frame * 0.35 + 1) * 0.2;
  
  const questionScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 100, stiffness: 400 },
  });
  
  const optionsScale = spring({
    frame: frame - 30,
    fps,
    config: { damping: 120, stiffness: 300 },
  });
  
  const encouragementScale = spring({
    frame: frame - 60,
    fps,
    config: { damping: 80, stiffness: 500 },
  });

  return (
    <AbsoluteFill>
      {/* Both characters SUPER excited - MUCH BIGGER */}
      <div
        style={{
          position: 'absolute',
          left: '2%',
          top: '8%',
          transform: `scale(${alexScale})`,
          filter: 'drop-shadow(0 0 25px rgba(255,215,0,0.8))',
        }}
      >
        <Img
          src={staticFile('/images/image.png')}
          style={{
            width: '380px',
            height: '490px',
            objectFit: 'cover',
            borderRadius: '25px',
            filter: 'brightness(1.3) contrast(1.2) saturate(1.4)',
            border: '8px solid rgba(255,215,0,0.8)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        />
      </div>
      
      <div
        style={{
          position: 'absolute',
          left: '25%',
          top: '8%',
          transform: `scale(${samScale})`,
          filter: 'drop-shadow(0 0 25px rgba(255,107,107,0.8))',
        }}
      >
        <Img
          src={staticFile('/images/image (1).png')}
          style={{
            width: '380px',
            height: '490px',
            objectFit: 'cover',
            borderRadius: '25px',
            filter: 'brightness(1.3) contrast(1.2) saturate(1.4)',
            border: '8px solid rgba(255,107,107,0.8)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          }}
        />
      </div>
      
      {/* Quiz Panel - MASSIVE AND DRAMATIC */}
      <div
        style={{
          position: 'absolute',
          right: '2%',
          top: '5%',
          width: '700px',
          height: '600px',
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderRadius: '35px',
          padding: '60px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          border: '10px solid #FF6B6B',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,107,107,0.05))',
        }}
      >
        {/* Question - STABLE AND READABLE */}
        <div
          style={{
            transform: `scale(${Math.min(questionScale, 1)})`,
            fontSize: '48px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            marginBottom: '50px',
            lineHeight: 1.3,
            background: 'rgba(255,255,255,0.95)',
            padding: '30px',
            borderRadius: '25px',
            border: '4px solid #333',
          }}
        >
          🎯 QUIZ TIME! 🎯
          <br />
          <span style={{ fontSize: '36px' }}>
            What's the dot product of (1,2) and (3,4)?
          </span>
        </div>
        
        {/* Options - STABLE AND READABLE */}
        <div
          style={{
            transform: `scale(${Math.min(optionsScale, 1)})`,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          {['A) 7', 'B) 11', 'C) 5', 'D) 10'].map((option, i) => (
            <div
              key={i}
              style={{
                padding: '25px 35px',
                backgroundColor: i === 1 ? 'rgba(200,255,200,0.8)' : 'rgba(240,240,240,0.9)',
                borderRadius: '20px',
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#333',
                border: i === 1 ? '6px solid #28a745' : '4px solid #333',
                textAlign: 'center',
                cursor: 'pointer',
                boxShadow: i === 1 ? '0 0 30px rgba(40,167,69,0.3)' : '0 10px 20px rgba(0,0,0,0.1)',
                transform: i === 1 ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {option}
            </div>
          ))}
        </div>
        
        {/* Encouragement - STABLE */}
        <div
          style={{
            transform: `scale(${Math.min(encouragementScale, 1)})`,
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#333',
            textAlign: 'center',
            background: 'rgba(200,255,200,0.8)',
            padding: '25px',
            borderRadius: '20px',
            border: '4px solid #28a745',
            boxShadow: '0 0 20px rgba(40,167,69,0.2)',
          }}
        >
          🎉 AMAZING! (1×3) + (2×4) = 3 + 8 = 11 ✨
        </div>
      </div>
      
      {/* Floating quiz symbols */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const radius = 150 + Math.sin(frame * 0.1 + i) * 30;
        const x = Math.cos(angle + frame * 0.05) * radius;
        const y = Math.sin(angle + frame * 0.05) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) scale(${1 + Math.sin(frame * 0.1 + i) * 0.3})`,
              fontSize: '36px',
              opacity: 0.4 + Math.sin(frame * 0.1 + i) * 0.4,
              filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.8))',
            }}
          >
            {['🎯', '🧮', '✨', '🔥', '💡', '⚡', '🎉', '💥'][i]}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// Conclusion
const Conclusion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // EXPLOSIVE celebration animations
  const celebrationScale = spring({
    frame: frame - 5,
    fps,
    config: { damping: 80, stiffness: 500 },
  });
  
  const finalMessageScale = spring({
    frame: frame - 25,
    fps,
    config: { damping: 100, stiffness: 400 },
  });
  
  // Characters celebrating with MAXIMUM energy
  const alexScale = 1.3 + Math.sin(frame * 0.4) * 0.3;
  const samScale = 1.3 + Math.sin(frame * 0.35 + 1) * 0.3;

  return (
    <AbsoluteFill>
      {/* Both characters celebrating - MASSIVE SIZE */}
      <div
        style={{
          position: 'absolute',
          left: '8%',
          top: '12%',
          transform: `scale(${alexScale})`,
          filter: 'drop-shadow(0 0 30px rgba(255,215,0,1))',
        }}
      >
        <Img
          src={staticFile('/images/image.png')}
          style={{
            width: '450px',
            height: '580px',
            objectFit: 'cover',
            borderRadius: '30px',
            filter: 'brightness(1.4) contrast(1.3) saturate(1.5)',
            border: '10px solid rgba(255,215,0,1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        />
      </div>
      
      <div
        style={{
          position: 'absolute',
          right: '8%',
          top: '12%',
          transform: `scale(${samScale})`,
          filter: 'drop-shadow(0 0 30px rgba(255,107,107,1))',
        }}
      >
        <Img
          src={staticFile('/images/image (1).png')}
          style={{
            width: '450px',
            height: '580px',
            objectFit: 'cover',
            borderRadius: '30px',
            filter: 'brightness(1.4) contrast(1.3) saturate(1.5)',
            border: '10px solid rgba(255,107,107,1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        />
      </div>
      
      {/* Celebration message - STABLE AND READABLE */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '50%',
          transform: `translateX(-50%) scale(${Math.min(celebrationScale, 1)})`,
          fontSize: '72px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '30px',
          border: '6px solid #333',
          boxShadow: '0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        🎉 VECTOR MASTERY ACHIEVED! 🎉
        <br />
        <span style={{ fontSize: '48px' }}>
          YOU'RE NOW A DOT PRODUCT WIZARD! 🧙‍♂️
        </span>
      </div>
      
      {/* Final message - STABLE AND READABLE */}
      <div
        style={{
          position: 'absolute',
          bottom: '8%',
          left: '50%',
          transform: `translateX(-50%) scale(${Math.min(finalMessageScale, 1)})`,
          fontSize: '42px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center',
          background: 'rgba(255,255,255,0.95)',
          padding: '40px',
          borderRadius: '30px',
          border: '6px solid #333',
          maxWidth: '1000px',
          boxShadow: '0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        🚀 Now you DOMINATE dot products! 
        <br />
        <span style={{ fontSize: '36px' }}>
          Keep practicing with different vectors! 💪
        </span>
      </div>
      
      {/* EXPLOSIVE floating celebration elements */}
      {Array.from({ length: 15 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 15;
        const radius = 300 + Math.sin(frame * 0.1 + i) * 80;
        const x = Math.cos(angle + frame * 0.05) * radius;
        const y = Math.sin(angle + frame * 0.05) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) rotate(${frame * 3 + i * 24}deg) scale(${1 + Math.sin(frame * 0.1 + i) * 0.5})`,
              fontSize: '48px',
              opacity: 0.6 + Math.sin(frame * 0.1 + i) * 0.4,
              filter: 'drop-shadow(0 0 20px rgba(255,215,0,1))',
            }}
          >
            {['🎊', '✨', '🎉', '💫', '🌟', '🎯', '🔥', '💪', '🚀', '⚡', '💥', '🧙‍♂️', '🏆', '👑', '🎖️'][i]}
          </div>
        );
      })}
      
      {/* Victory fireworks */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`firework-${i}`}
          style={{
            position: 'absolute',
            top: `${20 + i * 15}%`,
            left: `${15 + i * 20}%`,
            fontSize: '64px',
            opacity: Math.sin(frame * 0.2 + i) > 0 ? 1 : 0.3,
            transform: `scale(${1 + Math.sin(frame * 0.2 + i) * 0.5})`,
            filter: 'drop-shadow(0 0 25px rgba(255,215,0,1))',
          }}
        >
          🎆
        </div>
      ))}
    </AbsoluteFill>
  );
};