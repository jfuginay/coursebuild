import {interpolate, useCurrentFrame} from 'remotion';
import {AbsoluteFill} from 'remotion';
import React from 'react';

export const DialogueBox = ({text, x = 0, y = 20}: {text: string; x?: number; y?: number}) => {
    const frame = useCurrentFrame();
    const opacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    // Add bouncing entrance animation
    const scale = interpolate(frame, [0, 15], [0.8, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    // Add subtle floating animation
    const float = Math.sin(frame * 0.1) * 2;
    
    // Add slight rotation for more liveliness
    const wiggle = Math.sin(frame * 0.15) * 0.5;

    return (
        <AbsoluteFill style={{
            opacity, 
            justifyContent: 'center', 
            alignItems: 'center', 
            transform: `translate(${x}px, ${y + float}px) rotate(${wiggle}deg) scale(${scale})`
        }}>
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                padding: '30px 60px',
                maxWidth: '800px',
                margin: '0 40px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                border: '3px solid #8B4513',
                transform: `translateY(${Math.sin(frame * 0.08) * 1}px)`, // Additional subtle movement
            }}>
                <p style={{
                    fontFamily: 'Georgia, serif', 
                    fontSize: 42, 
                    textAlign: 'center', 
                    color: '#2C3E50',
                    margin: 0,
                    lineHeight: 1.4,
                }}>
                    {text}
                </p>
            </div>
        </AbsoluteFill>
    );
};