import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHiding(true), 1500);
    const t2 = setTimeout(() => onDone(), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`fixed inset-0 z-[9999] bg-gold flex flex-col items-center justify-center transition-opacity duration-500 ${hiding ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <picture>
        <source srcSet="/brand/dink-game-logo.webp" type="image/webp" />
        <img
          src="/brand/dink-game-logo.png"
          alt="Dink Game"
          className="w-52 h-52 rounded-[2rem] object-cover animate-splash shadow-xl"
          draggable="false"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </picture>
      <p className="absolute bottom-12 text-primary/70 text-xs font-semibold tracking-wide">Ethiopia's #1 Quiz Game</p>
    </div>
  );
}
