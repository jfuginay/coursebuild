import {
    AbsoluteFill,
    Sequence,
    useCurrentFrame,
    useVideoConfig,
    spring,
    interpolate,
} from 'remotion';
import React from 'react';

import {CafeBackground} from './components/CafeBackground';
import {Vector} from './components/Vector';
import {DialogueBox} from './components/DialogueBox';
import {Prompt} from './components/Prompt';

export const VectorCafeScene: React.FC = () => {
    const frame = useCurrentFrame();
    const {fps, width, height} = useVideoConfig();

    // Define the timing for each part of the animation
    const timings = {
        narrator1: {start: 30, duration: 120},
        vectorA: {start: 160, duration: 180},
        vectorB: {start: 350, duration: 150},
        narrator2: {start: 510, duration: 120},
        prompt: {start: 640},
    };

    // Continuous breathing/idle animation for both vectors
    const breathingA = Math.sin(frame * 0.1) * 3;
    const breathingB = Math.sin(frame * 0.08) * 4;
    
    // Vector A talking animation - bobbing and leaning
    const vectorATalking = frame >= timings.vectorA.start && frame <= timings.vectorA.start + timings.vectorA.duration;
    const vectorABobbing = vectorATalking ? Math.sin((frame - timings.vectorA.start) * 0.3) * 8 : 0;
    
    const leanAnimation = spring({
        frame: frame - timings.vectorA.start,
        fps,
        config: {damping: 8, stiffness: 60},
    });
    const leanX = interpolate(leanAnimation, [0, 1], [0, 30]);
    const leanRotate = interpolate(leanAnimation, [0, 1], [0, -8]);

    // Vector B talking animation - bobbing and nodding
    const vectorBTalking = frame >= timings.vectorB.start && frame <= timings.vectorB.start + timings.vectorB.duration;
    const vectorBBobbing = vectorBTalking ? Math.sin((frame - timings.vectorB.start) * 0.25) * 6 : 0;
    
    const sipAnimation = spring({
        frame: frame - timings.vectorB.start - 30,
        fps,
        config: {damping: 15, stiffness: 80},
    });
    const sipRotate = interpolate(sipAnimation, [0, 0.5, 1], [0, -20, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    
    // Add subtle side-to-side movement
    const vectorASwayX = Math.sin(frame * 0.05) * 2;
    const vectorBSwayX = Math.sin(frame * 0.07) * 3;

    // Animate the projection line appearing with pulsing effect
    const projectionOpacity = interpolate(
        frame,
        [timings.vectorA.start + 90, timings.vectorA.start + 110],
        [0, 1],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
    );
    
    // Add pulsing effect to projection line
    const projectionPulse = frame > timings.vectorA.start + 110 ? 
        1 + Math.sin(frame * 0.2) * 0.2 : 1;
    
    // Add some camera shake during exciting moments
    const cameraShake = vectorATalking || vectorBTalking ? 
        Math.sin(frame * 0.4) * 1 : 0;

    return (
        <AbsoluteFill style={{color: '#2C3E50'}}>
            <CafeBackground />

            {/* Position the vectors on the café table */}
            <AbsoluteFill
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    transform: `translateY(50px) translateX(${cameraShake}px)`, // Add camera shake
                }}
            >
                {/* Vector A (Northeast) - positioned on left side of table */}
                <div style={{
                    transform: `translate(${leanX - 200 + vectorASwayX}px, ${breathingA + vectorABobbing}px) rotate(${leanRotate}deg)`,
                    transformOrigin: '150px 150px',
                    transition: 'transform 0.1s ease-out'
                }}>
                    <Vector color="#E74C3C" angle={0} label="A" />
                </div>

                {/* Vector B (East) - positioned on right side of table */}
                <div style={{
                    transform: `translate(${200 + vectorBSwayX}px, ${breathingB + vectorBBobbing}px) rotate(${sipRotate}deg)`, 
                    transformOrigin: '150px 150px',
                    transition: 'transform 0.1s ease-out'
                }}>
                    <Vector color="#3498DB" angle={0} label="B" />
                </div>

                {/* Projection Visualization - between the vectors */}
                <div
                    style={{
                        position: 'absolute',
                        height: `${6 * projectionPulse}px`,
                        width: 300,
                        backgroundColor: '#FFD700',
                        left: 'calc(50% - 150px)',
                        top: 'calc(50% + 100px)',
                        opacity: projectionOpacity,
                        borderRadius: '3px',
                        boxShadow: `0 ${2 * projectionPulse}px ${8 * projectionPulse}px rgba(255,215,0,0.4)`,
                        transform: `scaleX(${projectionPulse})`,
                        transformOrigin: 'center',
                    }}
                />
            </AbsoluteFill>

            {/* Dialogue Sequences */}
            <Sequence from={timings.narrator1.start} durationInFrames={timings.narrator1.duration}>
                <DialogueBox text="Welcome to Vector Café, where angles clash and components spill the tea." />
            </Sequence>
            
            <Sequence from={timings.vectorA.start} durationInFrames={timings.vectorA.duration}>
                <DialogueBox
                    text="I'm telling you, when I dot with B, we get along perfectly — max alignment, full energy transfer. It's like we're... projecting our best selves!"
                    y={100}
                    x={-200}
                />
            </Sequence>
            
            <Sequence from={timings.vectorB.start} durationInFrames={timings.vectorB.duration}>
                <DialogueBox
                    text="Pfft, maybe. But I feel like people don't really get what our dot product even means."
                    y={400}
                    x={250}
                />
            </Sequence>

            <Sequence from={timings.narrator2.start} durationInFrames={timings.narrator2.duration}>
                <DialogueBox text="You there! Yes, you watching! Vector A and B are having a bit of an identity crisis." />
            </Sequence>

            {/* Final Prompt Sequence */}
            <Sequence from={timings.prompt.start}>
                <Prompt />
            </Sequence>
        </AbsoluteFill>
    );
};