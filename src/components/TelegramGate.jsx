import React from 'react';
import DinkLogo from '@/components/DinkLogo';
import BrandMascot from '@/components/BrandMascot';
import { allowPlayerAccess } from '@/lib/telegram';

export default function TelegramGate({ children }) {
  if (allowPlayerAccess()) return children;

  return (
    <div className="min-h-screen player-page px-6 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-sm text-center liquid-glass rounded-[2rem] p-6">
        <DinkLogo size="lg" className="mx-auto rounded-[1.4rem] shadow-xl" />
        <BrandMascot className="w-28 h-28 object-contain mx-auto mt-5" small />
        <h1 className="mt-5 text-3xl font-black text-white">Dink Game</h1>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-white/[0.68]">
          Open Dink Game from Telegram mobile to enter the live money game.
        </p>
      </div>
    </div>
  );
}
