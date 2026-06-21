import React from 'react';

export default function GameBackground({ active = true, intensity = 1 }) {
  if (!active) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        opacity: Math.min(0.34, 0.18 + intensity * 0.12),
        backgroundImage: [
          'linear-gradient(to right, hsl(var(--border) / 0.55) 1px, transparent 1px)',
          'linear-gradient(to bottom, hsl(var(--border) / 0.55) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '28px 28px',
        maskImage: 'linear-gradient(to bottom, transparent, black 12%, black 82%, transparent)',
      }}
    />
  );
}
