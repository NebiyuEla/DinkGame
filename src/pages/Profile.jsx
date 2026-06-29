import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Headphones, Landmark, Repeat2, ShieldCheck, Trophy, UserPlus, Wallet } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

export default function Profile() {
  const { currentUser, setCurrentUser } = useGame();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!currentUser?.id) return;
    appClient.entities.WalletTransaction.filter({ user_id: currentUser.id }, '-created_date', 5)
      .then(setTransactions)
      .catch(() => setTransactions([]));
  }, [currentUser?.id]);

  const refreshUser = async () => {
    const user = await appClient.auth.me();
    setCurrentUser(user);
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="min-h-screen player-page pb-24 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-5 pb-4 bg-navy-dark/75 border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentUser?.photo_url
              ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="" />
              : <span className="font-game text-2xl font-black text-gold">{(currentUser?.telegram_username || currentUser?.full_name || 'D')[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-white text-lg truncate">{currentUser?.telegram_username ? `@${currentUser.telegram_username}` : currentUser?.full_name || 'Dink user'}</p>
            <p className="text-white/[0.55] text-sm truncate">{currentUser?.username || currentUser?.full_name || 'Dink account'}</p>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-3">
        <section className="rounded-[1.6rem] liquid-glass p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-white/70 tracking-widest">WALLET BALANCE</p>
              <p className="font-game text-3xl font-black mt-1 text-gold">{fmt(currentUser?.wallet_balance)}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-white/[0.15] flex items-center justify-center">
              <img src="/brand/etb-coin-small.webp" alt="" className="w-10 h-10 object-contain" loading="eager" decoding="async" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/deposit" className="rounded-2xl gold-action py-3 text-center text-sm font-black active:scale-[0.98] transition-transform">
              Deposit
            </Link>
            <Link to="/deposit?mode=withdraw" className="rounded-2xl bg-white/[0.12] border border-white/25 py-3 text-center text-sm font-black active:scale-[0.98] transition-transform">
              Withdraw
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Winnings', value: fmt(currentUser?.total_winnings), icon: Trophy },
            { label: 'Games', value: currentUser?.games_played || 0, icon: ShieldCheck },
            { label: 'Best Rank', value: currentUser?.best_rank ? `#${currentUser.best_rank}` : '-', icon: Landmark },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="liquid-glass rounded-2xl p-3 text-center">
              <Icon size={16} className="text-gold mx-auto mb-1" />
              <p className="font-game font-black text-base text-white">{value}</p>
              <p className="text-[10px] text-white/[0.55] mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        <section className="liquid-glass rounded-2xl overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-gold" />
              <span className="font-semibold text-white text-sm">Recent Wallet Activity</span>
            </div>
            <button onClick={refreshUser} className="text-xs text-gold font-black">Refresh</button>
          </div>
          {transactions.length === 0 ? (
            <div className="px-4 py-5 text-sm text-white/[0.55] text-center">No wallet activity yet</div>
          ) : (
            <div className="divide-y divide-white/10">
              {transactions.map(tx => (
                <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{tx.note || tx.source?.replaceAll('_', ' ') || 'Wallet transaction'}</p>
                    <p className="text-xs text-white/[0.45]">{new Date(tx.created_date).toLocaleDateString()}</p>
                  </div>
                  <p className={`font-game font-black text-sm ${tx.type === 'debit' ? 'text-wrong-red' : 'text-correct-green'}`}>
                    {tx.type === 'debit' ? '-' : '+'}{fmt(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="liquid-glass rounded-2xl overflow-hidden divide-y divide-white/10">
          {[
            { to: '/leaderboard', label: 'My Games', icon: Trophy },
            { to: '/deposit', label: 'Transactions', icon: Repeat2 },
            { to: '/deposit?mode=withdraw', label: 'Deposit / Withdraw', icon: Wallet },
            { to: '/tasks', label: 'Referrals', icon: UserPlus },
            { to: 'https://t.me/DinkGame', label: 'Support', icon: Headphones, external: true },
          ].map(({ to, label, icon: Icon, external }) => (
            <Link
              key={label}
              to={to}
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              className="flex items-center justify-between p-4 active:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Icon size={15} className="text-white/[0.55]" />
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
              <ChevronRight size={15} className="text-white/[0.45]" />
            </Link>
          ))}
        </div>

      </main>

    </div>
  );
}
