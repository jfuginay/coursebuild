import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { Scene1 } from './scenes/Scene1';
import { Scene2 } from './scenes/Scene2';
import { Scene3 } from './scenes/Scene3';
import { Scene4 } from './scenes/Scene4';
import { Scene5 } from './scenes/Scene5';

export const ParadoxOfLight: React.FC = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            {/* Scene 1: Dark living room (0s - 3s) */}
            <Sequence from={0} durationInFrames={90}>
                <Scene1 />
            </Sequence>
            
            {/* Scene 2: Warm light transition (3s - 8s) */}
            <Sequence from={90} durationInFrames={150}>
                <Scene2 />
            </Sequence>
            
            {/* Scene 3: Cool light transition (8s - 13s) */}
            <Sequence from={240} durationInFrames={150}>
                <Scene3 />
            </Sequence>
            
            {/* Scene 4: The paradox explanation (13s - 18s) */}
            <Sequence from={390} durationInFrames={150}>
                <Scene4 />
            </Sequence>
            
            {/* Scene 5: Text message prompt (18s - 25s) */}
            <Sequence from={540} durationInFrames={210}>
                <Scene5 />
            </Sequence>
        </AbsoluteFill>
    );
};