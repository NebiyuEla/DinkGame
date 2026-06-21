import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Copy, HelpCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-electric-blue/20 text-electric-blue',
  lobby: 'bg-neon-purple/20 text-neon-purple',
  live: 'bg-correct-green/20 text-correct-green',
  paused: 'bg-yellow-500/20 text-yellow-400',
  ended: 'bg-border text-muted-foreground',
};
const STATUSES = ['draft', 'scheduled', 'lobby', 'live', 'paused', 'ended'];

export default function AdminGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', scheduled_at: '', prize_amount: 0, jackpot_amount: 0,
    max_players: 10000, total_questions: 15, question_timer: 10, status: 'draft', allow_late_join: false,
    base_points: 100, speed_bonus_max: 50
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    setLoading(true);
    try { const g = await appClient.entities.Game.list('-created_date', 50); setGames(g); } catch (e) {}
    setLoading(false);
  };

  const openCreate = () => {
    setEditingGame(null);
    setForm({ title: '', description: '', scheduled_at: '', prize_amount: 0, jackpot_amount: 0, max_players: 10000, total_questions: 15, question_timer: 10, status: 'draft', allow_late_join: false, base_points: 100, speed_bonus_max: 50 });
    setShowForm(true);
  };

  const openEdit = (game) => {
    setEditingGame(game);
    setForm({
      title: game.title, description: game.description || '', scheduled_at: game.scheduled_at || '',
      prize_amount: game.prize_amount, jackpot_amount: game.jackpot_amount, max_players: game.max_players,
      total_questions: game.total_questions, question_timer: game.question_timer, status: game.status,
      allow_late_join: game.allow_late_join, base_points: game.base_points, speed_bonus_max: game.speed_bonus_max
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      alert('Game title is required.');
      return;
    }
    if (form.total_questions < 1 || form.question_timer < 3) {
      alert('Use at least 1 question and a timer of 3 seconds or more.');
      return;
    }
    setSaving(true);
    try {
      if (editingGame) await appClient.entities.Game.update(editingGame.id, form);
      else await appClient.entities.Game.create(form);
      await loadGames();
      setShowForm(false);
    } catch (e) { alert('Failed to save game'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this game?')) return;
    await appClient.entities.Game.delete(id);
    loadGames();
  };

  const handleDuplicate = async (game) => {
    const { id, created_date, updated_date, ...rest } = game;
    await appClient.entities.Game.create({ ...rest, title: `${game.title} (Copy)`, status: 'draft' });
    loadGames();
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-white">Games</h1>
            <p className="text-muted-foreground text-sm">Manage all Dink Game sessions</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 gradient-purple-blue text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus size={16} /> New Game
          </button>
        </div>

        {/* Game form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl border border-neon-purple/30 w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
              <h2 className="font-game font-bold text-white mb-4">{editingGame ? 'Edit Game' : 'Create Game'}</h2>
              <div className="space-y-3">
                {[
                  { key: 'title', label: 'Title', type: 'text', required: true },
                  { key: 'description', label: 'Description', type: 'text' },
                  { key: 'scheduled_at', label: 'Scheduled At', type: 'datetime-local' },
                  { key: 'prize_amount', label: 'Prize Amount (ETB)', type: 'number' },
                  { key: 'jackpot_amount', label: 'Jackpot Amount (ETB)', type: 'number' },
                  { key: 'max_players', label: 'Max Players', type: 'number' },
                  { key: 'total_questions', label: 'Total Questions', type: 'number' },
                  { key: 'question_timer', label: 'Question Timer (sec)', type: 'number' },
                  { key: 'base_points', label: 'Base Points', type: 'number' },
                  { key: 'speed_bonus_max', label: 'Max Speed Bonus', type: 'number' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">{field.label.toUpperCase()}</label>
                    <input type={field.type} value={form[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">STATUS</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                    {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.allow_late_join} onChange={e => setForm(f => ({ ...f, allow_late_join: e.target.checked }))} className="rounded" />
                  <span className="text-sm text-white font-bold">Allow late join</span>
                </label>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-navy-light text-muted-foreground font-bold py-3 rounded-xl">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 gradient-purple-blue text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Game'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Games list */}
        <div className="space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="glass-card rounded-2xl p-4 border border-border/50 animate-pulse h-20" />)
          ) : games.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <p className="text-muted-foreground">No games yet. Create your first game!</p>
            </div>
          ) : games.map(game => (
            <div key={game.id} className="glass-card rounded-2xl p-4 border border-border/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-white truncate">{game.title}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${STATUS_COLORS[game.status] || ''}`}>{game.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{game.scheduled_at ? new Date(game.scheduled_at).toLocaleDateString() : 'No date'}</span>
                    <span>•</span>
                    <span>{fmt(game.prize_amount)} prize</span>
                    <span>•</span>
                    <span>{game.total_questions}Q</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleDuplicate(game)} className="w-8 h-8 rounded-lg bg-navy-light flex items-center justify-center" title="Duplicate">
                    <Copy size={13} className="text-muted-foreground" />
                  </button>
                  <Link to={`/admin/questions?game=${game.id}`} className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center" title="Questions">
                    <HelpCircle size={13} className="text-gold" />
                  </Link>
                  <button onClick={() => openEdit(game)} className="w-8 h-8 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                    <Edit size={13} className="text-neon-purple" />
                  </button>
                  <button onClick={() => handleDelete(game.id)} className="w-8 h-8 rounded-lg bg-wrong-red/20 flex items-center justify-center">
                    <Trash2 size={13} className="text-wrong-red" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
