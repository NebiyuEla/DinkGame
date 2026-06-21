import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Star, User, Zap } from 'lucide-react';

const NAV = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/leaderboard', icon: Trophy, label: 'Ranks' },
  { path: '/winners', icon: Star, label: 'Winners' },
  { path: '/jackpot', icon: Zap, label: 'Jackpot' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pointer-events-none" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div className="mx-auto max-w-md h-16 rounded-[1.75rem] bg-card/95 border border-border shadow-[0_14px_40px_rgba(15,23,42,0.14)] backdrop-blur flex justify-around items-center px-1 pointer-events-auto">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <Link key={path} to={path}
              className="flex flex-col items-center gap-0.5 py-1 px-2 flex-1 transition-all duration-200">
              <div className={`w-10 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                active ? 'bg-primary shadow-sm' : 'bg-transparent'
              }`}>
                <Icon size={18} className={active ? 'text-white' : 'text-muted-foreground'} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-semibold tracking-wide transition-colors ${active ? 'text-primary' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
