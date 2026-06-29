import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Copy, Edit, HelpCircle, Plus, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const STATUSES = ['draft', 'scheduled', 'lobby', 'live', 'paused', 'ended'];
const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-electric-blue/20 text-electric-blue',
  lobby: 'bg-gold/20 text-gold',
  live: 'bg-correct-green/20 text-correct-green',
  paused: 'bg-yellow-500/20 text-yellow-400',
  ended: 'bg-border text-muted-foreground',
};

const emptyForm = () => ({
  title: '',
  description: '',
  scheduled_at: '',
  status: 'draft',
  is_paid: false,
  entry_fee: 0,
  prize_amount: '',
  auto_prize_enabled: true,
  platform_fee_percent: 25,
  total_questions: 10,
  question_timer: 10,
  max_players: 10000,
  allow_late_join: false,
  base_points: 100,
  speed_bonus_max: 50,
  min_answers: 3,
  max_answers: 4,
});

const inputClass = 'w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold';
const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

export default function AdminGames() {
  const [games, setGames] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadGames(); }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      const [gameRows, depositRows, questionRows] = await Promise.all([
        appClient.entities.Game.list('-created_date', 100),
        appClient.entities.Deposit.list('-created_date', 1000),
        appClient.entities.Question.list('order_index', 1000),
      ]);
      setGames(gameRows);
      setDeposits(depositRows);
      setQuestions(questionRows);
    } catch {
      setGames([]);
    }
    setLoading(false);
  };

  const gameMoney = useMemo(() => {
    const result = {};
    games.forEach(game => {
      const paid = deposits.filter(deposit => deposit.game_id === game.id && deposit.status === 'paid');
      const gross = paid.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
      const profit = Math.round(gross * Number(game.platform_fee_percent ?? 25) / 100);
      const autoPrize = Math.max(0, gross - profit);
      result[game.id] = { paidCount: paid.length, gross, profit, autoPrize };
    });
    return result;
  }, [deposits, games]);

  const openCreate = () => {
    setEditingGame(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (game) => {
    setEditingGame(game);
    setForm({
      ...emptyForm(),
      ...game,
      scheduled_at: toDateTimeLocal(game.scheduled_at),
      prize_amount: Number(game.prize_amount || 0) || '',
      platform_fee_percent: Number(game.platform_fee_percent ?? 25),
      min_answers: Number(game.min_answers || 3),
      max_answers: Number(game.max_answers || 4),
    });
    setFormOpen(true);
  };

  const handleField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const saveGame = async () => {
    if (!form.title.trim()) {
      alert('Game title is required.');
      return;
    }
    if (form.is_paid && Number(form.entry_fee || 0) <= 0) {
      alert('Paid games need an entry fee.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : '',
        entry_fee: form.is_paid ? Number(form.entry_fee || 0) : 0,
        prize_amount: Number(form.prize_amount || 0),
        platform_fee_percent: Number(form.platform_fee_percent || 25),
        total_questions: Number(form.total_questions || 1),
        question_timer: Number(form.question_timer || 10),
        max_players: Number(form.max_players || 10000),
        base_points: Number(form.base_points || 100),
        speed_bonus_max: Number(form.speed_bonus_max || 50),
        min_answers: 3,
        max_answers: 4,
      };
      if (editingGame) await appClient.entities.Game.update(editingGame.id, payload);
      else await appClient.entities.Game.create(payload);
      setFormOpen(false);
      setEditingGame(null);
      setForm(emptyForm());
      await loadGames();
    } catch (error) {
      alert(error.message || 'Failed to save game');
    }
    setSaving(false);
  };

  const deleteGame = async (id) => {
    if (!confirm('Delete this game?')) return;
    await appClient.entities.Game.delete(id);
    await loadGames();
  };

  const duplicateGame = async (game) => {
    const { id, created_date, updated_date, ...rest } = game;
    await appClient.entities.Game.create({ ...rest, title: `${game.title} Copy`, status: 'draft', current_question_index: 0, explanation_question_index: null, explanation_revealed_at: null });
    await loadGames();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gold font-black tracking-widest">GAME OPERATIONS</p>
            <h1 className="font-game text-xl font-black text-white">Games</h1>
            <p className="text-muted-foreground text-sm">Create a free or paid Telegram game without leaving this page.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 bg-gold text-navy-dark font-black px-4 py-2.5 rounded-full text-sm">
            <Plus size={16} /> New Game
          </button>
        </div>

        {formOpen && (
          <section className="glass-card rounded-2xl border border-gold/30 p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-game text-lg font-black text-white">{editingGame ? 'Edit Game' : 'New Game'}</h2>
                <p className="text-xs text-muted-foreground">Prize can stay empty. The system calculates it from paid entries before play.</p>
              </div>
              <button onClick={() => setFormOpen(false)} className="text-xs text-muted-foreground font-bold">Close</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-black text-muted-foreground mb-1">TITLE</label>
                <input value={form.title} onChange={e => handleField('title', e.target.value)} className={inputClass} placeholder="Sunday Dink Game" />
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">SCHEDULE</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={e => handleField('scheduled_at', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">STATUS</label>
                <select value={form.status} onChange={e => handleField('status', e.target.value)} className={inputClass}>
                  {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">ENTRY</label>
                <div className="grid grid-cols-2 gap-1 bg-navy-dark border border-border rounded-xl p-1">
                  <button onClick={() => handleField('is_paid', false)} className={`rounded-lg py-2 text-xs font-black ${!form.is_paid ? 'bg-gold text-navy-dark' : 'text-muted-foreground'}`}>Free</button>
                  <button onClick={() => handleField('is_paid', true)} className={`rounded-lg py-2 text-xs font-black ${form.is_paid ? 'bg-gold text-navy-dark' : 'text-muted-foreground'}`}>Paid</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">ENTRY FEE</label>
                <input type="number" min={0} value={form.entry_fee} disabled={!form.is_paid} onChange={e => handleField('entry_fee', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">PRIZE POOL</label>
                <input type="number" min={0} value={form.prize_amount} onChange={e => handleField('prize_amount', e.target.value)} className={inputClass} placeholder="Auto" />
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">PLATFORM FEE %</label>
                <input type="number" min={0} max={90} value={form.platform_fee_percent} onChange={e => handleField('platform_fee_percent', Number(e.target.value))} className={inputClass} />
              </div>

              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">QUESTIONS</label>
                <input type="number" min={1} value={form.total_questions} onChange={e => handleField('total_questions', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">TIMER SEC</label>
                <input type="number" min={5} max={60} value={form.question_timer} onChange={e => handleField('question_timer', Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-black text-muted-foreground mb-1">MAX PLAYERS</label>
                <input type="number" min={1} value={form.max_players} onChange={e => handleField('max_players', Number(e.target.value))} className={inputClass} />
              </div>
              <label className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={form.allow_late_join} onChange={e => handleField('allow_late_join', e.target.checked)} />
                <span className="text-sm text-white font-bold">Allow late join</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setFormOpen(false)} className="px-4 py-2.5 rounded-full bg-navy-light text-muted-foreground font-bold text-sm">Cancel</button>
              <button onClick={saveGame} disabled={saving} className="px-5 py-2.5 rounded-full bg-gold text-navy-dark font-black text-sm flex items-center gap-2 disabled:opacity-50">
                <Save size={15} />
                {saving ? 'Saving' : 'Save Game'}
              </button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="glass-card rounded-2xl p-4 border border-border/50 animate-pulse h-24" />)
          ) : games.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <p className="text-muted-foreground">No games yet. Create the first one from the button above.</p>
            </div>
          ) : games.map(game => {
            const money = gameMoney[game.id] || {};
            const qCount = questions.filter(question => question.game_id === game.id && question.is_active !== false).length;
            return (
              <div key={game.id} className="glass-card rounded-2xl p-4 border border-border/50">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-white truncate">{game.title}</p>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-full ${STATUS_COLORS[game.status] || ''}`}>{game.status}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarClock size={12} /> {game.scheduled_at ? new Date(game.scheduled_at).toLocaleString() : 'No date'}</span>
                      <span>{game.is_paid ? `${fmt(game.entry_fee)} entry` : 'Free'}</span>
                      <span>{qCount}/{game.total_questions || qCount} questions</span>
                      <span>{game.question_timer || 10}s</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 min-w-[260px]">
                    <div className="bg-navy-dark rounded-xl px-3 py-2">
                      <p className="text-[10px] text-muted-foreground font-bold">DEPOSITS</p>
                      <p className="text-sm text-white font-black">{fmt(money.gross)}</p>
                    </div>
                    <div className="bg-navy-dark rounded-xl px-3 py-2">
                      <p className="text-[10px] text-muted-foreground font-bold">PROFIT</p>
                      <p className="text-sm text-correct-green font-black">{fmt(money.profit)}</p>
                    </div>
                    <div className="bg-navy-dark rounded-xl px-3 py-2">
                      <p className="text-[10px] text-muted-foreground font-bold">PRIZE</p>
                      <p className="text-sm text-gold font-black">{fmt(Number(game.prize_amount || 0) || money.autoPrize)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => duplicateGame(game)} className="w-9 h-9 rounded-full bg-navy-light flex items-center justify-center" title="Duplicate">
                      <Copy size={14} className="text-muted-foreground" />
                    </button>
                    <Link to={`/admin/questions?game=${game.id}`} className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center" title="Questions">
                      <HelpCircle size={14} className="text-gold" />
                    </Link>
                    <button onClick={() => openEdit(game)} className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center" title="Edit">
                      <Edit size={14} className="text-primary" />
                    </button>
                    <button onClick={() => deleteGame(game.id)} className="w-9 h-9 rounded-full bg-wrong-red/20 flex items-center justify-center" title="Delete">
                      <Trash2 size={14} className="text-wrong-red" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </AdminLayout>
  );
}
