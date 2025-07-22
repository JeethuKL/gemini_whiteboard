import React from 'react';
import { WhiteboardElement } from '../types/whiteboard';

interface ConnectionLineProps {
  from: WhiteboardElement;
  to: WhiteboardElement;
}

export default function ConnectionLine({ from, to }: ConnectionLineProps) {
  const fromCenterX = from.x + 64; // Half width of flow node
  const fromCenterY = from.y + 40; // Half height of flow node
  const toCenterX = to.x + 64;
  const toCenterY = to.y + 40;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) return null;

  const angle = Math.atan2(dy, dx);
  const arrowSize = 8;

  // Calculate arrow points
  const arrowX = toCenterX - Math.cos(angle) * 32; // Stop at edge of target node
  const arrowY = toCenterY - Math.sin(angle) * 32;

  const arrowPoints = [
    [arrowX, arrowY],
    [arrowX - arrowSize * Math.cos(angle - Math.PI / 6), arrowY - arrowSize * Math.sin(angle - Math.PI / 6)],
    [arrowX - arrowSize * Math.cos(angle + Math.PI / 6), arrowY - arrowSize * Math.sin(angle + Math.PI / 6)]
  ];

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      <defs>
        <marker
          id={`arrowhead-${from.id}-${to.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#6B7280"
          />
        </marker>
      </defs>
      
      <line
        x1={fromCenterX}
        y1={fromCenterY}
        x2={arrowX}
        y2={arrowY}
        stroke="#6B7280"
        strokeWidth="2"
        markerEnd={`url(#arrowhead-${from.id}-${to.id})`}
      />
    </svg>
  );
}