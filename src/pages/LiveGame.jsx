import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, Lock, Shield, Trophy, XCircle } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import { CorrectBurst, playWrongSound } from '@/components/VictoryEffect';
import GameBackground from '@/components/GameBackground';

const DISPLAY_LABELS = ['ሀ', 'ለ', 'ሐ', 'መ'];
const ETHIOPIC_RE = /[\u1200-\u137F\u1380-\u139F\u2D80-\u2DDF\uAB00-\uAB2F]/;
const amharicClass = (text) => (ETHIOPIC_RE.test(text || '') ? 'font-amharic' : '');

const ACTIVE_PLAYER = (player) => (
  !player.is_disqualified &&
  !player.is_eliminated &&
  ['lobby', 'playing'].includes(player.status || 'playing')
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

  const [question, setQuestion] = useState(null);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [scrambledOptions, setScrambledOptions] = useState([]);
  const [showCorrectBurst, setShowCorrectBurst] = useState(false);
  const [burstPoints, setBurstPoints] = useState(0);
  const [revealedCorrect, setRevealedCorrect] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [miniboard, setMiniboard] = useState([]);
  const [answerFlash, setAnswerFlash] = useState(null);
  const [isEliminated, setIsEliminated] = useState(false);

  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const prevIdxRef = useRef(-1);
  const questionsRef = useRef([]);
  const appliedRevealRef = useRef(null);

  const shuffleOptions = useCallback((options, userId, questionId) => {
    const seedSource = `${userId || 'local'}:${questionId || 'question'}`;
    const seed = [...seedSource].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const arr = [...options];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed * (i + 5) + i * 13) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.map((opt, i) => ({ ...opt, displayLabel: DISPLAY_LABELS[i] || opt.label }));
  }, []);

  const getOrCreatePlayer = useCallback(async (gameId) => {
    if (!currentUser || !gameId) return null;
    const existing = await appClient.entities.GamePlayer.filter({ game_id: gameId, user_id: currentUser.id }, '-created_date', 1);
    if (existing.length > 0) return existing[0];

    return await appClient.entities.GamePlayer.create({
      game_id: gameId,
      user_id: currentUser.id,
      joined_at: new Date().toISOString(),
      status: 'playing',
    });
  }, [currentUser]);

  const refreshMiniBoard = useCallback(async (gameId) => {
    const players = await appClient.entities.GamePlayer.filter({ game_id: gameId }, '-total_score', 10);
    setMiniboard(players.filter(ACTIVE_PLAYER).slice(0, 5));
  }, []);

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

  const applyRevealOutcome = useCallback(async (game, q) => {
    if (!game || !q || !currentUser) return;

    const revealKey = `${game.id}:${q.id}:${game.explanation_revealed_at || game.updated_date || ''}`;
    if (appliedRevealRef.current === revealKey) return;
    appliedRevealRef.current = revealKey;

    clearInterval(timerRef.current);
    setShowExplanation(true);
    setRevealedCorrect(q.correct_option);
    setIsAnswerLocked(true);

    const player = await getOrCreatePlayer(game.id);
    if (!player || player.is_disqualified || player.is_eliminated) {
      setIsEliminated(Boolean(player?.is_eliminated || player?.is_disqualified));
      await refreshMiniBoard(game.id);
      return;
    }

    const answers = await appClient.entities.Answer.filter({
      game_id: game.id,
      question_id: q.id,
      user_id: currentUser.id,
    }, '-created_date', 1);
    const answer = answers[0];

    if (!answer) {
      await appClient.entities.GamePlayer.update(player.id, {
        is_eliminated: true,
        elimination_question_id: q.id,
        status: 'finished',
        questions_answered: (player.questions_answered || 0) + 1,
      });
      setIsEliminated(true);
      setAnswerResult('wrong');
      setAnswerFlash('wrong');
      playWrongSound();
      await refreshMiniBoard(game.id);
      return;
    }

    const isCorrect = answer.selected_option === q.correct_option;
    if (answer.is_scored) {
      setAnswerResult(isCorrect ? 'correct' : 'wrong');
      setAnswerFlash(isCorrect ? 'correct' : 'wrong');
      setBurstPoints(answer.points_earned || 0);
      if (!isCorrect) setIsEliminated(true);
      setMyScore(player.total_score || 0);
      await refreshMiniBoard(game.id);
      return;
    }

    if (isCorrect) {
      const timeLimitMs = Number(q.time_limit || game.question_timer || 10) * 1000;
      const speedBonus = Math.round(Number(game.speed_bonus_max || 50) * Math.max(0, 1 - (answer.response_time_ms || timeLimitMs) / timeLimitMs));
      const points = Number(game.base_points || 100) + speedBonus;

      await appClient.entities.Answer.update(answer.id, {
        is_correct: true,
        points_earned: points,
        speed_bonus: speedBonus,
        is_scored: true,
      });

      const updatedPlayer = await appClient.entities.GamePlayer.update(player.id, {
        total_score: (player.total_score || 0) + points,
        total_response_time_ms: (player.total_response_time_ms || 0) + (answer.response_time_ms || 0),
        questions_answered: (player.questions_answered || 0) + 1,
        correct_answers: (player.correct_answers || 0) + 1,
        status: 'playing',
      });

      setMyScore(updatedPlayer.total_score || 0);
      setBurstPoints(points);
      setAnswerResult('correct');
      setAnswerFlash('correct');
      setShowCorrectBurst(true);
    } else {
      await appClient.entities.Answer.update(answer.id, {
        is_correct: false,
        points_earned: 0,
        speed_bonus: 0,
        is_scored: true,
      });
      await appClient.entities.GamePlayer.update(player.id, {
        is_eliminated: true,
        elimination_question_id: q.id,
        status: 'finished',
        questions_answered: (player.questions_answered || 0) + 1,
      });
      setIsEliminated(true);
      setAnswerResult('wrong');
      setAnswerFlash('wrong');
      playWrongSound();
    }

    await refreshMiniBoard(game.id);
  }, [currentUser, getOrCreatePlayer, refreshMiniBoard, setAnswerResult, setIsAnswerLocked, setMyScore]);

  const loadQuestion = useCallback(async (game) => {
    if (!game) return;

    try {
      const questions = await appClient.entities.Question.filter(
        { game_id: game.id, is_active: true },
        'order_index',
        game.total_questions || 100
      );
      questionsRef.current = questions;

      const idx = game.current_question_index || 0;
      const q = questions[idx];

      setTotalQ(questions.length);
      setQuestionIdx(idx);
      setTotalQuestions(questions.length);
      setQuestionIndex(idx);
      appliedRevealRef.current = null;

      if (!q) {
        setQuestion(null);
        setCurrentQuestion(null);
        return;
      }

      setQuestion(q);
      setCurrentQuestion(q);
      setScrambledOptions(shuffleOptions(q.options || [], currentUser?.id, q.id));
      setMyAnswer(null);
      setIsAnswerLocked(false);
      setRevealedCorrect(null);
      setShowExplanation(false);
      setAnswerFlash(null);
      setMiniboard([]);
      questionStartTimeRef.current = Date.now();

      const player = await getOrCreatePlayer(game.id);
      const playerOut = Boolean(player?.is_eliminated || player?.is_disqualified);
      setIsEliminated(playerOut);

      const existingAnswers = currentUser
        ? await appClient.entities.Answer.filter({ game_id: game.id, question_id: q.id, user_id: currentUser.id }, '-created_date', 1)
        : [];
      const existingAnswer = existingAnswers[0];
      if (existingAnswer) {
        setMyAnswer(existingAnswer.selected_option);
        setIsAnswerLocked(true);
      }

      if (playerOut) {
        setIsAnswerLocked(true);
      }

      const alreadyRevealed = game.explanation_question_index === idx;
      if (alreadyRevealed) {
        await applyRevealOutcome(game, q);
      } else {
        startTimer(q.time_limit || game.question_timer || 10);
      }
    } catch (error) {
      console.error(error);
    }
  }, [
    applyRevealOutcome,
    currentUser,
    getOrCreatePlayer,
    questionStartTimeRef,
    setCurrentQuestion,
    setIsAnswerLocked,
    setMyAnswer,
    setQuestionIndex,
    setTotalQuestions,
    shuffleOptions,
    startTimer,
  ]);

  useEffect(() => {
    if (!currentGame) {
      loadActiveGame();
      return undefined;
    }

    if (currentGame.status === 'lobby') {
      navigate('/lobby');
      return undefined;
    }

    loadQuestion(currentGame);
    prevIdxRef.current = currentGame.current_question_index || 0;

    pollRef.current = setInterval(async () => {
      try {
        const games = await appClient.entities.Game.filter({ id: currentGame.id }, '-created_date', 1);
        if (!games.length) return;

        const game = games[0];
        if (game.status === 'ended') {
          clearInterval(pollRef.current);
          clearInterval(timerRef.current);
          navigate('/winners');
          return;
        }

        const newIdx = game.current_question_index || 0;
        if (newIdx !== prevIdxRef.current) {
          prevIdxRef.current = newIdx;
          await loadQuestion(game);
          return;
        }

        const q = questionsRef.current[newIdx];
        if (q && game.explanation_question_index === newIdx) {
          await applyRevealOutcome(game, q);
        }
      } catch {
        // Keep the game screen resilient during polling.
      }
    }, 1200);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, [applyRevealOutcome, currentGame?.id, currentUser?.id, loadActiveGame, loadQuestion, navigate]);

  useEffect(() => {
    if (isAnswerLocked && currentGame) {
      refreshMiniBoard(currentGame.id).catch(() => {});
    }
  }, [currentGame, isAnswerLocked, refreshMiniBoard]);

  const handleAnswer = useCallback(async (option) => {
    if (isAnswerLocked || myAnswer || isEliminated || !question) return;
    if (navigator.vibrate) navigator.vibrate(35);

    const saved = await submitAnswer(option.label);
    if (!saved) return;

    setMyAnswer(option.label);
    setIsAnswerLocked(true);
    setAnswerFlash('selected');
  }, [isAnswerLocked, isEliminated, myAnswer, question, setIsAnswerLocked, setMyAnswer, submitAnswer]);

  const getOptionStyle = (option) => {
    if (showExplanation) {
      if (option.label === revealedCorrect) return 'border-correct-green bg-correct-green/10 ring-2 ring-correct-green/25';
      if (option.label === myAnswer && option.label !== revealedCorrect) return 'border-wrong-red bg-wrong-red/10 ring-2 ring-wrong-red/25 opacity-80';
      return 'border-border bg-muted/50 opacity-60';
    }

    if (option.label === myAnswer) return 'border-primary bg-primary/10 shadow-sm';
    if (isAnswerLocked) return 'border-border bg-muted/50 opacity-70';
    return 'border-border bg-card active:scale-[0.98]';
  };

  const timerPct = question ? Math.max(0, (timeLeft / (question.time_limit || currentGame?.question_timer || 10)) * 100) : 100;
  const timerColor = timerPct > 60 ? 'hsl(var(--correct-green))' : timerPct > 30 ? 'hsl(var(--gold))' : 'hsl(var(--wrong-red))';
  const correctOption = scrambledOptions.find((option) => option.label === revealedCorrect);

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Trophy size={26} className="text-white" />
          </div>
          <h2 className="font-game text-xl font-black text-foreground mb-2">Ready?</h2>
          <p className="text-muted-foreground">Waiting for the host to start.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
      <GameBackground active intensity={isAnswerLocked ? 0.25 : 0.6} />
      <div className="relative z-10 flex flex-col flex-1">
        {showCorrectBurst && <CorrectBurst points={burstPoints} onDone={() => setShowCorrectBurst(false)} />}

        {isSuspicious && (
          <div className="bg-wrong-red px-4 py-2 text-center z-50">
            <p className="text-white text-xs font-semibold">Suspicious activity detected</p>
          </div>
        )}

        <div className="px-4 pt-4 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-muted rounded-xl px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Q </span>
              <span className="font-game text-foreground font-bold text-sm">{questionIdx + 1}/{totalQ}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className={`font-game font-black text-2xl leading-none ${timeLeft <= 3 ? 'text-wrong-red animate-shake' : timeLeft <= 5 ? 'text-gold' : 'text-foreground'}`}>
                {timeLeft}
              </span>
              <span className="text-[9px] text-muted-foreground font-medium">sec</span>
            </div>
            <div className="bg-muted rounded-xl px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Score </span>
              <span className={`font-game text-primary font-bold text-sm ${showCorrectBurst ? 'animate-score-pop' : ''}`}>{myScore}</span>
            </div>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, backgroundColor: timerColor }} />
          </div>
        </div>

        <div className="px-4 pt-4 flex-1 flex flex-col">
          {isEliminated && (
              <div className="rounded-2xl p-3 border border-wrong-red/25 bg-wrong-red/10 mb-3 flex items-center gap-2">
              <Lock size={15} className="text-wrong-red" />
              <p className="text-sm font-semibold text-foreground">You are out of this game. You can keep watching.</p>
            </div>
          )}

          <div className={`rounded-2xl p-4 border-2 mb-3 transition-all duration-300 ${
            answerFlash === 'correct' ? 'border-correct-green bg-correct-green/10' :
            answerFlash === 'wrong' ? 'border-wrong-red bg-wrong-red/10' :
            'border-border bg-card'
          }`}>
            {question.image_url && (
              <img src={question.image_url} className="w-full h-36 object-cover rounded-xl mb-3" alt="" />
            )}
            <p className={`text-foreground font-bold text-lg leading-relaxed text-center ${amharicClass(question.text)}`}>
              {question.text}
            </p>

            {showExplanation && (
              <div className="mt-3 pt-3 border-t border-border animate-slide-up">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={13} className="text-primary" />
                  <p className="text-xs font-bold text-primary">Answer revealed</p>
                </div>
                {correctOption && (
                  <p className={`text-sm font-semibold text-foreground mb-2 ${amharicClass(correctOption.text)}`}>
                    {correctOption.displayLabel}. {correctOption.text}
                  </p>
                )}
                {question.explanation && (
                  <p className={`text-sm text-muted-foreground leading-relaxed ${amharicClass(question.explanation)}`}>
                    {question.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {scrambledOptions.map((option) => (
              <button
                key={option.label}
                onClick={() => handleAnswer(option)}
                disabled={isAnswerLocked || !!myAnswer || isEliminated}
                className={`rounded-2xl p-3.5 border-2 text-left transition-all duration-200 ${getOptionStyle(option)}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`font-amharic font-bold text-sm w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    myAnswer === option.label ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>{option.displayLabel}</span>
                  <span className={`text-foreground font-semibold text-sm leading-tight ${amharicClass(option.text)}`}>
                    {option.text}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {isAnswerLocked && !showExplanation && !isEliminated && (
            <div className="text-center rounded-2xl p-3 border border-border bg-card mb-3 flex items-center justify-center gap-2">
              <Lock size={14} className="text-muted-foreground" />
              <p className="text-muted-foreground text-sm font-semibold">
                {myAnswer ? 'Answer submitted. Waiting for admin reveal.' : 'Time is up. Waiting for admin reveal.'}
              </p>
            </div>
          )}

          {showExplanation && (
            <div className={`text-center rounded-2xl p-3 border mb-3 animate-bounce-in ${
              myAnswer === revealedCorrect ? 'border-correct-green bg-correct-green/10' : 'border-wrong-red bg-wrong-red/10'
            }`}>
              <div className="flex items-center justify-center gap-2">
                {myAnswer === revealedCorrect
                  ? <CheckCircle size={16} className="text-correct-green" />
                  : <XCircle size={16} className="text-wrong-red" />}
                <p className={`font-bold text-sm ${myAnswer === revealedCorrect ? 'text-correct-green' : 'text-wrong-red'}`}>
                  {myAnswer === revealedCorrect ? `Correct +${burstPoints} pts` : myAnswer ? 'Wrong answer' : 'No answer'}
                </p>
              </div>
              {myAnswer !== revealedCorrect && (
                <p className="text-xs text-muted-foreground mt-1">You can keep watching, but you cannot answer again.</p>
              )}
            </div>
          )}

          {isAnswerLocked && miniboard.length > 0 && (
            <div className="rounded-2xl border border-border overflow-hidden animate-slide-up mb-3 bg-card">
              <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-correct-green animate-live-pulse" />
                <span className="text-xs font-semibold text-foreground">Still In</span>
              </div>
              {miniboard.map((player, i) => (
                <div key={player.id} className={`flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-0 ${player.user_id === currentUser?.id ? 'bg-primary/5' : ''}`}>
                  <span className="font-game text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                  <span className="flex-1 text-xs font-semibold text-foreground truncate">
                    {player.user_id === currentUser?.id ? 'You' : `Player ${i + 1}`}
                  </span>
                  <span className="font-game text-xs text-primary font-bold">{player.total_score || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-5 flex justify-center">
          <div className="flex items-center gap-1.5">
            <Shield size={9} className="text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/40">Fair play protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
