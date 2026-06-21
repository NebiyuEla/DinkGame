import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, ShieldCheck, Users } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import { CorrectBurst } from '@/components/VictoryEffect';

const ETHIOPIC_RE = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;
const amharicClass = (text) => (ETHIOPIC_RE.test(text || '') ? 'font-amharic' : '');

const canPlay = (player) => (
  player &&
  !player.is_disqualified &&
  !player.is_eliminated &&
  !player.game_banned &&
  ['lobby', 'playing', 'winner'].includes(player.status || 'playing')
);

export default function LiveGame() {
  const navigate = useNavigate();
  const {
    currentGame,
    currentUser,
    myAnswer,
    setMyAnswer,
    myScore,
    setMyScore,
    timeLeft,
    setTimeLeft,
    isAnswerLocked,
    setIsAnswerLocked,
    questionStartTimeRef,
    isSuspicious,
    submitAnswer,
    loadActiveGame,
    setCurrentQuestion,
    setQuestionIndex,
    setTotalQuestions,
    setAnswerResult,
  } = useGame();

  const [game, setGame] = useState(currentGame);
  const [question, setQuestion] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [player, setPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [revealedCorrect, setRevealedCorrect] = useState(null);
  const [showCorrectBurst, setShowCorrectBurst] = useState(false);
  const [burstPoints, setBurstPoints] = useState(0);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const appliedRevealRef = useRef(null);

  const questionIndex = game?.current_question_index || 0;
  const activePlayers = players.filter(canPlay);
  const activeCount = activePlayers.length;
  const myCanPlay = canPlay(player);
  const correctOption = question?.options?.find(option => option.label === revealedCorrect);

  const optionStats = useMemo(() => {
    const stats = {};
    answers
      .filter(answer => answer.question_id === question?.id)
      .forEach(answer => {
        stats[answer.selected_option] = (stats[answer.selected_option] || 0) + 1;
      });
    return stats;
  }, [answers, question?.id]);

  const getOrCreatePlayer = useCallback(async (gameId) => {
    if (!currentUser?.id || !gameId) return null;
    const bans = await appClient.entities.GameBan.filter({ game_id: gameId, user_id: currentUser.id, is_active: true }, '-created_date', 1).catch(() => []);
    if (bans.length > 0) {
      const rows = await appClient.entities.GamePlayer.filter({ game_id: gameId, user_id: currentUser.id }, '-created_date', 1);
      if (rows[0]) return await appClient.entities.GamePlayer.update(rows[0].id, {
        is_disqualified: true,
        game_banned: true,
        disqualify_reason: bans[0].reason || 'Banned from this game',
        status: 'finished',
      });
      return null;
    }

    const existing = await appClient.entities.GamePlayer.filter({ game_id: gameId, user_id: currentUser.id }, '-created_date', 1);
    if (existing.length > 0) return existing[0];
    return await appClient.entities.GamePlayer.create({
      game_id: gameId,
      user_id: currentUser.id,
      username: currentUser.full_name || currentUser.username || 'Player',
      joined_at: new Date().toISOString(),
      status: 'playing',
    });
  }, [currentUser]);

  const startTimer = useCallback((seconds) => {
    clearInterval(timerRef.current);
    let next = Number(seconds || 10);
    setTimeLeft(next);
    timerRef.current = setInterval(() => {
      next -= 1;
      setTimeLeft(Math.max(0, next));
      if (next <= 0) {
        clearInterval(timerRef.current);
        setIsAnswerLocked(true);
      }
    }, 1000);
  }, [setIsAnswerLocked, setTimeLeft]);

  const scoreReveal = useCallback(async (latestGame, q, latestPlayer) => {
    if (!latestGame || !q || !latestPlayer || !currentUser?.id) return;
    const revealKey = `${latestGame.id}:${q.id}:${latestGame.explanation_revealed_at || latestGame.updated_date}`;
    if (appliedRevealRef.current === revealKey) return;
    appliedRevealRef.current = revealKey;

    clearInterval(timerRef.current);
    setShowExplanation(true);
    setRevealedCorrect(q.correct_option);
    setIsAnswerLocked(true);

    if (!canPlay(latestPlayer)) return;

    const mine = await appClient.entities.Answer.filter({
      game_id: latestGame.id,
      question_id: q.id,
      user_id: currentUser.id,
    }, '-created_date', 1);
    const answer = mine[0];

    if (!answer) {
      const out = await appClient.entities.GamePlayer.update(latestPlayer.id, {
        is_eliminated: true,
        elimination_question_id: q.id,
        status: 'finished',
      });
      setPlayer(out);
      return;
    }

    const isCorrect = answer.selected_option === q.correct_option;
    if (answer.is_scored) {
      setAnswerResult(isCorrect ? 'correct' : 'wrong');
      if (isCorrect) {
        setBurstPoints(answer.points_earned || 0);
        setShowCorrectBurst(true);
      }
      return;
    }

    if (isCorrect) {
      const timeLimitMs = Number(q.time_limit || latestGame.question_timer || 10) * 1000;
      const speedBonus = Math.round(Number(latestGame.speed_bonus_max || 50) * Math.max(0, 1 - (answer.response_time_ms || timeLimitMs) / timeLimitMs));
      const points = Number(latestGame.base_points || 100) + speedBonus;
      await appClient.entities.Answer.update(answer.id, {
        is_correct: true,
        points_earned: points,
        speed_bonus: speedBonus,
        is_scored: true,
      });
      const updatedPlayer = await appClient.entities.GamePlayer.update(latestPlayer.id, {
        total_score: Number(latestPlayer.total_score || 0) + points,
        total_response_time_ms: Number(latestPlayer.total_response_time_ms || 0) + Number(answer.response_time_ms || 0),
        questions_answered: Number(latestPlayer.questions_answered || 0) + 1,
        correct_answers: Number(latestPlayer.correct_answers || 0) + 1,
        status: 'playing',
      });
      setPlayer(updatedPlayer);
      setMyScore(updatedPlayer.total_score || 0);
      setBurstPoints(points);
      setAnswerResult('correct');
      setShowCorrectBurst(true);
    } else {
      await appClient.entities.Answer.update(answer.id, {
        is_correct: false,
        points_earned: 0,
        speed_bonus: 0,
        is_scored: true,
      });
      const out = await appClient.entities.GamePlayer.update(latestPlayer.id, {
        is_eliminated: true,
        elimination_question_id: q.id,
        status: 'finished',
      });
      setPlayer(out);
      setAnswerResult('wrong');
    }
  }, [currentUser?.id, setAnswerResult, setIsAnswerLocked, setMyScore]);

  const loadGameState = useCallback(async () => {
    const baseGame = game || currentGame;
    if (!baseGame?.id) {
      await loadActiveGame();
      return;
    }

    const [gameRows, qs, ps, ans] = await Promise.all([
      appClient.entities.Game.filter({ id: baseGame.id }, '-created_date', 1),
      appClient.entities.Question.filter({ game_id: baseGame.id, is_active: true }, 'order_index', 100),
      appClient.entities.GamePlayer.filter({ game_id: baseGame.id }, '-total_score', 500),
      appClient.entities.Answer.filter({ game_id: baseGame.id }, '-created_date', 1000),
    ]);

    const latestGame = gameRows[0] || baseGame;
    if (latestGame.status === 'lobby') { navigate('/lobby'); return; }
    if (latestGame.status === 'ended') { navigate(`/winners?game=${latestGame.id}`); return; }

    const q = qs[latestGame.current_question_index || 0];
    const latestPlayer = await getOrCreatePlayer(latestGame.id);
    const mine = ans.find(answer => answer.question_id === q?.id && answer.user_id === currentUser?.id);

    setGame(latestGame);
    setQuestions(qs);
    setQuestion(q || null);
    setCurrentQuestion(q || null);
    setQuestionIndex(latestGame.current_question_index || 0);
    setTotalQuestions(qs.length);
    setPlayers(ps);
    setAnswers(ans);
    setPlayer(latestPlayer);
    setMyScore(latestPlayer?.total_score || 0);
    setMyAnswer(mine?.selected_option || null);
    setIsAnswerLocked(Boolean(mine || !canPlay(latestPlayer)));

    if (!q) return;

    const revealed = latestGame.explanation_question_index === (latestGame.current_question_index || 0);
    if (revealed) {
      await scoreReveal(latestGame, q, latestPlayer);
    } else if (appliedRevealRef.current?.startsWith(`${latestGame.id}:${q.id}`)) {
      appliedRevealRef.current = null;
    } else if (!mine && canPlay(latestPlayer)) {
      setShowExplanation(false);
      setRevealedCorrect(null);
      questionStartTimeRef.current = Date.now();
      startTimer(q.time_limit || latestGame.question_timer || 10);
    }
  }, [currentGame, currentUser?.id, game, getOrCreatePlayer, loadActiveGame, navigate, questionStartTimeRef, scoreReveal, setCurrentQuestion, setIsAnswerLocked, setMyAnswer, setMyScore, setQuestionIndex, setTotalQuestions, startTimer]);

  useEffect(() => {
    loadGameState();
    pollRef.current = setInterval(loadGameState, 1400);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [loadGameState]);

  const handleAnswer = async (option) => {
    if (!question || isAnswerLocked || myAnswer || !myCanPlay) return;
    if (navigator.vibrate) navigator.vibrate(25);
    const saved = await submitAnswer(option.label);
    if (!saved) return;
    setMyAnswer(option.label);
    setIsAnswerLocked(true);
    setAnswers(prev => [...prev.filter(a => !(a.question_id === question.id && a.user_id === currentUser.id)), saved]);
  };

  const answerClass = (option) => {
    if (showExplanation) {
      if (option.label === revealedCorrect) return 'bg-correct-green text-white border-correct-green';
      if (myAnswer === option.label && option.label !== revealedCorrect) return 'bg-white/75 text-foreground border-wrong-red/45';
      return 'bg-white/70 text-foreground border-white/60';
    }
    if (myAnswer === option.label) return 'bg-primary text-white border-primary';
    return 'bg-white/88 text-foreground border-white/80 active:scale-[0.99]';
  };

  if (!question) {
    return (
      <div className="min-h-screen dink-orange-field flex items-center justify-center px-6 text-white text-center">
        <div>
          <img src="/brand/dink-mascot.png" alt="" className="w-44 h-44 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-black">Waiting for game</h1>
          <p className="text-white/75 text-sm mt-2">The host is preparing the first question.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dink-orange-field flex flex-col overflow-hidden text-primary">
      {showCorrectBurst && <CorrectBurst points={burstPoints} onDone={() => setShowCorrectBurst(false)} />}

      <header className="px-4 pt-3 pb-2 flex items-center justify-between text-white">
        <div className="flex items-center gap-2 font-black">
          <Users size={17} />
          <span>{activeCount.toLocaleString()}</span>
        </div>
        <div className="relative w-16 h-16 rounded-full bg-white/92 border-4 border-white flex items-center justify-center shadow-lg">
          <div className="absolute inset-1 rounded-full border-2 border-gold/50" />
          <span className={`text-3xl font-black ${timeLeft <= 3 ? 'text-wrong-red animate-shake' : 'text-primary'}`}>{timeLeft}</span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-white/70">SCORE</p>
          <p className="text-lg font-black">{myScore}</p>
        </div>
      </header>

      {isSuspicious && (
        <div className="mx-4 mb-2 rounded-full bg-white/18 text-white px-4 py-2 flex items-center justify-center gap-2">
          <ShieldCheck size={14} />
          <span className="text-xs font-black">Fair-play warning recorded</span>
        </div>
      )}

      <main className="px-4 pt-2 flex-1 flex flex-col">
        <section className="dink-answer-card rounded-[1.6rem] p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-muted-foreground">{game?.title}</p>
            <p className="text-xs font-black text-primary">{questionIndex + 1}/{questions.length}</p>
          </div>
          <h1 className={`text-center text-xl leading-relaxed font-black text-foreground mb-4 ${amharicClass(question.text)}`}>
            {question.text}
          </h1>

          <div className="space-y-2">
            {(question.options || []).slice(0, 4).map(option => {
              const count = optionStats[option.label] || 0;
              return (
                <button
                  key={option.label}
                  onClick={() => handleAnswer(option)}
                  disabled={isAnswerLocked || !!myAnswer || !myCanPlay}
                  className={`w-full min-h-12 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-300 ${answerClass(option)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`flex-1 font-black text-base leading-snug ${amharicClass(option.text)}`}>{option.text}</span>
                    {showExplanation && (
                      <span className="text-sm font-black opacity-70">{count.toLocaleString()}</span>
                    )}
                  </div>
                  {showExplanation && count > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                      <div className="h-full rounded-full bg-current opacity-30" style={{ width: `${Math.min(100, Math.round((count / Math.max(1, answers.filter(a => a.question_id === question.id).length)) * 100))}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="mt-4 rounded-2xl bg-white/70 border border-border p-3 animate-slide-up">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={15} className="text-primary" />
                <p className="text-xs font-black text-primary">Explanation</p>
              </div>
              {myAnswer === revealedCorrect && (
                <p className="font-amharic text-correct-green font-black text-lg mb-2">ተመልሷል</p>
              )}
              {correctOption && (
                <p className={`font-black text-foreground mb-2 ${amharicClass(correctOption.text)}`}>{correctOption.text}</p>
              )}
              {question.explanation && (
                <p className={`text-sm text-muted-foreground leading-relaxed ${amharicClass(question.explanation)}`}>
                  {question.explanation}
                </p>
              )}
            </div>
          )}
        </section>

        {!myCanPlay && (
          <div className="rounded-full bg-white/18 px-4 py-3 text-white text-center font-black mb-3">
            Watching only
          </div>
        )}

        {isAnswerLocked && !showExplanation && myCanPlay && (
          <div className="rounded-full bg-white/18 px-4 py-3 text-white text-center font-black mb-3">
            Waiting for reveal
          </div>
        )}

        <div className="mt-auto pb-5 text-center text-white/70">
          <CheckCircle size={14} className="mx-auto mb-1" />
          <p className="text-[10px] font-black tracking-widest">FAIR PLAY PROTECTED</p>
        </div>
      </main>
    </div>
  );
}
