import {AbsoluteFill, Img, staticFile} from 'remotion';
import React from 'react';

export const CafeBackground = () => (
    <AbsoluteFill>
        <Img 
            src={staticFile('/images/cafebackground.png')} 
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
            }}
        />
    </AbsoluteFill>
);