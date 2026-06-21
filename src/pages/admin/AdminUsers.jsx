import React, { useState, useEffect } from 'react';
import { Search, Shield, Ban, AlertTriangle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const u = await appClient.entities.User.list('-created_date', 100);
      setUsers(u);
    } catch (e) {}
    setLoading(false);
  };

  const toggleBan = async (user) => {
    const newBan = !user.is_banned;
    const reason = newBan ? prompt('Ban reason:') : null;
    if (newBan && !reason) return;
    setUpdatingId(user.id);
    await appClient.entities.User.update(user.id, { is_banned: newBan, ban_reason: reason || '' });
    await loadUsers();
    setUpdatingId('');
  };

  const toggleFlag = async (user) => {
    setUpdatingId(user.id);
    await appClient.entities.User.update(user.id, { is_flagged: !user.is_flagged });
    await loadUsers();
    setUpdatingId('');
  };

  const filtered = users.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || (filter === 'banned' && u.is_banned) || (filter === 'flagged' && u.is_flagged);
    return matchSearch && matchFilter;
  });

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-game text-xl font-black text-white">Users</h1>
          <p className="text-muted-foreground text-sm">{users.length} total registered players</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players..."
              className="w-full bg-navy-light border border-border rounded-xl pl-9 pr-3 py-2.5 text-white text-sm outline-none" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="bg-navy-light border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none">
            <option value="all">All</option>
            <option value="banned">Banned</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>

        <div className="space-y-2">
          {loading ? (
            [1,2,3,4,5].map(i => <div key={i} className="glass-card rounded-xl p-4 h-16 animate-pulse border border-border/50" />)
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : filtered.map(user => (
            <div key={user.id} className={`glass-card rounded-xl p-3 border flex items-center gap-3 ${user.is_banned ? 'border-wrong-red/30 bg-wrong-red/5' : user.is_flagged ? 'border-yellow-400/30' : 'border-border/50'}`}>
              <div className="w-10 h-10 rounded-full bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
                {user.photo_url ? (
                  <img src={user.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                ) : (
                  <span className="text-sm font-bold text-neon-purple">{(user.full_name || 'U')[0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-white truncate">{user.full_name || 'Unknown'}</p>
                  {user.is_banned && <Shield size={11} className="text-wrong-red flex-shrink-0" />}
                  {user.is_flagged && <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground">{user.username ? `@${user.username}` : user.telegram_id} · {fmt(user.total_winnings)} won · {user.games_played || 0} games</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleFlag(user)} disabled={updatingId === user.id}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.is_flagged ? 'bg-yellow-400/20' : 'bg-navy-light'}`}>
                  <AlertTriangle size={13} className={user.is_flagged ? 'text-yellow-400' : 'text-muted-foreground'} />
                </button>
                <button onClick={() => toggleBan(user)} disabled={updatingId === user.id}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.is_banned ? 'bg-correct-green/20' : 'bg-wrong-red/20'}`}>
                  <Ban size={13} className={user.is_banned ? 'text-correct-green' : 'text-wrong-red'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}