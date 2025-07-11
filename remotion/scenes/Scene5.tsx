import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene5: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    // Phone rockets up from bottom with overshoot
    const phoneY = spring({
        frame: frame - 5,
        fps,
        config: { damping: 200, stiffness: 500 },
    });
    const phoneYPos = interpolate(phoneY, [0, 1], [600, 0]);
    
    // Phone bounces and tilts
    const phoneTilt = interpolate(frame, [20, 40], [-5, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Friend's message pops in with bounce
    const friendMessageScale = spring({
        frame: frame - 30,
        fps,
        config: { damping: 300, stiffness: 600 },
    });
    
    const friendMessageOpacity = interpolate(frame, [30, 40], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Notification effects
    const notificationPulse = interpolate(frame, [25, 35], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Typing indicator with more energy
    const typingScale = 1 + Math.sin(frame * 0.5) * 0.2;
    const dot1Opacity = Math.sin(frame * 0.8) > 0 ? 1 : 0.3;
    const dot2Opacity = Math.sin(frame * 0.8 + 1) > 0 ? 1 : 0.3;
    const dot3Opacity = Math.sin(frame * 0.8 + 2) > 0 ? 1 : 0.3;
    
    // Cursor with faster blinking
    const cursorOpacity = Math.sin(frame * 0.3) > 0 ? 1 : 0;
    
    // Challenge text with dramatic entrance
    const challengeScale = spring({
        frame: frame - 100,
        fps,
        config: { damping: 150, stiffness: 400 },
    });
    
    const challengeOpacity = interpolate(frame, [100, 120], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Floating particles around challenge
    const particles = Array.from({ length: 8 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const radius = 50 + Math.sin(frame * 0.1 + i) * 20;
        return {
            x: Math.cos(angle + frame * 0.02) * radius,
            y: Math.sin(angle + frame * 0.02) * radius,
            scale: 0.5 + Math.sin(frame * 0.1 + i) * 0.3,
            opacity: challengeOpacity * (0.6 + Math.sin(frame * 0.1 + i) * 0.4),
        };
    });
    
    // Pressure meter effect
    const pressureLevel = interpolate(frame, [120, 180], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    return (
        <AbsoluteFill style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}>
            {/* Animated background elements */}
            {Array.from({ length: 10 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: `${(i * 120) % 1080}px`,
                        left: `${((frame * 0.5 + i * 200) % 2000) - 100}px`,
                        width: '4px',
                        height: '40px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        transform: `rotate(${frame * 0.1 + i * 45}deg)`,
                    }}
                />
            ))}
            
            {/* Text message interface with dramatic entrance */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `translateY(${phoneYPos}px) rotate(${phoneTilt}deg)`,
                }}
            >
                <div style={{ 
                    position: 'relative',
                    width: '450px',
                    height: '650px',
                    background: '#fff',
                    borderRadius: '40px',
                    boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '50px 25px',
                    border: '4px solid rgba(255,255,255,0.8)',
                }}>
                    {/* Notification badge */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            width: '25px',
                            height: '25px',
                            background: '#FF3B30',
                            borderRadius: '50%',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: `scale(${1 + notificationPulse * 0.3})`,
                            opacity: notificationPulse,
                            boxShadow: '0 0 15px rgba(255, 59, 48, 0.6)',
                        }}
                    >
                        1
                    </div>
                    
                    {/* Header with status */}
                    <div style={{
                        textAlign: 'center',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        marginBottom: '20px',
                        color: '#333',
                        fontFamily: 'Arial, sans-serif',
                    }}>
                        Dave 🤔
                        <div style={{
                            fontSize: '12px',
                            color: '#00C851',
                            marginTop: '5px',
                        }}>
                            • online
                        </div>
                    </div>
                    
                    {/* Friend's message with bounce */}
                    <div
                        style={{
                            backgroundColor: '#e5e5ea',
                            padding: '20px',
                            borderRadius: '25px',
                            marginBottom: '15px',
                            maxWidth: '85%',
                            alignSelf: 'flex-start',
                            opacity: friendMessageOpacity,
                            transform: `scale(${friendMessageScale})`,
                            fontSize: '18px',
                            fontFamily: 'Arial, sans-serif',
                            lineHeight: 1.4,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        Hey man, got that smart bulb you recommended. Why is the warm setting a lower temperature? Makes no sense. 🤷‍♂️
                    </div>
                    
                    {/* Typing indicator with energy */}
                    <div
                        style={{
                            backgroundColor: '#e5e5ea',
                            padding: '20px',
                            borderRadius: '25px',
                            marginBottom: '20px',
                            maxWidth: '80px',
                            alignSelf: 'flex-start',
                            opacity: friendMessageOpacity,
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: `scale(${typingScale})`,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        }}
                    >
                        <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            backgroundColor: '#007AFF', 
                            borderRadius: '50%',
                            opacity: dot1Opacity,
                        }} />
                        <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            backgroundColor: '#007AFF', 
                            borderRadius: '50%',
                            opacity: dot2Opacity,
                        }} />
                        <div style={{ 
                            width: '8px', 
                            height: '8px', 
                            backgroundColor: '#007AFF', 
                            borderRadius: '50%',
                            opacity: dot3Opacity,
                        }} />
                    </div>
                    
                    {/* Reply box with glow */}
                    <div style={{
                        marginTop: 'auto',
                        backgroundColor: '#f8f8f8',
                        borderRadius: '25px',
                        padding: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        border: '2px solid rgba(0,122,255,0.3)',
                    }}>
                        <div style={{
                            flex: 1,
                            fontSize: '18px',
                            color: '#666',
                            fontFamily: 'Arial, sans-serif',
                        }}>
                            Your brilliant explanation...
                            <span style={{ 
                                opacity: cursorOpacity,
                                marginLeft: '3px',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: '#007AFF',
                            }}>|</span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#007AFF',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,122,255,0.3)',
                            transform: `scale(${1 + Math.sin(frame * 0.1) * 0.05})`,
                        }}>
                            →
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
            
            {/* Challenge text with particles */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    padding: '0 60px 40px 60px',
                }}
            >
                {/* Floating particles */}
                {particles.map((particle, i) => (
                    <div
                        key={i}
                        style={{
                            position: 'absolute',
                            top: '60%',
                            left: '50%',
                            transform: `translate(${particle.x}px, ${particle.y}px) scale(${particle.scale})`,
                            opacity: particle.opacity,
                            width: '8px',
                            height: '8px',
                            background: '#FFD700',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #FFD700',
                        }}
                    />
                ))}
                
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        opacity: challengeOpacity,
                        transform: `scale(${challengeScale})`,
                        fontFamily: 'Arial, sans-serif',
                        maxWidth: '900px',
                        lineHeight: 1.3,
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '40px',
                        borderRadius: '20px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        border: '3px solid #FFD700',
                    }}
                >
                    <div style={{ color: '#FF6B6B', fontSize: '56px', marginBottom: '20px' }}>
                        🎯 YOUR CHALLENGE 🎯
                    </div>
                    <div style={{ color: '#333', fontSize: '32px', marginBottom: '15px' }}>
                        Explain this paradox in simple terms!
                    </div>
                    <div style={{ 
                        color: '#666',
                        fontSize: '24px',
                        fontStyle: 'italic',
                    }}>
                        Use a real-world analogy that makes sense 🧠
                    </div>
                    
                    {/* Pressure meter */}
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: 'rgba(255, 107, 107, 0.1)',
                        borderRadius: '10px',
                        border: '2px solid #FF6B6B',
                    }}>
                        <div style={{ fontSize: '18px', color: '#FF6B6B', marginBottom: '8px' }}>
                            ⏱️ PRESSURE LEVEL
                        </div>
                        <div style={{
                            width: '100%',
                            height: '8px',
                            background: 'rgba(255, 107, 107, 0.2)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                        }}>
                            <div
                                style={{
                                    width: `${pressureLevel * 100}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #FFD700, #FF6B6B)',
                                    borderRadius: '4px',
                                    boxShadow: '0 0 10px rgba(255, 107, 107, 0.5)',
                                }}
                            />
                        </div>
                    </div>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};