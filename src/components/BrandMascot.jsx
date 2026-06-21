import React from 'react';

export default function BrandMascot({ className = '', small = false }) {
  return (
    <picture>
      <source srcSet={small ? '/brand/dink-mascot-small.webp' : '/brand/dink-mascot.webp'} type="image/webp" />
      <img
        src="/brand/dink-mascot.png"
        alt=""
        className={className}
        draggable="false"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />
    </picture>
  );
}
