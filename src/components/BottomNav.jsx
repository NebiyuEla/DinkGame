import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ListChecks, Medal, Trophy, User } from 'lucide-react';

const NAV = [
  { path: '/leaderboard', icon: Medal, label: 'Ranks' },
  { path: '/winners', icon: Trophy, label: 'Winners' },
  { path: '/tasks', icon: ListChecks, label: 'Tasks' },
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
    const active = pathname === path;
    return (
      <motion.button
        key={path}
        type="button"
        onClick={() => go(path)}
        aria-current={active ? 'page' : undefined}
        whileTap={{ scale: 0.94 }}
        className={`relative mx-0.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 transition-colors duration-200 ${
          active ? 'bg-gold/20' : 'bg-transparent'
        }`}
      >
        <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 ${
          active ? 'bg-gold text-primary shadow-[0_8px_16px_hsl(var(--gold)/0.22)]' : 'bg-primary/5 text-primary/70'
        }`}>
          <Icon size={17} strokeWidth={active ? 2.8 : 2.2} />
        </div>
        <span className={`text-[9px] font-black transition-colors duration-200 ${active ? 'text-primary' : 'text-primary/60'}`}>
          {label}
        </span>
      </motion.button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pointer-events-none" style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
      <div className="relative mx-auto max-w-md h-[3.9rem] rounded-[2rem] liquid-glass border-2 border-primary/80 flex items-center pointer-events-auto overflow-visible">
        <div className="flex flex-1 h-full pl-2 pr-8 items-center">
          {leftItems.map(renderItem)}
        </div>

        <button
          type="button"
          onClick={() => go('/')}
          className="absolute left-1/2 -translate-x-1/2 -top-2 h-[3.9rem] w-[3.9rem] rounded-full bg-gold border-[3px] border-white shadow-[0_10px_24px_rgba(0,20,81,0.22)] flex items-center justify-center"
          aria-label="Dink Game"
        >
          <picture>
            <source srcSet="/brand/dink-game-logo-transparent-small.webp" type="image/webp" />
            <img src="/brand/dink-game-logo-transparent.png" alt="" className="h-12 w-12 object-contain" draggable="false" loading="eager" decoding="async" />
          </picture>
        </button>

        <div className="flex flex-1 h-full pl-8 pr-2 items-center">
          {rightItems.map(renderItem)}
        </div>
      </div>
    </nav>
  );
}
