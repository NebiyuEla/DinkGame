import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, BarChart2, CheckCircle, Eye, Megaphone, Pause, Play, RefreshCw, SkipForward, Square, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const isConnectedPlayer = (player) => !player.is_disqualified && (player.status || 'playing') !== 'disconnected';
const isContestant = (player) => isConnectedPlayer(player) && !player.is_eliminated && ['lobby', 'playing'].includes(player.status || 'playing');
const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

export default function AdminLiveController() {
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [announcement, setAnnouncement] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const pollRef = useRef(null);

  const loadGames = async () => {
    const [live, lobby, scheduled, paused, draft] = await Promise.all([
      appClient.entities.Game.filter({ status: 'live' }, '-created_date', 20),
      appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 20),
      appClient.entities.Game.filter({ status: 'scheduled' }, '-created_date', 20),
      appClient.entities.Game.filter({ status: 'paused' }, '-created_date', 20),
      appClient.entities.Game.filter({ status: 'draft' }, '-created_date', 20),
    ]);
    const rows = [...live, ...lobby, ...paused, ...scheduled, ...draft];
    setGames(rows);
    if (!selectedGame && rows.length > 0) setSelectedGame(rows[0]);
  };

  useEffect(() => { loadGames(); }, []);

  useEffect(() => {
    if (!selectedGame?.id) return;
    loadGameData();
    pollRef.current = setInterval(loadGameData, 3000);
    return () => clearInterval(pollRef.current);
  }, [selectedGame?.id]);

  const loadGameData = async () => {
    if (!selectedGame?.id) return;
    try {
      const [questionRows, playerRows, answerRows, gameRows, depositRows] = await Promise.all([
        appClient.entities.Question.filter({ game_id: selectedGame.id, is_active: true }, 'order_index', 100),
        appClient.entities.GamePlayer.filter({ game_id: selectedGame.id }, '-total_score', 500),
        appClient.entities.Answer.filter({ game_id: selectedGame.id }, '-created_date', 2000),
        appClient.entities.Game.filter({ id: selectedGame.id }, '-created_date', 1),
        appClient.entities.Deposit.filter({ game_id: selectedGame.id, status: 'paid' }, '-created_date', 10000),
      ]);
      setQuestions(questionRows);
      setPlayers(playerRows);
      setAnswers(answerRows);
      setDeposits(depositRows);
      if (gameRows[0]) setSelectedGame(gameRows[0]);
    } catch {}
  };

  const calculateMoney = (game = selectedGame) => {
    const gross = deposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
    const profit = Math.round(gross * Number(game?.platform_fee_percent ?? 25) / 100);
    const autoPrize = Math.max(0, gross - profit);
    const prize = Number(game?.prize_amount || 0) || autoPrize;
    return { gross, profit, autoPrize, prize };
  };

  const endGame = async (game) => {
    const sorted = [...players]
      .filter(player => !player.is_disqualified && !player.is_eliminated)
      .sort((a, b) => Number(b.total_score || 0) - Number(a.total_score || 0) || Number(a.total_response_time_ms || 0) - Number(b.total_response_time_ms || 0));

    for (let index = 0; index < sorted.length; index += 1) {
      await appClient.entities.GamePlayer.update(sorted[index].id, { rank: index + 1, status: 'finished' });
    }

    const money = calculateMoney(game);
    await appClient.entities.Game.update(game.id, {
      status: 'ended',
      ended_at: new Date().toISOString(),
      winner_user_id: sorted[0]?.user_id || null,
      prize_amount: Number(game.prize_amount || 0) || money.autoPrize,
    });
  };

  const doAction = async (action) => {
    if (!selectedGame) return;
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
      }

      if (action === 'start_game') {
        const money = calculateMoney(game);
        const lobbyPlayers = players.filter(player => ['lobby', 'playing'].includes(player.status || 'lobby'));
        for (const player of lobbyPlayers) {
          await appClient.entities.GamePlayer.update(player.id, { status: 'playing' });
        }
        await appClient.entities.Game.update(game.id, {
          status: 'live',
          current_question_index: 0,
          explanation_question_index: null,
          explanation_revealed_at: null,
          total_players: lobbyPlayers.filter(isContestant).length,
          prize_amount: Number(game.prize_amount || 0) || money.autoPrize,
        });
      }

      if (action === 'show_explanation') {
        const currentIndex = game.current_question_index || 0;
        await appClient.entities.Game.update(game.id, {
          explanation_question_index: currentIndex,
          explanation_revealed_at: new Date().toISOString(),
        });
        await appClient.entities.Broadcast.create({
          game_id: game.id,
          message: `EXPLANATION:${currentIndex}`,
          target: 'live',
          sent_by: 'system',
          sent_at: new Date().toISOString(),
          status: 'sent',
        });
      }

      if (action === 'next_question') {
        const currentIndex = game.current_question_index || 0;
        const currentQuestion = questions[currentIndex];
        if (currentQuestion && game.explanation_question_index !== currentIndex) {
          alert('Reveal the answer before moving to the next question.');
          setActionLoading('');
          return;
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex >= questions.length) {
          await endGame(game);
        } else {
          await appClient.entities.Game.update(game.id, {
            current_question_index: nextIndex,
            explanation_question_index: null,
            explanation_revealed_at: null,
          });
        }
      }

      if (action === 'pause') await appClient.entities.Game.update(game.id, { status: 'paused' });
      if (action === 'resume') await appClient.entities.Game.update(game.id, { status: 'live' });
      if (action === 'end_game') {
        if (!confirm('End this game now?')) {
          setActionLoading('');
          return;
        }
        await endGame(game);
      }

      await loadGames();
      await loadGameData();
    } catch (error) {
      alert(`Action failed: ${error.message}`);
    }
    setActionLoading('');
  };

  const sendAnnouncement = async () => {
    if (!announcement.trim() || !selectedGame) return;
    await appClient.entities.Broadcast.create({
      game_id: selectedGame.id,
      message: announcement,
      target: 'live',
      sent_by: 'admin',
      sent_at: new Date().toISOString(),
      status: 'sent',
    });
    setAnnouncement('');
  };

  const banPlayer = async (player) => {
    const reason = prompt('Reason for this game ban:', 'Admin fair-play decision');
    if (!reason) return;
    await appClient.entities.GamePlayer.update(player.id, {
      is_disqualified: true,
      game_banned: true,
      disqualify_reason: reason,
      status: 'finished',
    });
    await appClient.entities.GameBan.create({
      game_id: player.game_id,
      user_id: player.user_id,
      username: player.username || 'Player',
      reason,
      is_active: true,
    });
    await appClient.entities.Broadcast.create({
      game_id: player.game_id,
      target: 'user',
      target_user_id: player.user_id,
      message: `Game ban: ${reason}`,
      sent_by: 'admin',
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    await loadGameData();
  };

  const currentIndex = selectedGame?.current_question_index || 0;
  const currentQuestion = questions[currentIndex];
  const currentAnswers = currentQuestion ? answers.filter(answer => answer.question_id === currentQuestion.id) : [];
  const answeredCount = currentAnswers.length;
  const liveUserCount = players.filter(isConnectedPlayer).length;
  const activePlayerCount = players.filter(isContestant).length;
  const eliminatedCount = players.filter(player => player.is_eliminated).length;
  const explanationRevealed = selectedGame?.explanation_question_index === currentIndex;
  const isLastQuestion = questions.length > 0 && currentIndex >= questions.length - 1;
  const money = calculateMoney();

  const controls = [
    { action: 'start_lobby', label: 'Open Lobby', icon: Users, color: 'bg-blue-50 border-blue-200 text-blue-700', show: ['draft', 'scheduled'] },
    { action: 'start_game', label: 'Start Game', icon: Play, color: 'bg-green-50 border-green-200 text-correct-green', show: ['lobby'] },
    { action: 'show_explanation', label: explanationRevealed ? 'Answer Revealed' : 'Reveal Answer', icon: Eye, color: 'bg-amber-50 border-amber-200 text-amber-700', show: ['live'], disabled: explanationRevealed },
    { action: 'next_question', label: isLastQuestion ? 'End Game' : 'Next Question', icon: isLastQuestion ? Square : SkipForward, color: isLastQuestion ? 'bg-red-50 border-red-200 text-wrong-red' : 'bg-primary/5 border-primary/20 text-primary', show: ['live'], disabled: currentQuestion && !explanationRevealed },
    { action: 'pause', label: 'Pause', icon: Pause, color: 'bg-amber-50 border-amber-200 text-amber-700', show: ['live'] },
    { action: 'resume', label: 'Resume', icon: Play, color: 'bg-green-50 border-green-200 text-correct-green', show: ['paused'] },
    { action: 'end_game', label: 'Force End', icon: Square, color: 'bg-red-50 border-red-200 text-wrong-red', show: ['live', 'paused'] },
  ];

  const distribution = currentQuestion
    ? (currentQuestion.options || []).map((option, index) => {
      const count = currentAnswers.filter(answer => answer.selected_option === option.label).length;
      const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0;
      return { ...option, displayLabel: `Answer ${index + 1}`, count, pct, isCorrect: option.label === currentQuestion.correct_option };
    })
    : [];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <p className="text-xs text-gold font-black tracking-widest">LIVE GAME CONTROL</p>
          <h1 className="font-game text-xl font-black text-white">Live Controller</h1>
          <p className="text-muted-foreground text-sm">Start, reveal, move questions, end games, and enforce fair play.</p>
        </div>

        <section className="glass-card rounded-2xl p-4 border border-border/50">
          <label className="block text-xs font-black text-muted-foreground mb-2">SELECT GAME</label>
          <select value={selectedGame?.id || ''}
            onChange={event => setSelectedGame(games.find(game => game.id === event.target.value) || null)}
            className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold">
            <option value="">Select a game</option>
            {games.map(game => <option key={game.id} value={game.id}>{game.title} ({game.status})</option>)}
          </select>
        </section>

        {selectedGame && (
          <>
            <section className="glass-card rounded-2xl p-4 border border-gold/25">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-black text-white truncate">{selectedGame.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedGame.is_paid ? `${fmt(selectedGame.entry_fee)} entry` : 'No entry fee'} · Prize {fmt(Number(selectedGame.prize_amount || 0) || money.autoPrize)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${
                    selectedGame.status === 'live' ? 'bg-correct-green/20 text-correct-green' :
                    selectedGame.status === 'lobby' ? 'bg-gold/20 text-gold' :
                    selectedGame.status === 'paused' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-muted text-muted-foreground'
                  }`}>{selectedGame.status?.toUpperCase()}</span>
                  <button onClick={loadGameData} className="w-8 h-8 bg-navy-light rounded-full flex items-center justify-center">
                    <RefreshCw size={13} className="text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 text-center">
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-white">{liveUserCount}</p>
                  <p className="text-xs text-muted-foreground">Live Users</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-correct-green">{activePlayerCount}</p>
                  <p className="text-xs text-muted-foreground">Can Answer</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-gold">{currentIndex + 1}/{questions.length || '?'}</p>
                  <p className="text-xs text-muted-foreground">Question</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-white">{answeredCount}</p>
                  <p className="text-xs text-muted-foreground">Answered</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-correct-green">{fmt(money.profit)}</p>
                  <p className="text-xs text-muted-foreground">Profit</p>
                </div>
                <div className="bg-navy-dark rounded-xl p-3">
                  <p className="font-game text-xl font-bold text-gold">{fmt(money.prize)}</p>
                  <p className="text-xs text-muted-foreground">Prize</p>
                </div>
              </div>
              {eliminatedCount > 0 && <p className="text-xs text-muted-foreground mt-3">{eliminatedCount} users are watching after elimination.</p>}
            </section>

            <section className="glass-card rounded-2xl p-4 border border-border/50">
              <p className="text-xs font-black text-muted-foreground mb-3 tracking-widest">CONTROLS</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {controls.filter(button => button.show.includes(selectedGame.status)).map(({ action, label, icon: Icon, color, disabled }) => (
                  <button key={action} onClick={() => doAction(action)}
                    disabled={Boolean(actionLoading) || disabled}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-black text-sm transition-all active:scale-95 disabled:opacity-50 ${color}`}>
                    <Icon size={15} />
                    {actionLoading === action ? 'Working...' : label}
                  </button>
                ))}
              </div>
            </section>

            {currentQuestion && (
              <section className="glass-card rounded-2xl p-4 border border-gold/25">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-black text-muted-foreground tracking-widest">CURRENT QUESTION</p>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${explanationRevealed ? 'bg-correct-green/15 text-correct-green' : 'bg-amber-500/15 text-amber-400'}`}>
                    {explanationRevealed ? 'REVEALED' : 'HIDDEN'}
                  </span>
                </div>
                <p className="text-white font-black text-base mb-3 leading-relaxed">{currentQuestion.text}</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
                  {(currentQuestion.options || []).map((option, index) => (
                    <div key={option.label} className={`p-3 rounded-xl border text-sm ${
                      option.label === currentQuestion.correct_option
                        ? 'border-correct-green bg-correct-green/10 text-correct-green font-black'
                        : 'border-border/30 text-muted-foreground'
                    }`}>
                      <span className="font-black">Answer {index + 1}.</span> {option.text}
                      {option.label === currentQuestion.correct_option && <CheckCircle size={12} className="inline ml-1" />}
                    </div>
                  ))}
                </div>

                {currentQuestion.explanation && (
                  <div className="bg-navy-dark rounded-xl p-3 mb-3">
                    <p className="text-xs text-muted-foreground font-bold mb-1">Explanation</p>
                    <p className="text-xs text-white/80">{currentQuestion.explanation}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Answer distribution</span>
                    <span>{answeredCount}/{activePlayerCount} answered</span>
                  </div>
                  {distribution.map(option => (
                    <div key={option.label} className="flex items-center gap-2">
                      <span className="text-xs text-white font-black w-16">{option.displayLabel}</span>
                      <div className="flex-1 bg-navy-light rounded-full h-2.5">
                        <div className={`h-full rounded-full transition-all duration-500 ${option.isCorrect ? 'bg-correct-green' : 'bg-gold/70'}`} style={{ width: `${option.pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{option.pct}%</span>
                      <span className="text-xs text-white/50 w-6 text-right">{option.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="glass-card rounded-2xl p-4 border border-border/50">
              <p className="text-xs font-black text-muted-foreground mb-2 tracking-widest">BROADCAST</p>
              <div className="flex gap-2">
                <input value={announcement} onChange={event => setAnnouncement(event.target.value)}
                  placeholder="Message to live players"
                  className="flex-1 bg-navy-dark border border-border rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-gold"
                  onKeyDown={event => event.key === 'Enter' && sendAnnouncement()} />
                <button onClick={sendAnnouncement} className="bg-primary text-white font-black px-4 py-2 rounded-full text-sm">
                  <Megaphone size={14} />
                </button>
              </div>
            </section>

            <section className="glass-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <p className="font-black text-white text-sm">Players ({players.length})</p>
                <BarChart2 size={14} className="text-gold" />
              </div>
              <div className="max-h-72 overflow-y-auto">
                {players.slice(0, 60).map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/20 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground w-5">{index + 1}</span>
                      <span className="text-sm font-black text-white truncate">{player.username || `Player ${index + 1}`}</span>
                      {player.is_disqualified && <span className="text-[10px] text-wrong-red font-black">BANNED</span>}
                      {player.is_eliminated && <span className="text-[10px] text-amber-400 font-black">OUT</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-game text-sm text-gold">{player.total_score || 0}</span>
                      {!player.is_disqualified && (
                        <button onClick={() => banPlayer(player)} className="w-7 h-7 rounded-full bg-wrong-red/20 flex items-center justify-center" title="Ban from game">
                          <AlertTriangle size={11} className="text-wrong-red" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
