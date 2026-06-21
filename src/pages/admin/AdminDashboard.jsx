import React, { useState, useEffect } from 'react';
import { Users, Gamepad2, Gift, Shield, TrendingUp, Activity } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="glass-card rounded-2xl p-4 border border-border/50">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <TrendingUp size={14} className="text-correct-green" />
      </div>
      <p className="font-game text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
      {sub && <p className="text-xs text-neon-purple mt-0.5">{sub}</p>}
    </div>
  );
}

const isLiveUser = (player, liveGameIds) => (
  liveGameIds.has(player.game_id) &&
  !player.is_disqualified &&
  (player.status || 'playing') !== 'disconnected'
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, games: 0, claims: 0, suspicious: 0, paid: 0, liveUsers: 0 });
  const [recentGames, setRecentGames] = useState([]);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [users, games, claims, suspicious, paid, players] = await Promise.all([
          appClient.entities.User.list(),
          appClient.entities.Game.list(),
          appClient.entities.PrizeClaim.filter({ status: 'pending' }),
          appClient.entities.AntiCheatLog.filter({ severity: 'high' }),
          appClient.entities.PrizeClaim.filter({ status: 'paid' }),
          appClient.entities.GamePlayer.list('-created_date', 1000),
        ]);
        const liveGameIds = new Set(games.filter(g => ['lobby', 'live'].includes(g.status)).map(g => g.id));
        if (!mounted) return;
        setStats({
          users: users.length,
          games: games.length,
          claims: claims.length,
          suspicious: suspicious.length,
          paid: paid.length,
          liveUsers: players.filter(player => isLiveUser(player, liveGameIds)).length,
        });
        setRecentGames(games.slice(0, 5));
        const allClaims = await appClient.entities.PrizeClaim.list('-created_date', 5);
        if (mounted) setRecentClaims(allClaims);
      } catch (e) {}
      if (mounted) setLoading(false);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const statusColors = { draft: 'text-muted-foreground', scheduled: 'text-electric-blue', lobby: 'text-neon-purple', live: 'text-correct-green', ended: 'text-muted-foreground' };
  const claimColors = { pending: 'text-yellow-400', approved: 'text-electric-blue', paid: 'text-correct-green', rejected: 'text-wrong-red' };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-game text-xl font-black text-white">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Overview of Dink Game platform</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats.users.toLocaleString()} color="bg-electric-blue" />
          <StatCard icon={Activity} label="Live Users" value={stats.liveUsers.toLocaleString()} color="bg-correct-green" sub="Lobby and game" />
          <StatCard icon={Gamepad2} label="Total Games" value={stats.games} color="bg-neon-purple" />
          <StatCard icon={Gift} label="Pending Claims" value={stats.claims} color="bg-yellow-500" sub="Needs review" />
          <StatCard icon={Shield} label="Suspicious Events" value={stats.suspicious} color="bg-wrong-red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Games */}
          <div className="glass-card rounded-2xl border border-border/50">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Gamepad2 size={14} className="text-neon-purple" /> Recent Games
              </h2>
              <a href="/admin/games" className="text-xs text-neon-purple">View All</a>
            </div>
            <div className="divide-y divide-border/30">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 bg-navy-light rounded w-3/4" /></div>)
              ) : recentGames.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No games yet</div>
              ) : recentGames.map(g => (
                <div key={g.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-bold text-white truncate">{g.title}</p>
                    <p className="text-xs text-muted-foreground">{g.scheduled_at ? new Date(g.scheduled_at).toLocaleDateString() : '-'}</p>
                  </div>
                  <span className={`text-xs font-bold capitalize ${statusColors[g.status] || 'text-muted-foreground'}`}>
                    {g.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Claims */}
          <div className="glass-card rounded-2xl border border-border/50">
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Gift size={14} className="text-gold" /> Recent Claims
              </h2>
              <a href="/admin/claims" className="text-xs text-neon-purple">View All</a>
            </div>
            <div className="divide-y divide-border/30">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="p-4 animate-pulse"><div className="h-4 bg-navy-light rounded w-3/4" /></div>)
              ) : recentClaims.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No claims yet</div>
              ) : recentClaims.map(c => (
                <div key={c.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-bold text-white">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.payment_method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gold">
                      {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(c.prize_amount || 0)}
                    </p>
                    <span className={`text-xs font-bold ${claimColors[c.status] || ''}`}>{c.status?.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
