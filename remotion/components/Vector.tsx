import React from 'react';
import {Img, staticFile} from 'remotion';

export const Vector = ({
    color,
    angle,
    label,
    x = 0,
    y = 0,
}: {
    color: string;
    angle: number;
    label: string;
    x?: number;
    y?: number;
}) => {
    // Select the appropriate image based on the label
    const imageSrc = label === 'A' ? staticFile('/images/vectorA.png') : staticFile('/images/VectorB.png');
    
    return (
        <div style={{
            position: 'absolute', 
            left: x, 
            top: y, 
            width: 300, 
            height: 300, 
            transform: `rotate(${angle}deg)`, 
            transformOrigin: '150px 150px'
        }}>
            <Img 
                src={imageSrc}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                }}
            />
        </div>
    );
};