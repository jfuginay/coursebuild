import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene1: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    // Explosive zoom-in effect
    const roomScale = interpolate(frame, [0, 30], [1.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Flash effect for dramatic entrance
    const flashOpacity = interpolate(frame, [0, 5, 10], [1, 0, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Text explosion effect
    const textScale = spring({
        frame: frame - 15,
        fps,
        config: { damping: 100, stiffness: 300 },
    });
    
    const textOpacity = interpolate(frame, [15, 25], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Multiple text particles effect
    const particles = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const distance = interpolate(frame, [15, 35], [100, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
        return {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            opacity: interpolate(frame, [15, 25, 35], [0, 1, 0], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }),
        };
    });
    
    // Glitch effect
    const glitchX = frame % 10 < 2 ? (Math.random() - 0.5) * 5 : 0;
    const glitchY = frame % 15 < 1 ? (Math.random() - 0.5) * 3 : 0;
    
    return (
        <AbsoluteFill>
            {/* Dark living room background with zoom */}
            <Img 
                src={staticFile('/images/Gemini_Generated_Image_9xgvja9xgvja9xgv.png')} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${roomScale}) translate(${glitchX}px, ${glitchY}px)`,
                    filter: `contrast(${1 + Math.sin(frame * 0.3) * 0.2}) saturate(${1 + Math.sin(frame * 0.2) * 0.3})`,
                }}
            />
            
            {/* Flash overlay */}
            <AbsoluteFill
                style={{
                    background: '#FFFFFF',
                    opacity: flashOpacity,
                }}
            />
            
            {/* Dramatic gradient overlay */}
            <AbsoluteFill
                style={{
                    background: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 70%)',
                }}
            />
            
            {/* Particle effects */}
            {particles.map((particle, i) => (
                <AbsoluteFill
                    key={i}
                    style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: `translate(${particle.x}px, ${particle.y}px)`,
                        opacity: particle.opacity,
                    }}
                >
                    <div
                        style={{
                            width: '4px',
                            height: '4px',
                            backgroundColor: '#FFD700',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #FFD700',
                        }}
                    />
                </AbsoluteFill>
            ))}
            
            {/* Main text with explosive entrance */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        fontSize: 72,
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        opacity: textOpacity,
                        transform: `scale(${textScale}) rotate(${Math.sin(frame * 0.1) * 2}deg)`,
                        textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.6)',
                        fontFamily: 'Arial, sans-serif',
                        background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        animation: frame > 20 ? 'pulse 0.5s infinite' : 'none',
                    }}
                >
                    💡 SMART BULB INSTALLED! 💡
                </div>
            </AbsoluteFill>
            
            {/* Subtitle */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    padding: '0 60px 150px 60px',
                }}
            >
                <div
                    style={{
                        fontSize: 40,
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        opacity: interpolate(frame, [40, 60], [0, 1], {
                            extrapolateLeft: 'clamp',
                            extrapolateRight: 'clamp',
                        }),
                        textShadow: '0 4px 8px rgba(0,0,0,0.8)',
                        fontFamily: 'Arial, sans-serif',
                        transform: `translateY(${Math.sin(frame * 0.15) * 3}px)`,
                    }}
                >
                    Time to set the mood... 🌟
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};