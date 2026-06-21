import React from 'react';

const SIZES = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-24 h-24',
};

export default function DinkLogo({ size = 'md', className = '' }) {
  return (
    <picture>
      <source srcSet="/brand/dink-game-logo-small.webp" type="image/webp" />
      <img
        src="/brand/dink-game-logo.png"
        alt="Dink Game"
        className={`block ${SIZES[size] || SIZES.md} rounded-2xl object-cover shadow-sm ${className}`}
        draggable="false"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}
