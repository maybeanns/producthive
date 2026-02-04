'use client';

import React from 'react';

const HoneycombBackground = () => {
    return (
        <div className="fixed inset-0 z-0 flex justify-between pointer-events-none select-none overflow-hidden">
            {/* Left Panel */}
            <div
                className="w-96 h-full relative"
                style={{
                    maskImage: 'linear-gradient(to right, black, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, black, transparent)',
                }}
            >
                <HexagonPattern id="hex-left" />
            </div>

            {/* Right Panel */}
            <div
                className="w-96 h-full relative"
                style={{
                    maskImage: 'linear-gradient(to left, black, transparent)',
                    WebkitMaskImage: 'linear-gradient(to left, black, transparent)',
                }}
            >
                <HexagonPattern id="hex-right" />
            </div>
        </div>
    );
};

const HexagonPattern = ({ id }: { id: string }) => {
    return (
        <svg
            className="absolute inset-0 w-full h-full text-gray-600"
            style={{ opacity: 0.15 }} // Subtle opacity
        >
            <defs>
                <pattern
                    id={id}
                    width="56"
                    height="100"
                    patternUnits="userSpaceOnUse"
                    patternTransform="scale(1.5)"
                >
                    {/* Primary Hexagon Column */}
                    <path
                        d="M28 66 L0 50 L0 16 L28 0 L56 16 L56 50 L28 66 L28 100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                    />
                    {/* Offset Hexagon Column (shifted by x=28, y=50) */}
                    <path
                        d="M28 66 L0 50 L0 16 L28 0 L56 16 L56 50 L28 66 L28 100"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        transform="translate(28, 50)"
                    />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${id})`} />
        </svg>
    );
};

export default HoneycombBackground;
