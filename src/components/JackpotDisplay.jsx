import React from 'react';
import { Trophy } from 'lucide-react';

export default function JackpotDisplay({ amount = 0, label = 'WEEKLY JACKPOT', size = 'md' }) {
  const formatted = new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(amount);

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1.5">
        <Trophy size={14} className="text-gold" />
        <span className="font-game text-gold font-bold text-sm">{formatted}</span>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden p-[1px]">
      <div className="absolute inset-0 gradient-gold opacity-60 rounded-2xl" />
      <div className="relative bg-navy-dark/90 rounded-2xl p-4 text-center">
        <div className="flex justify-center mb-1">
          <Trophy size={20} className="text-gold" />
        </div>
        <p className="text-xs font-bold text-gold tracking-widest mb-0.5">{label}</p>
        <p className="font-game text-3xl font-black text-gold animate-pulse-glow">{formatted}</p>
      </div>
    </div>
  );
}