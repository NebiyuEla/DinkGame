import React, { useEffect, useState } from 'react';
import { Link2, ShieldCheck, Wallet } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import { getTelegramProfile } from '@/lib/telegram';
import { appClient } from '@/api/appClient';

export default function WelcomeSplash({ user, onDone }) {
  const [saving, setSaving] = useState(false);
  const profile = getTelegramProfile();

  useEffect(() => {
    if (!profile || !user?.id) return;
    setSaving(true);
    appClient.entities.User.update(user.id, {
      ...profile,
      telegram_linked: true,
      wallet_balance: Number(user.wallet_balance || 0),
    }).catch(() => {}).finally(() => setSaving(false));
  }, [profile?.telegram_id, user?.id]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center animate-slide-up">
        <DinkLogo size="lg" className="mx-auto mb-5" />
        <img
          src="/brand/dink-mascot.png"
          alt=""
          className="w-36 h-36 object-contain mx-auto mb-4 rounded-full"
        />
        <h1 className="text-2xl font-black text-foreground mb-2">Welcome to Dink Game</h1>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          Your Telegram profile is linked to this wallet and every game you play.
        </p>
        <div className="space-y-2 mb-6 text-left">
          {[
            { icon: Link2, text: profile ? `Linked as @${profile.telegram_username || profile.username}` : 'Telegram account required' },
            { icon: Wallet, text: 'Wallet receives prize shares automatically' },
            { icon: ShieldCheck, text: 'Fair-play checks protect paid games' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 rounded-2xl bg-card border border-border px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center">
                <Icon size={17} className="text-gold" />
              </div>
              <p className="text-sm font-semibold text-foreground">{text}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onDone}
          disabled={saving}
          className="w-full rounded-full bg-primary text-white font-black py-4 active:scale-95 transition-transform disabled:opacity-60"
        >
          {saving ? 'Linking...' : 'Start Playing'}
        </button>
      </div>
    </div>
  );
}
