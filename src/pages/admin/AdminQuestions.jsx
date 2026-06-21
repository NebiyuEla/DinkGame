import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const emptyForm = () => ({
  game_id: '', text: '', image_url: '', explanation: '', options: [
    { label: 'A', text: '' }, { label: 'B', text: '' },
    { label: 'C', text: '' }, { label: 'D', text: '' }
  ],
  correct_option: 'A', category: '', difficulty: 'medium', time_limit: 10, order_index: 0
});

export default function AdminQuestions() {
  const location = useLocation();
  const [questions, setQuestions] = useState([]);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const g = await appClient.entities.Game.list('-created_date', 50);
      setGames(g);
      const params = new URLSearchParams(location.search);
      const requestedGame = params.get('game');
      if (requestedGame && g.some(game => game.id === requestedGame)) setSelectedGame(requestedGame);
      else if (g.length > 0) setSelectedGame(g[0].id);
    };
    load();
  }, [location.search]);

  useEffect(() => {
    if (selectedGame) loadQuestions();
  }, [selectedGame]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const q = await appClient.entities.Question.filter({ game_id: selectedGame }, 'order_index', 100);
      setQuestions(q);
    } catch (e) {}
    setLoading(false);
  };

  const openCreate = () => {
    setEditingQ(null);
    setForm({ ...emptyForm(), game_id: selectedGame, order_index: questions.length });
    setShowForm(true);
  };

  const openEdit = (q) => {
    setEditingQ(q);
    setForm({
      game_id: q.game_id, text: q.text, image_url: q.image_url || '', explanation: q.explanation || '',
      options: q.options || emptyForm().options, correct_option: q.correct_option,
      category: q.category || '', difficulty: q.difficulty, time_limit: q.time_limit, order_index: q.order_index
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.text.trim()) return;
    if ((form.options || []).some(opt => !opt.text.trim())) {
      alert('Fill all answer options before saving.');
      return;
    }
    if (!form.correct_option || !(form.options || []).some(opt => opt.label === form.correct_option)) {
      alert('Choose a correct answer.');
      return;
    }
    setSaving(true);
    try {
      if (editingQ) await appClient.entities.Question.update(editingQ.id, { ...form, is_active: true });
      else await appClient.entities.Question.create({ ...form, is_active: true });
      const updated = await appClient.entities.Question.filter({ game_id: form.game_id, is_active: true }, 'order_index', 200);
      await appClient.entities.Game.update(form.game_id, { total_questions: updated.length });
      await loadQuestions();
      setShowForm(false);
    } catch (e) { alert('Failed to save question'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return;
    await appClient.entities.Question.delete(id);
    const updated = await appClient.entities.Question.filter({ game_id: selectedGame, is_active: true }, 'order_index', 200);
    await appClient.entities.Game.update(selectedGame, { total_questions: updated.length });
    loadQuestions();
  };

  const filtered = questions.filter(q =>
    q.text?.toLowerCase().includes(search.toLowerCase()) ||
    q.category?.toLowerCase().includes(search.toLowerCase())
  );

  const diffColors = { easy: 'text-correct-green bg-correct-green/10', medium: 'text-yellow-400 bg-yellow-400/10', hard: 'text-wrong-red bg-wrong-red/10' };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-white">Questions</h1>
            <p className="text-muted-foreground text-sm">Manage quiz questions</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 gradient-purple-blue text-white font-bold px-4 py-2.5 rounded-xl text-sm">
            <Plus size={16} /> Add Question
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)}
            className="bg-navy-light border border-border rounded-xl px-3 py-2 text-white text-sm outline-none flex-1">
            {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..."
              className="w-full bg-navy-light border border-border rounded-xl pl-9 pr-3 py-2 text-white text-sm outline-none" />
          </div>
        </div>

        {/* Question Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl border border-neon-purple/30 w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
              <h2 className="font-game font-bold text-white mb-4">{editingQ ? 'Edit Question' : 'Add Question'}</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">QUESTION TEXT *</label>
                  <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} rows={3}
                    className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">IMAGE URL (OPTIONAL)</label>
                  <input type="text" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                    className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">EXPLANATION SHOWN AFTER REVEAL</label>
                  <textarea value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} rows={3}
                    className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple resize-none"
                    placeholder="Explain the answer. Players see this only after admin reveal." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-2 tracking-widest">ANSWER OPTIONS</label>
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={opt.label} className={`flex items-center gap-2 p-2 rounded-xl border ${form.correct_option === opt.label ? 'border-correct-green bg-correct-green/10' : 'border-border'}`}>
                        <button type="button" onClick={() => setForm(f => ({ ...f, correct_option: opt.label }))}
                          className={`w-7 h-7 rounded-lg font-game font-bold text-xs flex-shrink-0 ${form.correct_option === opt.label ? 'bg-correct-green text-white' : 'bg-navy-light text-muted-foreground'}`}>
                          {opt.label}
                        </button>
                        <input value={opt.text}
                          onChange={e => setForm(f => ({ ...f, options: f.options.map((o, oi) => oi === i ? { ...o, text: e.target.value } : o) }))}
                          className="flex-1 bg-transparent text-white text-sm outline-none"
                          placeholder={`Option ${opt.label}`} />
                        {form.correct_option === opt.label && <span className="text-xs text-correct-green font-bold">✓ Correct</span>}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Click a label to mark it as the correct answer</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">CATEGORY</label>
                    <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">DIFFICULTY</label>
                    <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
                      className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none">
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">TIME LIMIT (SEC)</label>
                    <input type="number" min={5} max={60} value={form.time_limit} onChange={e => setForm(f => ({ ...f, time_limit: Number(e.target.value) }))}
                      className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground mb-1 tracking-widest">ORDER</label>
                    <input type="number" value={form.order_index} onChange={e => setForm(f => ({ ...f, order_index: Number(e.target.value) }))}
                      className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowForm(false)} className="flex-1 bg-navy-light text-muted-foreground font-bold py-3 rounded-xl">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 gradient-purple-blue text-white font-bold py-3 rounded-xl disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Questions list */}
        <div className="space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-4 border border-border/50 h-16 animate-pulse" />)
          ) : filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <p className="text-muted-foreground">{questions.length === 0 ? 'No questions yet. Add the first one!' : 'No questions match your search.'}</p>
            </div>
          ) : filtered.map((q, i) => (
            <div key={q.id} className="glass-card rounded-xl p-4 border border-border/50 flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-neon-purple/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-neon-purple">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{q.text}</p>
                <div className="flex items-center gap-2 mt-1">
                  {q.category && <span className="text-xs text-muted-foreground">{q.category}</span>}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${diffColors[q.difficulty] || ''}`}>{q.difficulty}</span>
                  <span className="text-xs text-muted-foreground">{q.time_limit}s</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => openEdit(q)} className="w-7 h-7 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                  <Edit size={12} className="text-neon-purple" />
                </button>
                <button onClick={() => handleDelete(q.id)} className="w-7 h-7 rounded-lg bg-wrong-red/20 flex items-center justify-center">
                  <Trash2 size={12} className="text-wrong-red" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
