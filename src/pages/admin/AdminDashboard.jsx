import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Banknote, Gamepad2, Shield, Users, Wallet } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

function StatCard({ icon: Icon, label, value, sub, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary/15 border-primary/25 text-primary',
    gold: 'bg-gold/15 border-gold/25 text-gold',
    green: 'bg-correct-green/15 border-correct-green/25 text-correct-green',
    red: 'bg-wrong-red/15 border-wrong-red/25 text-wrong-red',
  };
  return (
    <div className="glass-card rounded-2xl p-4 border border-border/50">
      <div className={`w-10 h-10 rounded-full border flex items-center justify-center mb-3 ${tones[tone] || tones.primary}`}>
        <Icon size={18} />
      </div>
      <p className="font-game text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-muted-foreground mt-1 font-bold">{label}</p>
      {sub && <p className="text-xs text-gold mt-0.5">{sub}</p>}
    </div>
  );
}

const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

const activePlayer = (player) => !player.is_disqualified && !player.is_eliminated && (player.status || 'playing') !== 'disconnected';

export default function AdminDashboard() {
  const [data, setData] = useState({
    users: [],
    games: [],
    deposits: [],
    withdrawals: [],
    players: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [users, games, deposits, withdrawals, players, logs] = await Promise.all([
          appClient.entities.User.list('-created_date', 5000),
          appClient.entities.Game.list('-created_date', 100),
          appClient.entities.Deposit.list('-created_date', 5000),
          appClient.entities.Withdrawal.list('-created_date', 500),
          appClient.entities.GamePlayer.list('-created_date', 5000),
          appClient.entities.AntiCheatLog.list('-created_date', 100),
        ]);
        if (mounted) setData({ users, games, deposits, withdrawals, players, logs });
      } catch {
        if (mounted) setData({ users: [], games: [], deposits: [], withdrawals: [], players: [], logs: [] });
      }
      if (mounted) setLoading(false);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const stats = useMemo(() => {
    const liveGameIds = new Set(data.games.filter(game => ['lobby', 'live', 'paused'].includes(game.status)).map(game => game.id));
    const paidDeposits = data.deposits.filter(deposit => deposit.status === 'paid');
    const grossDeposits = paidDeposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
    const platformProfit = Math.round(grossDeposits * 0.25);
    const prizePool = Math.max(0, grossDeposits - platformProfit);
    return {
      registeredUsers: data.users.length,
      depositedUsers: new Set(paidDeposits.map(deposit => deposit.user_id)).size,
      liveUsers: data.players.filter(player => liveGameIds.has(player.game_id) && activePlayer(player)).length,
      games: data.games.length,
      grossDeposits,
      platformProfit,
      prizePool,
      pendingWithdrawals: data.withdrawals.filter(item => item.status === 'pending').length,
      highRisk: data.logs.filter(log => log.severity === 'high').length,
    };
  }, [data]);

  const recentGames = data.games.slice(0, 5);
  const recentDeposits = data.deposits.slice(0, 5);
  const statusColor = {
    draft: 'text-muted-foreground',
    scheduled: 'text-electric-blue',
    lobby: 'text-gold',
    live: 'text-correct-green',
    paused: 'text-yellow-400',
    ended: 'text-muted-foreground',
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gold font-black tracking-widest">SECURE OPERATOR PANEL</p>
            <h1 className="font-game text-2xl font-black text-white mt-1">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Live game, wallet, payout, and security overview.</p>
          </div>
          <a href="/admin/live" className="hidden sm:flex items-center gap-2 bg-gold text-navy-dark font-black px-4 py-2.5 rounded-full text-sm shadow-[0_12px_26px_hsl(var(--gold)/0.2)]">
            <Activity size={15} />
            Live Controller
          </a>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <StatCard icon={Activity} label="Live Playing Users" value={stats.liveUsers.toLocaleString()} sub="Can still answer" tone="green" />
          <StatCard icon={Users} label="Registered Users" value={stats.registeredUsers.toLocaleString()} />
          <StatCard icon={Wallet} label="Deposited Users" value={stats.depositedUsers.toLocaleString()} sub={fmt(stats.grossDeposits)} tone="gold" />
          <StatCard icon={Banknote} label="Platform Profit" value={fmt(stats.platformProfit)} sub="25% default" tone="green" />
          <StatCard icon={Banknote} label="Prize Pool" value={fmt(stats.prizePool)} sub="After platform fee" tone="gold" />
          <StatCard icon={Wallet} label="Pending Withdrawals" value={stats.pendingWithdrawals.toLocaleString()} />
          <StatCard icon={Shield} label="High Risk Events" value={stats.highRisk.toLocaleString()} tone="red" />
          <StatCard icon={Gamepad2} label="Total Games" value={stats.games.toLocaleString()} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="glass-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="font-black text-white text-sm flex items-center gap-2">
                <Gamepad2 size={15} className="text-gold" /> Recent Games
              </h2>
              <a href="/admin/games" className="text-xs text-gold font-bold">Open</a>
            </div>
            <div className="divide-y divide-border/30">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 bg-navy-light rounded w-3/4" /></div>)
              ) : recentGames.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No games yet</div>
              ) : recentGames.map(game => (
                <div key={game.id} className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{game.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {game.is_paid ? `${fmt(game.entry_fee)} entry` : 'Free to play'} - {game.total_questions || 0} questions
                    </p>
                  </div>
                  <span className={`text-xs font-black uppercase ${statusColor[game.status] || 'text-muted-foreground'}`}>{game.status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-2xl border border-border/50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="font-black text-white text-sm flex items-center gap-2">
                <Wallet size={15} className="text-gold" /> Recent Deposits
              </h2>
              <span className="text-xs text-muted-foreground">{data.deposits.length} total</span>
            </div>
            <div className="divide-y divide-border/30">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 bg-navy-light rounded w-3/4" /></div>)
              ) : recentDeposits.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No deposits yet</div>
              ) : recentDeposits.map(deposit => (
                <div key={deposit.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-black text-white">{fmt(deposit.amount)}</p>
                    <p className="text-xs text-muted-foreground">{deposit.provider || 'chapa'} - {deposit.purpose || 'wallet'}</p>
                  </div>
                  <span className={`text-xs font-black uppercase ${deposit.status === 'paid' ? 'text-correct-green' : 'text-yellow-400'}`}>{deposit.status}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
