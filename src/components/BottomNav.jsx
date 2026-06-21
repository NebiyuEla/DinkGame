import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Medal, Trophy, User, Wallet } from 'lucide-react';

const NAV = [
  { path: '/leaderboard', icon: Medal, label: 'Ranks' },
  { path: '/deposit', icon: Wallet, label: 'Wallet' },
  { path: '/winners', icon: Trophy, label: 'Winners' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const leftItems = NAV.slice(0, 2);
  const rightItems = NAV.slice(2);

  const go = (path) => {
    if (pathname !== path) navigate(path);
  };

  const renderItem = ({ path, icon: Icon, label }) => {
    const active = pathname === path || (path === '/deposit' && pathname.startsWith('/deposit'));
    return (
      <button
        key={path}
        type="button"
        onClick={() => go(path)}
        aria-current={active ? 'page' : undefined}
        className="relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2"
      >
        <div className={`h-11 w-11 rounded-full flex items-center justify-center transition-all duration-300 ${
          active ? 'bg-gold text-primary shadow-[0_8px_18px_hsl(var(--gold)/0.28)] -translate-y-1' : 'text-primary/70'
        }`}>
          <Icon size={22} strokeWidth={active ? 2.8 : 2.2} />
        </div>
        <span className={`text-[10px] font-black transition-colors duration-300 ${active ? 'text-primary' : 'text-primary/70'}`}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none" style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
      <div className="relative mx-auto max-w-md h-[4.75rem] rounded-full bg-white/96 border-2 border-primary shadow-[0_18px_42px_rgba(0,20,81,0.22)] backdrop-blur flex items-center pointer-events-auto overflow-visible">
        <div className="flex flex-1 h-full pl-2 pr-11">
          {leftItems.map(renderItem)}
        </div>

        <button
          type="button"
          onClick={() => go('/')}
          className="absolute left-1/2 -translate-x-1/2 -top-6 h-28 w-28 rounded-full bg-gold border-[7px] border-white shadow-[0_14px_30px_rgba(0,20,81,0.28)] flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Dink Game"
        >
          <picture>
            <source srcSet="/brand/dink-game-logo-small.webp" type="image/webp" />
            <img src="/brand/dink-game-logo.png" alt="" className="h-[5.4rem] w-[5.4rem] rounded-full object-cover" draggable="false" />
          </picture>
        </button>

        <div className="flex flex-1 h-full pl-11 pr-2">
          {rightItems.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}
