import React, { useEffect, useState } from 'react';
import DinkLogo from '@/components/DinkLogo';
import BrandMascot from '@/components/BrandMascot';
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
    <div className="fixed inset-0 z-[100] player-page flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-sm text-center animate-splash liquid-glass rounded-[2rem] p-5">
        <div className="mx-auto w-24 h-24 rounded-[1.6rem] bg-gold border border-white/20 shadow-xl flex items-center justify-center">
          <DinkLogo transparent size="lg" className="w-20 h-20 rounded-none shadow-none" />
        </div>
        <picture className="block mt-4">
          <source srcSet="/brand/welcome-message-small.webp" type="image/webp" />
          <img
            src="/brand/welcome-message.webp"
            alt=""
            className="w-full max-h-32 object-contain rounded-[1.4rem] shadow-[0_18px_40px_rgba(0,0,0,0.24)]"
            loading="eager"
            decoding="async"
          />
        </picture>
        <BrandMascot className="w-36 h-36 object-contain mx-auto mt-3" small />
        <button
          onClick={onDone}
          disabled={saving}
          className="mt-5 w-full rounded-full gold-action font-black py-4 active:scale-95 transition-transform disabled:opacity-60"
        >
          {saving ? 'Loading...' : 'Start'}
        </button>
      </div>
    </div>
  );
}
