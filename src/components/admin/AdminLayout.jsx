import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Gamepad2, HelpCircle, Trophy, Users,
  Zap, Megaphone, Shield, Settings, LogOut, Menu, X, Wallet
} from 'lucide-react';
import { useAdmin } from '@/lib/adminContext';
import DinkLogo from '@/components/DinkLogo';

const NAV = [
  { path: '/admin/live', icon: Zap, label: 'Live Controller' },
  { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/admin/games', icon: Gamepad2, label: 'Games' },
  { path: '/admin/questions', icon: HelpCircle, label: 'Questions' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/winners', icon: Trophy, label: 'Winners' },
  { path: '/admin/withdrawals', icon: Wallet, label: 'Withdrawals' },
  { path: '/admin/broadcasts', icon: Megaphone, label: 'Broadcasts' },
  { path: '/admin/anticheat', icon: Shield, label: 'Anti-Cheat' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout({ children }) {
  const { pathname } = useLocation();
  const { adminUser, adminLogout } = useAdmin();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { adminLogout(); navigate('/admin/login'); };

  return (
    <div className="admin-theme min-h-screen gradient-bg flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 glass-card border-r border-border/50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DinkLogo size="sm" className="flex-shrink-0" />
            <div>
              <span className="font-game font-black text-white text-sm">DINK ADMIN</span>
              <p className="text-xs text-muted-foreground capitalize">{adminUser?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = pathname === path;
            const featured = path === '/admin/live';
            return (
              <Link key={path} to={path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gold text-navy-dark shadow-[0_10px_22px_hsl(var(--gold)/0.18)]'
                    : featured
                      ? 'border border-gold/25 bg-gold/10 text-gold hover:bg-gold hover:text-navy-dark'
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                }`}>
                <Icon size={16} />
                <span className="text-sm font-bold">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/50">
          <div className="flex items-center gap-2 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center">
              <span className="text-xs font-bold text-neon-purple">{(adminUser?.full_name || 'A')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{adminUser?.full_name || adminUser?.username}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-wrong-red hover:bg-wrong-red/10 transition-colors">
            <LogOut size={14} />
            <span className="text-sm font-bold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="glass-card border-b border-border/50 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={20} className="text-muted-foreground" />
          </button>
          <span className="font-game text-sm font-bold text-white">DINK ADMIN</span>
        </header>
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
