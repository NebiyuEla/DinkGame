import React from 'react';

const SIZES = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-24 h-24',
  xl: 'w-60 h-60',
};

export default function DinkLogo({ size = 'md', className = '', transparent = false }) {
  const webp = transparent
    ? (size === 'sm' ? '/brand/dink-game-logo-transparent-small.webp' : '/brand/dink-game-logo-transparent.webp')
    : (size === 'lg' ? '/brand/dink-game-logo.webp' : '/brand/dink-game-logo-small.webp');
  const fallback = transparent ? '/brand/dink-game-logo-transparent.png' : '/brand/dink-game-logo.png';
  const fit = transparent ? 'object-contain' : 'object-cover';

  return (
    <picture>
      <source srcSet={webp} type="image/webp" />
      <img
        src={fallback}
        alt="Dink Game"
        className={`block ${SIZES[size] || SIZES.md} rounded-2xl ${fit} shadow-sm ${className}`}
        draggable="false"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}
