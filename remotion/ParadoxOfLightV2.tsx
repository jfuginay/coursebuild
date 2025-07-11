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
import React from 'react';

// 1. Main Scene Component
export const ParadoxOfLightV2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: 'black', color: 'white', fontFamily: 'Arial, sans-serif'}}>
      <Sequence from={0} durationInFrames={60}>
        <DiagramFadeIn />
      </Sequence>
      <Sequence from={60} durationInFrames={90}>
        <WarningOverlay />
      </Sequence>
      <Sequence from={150} durationInFrames={90}>
        <KineticText />
      </Sequence>
      <Sequence from={240} durationInFrames={60}>
        <PromptText />
      </Sequence>
    </AbsoluteFill>
  );
};

// 2. System Diagram (fades in)
const DiagramFadeIn: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: 'clamp'});
  
  // Add subtle zoom effect for engagement
  const scale = interpolate(frame, [0, 30], [1.1, 1], {extrapolateRight: 'clamp'});
  
  // Glitch effect for college student attention
  const glitchX = frame % 20 < 2 ? (Math.random() - 0.5) * 3 : 0;
  const glitchY = frame % 25 < 1 ? (Math.random() - 0.5) * 2 : 0;

  return (
    <AbsoluteFill style={{
      justifyContent: 'center', 
      alignItems: 'center', 
      opacity,
      transform: `scale(${scale}) translate(${glitchX}px, ${glitchY}px)`
    }}>
      {/* Background glow effect */}
      <div style={{
        position: 'absolute',
        width: '90%',
        height: '70%',
        background: 'radial-gradient(circle, rgba(255,165,0,0.1) 0%, transparent 70%)',
        borderRadius: '20px',
        filter: 'blur(30px)',
      }} />
      
      {/* Using the smart bulb phone image */}
      <Img 
        src={staticFile('/images/Gemini_Generated_Image_gqskt8gqskt8gqsk.png')} 
        style={{
          width: '60%',
          height: 'auto',
          borderRadius: '20px',
          boxShadow: '0 20px 40px rgba(255,165,0,0.3)',
          filter: `brightness(${1 + Math.sin(frame * 0.1) * 0.1})`
        }} 
      />
      
      {/* Floating particles around the diagram */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 6;
        const radius = 200 + Math.sin(frame * 0.05 + i) * 30;
        const x = Math.cos(angle + frame * 0.02) * radius;
        const y = Math.sin(angle + frame * 0.02) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px)`,
              width: '8px',
              height: '8px',
              background: '#FFD700',
              borderRadius: '50%',
              boxShadow: '0 0 15px #FFD700',
              opacity: 0.6 + Math.sin(frame * 0.1 + i) * 0.4,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// 3. Flashing warning icons
const WarningOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 10) % 2 === 0; // Faster blinking
  
  // Add pulsing effect
  const pulseScale = 1 + Math.sin(frame * 0.3) * 0.2;
  
  // Explosive entrance
  const entranceScale = interpolate(frame, [0, 15], [0, 1], {extrapolateRight: 'clamp'});

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    fontSize: 32,
    fontWeight: 'bold',
    padding: '12px 16px',
    backgroundColor: blink ? '#FF3B30' : 'rgba(255,59,48,0.2)',
    borderRadius: 12,
    border: '3px solid #FF3B30',
    boxShadow: blink ? '0 0 30px rgba(255,59,48,0.8)' : '0 0 10px rgba(255,59,48,0.3)',
    transform: `scale(${entranceScale * pulseScale})`,
    color: 'white',
    textShadow: '0 0 10px rgba(255,255,255,0.5)',
  };

  return (
    <>
      {/* Screen crack effect */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,10 L90,90 M90,10 L10,90 M50,0 L50,100 M0,50 L100,50" stroke="red" stroke-width="0.3" fill="none" opacity="0.3"/></svg>')}")`,
        opacity: blink ? 0.3 : 0,
      }} />
      
      <div style={{...labelStyle, top: '35%', left: '20%'}}>
        ⚠️ 2700K "Warm"
      </div>
      <div style={{...labelStyle, top: '35%', right: '20%'}}>
        ⚠️ 6500K "Cool"
      </div>
      
      {/* Confusion emojis floating around */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const radius = 100 + Math.sin(frame * 0.1 + i) * 20;
        const x = Math.cos(angle + frame * 0.05) * radius;
        const y = Math.sin(angle + frame * 0.05) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px) rotate(${frame * 2}deg)`,
              fontSize: '24px',
              opacity: 0.3 + Math.sin(frame * 0.1 + i) * 0.3,
            }}
          >
            🤔
          </div>
        );
      })}
    </>
  );
};

// 4. Kinetic Text
const KineticText: React.FC = () => {
  const frame = useCurrentFrame();
  const slideIn = interpolate(frame, [0, 30], [100, 0], {extrapolateRight: 'clamp'});
  const opacity = interpolate(frame, [0, 20], [0, 1]);
  
  // Add dramatic shake effect
  const shakeX = Math.sin(frame * 0.5) * 3;
  const shakeY = Math.cos(frame * 0.3) * 2;
  
  // Color cycling for attention
  const colorCycle = frame % 30;
  const color = colorCycle < 10 ? '#FF3B30' : colorCycle < 20 ? '#FFD700' : '#FF6B35';

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        width: '100%',
        textAlign: 'center',
        transform: `translateY(${slideIn - 50}px) translate(${shakeX}px, ${shakeY}px)`,
        opacity,
        fontSize: 56,
        fontWeight: 'bold',
        color,
        textShadow: '0 0 20px rgba(255,255,255,0.8), 0 4px 8px rgba(0,0,0,0.8)',
        background: 'linear-gradient(45deg, #FF3B30, #FFD700, #FF6B35)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}
    >
      🚨 SYSTEM MALFUNCTION! 🚨
      <br />
      <span style={{ 
        fontSize: '36px',
        WebkitTextFillColor: '#FFF',
        color: '#FFF',
        display: 'block',
        marginTop: '10px'
      }}>
        Logic.exe has stopped working
      </span>
    </div>
  );
};

// 5. Final Prompt
const PromptText: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const springOpacity = spring({
    fps,
    frame,
    config: {damping: 200},
  });
  
  const springScale = spring({
    fps,
    frame: frame - 10,
    config: {damping: 150, stiffness: 300},
  });

  // Typing effect for the challenge text
  const challengeText = "🎯 YOUR MISSION: Explain why 'Warm' has a LOWER temperature than 'Cool'! 🤯";
  const typingProgress = interpolate(frame, [20, 50], [0, 1], {extrapolateRight: 'clamp'});
  const visibleText = challengeText.substring(0, Math.floor(typingProgress * challengeText.length));

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 80,
        width: '100%',
        textAlign: 'center',
        fontSize: 42,
        color: 'white',
        opacity: springOpacity,
        transform: `scale(${springScale})`,
        fontWeight: 'bold',
        background: 'rgba(0,0,0,0.8)',
        padding: '30px',
        borderRadius: '20px',
        margin: '0 60px',
        border: '3px solid #FFD700',
        boxShadow: '0 0 30px rgba(255,215,0,0.4)',
      }}
    >
      {visibleText}
      {typingProgress < 1 && (
        <span style={{ 
          opacity: Math.sin(frame * 0.5) > 0 ? 1 : 0,
          color: '#FFD700',
          marginLeft: '3px'
        }}>|</span>
      )}
      
      {/* Floating challenge indicators */}
      {typingProgress >= 1 && Array.from({ length: 4 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 4;
        const radius = 50 + Math.sin(frame * 0.1 + i) * 15;
        const x = Math.cos(angle + frame * 0.03) * radius;
        const y = Math.sin(angle + frame * 0.03) * radius;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: `translate(${x}px, ${y}px)`,
              fontSize: '20px',
              opacity: 0.6 + Math.sin(frame * 0.1 + i) * 0.4,
            }}
          >
            💡
          </div>
        );
      })}
    </div>
  );
};