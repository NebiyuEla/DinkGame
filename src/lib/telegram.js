export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

export function getTelegramProfile() {
  const webApp = getTelegramWebApp();
  const user = webApp?.initDataUnsafe?.user;
  if (!user) return null;

  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || user.username || `tg_${user.id}`;

  return {
    telegram_id: String(user.id),
    telegram_username: user.username || '',
    username: user.username || `tg_${user.id}`,
    full_name: fullName,
    photo_url: user.photo_url || '',
    email: `tg_${user.id}@telegram.dink`,
  };
}

export function isTelegramMobile() {
  const webApp = getTelegramWebApp();
  const platform = webApp?.platform;
  return platform === 'ios' || platform === 'android';
}

export function isMobileViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches || /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function allowPlayerAccess() {
  if (import.meta.env.DEV) return true;
  return isTelegramMobile() && isMobileViewport() && Boolean(getTelegramProfile());
}
