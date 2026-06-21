import React from 'react';
import { ShieldCheck, Smartphone } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import { allowPlayerAccess } from '@/lib/telegram';

export default function TelegramGate({ children }) {
  if (allowPlayerAccess()) return children;

  return (
    <div className="min-h-screen bg-background px-6 flex items-center justify-center">
      <div className="w-full max-w-sm text-center">
        <DinkLogo size="lg" className="mx-auto mb-5" />
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center">
          <Smartphone size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">Telegram mobile only</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Dink Game uses Telegram account linking and fair-play checks. Open the bot from Telegram on your phone to play.
        </p>
        <div className="rounded-2xl border border-border bg-card p-4 flex items-start gap-3 text-left">
          <ShieldCheck size={18} className="text-gold flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Admin pages remain available on desktop. Player games require Telegram mobile.
          </p>
        </div>
      </div>
    </div>
  );
}
