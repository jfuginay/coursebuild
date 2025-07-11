import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene2: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    // Rapid fire transition from dark to warm
    const transitionSpeed = interpolate(frame, [0, 20], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Phone rockets in from off-screen
    const phoneX = spring({
        frame: frame - 10,
        fps,
        config: { damping: 150, stiffness: 400 },
    });
    const phoneXPos = interpolate(phoneX, [0, 1], [800, 0]);
    
    // Phone rotation and scale for dramatic effect
    const phoneRotation = interpolate(frame, [10, 40], [25, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    const phoneScale = interpolate(frame, [10, 40], [1.5, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Finger tap animation
    const fingerTap = frame >= 50 && frame <= 70;
    const fingerScale = fingerTap ? 1 + Math.sin((frame - 50) * 0.8) * 0.3 : 0;
    
    // Slider animation with bounce
    const sliderProgress = spring({
        frame: frame - 50,
        fps,
        config: { damping: 300, stiffness: 500 },
    });
    
    // Light explosion effect
    const lightExplosion = interpolate(frame, [70, 85], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Screen glow effect
    const screenGlow = interpolate(frame, [40, 70], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Text with typing effect
    const textProgress = interpolate(frame, [90, 130], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    const fullText = "🍿 MOVIE NIGHT VIBES 🍿";
    const visibleText = fullText.substring(0, Math.floor(textProgress * fullText.length));
    
    return (
        <AbsoluteFill>
            {/* Dark room background */}
            <Img 
                src={staticFile('/images/Gemini_Generated_Image_9xgvja9xgvja9xgv.png')} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: `brightness(${1 - transitionSpeed * 0.3})`,
                }}
            />
            
            {/* Warm room overlay with explosion effect */}
            <Img 
                src={staticFile('/images/Gemini_Generated_Image_fcik8gfcik8gfcik.png')} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: lightExplosion,
                    transform: `scale(${1 + lightExplosion * 0.1})`,
                    filter: `brightness(${1 + lightExplosion * 0.5}) saturate(${1 + lightExplosion})`,
                }}
            />
            
            {/* Light rays effect */}
            <AbsoluteFill
                style={{
                    background: `radial-gradient(circle at 60% 40%, 
                        rgba(255,165,0,${lightExplosion * 0.4}) 0%, 
                        rgba(255,69,0,${lightExplosion * 0.2}) 30%, 
                        transparent 70%)`,
                }}
            />
            
            {/* Smartphone with dramatic entrance */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `translateX(${phoneXPos}px) rotate(${phoneRotation}deg) scale(${phoneScale})`,
                }}
            >
                <div style={{ position: 'relative', marginLeft: '200px' }}>
                    {/* Phone glow */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '-20px',
                            background: `radial-gradient(circle, rgba(255,165,0,${screenGlow * 0.3}), transparent)`,
                            borderRadius: '30px',
                            filter: 'blur(20px)',
                        }}
                    />
                    
                    <Img 
                        src={staticFile('/images/Gemini_Generated_Image_gqskt8gqskt8gqsk.png')} 
                        style={{
                            width: '350px',
                            height: '450px',
                            objectFit: 'contain',
                            borderRadius: '25px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                            filter: `brightness(${1 + screenGlow * 0.3})`,
                        }}
                    />
                    
                    {/* Animated finger tap */}
                    {fingerTap && (
                        <div
                            style={{
                                position: 'absolute',
                                top: '45%',
                                left: '25%',
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: 'rgba(255,255,255,0.3)',
                                transform: `scale(${fingerScale})`,
                                border: '3px solid rgba(255,255,255,0.8)',
                                animation: 'ping 0.3s ease-out',
                            }}
                        />
                    )}
                    
                    {/* Animated slider with particles */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '45%',
                            left: '15%',
                            width: '70%',
                            height: '8px',
                            background: 'rgba(255,255,255,0.4)',
                            borderRadius: '4px',
                            transform: 'translateY(-50%)',
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                width: `${sliderProgress * 40}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #FF6B35, #FFD700)',
                                borderRadius: '4px',
                                boxShadow: '0 0 20px rgba(255,215,0,0.8)',
                                position: 'relative',
                            }}
                        />
                        
                        {/* Slider particles */}
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: `${sliderProgress * 40 + Math.random() * 20}%`,
                                    width: '3px',
                                    height: '3px',
                                    background: '#FFD700',
                                    borderRadius: '50%',
                                    transform: 'translateY(-50%)',
                                    opacity: Math.random(),
                                    boxShadow: '0 0 6px #FFD700',
                                }}
                            />
                        ))}
                    </div>
                </div>
            </AbsoluteFill>
            
            {/* Dynamic text with typewriter effect */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    padding: '0 60px 80px 60px',
                }}
            >
                <div
                    style={{
                        fontSize: 64,
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        textShadow: '0 0 20px rgba(255,165,0,0.8), 0 4px 8px rgba(0,0,0,0.8)',
                        fontFamily: 'Arial, sans-serif',
                        background: 'linear-gradient(45deg, #FF6B35, #FFD700, #FF6B35)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        transform: `scale(${1 + Math.sin(frame * 0.2) * 0.05})`,
                    }}
                >
                    {visibleText}
                    {textProgress < 1 && (
                        <span style={{ 
                            opacity: Math.sin(frame * 0.5) > 0 ? 1 : 0,
                            color: '#FFD700',
                            WebkitTextFillColor: '#FFD700',
                        }}>|</span>
                    )}
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};