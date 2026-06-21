import React, { useEffect, useState } from 'react';

export default function LiveCounter({ count = 0, label = 'players live' }) {
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    setDisplayCount(count);
  }, [count]);

  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full bg-correct-green animate-live-pulse shadow-[0_0_8px_#22c55e]" />
      <span className="font-game text-sm font-bold text-white">
        {displayCount.toLocaleString()}
        <span className="text-muted-foreground font-body font-normal ml-1 text-xs">{label}</span>
      </span>
    </div>
  );
}