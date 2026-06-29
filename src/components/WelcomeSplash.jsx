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
    <div className="fixed inset-0 z-[100] dink-orange-field flex items-center justify-center px-6 overflow-hidden">
      <div className="w-full max-w-sm text-center animate-splash">
        <div className="mx-auto w-28 h-28 rounded-full bg-white border-[5px] border-primary shadow-xl flex items-center justify-center">
          <DinkLogo transparent size="lg" className="w-24 h-24 rounded-none shadow-none" />
        </div>
        <picture className="block mt-4">
          <source srcSet="/brand/welcome-message-small.webp" type="image/webp" />
          <img
            src="/brand/welcome-message.webp"
            alt=""
            className="w-full max-h-36 object-contain rounded-[1.4rem] shadow-[0_14px_30px_rgba(0,20,81,0.18)]"
            loading="eager"
            decoding="async"
          />
        </picture>
        <BrandMascot className="w-64 h-64 object-contain mx-auto mt-3 animate-float" small />
        <button
          onClick={onDone}
          disabled={saving}
          className="mt-6 w-full rounded-full bg-white text-primary font-black py-4 active:scale-95 transition-transform disabled:opacity-60 shadow-[0_14px_30px_rgba(0,20,81,0.24)]"
        >
          {saving ? 'Loading...' : 'Start'}
        </button>
      </div>
    </div>
  );
}
