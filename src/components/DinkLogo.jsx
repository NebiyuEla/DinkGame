import React from 'react';

const SIZES = {
  sm: 'w-12 h-12',
  md: 'w-14 h-14',
  lg: 'w-24 h-24',
};

export default function DinkLogo({ size = 'md' }) {
  return (
    <img
      src="/brand/dink-game-logo.png"
      alt="Dink Game"
      className={`${SIZES[size] || SIZES.md} rounded-2xl object-cover shadow-sm`}
      draggable="false"
    />
  );
}
