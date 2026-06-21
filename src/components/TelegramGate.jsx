import React from 'react';
import DinkLogo from '@/components/DinkLogo';
import BrandMascot from '@/components/BrandMascot';
import { allowPlayerAccess } from '@/lib/telegram';

export default function TelegramGate({ children }) {
  if (allowPlayerAccess()) return children;

  return (
    <div className="min-h-screen dink-orange-field px-6 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-sm text-center">
        <DinkLogo size="lg" className="mx-auto mb-8 rounded-full shadow-xl" />
        <BrandMascot className="w-56 h-56 object-contain mx-auto animate-float" small />
        <h1 className="mt-6 text-4xl font-black text-white drop-shadow-sm">Dink Game</h1>
        <div className="mx-auto mt-5 h-2 w-28 rounded-full bg-white/75" />
      </div>
    </div>
  );
}
