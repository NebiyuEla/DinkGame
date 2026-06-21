import React, { useState, useEffect, useRef } from 'react';
import {
  Play, SkipForward, Pause, Square, Users, BarChart2, Trophy, Megaphone, Settings, HelpCircle, Gift, Shield,
  Gamepad2, LogOut, Menu, RefreshCw, CheckCircle, Trash2,
  DollarSign, TrendingUp, UserCheck, CreditCard, Eye, EyeOff,
  Plus, Search
} from 'lucide-react';
import { appClient } from '@/api/appClient';

const SUPER_ADMIN = { username: 'dinkadmin', password: 'Dink@2026!' };

// ─── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault(); setLoading(true);
    setTimeout(() => {
      if (form.username === SUPER_ADMIN.username && form.password === SUPER_ADMIN.password) {
        localStorage.setItem('dink_super', '1'); onLogin();
      } else setError('Invalid credentials');
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white font-mono">DINK SUPERADMIN</h1>
          <p className="text-slate-400 text-sm mt-1">Game Control Panel</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-widest">USERNAME</label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500"
              placeholder="username" autoComplete="username" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 tracking-widest">PASSWORD</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-violet-500 pr-10"
                placeholder="password" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {show ? <EyeOff size={15} className="text-slate-400" /> : <Eye size={15} className="text-slate-400" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 transition-colors">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Dashboard / Overview ─────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentDeposits, setRecentDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [users, games, deposits, claims, players] = await Promise.all([
        appClient.entities.User.list('-created_date', 1000),
        appClient.entities.Game.list('-created_date', 100),
        appClient.entities.Deposit.list('-created_date', 100),
        appClient.entities.PrizeClaim.list('-created_date', 100),
        appClient.entities.GamePlayer.list('-created_date', 1000),
      ]);
      const paidDeposits = deposits.filter(d => d.status === 'paid');
      const totalRevenue = paidDeposits.reduce((s, d) => s + (d.amount || 0), 0);
      const totalPrizesPaid = claims.filter(c => c.status === 'paid').reduce((s, c) => s + (c.prize_amount || 0), 0);
      setStats({
        totalUsers: users.length,
        activeUsers: users.filter(u => !u.is_banned).length,
        bannedUsers: users.filter(u => u.is_banned).length,
        totalGames: games.length,
        liveGames: games.filter(g => g.status === 'live').length,
        totalDeposits: deposits.length,
        paidDeposits: paidDeposits.length,
        totalRevenue,
        totalPrizesPaid,
        netRevenue: totalRevenue - totalPrizesPaid,
        pendingClaims: claims.filter(c => c.status === 'pending').length,
        totalPlayers: players.length,
      });
      setRecentDeposits(deposits.slice(0, 10));
    } catch (e) {}
    setLoading(false);
  };

  const fmt = (n) => `ETB ${Number(n || 0).toLocaleString()}`;

  if (loading) return <div className="text-slate-400 text-sm text-center py-12">Loading...</div>;

  const CARDS = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
    { label: 'Total Revenue', value: fmt(stats.totalRevenue), icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    { label: 'Prizes Paid', value: fmt(stats.totalPrizesPaid), icon: Gift, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Net Revenue', value: fmt(stats.netRevenue), icon: DollarSign, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { label: 'Total Games', value: stats.totalGames, icon: Gamepad2, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
    { label: 'Paid Deposits', value: stats.paidDeposits, icon: CreditCard, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20' },
    { label: 'Pending Claims', value: stats.pendingClaims, icon: Trophy, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    { label: 'Total Plays', value: stats.totalPlayers, icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white font-mono">Dashboard</h2>
          <p className="text-slate-400 text-sm">Platform overview</p>
        </div>
        <button onClick={load} className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
          <RefreshCw size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-2xl p-4 border ${bg}`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-xs text-slate-400 font-medium">{label}</span>
            </div>
            <p className={`font-mono font-black text-lg ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <p className="text-sm font-bold text-white">Recent Deposits</p>
        </div>
        {recentDeposits.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No deposits yet</p>
        ) : recentDeposits.map(d => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50 last:border-0">
            <div>
              <p className="text-sm text-white font-medium truncate">{d.phone || d.email || d.user_id?.slice(-6)}</p>
              <p className="text-xs text-slate-500">{d.chapa_tx_ref?.slice(-12)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-sm font-bold text-green-400">ETB {d.amount}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${d.status === 'paid' ? 'bg-green-500/20 text-green-400' : d.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{d.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Users Manager ────────────────────────────────────────────────────────────
function UsersManager() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setUsers(await appClient.entities.User.list('-created_date', 200)); } catch (e) {}
    setLoading(false);
  };

  const toggleBan = async (user) => {
    if (!window.confirm(user.is_banned ? 'Unban this user?' : 'Ban this user?')) return;
    await appClient.entities.User.update(user.id, { is_banned: !user.is_banned });
    load();
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || (u.full_name || '').toLowerCase().includes(q) || (u.username || '').toLowerCase().includes(q);
    const matchFilter = filter === 'all' || (filter === 'banned' && u.is_banned) || (filter === 'flagged' && u.is_flagged);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white font-mono">Users</h2>
          <p className="text-slate-400 text-sm">{users.length} registered</p>
        </div>
        <button onClick={load} className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
          <RefreshCw size={14} className="text-slate-400" />
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or username..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-violet-500" />
      </div>

      <div className="flex gap-2">
        {['all', 'banned', 'flagged'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${filter === f ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? <div className="text-slate-400 text-sm text-center py-8">Loading...</div> :
          filtered.map(u => (
            <div key={u.id} className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-400">{(u.full_name || u.username || 'U')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{u.full_name || u.username || 'Unknown'}</p>
                    {u.is_banned && <span className="text-[9px] bg-red-500/20 text-red-400 px-1 py-0.5 rounded font-bold">BANNED</span>}
                    {u.is_flagged && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded font-bold">FLAGGED</span>}
                  </div>
                  <p className="text-xs text-slate-500">Winnings: ETB {u.total_winnings || 0} · Games: {u.games_played || 0}</p>
                </div>
              </div>
              <button onClick={() => toggleBan(u)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 ${u.is_banned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {u.is_banned ? 'Unban' : 'Ban'}
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Deposits Manager ─────────────────────────────────────────────────────────
function DepositsManager() {
  const [deposits, setDeposits] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setDeposits(await appClient.entities.Deposit.list('-created_date', 200)); } catch (e) {}
    setLoading(false);
  };

  const markPaid = async (dep) => {
    await appClient.entities.Deposit.update(dep.id, { status: 'paid', verified_at: new Date().toISOString() });
    load();
  };

  const markFailed = async (dep) => {
    await appClient.entities.Deposit.update(dep.id, { status: 'failed' });
    load();
  };

  const filtered = filter === 'all' ? deposits : deposits.filter(d => d.status === filter);
  const totalPaid = deposits.filter(d => d.status === 'paid').reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white font-mono">Deposits</h2>
        <p className="text-slate-400 text-sm">Total collected: <span className="text-green-400 font-bold">ETB {totalPaid.toLocaleString()}</span></p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'paid', 'failed'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${filter === s ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {s} ({(s === 'all' ? deposits : deposits.filter(d => d.status === s)).length})
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {loading ? <div className="text-slate-400 text-sm text-center py-8">Loading...</div> :
          filtered.map(dep => (
            <div key={dep.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-white">{dep.phone || dep.email || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 font-mono">{dep.chapa_tx_ref}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-black text-green-400">ETB {dep.amount}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${dep.status === 'paid' ? 'bg-green-500/20 text-green-400' : dep.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{dep.status}</span>
                </div>
              </div>
              {dep.status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => markPaid(dep)} className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold py-2 rounded-xl text-xs">
                    Mark Paid
                  </button>
                  <button onClick={() => markFailed(dep)} className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold py-2 rounded-xl text-xs">
                    Mark Failed
                  </button>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Games Manager ────────────────────────────────────────────────────────────
function GamesManager() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editGame, setEditGame] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setGames(await appClient.entities.Game.list('-created_date', 30)); } catch (e) {}
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editGame.id) await appClient.entities.Game.update(editGame.id, editGame);
      else await appClient.entities.Game.create(editGame);
      await load(); setEditGame(null);
    } catch (e) {} finally { setSaving(false); }
  };

  const FIELDS = [
    { key: 'title', label: 'Title', type: 'text' },
    { key: 'prize_amount', label: 'Prize Amount (ETB)', type: 'number' },
    { key: 'jackpot_amount', label: 'Jackpot (ETB)', type: 'number' },
    { key: 'entry_fee', label: 'Entry Fee (ETB, 0 = free)', type: 'number' },
    { key: 'total_questions', label: 'Total Questions', type: 'number' },
    { key: 'question_timer', label: 'Timer per Q (sec)', type: 'number' },
    { key: 'scheduled_at', label: 'Scheduled At', type: 'datetime-local' },
  ];

  const STATUS_C = { draft: 'bg-slate-700 text-slate-300', scheduled: 'bg-blue-500/20 text-blue-400', lobby: 'bg-violet-500/20 text-violet-400', live: 'bg-green-500/20 text-green-400', paused: 'bg-amber-500/20 text-amber-400', ended: 'bg-slate-700 text-slate-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white font-mono">Games</h2>
          <p className="text-slate-400 text-sm">Manage all game sessions</p>
        </div>
        <button onClick={() => setEditGame({ title: '', status: 'draft', prize_amount: 0, jackpot_amount: 0, entry_fee: 0, is_paid: false, total_questions: 15, question_timer: 10 })}
          className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5">
          <Plus size={14} /> New
        </button>
      </div>

      {editGame && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-violet-500/30 space-y-3">
          <h3 className="font-bold text-white">{editGame.id ? 'Edit Game' : 'New Game'}</h3>
          {FIELDS.map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{label}</label>
              <input type={type} value={editGame[key] || ''} onChange={e => setEditGame(g => ({ ...g, [key]: type === 'number' ? +e.target.value : e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500" />
            </div>
          ))}
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl">
            <span className="text-sm font-semibold text-white">Paid Entry</span>
            <button onClick={() => setEditGame(g => ({ ...g, is_paid: !g.is_paid }))}
              className={`w-12 h-6 rounded-full transition-colors ${editGame.is_paid ? 'bg-violet-600' : 'bg-slate-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform mx-0.5 ${editGame.is_paid ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
            <select value={editGame.status || 'draft'} onChange={e => setEditGame(g => ({ ...g, status: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500">
              {['draft', 'scheduled', 'lobby', 'live', 'paused', 'ended'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditGame(null)} className="flex-1 bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading ? <div className="text-slate-400 text-sm text-center py-8">Loading...</div> :
          games.map(g => (
            <div key={g.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm truncate">{g.title}</p>
                  {g.is_paid && <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">PAID</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {g.scheduled_at ? new Date(g.scheduled_at).toLocaleString() : 'No date'} · {g.total_questions}q · ETB {g.prize_amount}
                  {g.is_paid ? ` · Entry: ETB ${g.entry_fee}` : ' · Free'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${STATUS_C[g.status] || ''}`}>{g.status}</span>
                <button onClick={() => setEditGame(g)} className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
                  <Settings size={12} className="text-slate-400" />
                </button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Questions Manager ────────────────────────────────────────────────────────
function QuestionsManager() {
  const [games, setGames] = useState([]);
  const [gameId, setGameId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [editQ, setEditQ] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    appClient.entities.Game.list('-created_date', 30).then(setGames).catch(() => {});
  }, []);

  useEffect(() => {
    if (!gameId) return;
    loadQuestions();
  }, [gameId]);

  const loadQuestions = () =>
    appClient.entities.Question.filter({ game_id: gameId }, 'order_index', 200).then(setQuestions).catch(() => {});

  const save = async () => {
    setSaving(true);
    try {
      if (editQ.id) await appClient.entities.Question.update(editQ.id, editQ);
      else await appClient.entities.Question.create({ ...editQ, game_id: gameId });
      await loadQuestions(); setEditQ(null);
    } catch (e) {} finally { setSaving(false); }
  };

  const deleteQ = async (q) => {
    if (!window.confirm('Delete this question?')) return;
    setDeleting(q.id);
    try { await appClient.entities.Question.delete(q.id); await loadQuestions(); } catch (e) {}
    setDeleting('');
  };

  const blank = { text: '', options: [{ label: 'A', text: '' }, { label: 'B', text: '' }, { label: 'C', text: '' }, { label: 'D', text: '' }], correct_option: 'A', explanation: '', time_limit: 10, order_index: questions.length, is_active: true };

  const filtered = questions.filter(q => !search || q.text.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white font-mono">Questions</h2>
          <p className="text-slate-400 text-sm">Amharic quiz content</p>
        </div>
        {gameId && (
          <button onClick={() => setEditQ(blank)} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-xl text-sm flex items-center gap-1.5">
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      <select value={gameId} onChange={e => setGameId(e.target.value)}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500">
        <option value="">— Select game —</option>
        {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
      </select>

      {gameId && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm outline-none focus:border-violet-500" />
        </div>
      )}

      {editQ && (
        <div className="bg-slate-900 rounded-2xl p-4 border border-violet-500/30 space-y-3">
          <h3 className="font-bold text-white">{editQ.id ? 'Edit Question' : 'New Question'}</h3>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Question (Amharic)</label>
            <textarea value={editQ.text} onChange={e => setEditQ(q => ({ ...q, text: e.target.value }))} rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500 resize-none" />
          </div>
          {['A', 'B', 'C', 'D'].map(label => (
            <div key={label}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Option {label}</label>
              <input value={editQ.options?.find(o => o.label === label)?.text || ''}
                onChange={e => setEditQ(q => ({ ...q, options: q.options.map(o => o.label === label ? { ...o, text: e.target.value } : o) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Correct</label>
              <select value={editQ.correct_option} onChange={e => setEditQ(q => ({ ...q, correct_option: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500">
                {['A', 'B', 'C', 'D'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Timer (sec)</label>
              <input type="number" value={editQ.time_limit} onChange={e => setEditQ(q => ({ ...q, time_limit: +e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Explanation</label>
            <textarea value={editQ.explanation} onChange={e => setEditQ(q => ({ ...q, explanation: e.target.value }))} rows={2}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500 resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex-1 bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditQ(null)} className="flex-1 bg-slate-700 text-white font-semibold py-2.5 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((q, i) => (
          <div key={q.id} className="bg-slate-900 rounded-2xl p-3.5 border border-slate-800 flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-slate-400">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white leading-relaxed">{q.text}</p>
              <p className="text-xs text-green-400 font-semibold mt-1">Correct: {q.correct_option}</p>
              {q.explanation && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{q.explanation}</p>}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => setEditQ(q)} className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
                <Settings size={11} className="text-slate-400" />
              </button>
              <button onClick={() => deleteQ(q)} disabled={deleting === q.id}
                className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
                <Trash2 size={11} className={deleting === q.id ? 'text-slate-500' : 'text-red-400'} />
              </button>
            </div>
          </div>
        ))}
        {gameId && filtered.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-6">No questions found</p>
        )}
      </div>
    </div>
  );
}

// ─── Live Controller ──────────────────────────────────────────────────────────
function LiveController() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const pollRef = useRef(null);

  useEffect(() => { loadGames(); }, []);
  useEffect(() => {
    if (!selectedGame) return;
    refresh();
    pollRef.current = setInterval(refresh, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedGame?.id]);

  const loadGames = async () => {
    const [a, b, c, d] = await Promise.all([
      appClient.entities.Game.filter({ status: 'live' }, '-created_date', 10),
      appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 10),
      appClient.entities.Game.filter({ status: 'scheduled' }, '-created_date', 10),
      appClient.entities.Game.filter({ status: 'paused' }, '-created_date', 10),
    ]);
    setGames([...a, ...b, ...d, ...c]);
  };

  const refresh = async () => {
    if (!selectedGame) return;
    try {
      const [q, p, a, updated] = await Promise.all([
        appClient.entities.Question.filter({ game_id: selectedGame.id, is_active: true }, 'order_index', 100),
        appClient.entities.GamePlayer.filter({ game_id: selectedGame.id }, '-total_score', 50),
        appClient.entities.Answer.filter({ game_id: selectedGame.id }),
        appClient.entities.Game.filter({ id: selectedGame.id }, '-created_date', 1),
      ]);
      setQuestions(q); setPlayers(p); setAnswers(a);
      if (updated.length > 0) setSelectedGame(updated[0]);
    } catch (e) {}
  };

  const doAction = async (action) => {
    setActionLoading(action);
    try {
      if (action === 'start_lobby') await appClient.entities.Game.update(selectedGame.id, { status: 'lobby' });
      else if (action === 'start_game') await appClient.entities.Game.update(selectedGame.id, { status: 'live', current_question_index: 0 });
      else if (action === 'show_explanation') {
        await appClient.entities.Broadcast.create({ message: `EXPLANATION:${selectedGame.current_question_index || 0}`, target: 'live', sent_by: 'system', sent_at: new Date().toISOString(), status: 'sent' });
      } else if (action === 'next_question') {
        const nextIdx = (selectedGame.current_question_index || 0) + 1;
        if (nextIdx >= questions.length) await endGame();
        else await appClient.entities.Game.update(selectedGame.id, { current_question_index: nextIdx });
      } else if (action === 'pause') await appClient.entities.Game.update(selectedGame.id, { status: 'paused' });
      else if (action === 'resume') await appClient.entities.Game.update(selectedGame.id, { status: 'live' });
      else if (action === 'end_game') {
        if (!window.confirm('End game?')) { setActionLoading(''); return; }
        await endGame();
      }
      await refresh();
    } catch (e) { alert(e.message); }
    setActionLoading('');
  };

  const endGame = async () => {
    await appClient.entities.Game.update(selectedGame.id, { status: 'ended', ended_at: new Date().toISOString() });
    const sorted = [...players].sort((a, b) => b.total_score - a.total_score || a.total_response_time_ms - b.total_response_time_ms);
    for (let i = 0; i < sorted.length; i++) await appClient.entities.GamePlayer.update(sorted[i].id, { rank: i + 1, status: 'finished' });
    if (sorted[0]) await appClient.entities.Game.update(selectedGame.id, { winner_user_id: sorted[0].user_id });
  };

  const currentQ = selectedGame && questions[selectedGame.current_question_index || 0];
  const qAnswers = currentQ ? answers.filter(a => a.question_id === currentQ.id) : [];
  const answeredCount = qAnswers.length;
  const isLast = questions.length > 0 && (selectedGame?.current_question_index || 0) >= questions.length - 1;

  const CONTROLS = [
    { action: 'start_lobby', label: 'Open Lobby', icon: Users, c: 'bg-blue-500/20 border-blue-500/30 text-blue-400', show: ['draft', 'scheduled'] },
    { action: 'start_game', label: 'Start Game', icon: Play, c: 'bg-green-500/20 border-green-500/30 text-green-400', show: ['lobby'] },
    { action: 'show_explanation', label: 'Show Answer', icon: CheckCircle, c: 'bg-amber-500/20 border-amber-500/30 text-amber-400', show: ['live'] },
    { action: 'next_question', label: isLast ? 'Finish Game' : 'Next Question', icon: isLast ? Square : SkipForward, c: isLast ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-violet-500/20 border-violet-500/30 text-violet-400', show: ['live'] },
    { action: 'pause', label: 'Pause', icon: Pause, c: 'bg-amber-500/20 border-amber-500/30 text-amber-400', show: ['live'] },
    { action: 'resume', label: 'Resume', icon: Play, c: 'bg-green-500/20 border-green-500/30 text-green-400', show: ['paused'] },
    { action: 'end_game', label: 'Force End', icon: Square, c: 'bg-red-500/20 border-red-500/30 text-red-400', show: ['live', 'paused'] },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white font-mono">Live Controller</h2>
        <p className="text-slate-400 text-sm">Real-time game control</p>
      </div>

      <select value={selectedGame?.id || ''} onChange={e => setSelectedGame(games.find(g => g.id === e.target.value) || null)}
        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500">
        <option value="">— Select a game —</option>
        {games.map(g => <option key={g.id} value={g.id}>{g.title} ({g.status})</option>)}
      </select>

      {selectedGame && (
        <>
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-white">{selectedGame.title}</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${selectedGame.status === 'live' ? 'bg-green-500/20 text-green-400' : selectedGame.status === 'lobby' ? 'bg-violet-500/20 text-violet-400' : 'bg-slate-700 text-slate-400'}`}>{selectedGame.status?.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Players', value: players.filter(p => !p.is_disqualified).length, color: 'text-violet-400' },
                { label: 'Question', value: `${(selectedGame.current_question_index || 0) + 1}/${questions.length}`, color: 'text-blue-400' },
                { label: 'Answered', value: answeredCount, color: 'text-amber-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-slate-800 rounded-xl p-3">
                  <p className={`font-mono text-lg font-black ${color}`}>{value}</p>
                  <p className="text-xs text-slate-500">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <p className="text-xs font-bold text-slate-400 mb-3 tracking-widest">CONTROLS</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTROLS.filter(b => b.show.includes(selectedGame.status)).map(({ action, label, icon: Icon, c }) => (
                <button key={action} onClick={() => doAction(action)} disabled={!!actionLoading}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${c}`}>
                  <Icon size={14} />
                  {actionLoading === action ? '...' : label}
                </button>
              ))}
            </div>
          </div>

          {currentQ && (
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
              <p className="text-xs font-bold text-slate-400 mb-2 tracking-widest">CURRENT QUESTION</p>
              <p className="text-white font-bold text-sm mb-3 leading-relaxed">{currentQ.text}</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(currentQ.options || []).map(opt => (
                  <div key={opt.label} className={`p-2.5 rounded-xl border text-xs ${opt.label === currentQ.correct_option ? 'border-green-500/40 bg-green-500/10 text-green-400 font-bold' : 'border-slate-700 text-slate-400'}`}>
                    <span className="font-bold">{opt.label}.</span> {opt.text}
                    {opt.label === currentQ.correct_option && <CheckCircle size={10} className="inline ml-1" />}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-slate-500">{answeredCount} answered</p>
                {(currentQ.options || []).map((opt, i) => {
                  const count = qAnswers.filter(a => a.selected_option === opt.label).length;
                  const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
                  return (
                    <div key={opt.label} className="flex items-center gap-2">
                      <span className="text-xs text-white font-bold w-4">{opt.label}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2">
                        <div className={`h-full rounded-full transition-all ${opt.label === currentQ.correct_option ? 'bg-green-500' : 'bg-violet-500/60'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      <span className="text-xs text-slate-500 w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex gap-2">
              <input value={announcement} onChange={e => setAnnouncement(e.target.value)}
                placeholder="Broadcast to all players..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-violet-500"
                onKeyDown={e => e.key === 'Enter' && (appClient.entities.Broadcast.create({ message: announcement, target: 'live', sent_by: 'admin', sent_at: new Date().toISOString(), status: 'sent' }), setAnnouncement(''))} />
              <button onClick={() => { appClient.entities.Broadcast.create({ message: announcement, target: 'live', sent_by: 'admin', sent_at: new Date().toISOString(), status: 'sent' }); setAnnouncement(''); }}
                className="bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
                <Megaphone size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Prize Claims ─────────────────────────────────────────────────────────────
function ClaimsManager() {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { setClaims(await appClient.entities.PrizeClaim.list('-created_date', 100)); } catch (e) {}
    setLoading(false);
  };

  const update = async (id, status) => {
    await appClient.entities.PrizeClaim.update(id, { status, reviewed_at: new Date().toISOString() });
    load();
  };

  const filtered = claims.filter(c => c.status === filter);
  const total = claims.filter(c => c.status === 'paid').reduce((s, c) => s + (c.prize_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white font-mono">Prize Claims</h2>
        <p className="text-slate-400 text-sm">Total paid: <span className="text-green-400 font-bold">ETB {total.toLocaleString()}</span></p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['pending', 'approved', 'paid', 'rejected'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${filter === s ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {s} ({claims.filter(c => c.status === s).length})
          </button>
        ))}
      </div>
      {loading ? <div className="text-slate-400 text-sm text-center py-8">Loading...</div> :
        filtered.length === 0 ? <p className="text-slate-500 text-sm text-center py-8">No {filter} claims</p> :
        filtered.map(claim => (
          <div key={claim.id} className="bg-slate-900 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-white text-sm">{claim.full_name}</p>
                <p className="text-xs text-slate-500">{claim.phone_number} · {claim.payment_method}</p>
              </div>
              <p className="font-mono font-black text-amber-400">ETB {claim.prize_amount}</p>
            </div>
            {claim.note && <p className="text-xs text-slate-400 mb-2 bg-slate-800 rounded-lg px-3 py-2">{claim.note}</p>}
            {claim.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => update(claim.id, 'approved')} className="flex-1 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold py-2 rounded-xl text-xs">Approve</button>
                <button onClick={() => update(claim.id, 'rejected')} className="flex-1 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold py-2 rounded-xl text-xs">Reject</button>
              </div>
            )}
            {claim.status === 'approved' && (
              <button onClick={() => update(claim.id, 'paid')} className="w-full bg-green-500/20 border border-green-500/30 text-green-400 font-semibold py-2 rounded-xl text-xs">Mark Paid</button>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ─── Main Layout ──────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'live', label: 'Live Control', icon: Play },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'questions', label: 'Questions', icon: HelpCircle },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'deposits', label: 'Deposits', icon: CreditCard },
  { id: 'claims', label: 'Claims', icon: Gift },
];

export default function SuperAdmin() {
  const [authed, setAuthed] = useState(() => localStorage.getItem('dink_super') === '1');
  const [section, setSection] = useState('dashboard');
  const [sideOpen, setSideOpen] = useState(false);

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;

  const handleLogout = () => { localStorage.removeItem('dink_super'); setAuthed(false); };

  const SectionContent = () => {
    if (section === 'dashboard') return <Dashboard />;
    if (section === 'live') return <LiveController />;
    if (section === 'games') return <GamesManager />;
    if (section === 'questions') return <QuestionsManager />;
    if (section === 'users') return <UsersManager />;
    if (section === 'deposits') return <DepositsManager />;
    if (section === 'claims') return <ClaimsManager />;
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-56 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${sideOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex`}>
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Shield size={15} className="text-white" />
            </div>
            <div>
              <p className="font-mono font-black text-white text-sm">SUPERADMIN</p>
              <p className="text-xs text-slate-500">Dink Game</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setSection(id); setSideOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${section === id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-semibold">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {sideOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSideOpen(false)} />}

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 lg:hidden">
          <button onClick={() => setSideOpen(true)} className="w-8 h-8 bg-slate-800 rounded-xl flex items-center justify-center">
            <Menu size={16} className="text-white" />
          </button>
          <span className="font-mono text-sm font-bold text-white">{SECTIONS.find(s => s.id === section)?.label}</span>
        </header>
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <SectionContent />
        </div>
      </main>
    </div>
  );
}