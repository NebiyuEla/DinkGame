import React from 'react';

const RANK_STYLES = {
  1: 'bg-gold text-white font-black shadow-sm',
  2: 'bg-gray-400 text-white font-black',
  3: 'bg-amber-700 text-white font-black',
};

export default function RankBadge({ rank }) {
  const style = RANK_STYLES[rank] || 'bg-muted text-muted-foreground font-bold';
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${style}`}>
      {rank}
    </div>
  );
}