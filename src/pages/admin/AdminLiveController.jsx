import React, { useState, useEffect, useRef } from 'react';
import { Play, SkipForward, Pause, Square, Megaphone, Users, BarChart2, AlertTriangle, Eye, RefreshCw, CheckCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const AMHARIC_LABELS = ['ሀ', 'ለ', 'ሐ', 'መ'];

const isConnectedPlayer = (player) => (
  !player.is_disqualified &&
  (player.status || 'playing') !== 'disconnected'
);

const isContestant = (player) => (
  isConnectedPlayer(player) &&
  !player.is_eliminated &&
  ['lobby', 'playing'].includes(player.status || 'playing')
);

export default function AdminLiveController() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const pollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const [live, lobby, scheduled, paused] = await Promise.all([
        appClient.entities.Game.filter({ status: 'live' }, '-created_date', 20),
        appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 20),
        appClient.entities.Game.filter({ status: 'scheduled' }, '-created_date', 20),
        appClient.entities.Game.filter({ status: 'paused' }, '-created_date', 20),
      ]);
      setGames([...live, ...lobby, ...paused, ...scheduled]);
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedGame) return;
    loadGameData();
    pollRef.current = setInterval(loadGameData, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedGame?.id]);

  const loadGameData = async () => {
    if (!selectedGame) return;
    try {
      const [q, p, a, updated] = await Promise.all([
        appClient.entities.Question.filter({ game_id: selectedGame.id, is_active: true }, 'order_index', 100),
        appClient.entities.GamePlayer.filter({ game_id: selectedGame.id }, '-total_score', 100),
        appClient.entities.Answer.filter({ game_id: selectedGame.id }),
        appClient.entities.Game.filter({ id: selectedGame.id }, '-created_date', 1),
      ]);
      setQuestions(q);
      setPlayers(p);
      setAnswers(a);
      if (updated.length > 0) setSelectedGame(updated[0]);
    } catch (e) {}
  };

  const doAction = async (action) => {
    setActionLoading(action);
    try {
      const game = selectedGame;
      if (action === 'start_lobby') {
        await appClient.entities.Game.update(game.id, {
          status: 'lobby',
          total_players: 0,
          current_question_index: 0,
          explanation_question_index: null,
          explanation_revealed_at: null,
        });
      } else if (action === 'start_game') {
        const lobbyPlayers = players.filter(p => ['lobby', 'playing'].includes(p.status || 'lobby'));
        for (const player of lobbyPlayers) {
          await appClient.entities.GamePlayer.update(player.id, { status: 'playing' });
        }
        await appClient.entities.Game.update(game.id, {
          status: 'live',
          current_question_index: 0,
          explanation_question_index: null,
          explanation_revealed_at: null,
          total_players: lobbyPlayers.filter(isContestant).length,
        });
      } else if (action === 'show_explanation') {
        const currentIdx = game.current_question_index || 0;
        await appClient.entities.Game.update(game.id, {
          explanation_question_index: currentIdx,
          explanation_revealed_at: new Date().toISOString(),
        });
        await appClient.entities.Broadcast.create({
          message: `EXPLANATION:${currentIdx}`,
          target: 'live', sent_by: 'system', sent_at: new Date().toISOString(), status: 'sent'
        });
      } else if (action === 'next_question') {
        const currentIdx = game.current_question_index || 0;
        if (currentQ && game.explanation_question_index !== currentIdx) {
          alert('Reveal the answer before moving to the next question.');
          setActionLoading('');
          return;
        }
        const nextIdx = currentIdx + 1;
        if (nextIdx >= questions.length) {
          await endGame(game);
        } else {
          await appClient.entities.Game.update(game.id, {
            current_question_index: nextIdx,
            explanation_question_index: null,
            explanation_revealed_at: null,
          });
        }
      } else if (action === 'pause') {
        await appClient.entities.Game.update(game.id, { status: 'paused' });
      } else if (action === 'resume') {
        await appClient.entities.Game.update(game.id, { status: 'live' });
      } else if (action === 'end_game') {
        if (!confirm('End this game now?')) { setActionLoading(''); return; }
        await endGame(game);
      }
      await loadGameData();
    } catch (e) { alert(`Action failed: ${e.message}`); }
    setActionLoading('');
  };

  const endGame = async (game) => {
    await appClient.entities.Game.update(game.id, { status: 'ended', ended_at: new Date().toISOString() });
    const sorted = [...players]
      .filter(p => !p.is_disqualified && !p.is_eliminated)
      .sort((a, b) => b.total_score - a.total_score || a.total_response_time_ms - b.total_response_time_ms);
    for (let i = 0; i < sorted.length; i++) {
      await appClient.entities.GamePlayer.update(sorted[i].id, { rank: i + 1, status: 'finished' });
    }
    if (sorted.length > 0) {
      await appClient.entities.Game.update(game.id, { winner_user_id: sorted[0].user_id });
    }
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !selectedGame) return;
    await appClient.entities.Broadcast.create({
      message: announcement, target: 'live', sent_by: 'admin',
      sent_at: new Date().toISOString(), status: 'sent'
    });
    setAnnouncement('');
  };

  const disqualifyPlayer = async (player) => {
    if (!confirm('Disqualify this player?')) return;
    await appClient.entities.GamePlayer.update(player.id, { is_disqualified: true, disqualify_reason: 'Admin disqualification' });
    loadGameData();
  };

  const currentQ = selectedGame && questions[selectedGame.current_question_index || 0];
  const currentQAnswers = currentQ ? answers.filter(a => a.question_id === currentQ.id) : [];
  const answeredCount = currentQAnswers.length;
  const liveUserCount = players.filter(isConnectedPlayer).length;
  const activePlayerCount = players.filter(isContestant).length;
  const eliminatedCount = players.filter(p => p.is_eliminated).length;

  // Build answer distribution by original label, then map to display
  const getDistribution = () => {
    if (!currentQ) return [];
    return (currentQ.options || []).map((opt, i) => {
      const count = currentQAnswers.filter(a => a.selected_option === opt.label).length;
      const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
      return { label: opt.label, displayLabel: AMHARIC_LABELS[i] || opt.label, text: opt.text, count, pct, isCorrect: opt.label === currentQ.correct_option };
    });
  };

  const currentIdx = selectedGame?.current_question_index || 0;
  const isLastQuestion = questions.length > 0 && currentIdx >= questions.length - 1;
  const explanationRevealed = selectedGame?.explanation_question_index === currentIdx;

  const CONTROLS = [
    { action: 'start_lobby', label: 'Open Lobby', icon: Users, color: 'bg-blue-50 border-blue-200 text-blue-700', show: ['draft', 'scheduled'] },
    { action: 'start_game', label: 'Start Game', icon: Play, color: 'bg-green-50 border-green-200 text-correct-green', show: ['lobby'] },
    { action: 'show_explanation', label: explanationRevealed ? 'Answer Revealed' : 'Reveal Answer', icon: Eye, color: 'bg-amber-50 border-amber-200 text-amber-700', show: ['live'], disabled: explanationRevealed },
    { action: 'next_question', label: isLastQuestion ? 'End Game' : 'Next Question', icon: isLastQuestion ? Square : SkipForward, color: isLastQuestion ? 'bg-red-50 border-red-200 text-wrong-red' : 'bg-primary/5 border-primary/20 text-primary', show: ['live'], disabled: currentQ && !explanationRevealed },
    { action: 'pause', label: 'Pause', icon: Pause, color: 'bg-amber-50 border-amber-200 text-amber-700', show: ['live'] },
    { action: 'resume', label: 'Resume', icon: Play, color: 'bg-green-50 border-green-200 text-correct-green', show: ['paused'] },
    { action: 'end_game', label: 'Force End', icon: Square, color: 'bg-red-50 border-red-200 text-wrong-red', show: ['live', 'paused'] },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-game text-xl font-black text-white">Live Controller</h1>
          <p className="text-muted-foreground text-sm">Real-time game management</p>
        </div>

        {/* Game selector */}
        <div className="glass-card rounded-2xl p-4 border border-border/50">
          <label className="block text-xs font-bold text-muted-foreground mb-2 tracking-widest">SELECT GAME</label>
          <select value={selectedGame?.id || ''}
            onChange={e => setSelectedGame(games.find(g => g.id === e.target.value) || null)}
            className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none">
            <option value="">-- Select a game --</option>
            {games.map(g => <option key={g.id} value={g.id}>{g.title} ({g.status})</option>)}
          </select>
        </div>

        {selectedGame && (
          <>
            {/* Stats */}
            <div className="glass-card rounded-2xl p-4 border border-neon-purple/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-white truncate">{selectedGame.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedGame.scheduled_at ? new Date(selectedGame.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    selectedGame.status === 'live' ? 'bg-correct-green/20 text-correct-green' :
                    selectedGame.status === 'lobby' ? 'bg-neon-purple/20 text-neon-purple' :
                    selectedGame.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-muted text-muted-foreground'
                  }`}>{selectedGame.status?.toUpperCase()}</span>
                  <button onClick={loadGameData} className="w-7 h-7 bg-navy-light rounded-lg flex items-center justify-center">
                    <RefreshCw size={12} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-white">{liveUserCount}</p>
                  <p className="text-xs text-muted-foreground">Live Users</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-correct-green">{activePlayerCount}</p>
                  <p className="text-xs text-muted-foreground">Can Answer</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-neon-purple">
                    {currentIdx + 1}/{questions.length || '?'}
                  </p>
                  <p className="text-xs text-muted-foreground">Question</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-gold">{answeredCount}</p>
                  <p className="text-xs text-muted-foreground">Answered</p>
                </div>
              </div>
              {eliminatedCount > 0 && (
                <p className="text-xs text-muted-foreground mt-3">{eliminatedCount} watching after elimination</p>
              )}
            </div>

            {/* Controls */}
            <div className="glass-card rounded-2xl p-4 border border-border/50">
              <p className="text-xs font-bold text-muted-foreground mb-3 tracking-widest">CONTROLS</p>
              <div className="grid grid-cols-2 gap-2.5">
                {CONTROLS.filter(btn => btn.show.includes(selectedGame.status)).map(({ action, label, icon: Icon, color, disabled }) => (
                  <button key={action} onClick={() => doAction(action)}
                    disabled={!!actionLoading || disabled}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${color}`}>
                    <Icon size={15} />
                    {actionLoading === action ? 'Working...' : label}
                  </button>
                ))}
              </div>
            </div>

            {/* Current question */}
            {currentQ && (
              <div className="glass-card rounded-2xl p-4 border border-neon-purple/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-muted-foreground tracking-widest">CURRENT QUESTION</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${explanationRevealed ? 'bg-correct-green/15 text-correct-green' : 'bg-amber-500/15 text-amber-400'}`}>
                      {explanationRevealed ? 'REVEALED' : 'HIDDEN'}
                    </span>
                    <span className="text-xs text-muted-foreground">Q{currentIdx + 1}/{questions.length}</span>
                  </div>
                </div>
                <p className="text-white font-bold text-sm mb-3 leading-relaxed">{currentQ.text}</p>

                {/* Options with correct answer shown to admin */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(currentQ.options || []).map((opt, i) => (
                    <div key={opt.label} className={`p-2.5 rounded-xl border text-xs ${
                      opt.label === currentQ.correct_option
                        ? 'border-correct-green bg-correct-green/10 text-correct-green font-bold'
                        : 'border-border/30 text-muted-foreground'
                    }`}>
                      <span className="font-bold">{AMHARIC_LABELS[i] || opt.label}.</span> {opt.text}
                      {opt.label === currentQ.correct_option && <CheckCircle size={10} className="inline ml-1" />}
                    </div>
                  ))}
                </div>

                {currentQ.explanation && (
                  <div className="bg-navy-dark rounded-xl p-3 mb-3">
                    <p className="text-xs text-muted-foreground font-semibold mb-1">Explanation:</p>
                    <p className="text-xs text-white/80">{currentQ.explanation}</p>
                  </div>
                )}

                {/* Answer distribution by original label */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Answer distribution</span>
                    <span>{answeredCount}/{activePlayerCount} answered</span>
                  </div>
                  {getDistribution().map(({ displayLabel, text, count, pct, isCorrect }) => (
                    <div key={displayLabel} className="flex items-center gap-2">
                      <span className="text-xs text-white font-bold w-5">{displayLabel}</span>
                      <div className="flex-1 bg-navy-light rounded-full h-2.5">
                        <div className={`h-full rounded-full transition-all duration-500 ${isCorrect ? 'bg-correct-green' : 'bg-neon-purple/60'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                      <span className="text-xs text-white/50 w-5 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Announcement */}
            <div className="glass-card rounded-2xl p-4 border border-border/50">
              <p className="text-xs font-bold text-muted-foreground mb-2 tracking-widest">BROADCAST</p>
              <div className="flex gap-2">
                <input value={announcement} onChange={e => setAnnouncement(e.target.value)}
                  placeholder="Message to all live players..."
                  className="flex-1 bg-navy-dark border border-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-neon-purple"
                  onKeyDown={e => e.key === 'Enter' && sendAnnouncement()} />
                <button onClick={sendAnnouncement}
                  className="gradient-purple-blue text-white font-bold px-4 py-2 rounded-xl text-sm">
                  <Megaphone size={14} />
                </button>
              </div>
            </div>

            {/* Players */}
            <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <p className="font-bold text-white text-sm">Players ({activePlayerCount})</p>
                <BarChart2 size={14} className="text-neon-purple" />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {players.slice(0, 20).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-5">{i + 1}</span>
                      <span className="text-sm font-bold text-white">Player {i + 1}</span>
                      {p.is_disqualified && <span className="text-[10px] text-wrong-red font-bold">DQ</span>}
                      {p.is_eliminated && <span className="text-[10px] text-amber-400 font-bold">OUT</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-game text-sm text-gold">{p.total_score}</span>
                      {!p.is_disqualified && (
                        <button onClick={() => disqualifyPlayer(p)}
                          className="w-6 h-6 rounded-lg bg-wrong-red/20 flex items-center justify-center">
                          <AlertTriangle size={10} className="text-wrong-red" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 winners preview (when ended) */}
            {selectedGame.status === 'ended' && players.length > 0 && (
              <div className="glass-card rounded-2xl p-4 border border-gold/30">
                <p className="text-xs font-bold text-gold mb-3 tracking-widest">FINAL RESULTS</p>
                {players.slice(0, 3).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-game font-black text-gold text-sm w-4">#{i + 1}</span>
                      <span className="text-white text-sm font-bold">Player {i + 1}</span>
                    </div>
                    <span className="font-game text-gold font-black">{p.total_score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
