import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AbsoluteFill} from 'remotion';
import React from 'react';

export const Prompt = () => {
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();
    const scale = spring({frame, fps, config: {damping: 12}});

    // Add floating animation
    const float = Math.sin(frame * 0.05) * 3;
    
    // Add pulsing effect to the awaiting text
    const pulseBrightness = 0.8 + Math.sin(frame * 0.1) * 0.2;
    
    // Add subtle rotation
    const wiggle = Math.sin(frame * 0.03) * 0.3;

    return (
        <AbsoluteFill style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <div style={{
                transform: `scale(${scale}) translateY(${float}px) rotate(${wiggle}deg)`, 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: 20, 
                padding: 60, 
                boxShadow: '0 15px 40px rgba(0, 0, 0, 0.3)', 
                width: '70%', 
                fontFamily: 'Arial, sans-serif',
                border: '3px solid #3498DB'
            }}>
                <h2 style={{
                    fontSize: 50, 
                    textAlign: 'center', 
                    marginTop: 0,
                    transform: `translateY(${Math.sin(frame * 0.08) * 1}px)` // Subtle title movement
                }}>
                    Can you break it down for them?
                </h2>
                <p style={{
                    fontSize: 35, 
                    lineHeight: 1.5,
                    transform: `translateY(${Math.sin(frame * 0.06) * 0.5}px)` // Slight text movement
                }}>
                    In your own words, explain to Vector A and B what the dot product really tells us about two vectors. Use a real-world metaphor — like friendships, teamwork, sports, or anything else. Get creative.
                </p>
                <div style={{
                    marginTop: 40, 
                    border: '2px dashed #3498DB', 
                    padding: 20, 
                    borderRadius: 10, 
                    textAlign: 'center', 
                    fontSize: 30, 
                    color: `rgba(127, 140, 141, ${pulseBrightness})`,
                    transform: `scale(${1 + Math.sin(frame * 0.12) * 0.02})` // Gentle pulsing
                }}>
                    [ Awaiting your explanation... ]
                </div>
            </div>
        </AbsoluteFill>
    );
};