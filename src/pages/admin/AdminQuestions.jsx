import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, Plus, Save, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const LABELS = ['A', 'B', 'C', 'D'];
const inputClass = 'w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold';

const emptyQuestion = (gameId, orderIndex) => ({
  temp_id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  game_id: gameId,
  text: '',
  explanation: '',
  options: [
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
  ],
  correct_option: 'A',
  time_limit: 10,
  order_index: orderIndex,
  difficulty: 'medium',
  category: '',
  is_active: true,
});

function normalizeQuestion(question, fallbackGameId, index) {
  const options = (question.options?.length ? question.options : emptyQuestion(fallbackGameId, index).options)
    .slice(0, 4)
    .map((option, optionIndex) => ({ label: LABELS[optionIndex], text: option.text || '' }));
  while (options.length < 3) options.push({ label: LABELS[options.length], text: '' });
  return {
    ...emptyQuestion(fallbackGameId, index),
    ...question,
    options,
    correct_option: options.some(option => option.label === question.correct_option) ? question.correct_option : options[0].label,
    order_index: Number(question.order_index ?? index),
  };
}

export default function AdminQuestions() {
  const location = useLocation();
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    const loadGames = async () => {
      const rows = await appClient.entities.Game.list('-created_date', 100);
      const params = new URLSearchParams(location.search);
      const requested = params.get('game');
      setGames(rows);
      setSelectedGame(requested && rows.some(game => game.id === requested) ? requested : rows[0]?.id || '');
    };
    loadGames();
  }, [location.search]);

  useEffect(() => {
    if (!selectedGame) return;
    loadQuestions(selectedGame);
  }, [selectedGame]);

  const selectedGameRecord = useMemo(() => games.find(game => game.id === selectedGame), [games, selectedGame]);

  const loadQuestions = async (gameId) => {
    setLoading(true);
    try {
      const rows = await appClient.entities.Question.filter({ game_id: gameId }, 'order_index', 200);
      setDrafts(rows.map((question, index) => normalizeQuestion(question, gameId, index)));
    } catch {
      setDrafts([]);
    }
    setLoading(false);
  };

  const updateDraft = (key, patch) => {
    setDrafts(prev => prev.map(item => (item.id || item.temp_id) === key ? { ...item, ...patch } : item));
  };

  const updateOption = (key, index, text) => {
    setDrafts(prev => prev.map(item => {
      if ((item.id || item.temp_id) !== key) return item;
      return { ...item, options: item.options.map((option, optionIndex) => optionIndex === index ? { ...option, text } : option) };
    }));
  };

  const addQuestion = () => {
    setDrafts(prev => [...prev, emptyQuestion(selectedGame, prev.length)]);
  };

  const addOption = (key) => {
    setDrafts(prev => prev.map(item => {
      if ((item.id || item.temp_id) !== key || item.options.length >= 4) return item;
      const nextOptions = [...item.options, { label: LABELS[item.options.length], text: '' }];
      return { ...item, options: nextOptions };
    }));
  };

  const removeOption = (key, index) => {
    setDrafts(prev => prev.map(item => {
      if ((item.id || item.temp_id) !== key || item.options.length <= 3) return item;
      const options = item.options.filter((_, optionIndex) => optionIndex !== index).map((option, optionIndex) => ({ ...option, label: LABELS[optionIndex] }));
      return {
        ...item,
        options,
        correct_option: options.some(option => option.label === item.correct_option) ? item.correct_option : options[0].label,
      };
    }));
  };

  const saveQuestion = async (question, index) => {
    const key = question.id || question.temp_id;
    if (!question.text.trim()) {
      alert('Question text is required.');
      return;
    }
    const options = question.options.filter(option => option.text.trim()).slice(0, 4).map((option, optionIndex) => ({ label: LABELS[optionIndex], text: option.text.trim() }));
    if (options.length < 3 || options.length > 4) {
      alert('Each question needs 3 or 4 answers.');
      return;
    }
    const correctOption = options.some(option => option.label === question.correct_option) ? question.correct_option : options[0].label;
    setSavingId(key);
    try {
      const payload = {
        game_id: selectedGame,
        text: question.text.trim(),
        explanation: question.explanation || '',
        image_url: question.image_url || '',
        options,
        correct_option: correctOption,
        category: question.category || '',
        difficulty: question.difficulty || 'medium',
        time_limit: Number(question.time_limit || selectedGameRecord?.question_timer || 10),
        order_index: Number(question.order_index ?? index),
        is_active: true,
      };
      if (question.id) await appClient.entities.Question.update(question.id, payload);
      else await appClient.entities.Question.create(payload);
      const updated = await appClient.entities.Question.filter({ game_id: selectedGame, is_active: true }, 'order_index', 200);
      await appClient.entities.Game.update(selectedGame, { total_questions: updated.length });
      await loadQuestions(selectedGame);
    } catch (error) {
      alert(error.message || 'Failed to save question');
    }
    setSavingId('');
  };

  const deleteQuestion = async (question) => {
    const key = question.id || question.temp_id;
    if (!question.id) {
      setDrafts(prev => prev.filter(item => (item.id || item.temp_id) !== key));
      return;
    }
    if (!confirm('Delete this question?')) return;
    await appClient.entities.Question.delete(question.id);
    const updated = await appClient.entities.Question.filter({ game_id: selectedGame, is_active: true }, 'order_index', 200);
    await appClient.entities.Game.update(selectedGame, { total_questions: updated.length });
    await loadQuestions(selectedGame);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gold font-black tracking-widest">QUESTION BUILDER</p>
            <h1 className="font-game text-xl font-black text-white">Questions</h1>
            <p className="text-muted-foreground text-sm">Build questions inline. Every question supports 3 or 4 answer choices.</p>
          </div>
          <button onClick={addQuestion} disabled={!selectedGame} className="flex items-center gap-2 bg-primary text-white font-black px-4 py-2.5 rounded-full text-sm disabled:opacity-50">
            <Plus size={16} /> Add Question
          </button>
        </div>

        <section className="glass-card rounded-2xl p-4 border border-border/50">
          <label className="block text-xs font-black text-muted-foreground mb-2">SELECT GAME</label>
          <select value={selectedGame} onChange={e => setSelectedGame(e.target.value)} className={inputClass}>
            {games.map(game => <option key={game.id} value={game.id}>{game.title} ({game.status})</option>)}
          </select>
        </section>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="glass-card rounded-2xl p-4 h-32 animate-pulse border border-border/50" />)}
          </div>
        ) : drafts.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
            <p className="text-muted-foreground mb-4">No questions yet for this game.</p>
            <button onClick={addQuestion} className="inline-flex items-center gap-2 bg-primary text-white font-black px-4 py-2.5 rounded-full text-sm">
              <Plus size={16} /> Add First Question
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((question, index) => {
              const key = question.id || question.temp_id;
              return (
                <article key={key} className="glass-card rounded-2xl border border-border/50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gold/15 text-gold flex items-center justify-center font-black text-sm">{index + 1}</div>
                      <div>
                        <p className="font-black text-white text-sm">Question {index + 1}</p>
                        <p className="text-xs text-muted-foreground">{question.id ? 'Saved' : 'Draft'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveQuestion(question, index)} disabled={savingId === key}
                        className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50" title="Save">
                        <Save size={15} />
                      </button>
                      <button onClick={() => deleteQuestion(question)} className="w-9 h-9 rounded-full bg-wrong-red/20 text-wrong-red flex items-center justify-center" title="Delete">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea
                      value={question.text}
                      onChange={e => updateDraft(key, { text: e.target.value })}
                      rows={3}
                      className={`${inputClass} resize-none text-base font-bold`}
                      placeholder="Type the question here"
                    />

                    <div className="space-y-2">
                      {question.options.map((option, optionIndex) => {
                        const isCorrect = question.correct_option === option.label;
                        return (
                          <div key={option.label} className={`flex items-center gap-2 rounded-2xl border p-2 ${isCorrect ? 'border-correct-green bg-correct-green/10' : 'border-border/50 bg-navy-dark/40'}`}>
                            <button
                              type="button"
                              onClick={() => updateDraft(key, { correct_option: option.label })}
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${isCorrect ? 'bg-correct-green text-white' : 'bg-navy-light text-muted-foreground'}`}
                              title="Mark correct"
                            >
                              {isCorrect ? <CheckCircle size={15} /> : optionIndex + 1}
                            </button>
                            <input
                              value={option.text}
                              onChange={e => updateOption(key, optionIndex, e.target.value)}
                              className="flex-1 bg-transparent text-white text-sm outline-none"
                              placeholder={`Answer ${optionIndex + 1}`}
                            />
                            {question.options.length > 3 && (
                              <button onClick={() => removeOption(key, optionIndex)} className="w-8 h-8 rounded-full bg-wrong-red/15 text-wrong-red flex items-center justify-center">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      {question.options.length < 4 && (
                        <button onClick={() => addOption(key)} className="text-xs font-black text-gold px-2 py-1">
                          Add fourth answer
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-muted-foreground mb-1">EXPLANATION</label>
                        <textarea value={question.explanation} onChange={e => updateDraft(key, { explanation: e.target.value })} rows={3}
                          className={`${inputClass} resize-none`} placeholder="Shown only after admin reveals answer" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-muted-foreground mb-1">TIME SEC</label>
                        <input type="number" min={5} max={60} value={question.time_limit} onChange={e => updateDraft(key, { time_limit: Number(e.target.value) })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-muted-foreground mb-1">ORDER</label>
                        <input type="number" value={question.order_index} onChange={e => updateDraft(key, { order_index: Number(e.target.value) })} className={inputClass} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
