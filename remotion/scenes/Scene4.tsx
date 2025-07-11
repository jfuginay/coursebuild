import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

export const Scene4: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    
    // Matrix-style background glitch
    const glitchIntensity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Phone spins and scales dramatically
    const phoneRotation = interpolate(frame, [0, 30], [0, 360], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    const phoneScale = spring({
        frame: frame - 10,
        fps,
        config: { damping: 200, stiffness: 400 },
    });
    
    // ERROR! text explosion
    const errorScale = spring({
        frame: frame - 40,
        fps,
        config: { damping: 100, stiffness: 500 },
    });
    
    const errorOpacity = interpolate(frame, [40, 50], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Multiple question marks flying around
    const questionMarks = Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const radius = interpolate(frame, [50, 80], [0, 200], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        });
        return {
            x: Math.cos(angle + frame * 0.05) * radius,
            y: Math.sin(angle + frame * 0.05) * radius,
            scale: 0.5 + Math.sin(frame * 0.1 + i) * 0.3,
            opacity: interpolate(frame, [50, 70, 100], [0, 1, 0.3], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
            }),
        };
    });
    
    // Number highlights with aggressive pulsing
    const numberPulse = 1 + Math.sin(frame * 0.3) * 0.5;
    const numberGlow = interpolate(frame, [60, 80], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Screen crack effect
    const crackOpacity = interpolate(frame, [30, 40], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Mind-blown text effect
    const mindBlownScale = spring({
        frame: frame - 90,
        fps,
        config: { damping: 150, stiffness: 300 },
    });
    
    const mindBlownOpacity = interpolate(frame, [90, 110], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {/* Glitchy background */}
            <Img 
                src={staticFile('/images/Gemini_Generated_Image_mzu60ymzu60ymzu6.png')} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.3,
                    filter: `hue-rotate(${frame * 2}deg) contrast(${1 + glitchIntensity}) brightness(${1 + glitchIntensity * 0.5})`,
                    transform: `translate(${Math.sin(frame * 0.5) * glitchIntensity * 3}px, ${Math.cos(frame * 0.3) * glitchIntensity * 2}px)`,
                }}
            />
            
            {/* Digital rain effect */}
            {Array.from({ length: 20 }).map((_, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: `${((frame * 2 + i * 50) % 1200) - 100}px`,
                        left: `${(i * 96) % 1920}px`,
                        width: '2px',
                        height: '60px',
                        background: 'linear-gradient(to bottom, transparent, #00FF00, transparent)',
                        opacity: glitchIntensity * 0.6,
                    }}
                />
            ))}
            
            {/* Smartphone with dramatic effects */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `rotate(${phoneRotation}deg) scale(${phoneScale})`,
                }}
            >
                <div style={{ position: 'relative' }}>
                    {/* Phone electric aura */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '-30px',
                            background: `radial-gradient(circle, rgba(255,59,48,${numberGlow * 0.4}), transparent)`,
                            borderRadius: '40px',
                            filter: 'blur(20px)',
                            animation: 'pulse 0.5s infinite',
                        }}
                    />
                    
                    <Img 
                        src={staticFile('/images/Gemini_Generated_Image_gqskt8gqskt8gqsk.png')} 
                        style={{
                            width: '450px',
                            height: '550px',
                            objectFit: 'contain',
                            borderRadius: '25px',
                            boxShadow: `0 30px 60px rgba(255,59,48,${numberGlow * 0.8})`,
                            filter: `brightness(${1 + numberGlow * 0.5}) saturate(${1 + numberGlow})`,
                        }}
                    />
                    
                    {/* Screen crack overlay */}
                    <div
                        style={{
                            position: 'absolute',
                            inset: '0',
                            background: `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10,10 L90,90 M90,10 L10,90 M50,0 L50,100 M0,50 L100,50" stroke="red" stroke-width="0.5" fill="none"/></svg>')}")`,
                            opacity: crackOpacity,
                            borderRadius: '25px',
                        }}
                    />
                    
                    {/* Explosive number highlights */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '20%',
                            padding: '12px 16px',
                            backgroundColor: `rgba(255, 59, 48, ${numberGlow})`,
                            borderRadius: '12px',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: 'white',
                            fontFamily: 'Arial, sans-serif',
                            transform: `scale(${numberPulse})`,
                            boxShadow: '0 0 30px rgba(255, 59, 48, 0.8)',
                            border: '2px solid #FFF',
                        }}
                    >
                        2700K
                    </div>
                    
                    <div
                        style={{
                            position: 'absolute',
                            top: '50%',
                            right: '20%',
                            padding: '12px 16px',
                            backgroundColor: `rgba(255, 59, 48, ${numberGlow})`,
                            borderRadius: '12px',
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: 'white',
                            fontFamily: 'Arial, sans-serif',
                            transform: `scale(${numberPulse})`,
                            boxShadow: '0 0 30px rgba(255, 59, 48, 0.8)',
                            border: '2px solid #FFF',
                        }}
                    >
                        6500K
                    </div>
                </div>
            </AbsoluteFill>
            
            {/* Flying question marks */}
            {questionMarks.map((qm, i) => (
                <AbsoluteFill
                    key={i}
                    style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        transform: `translate(${qm.x}px, ${qm.y}px) scale(${qm.scale})`,
                        opacity: qm.opacity,
                    }}
                >
                    <div
                        style={{
                            fontSize: '60px',
                            fontWeight: 'bold',
                            color: '#FF3B30',
                            textShadow: '0 0 20px rgba(255, 59, 48, 0.8)',
                            fontFamily: 'Arial, sans-serif',
                            transform: `rotate(${frame * 2}deg)`,
                        }}
                    >
                        ?
                    </div>
                </AbsoluteFill>
            ))}
            
            {/* ERROR! text explosion */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `translateY(-100px)`,
                }}
            >
                <div
                    style={{
                        fontSize: 120,
                        fontWeight: 'bold',
                        color: '#FF3B30',
                        textAlign: 'center',
                        opacity: errorOpacity,
                        transform: `scale(${errorScale}) rotate(${Math.sin(frame * 0.1) * 5}deg)`,
                        textShadow: '0 0 40px rgba(255, 59, 48, 0.8), 0 0 80px rgba(255, 59, 48, 0.4)',
                        fontFamily: 'Arial, sans-serif',
                        background: 'linear-gradient(45deg, #FF3B30, #FFD700, #FF3B30)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}
                >
                    ⚠️ ERROR! ⚠️
                </div>
            </AbsoluteFill>
            
            {/* Mind-blown text */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    padding: '0 60px 60px 60px',
                }}
            >
                <div
                    style={{
                        fontSize: 52,
                        fontWeight: 'bold',
                        color: '#FFFFFF',
                        textAlign: 'center',
                        opacity: mindBlownOpacity,
                        transform: `scale(${mindBlownScale})`,
                        textShadow: '0 0 20px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.8)',
                        fontFamily: 'Arial, sans-serif',
                        background: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        maxWidth: '900px',
                        lineHeight: 1.3,
                    }}
                >
                    🤯 WAIT... THAT'S BACKWARDS! 🤯
                    <br />
                    <span style={{ fontSize: '36px', WebkitTextFillColor: '#FFF' }}>
                        Lower = Warm? Higher = Cool?
                    </span>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};