import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene3: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    // Crossfade from warm to cool lighting
    const coolLightOpacity = interpolate(frame, [0, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Slider animation - moving to the cool side
    const sliderProgress = interpolate(frame, [20, 80], [0.3, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Text animation
    const textOpacity = interpolate(frame, [60, 90], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Subtle floating animation for phone
    const phoneFloat = Math.sin(frame * 0.08) * 3;
    
    // Color temperature transition effect
    const colorShift = interpolate(frame, [0, 60], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    return (
        <AbsoluteFill>
            {/* Warm room background */}
            <Img 
                src={staticFile('/images/Gemini_Generated_Image_fcik8gfcik8gfcik.png')} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                }}
            />
            
            {/* Cool room overlay */}
            <Img 
                src={staticFile('/images/Gemini_Generated_Image_mzu60ymzu60ymzu6.png')} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: coolLightOpacity,
                }}
            />
            
            {/* Color temperature transition overlay */}
            <AbsoluteFill
                style={{
                    background: `linear-gradient(45deg, 
                        rgba(255, 147, 41, ${0.3 * (1 - colorShift)}) 0%, 
                        rgba(41, 128, 255, ${0.3 * colorShift}) 100%
                    )`,
                }}
            />
            
            {/* Smartphone UI */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `translateY(${phoneFloat}px)`,
                }}
            >
                <div style={{ position: 'relative', marginLeft: '300px' }}>
                    <Img 
                        src={staticFile('/images/Gemini_Generated_Image_gqskt8gqskt8gqsk.png')} 
                        style={{
                            width: '300px',
                            height: '400px',
                            objectFit: 'contain',
                            borderRadius: '20px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        }}
                    />
                    
                    {/* Animated slider indicator */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '15%',
                            width: '70%',
                            height: '4px',
                            background: 'rgba(255,255,255,0.3)',
                            borderRadius: '2px',
                            transform: 'translateY(-50%)',
                        }}
                    >
                        <div
                            style={{
                                width: `${sliderProgress * 70}%`,
                                height: '100%',
                                background: sliderProgress > 0.6 ? '#4A90E2' : '#FF6B35',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease, background-color 0.3s ease',
                            }}
                        />
                    </div>
                </div>
            </AbsoluteFill>
            
            {/* Text overlay */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    padding: '0 60px 100px 60px',
                }}
            >
                <div
                    style={{
                        fontSize: 48,
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        opacity: textOpacity,
                        textShadow: '0 4px 8px rgba(0,0,0,0.8)',
                        fontFamily: 'Arial, sans-serif',
                        maxWidth: '800px',
                    }}
                >
                    ...not a "cool" blue light like an office or a lab.
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};