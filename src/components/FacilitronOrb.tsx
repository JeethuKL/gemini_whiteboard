import React from 'react';

interface FacilitronOrbProps {
  size?: number;
  className?: string;
}

// Minimal "orb" logo: gradient circle with inner glow
export default function FacilitronOrb({ size = 16, className }: FacilitronOrbProps) {
  const dim = `${size}`;
  return (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id="orbGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
          <stop offset="60%" stopColor="#6366f1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.9" />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#orbGradient)" />
      <circle cx="9" cy="9" r="3" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}


