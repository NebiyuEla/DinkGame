import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { appClient } from '@/api/appClient';
import { getTelegramProfile } from '@/lib/telegram';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentGame, setCurrentGame] = useState(null);
  const [gameStatus, setGameStatus] = useState('idle'); // idle, lobby, live, paused, ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [myAnswer, setMyAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const [lobbyCount, setLobbyCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isSuspicious, setIsSuspicious] = useState(false);
  const [nextGame, setNextGame] = useState(null);
  const [winners, setWinners] = useState([]);

  const timerRef = useRef(null);
  const questionStartTimeRef = useRef(null);
  const lastFocusEventRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const telegramProfile = getTelegramProfile();
      const user = telegramProfile
        ? await appClient.auth.loginViaEmailPassword(telegramProfile.email)
        : await appClient.auth.me();

      if (telegramProfile) {
        const linkedUser = await appClient.entities.User.update(user.id, {
          ...telegramProfile,
          telegram_linked: true,
          last_seen: new Date().toISOString(),
        });
        if (mounted) setCurrentUser(linkedUser);
        return;
      }

      if (mounted) setCurrentUser(user);
    };

    loadUser().catch((error) => console.error(error));

    const unsubscribe = appClient.events?.subscribe?.(() => {
      appClient.auth.me()
        .then((user) => {
          if (mounted) setCurrentUser(user);
        })
        .catch(() => {});
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const recordSuspicious = useCallback(async ({ eventType, reason, forceBan = false }) => {
    if (!currentUser?.id || !currentGame?.id) return;
    try {
      const rows = await appClient.entities.GamePlayer.filter({
        game_id: currentGame.id,
        user_id: currentUser.id,
      }, '-created_date', 1);
      const player = rows[0];
      const nextWarningCount = Number(player?.warning_count || 0) + 1;
      const shouldBan = forceBan || nextWarningCount >= 2;
      const severity = shouldBan ? 'high' : 'medium';

      await appClient.entities.AntiCheatLog.create({
        user_id: currentUser.id,
        username: currentUser.full_name || currentUser.username || 'Player',
        game_id: currentGame.id,
        event_type: eventType,
        details: `${reason}. Warning ${Math.min(nextWarningCount, 2)} of 2.`,
        severity,
        action_taken: shouldBan ? 'game_ban' : 'warning',
      });

      if (player) {
        await appClient.entities.GamePlayer.update(player.id, {
          warning_count: nextWarningCount,
          ...(shouldBan ? {
            is_disqualified: true,
            game_banned: true,
            disqualify_reason: reason,
            status: 'finished',
          } : {}),
        });
      }

      if (shouldBan) {
        await appClient.entities.Broadcast.create({
          game_id: currentGame.id,
          target: 'user',
          target_user_id: currentUser.id,
          message: `Game ban: ${reason}`,
          sent_by: 'system',
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).catch(() => {});

        const existingBan = await appClient.entities.GameBan.filter({
          game_id: currentGame.id,
          user_id: currentUser.id,
          is_active: true,
        }, '-created_date', 1);
        if (existingBan.length === 0) {
          await appClient.entities.GameBan.create({
            game_id: currentGame.id,
            user_id: currentUser.id,
            username: currentUser.full_name || currentUser.username || 'Player',
            reason,
            is_active: true,
          });
        }
      }

      setTabSwitchCount(nextWarningCount);
      setIsSuspicious(true);
    } catch (error) {
      console.error(error);
    }
  }, [currentGame, currentUser]);

  const loadNextGame = useCallback(async () => {
    try {
      const games = await appClient.entities.Game.filter({ status: 'scheduled' }, 'scheduled_at', 1);
      if (games.length > 0) {
        setNextGame(games[0]);
        return games[0];
      }

      const lobby = await appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 1);
      if (lobby.length > 0) {
        setNextGame(lobby[0]);
        return lobby[0];
      }

      setNextGame(null);
      return null;
    } catch (e) { console.error(e); }
    return null;
  }, []);

  const loadActiveGame = useCallback(async () => {
    try {
      const live = await appClient.entities.Game.filter({ status: 'live' }, '-created_date', 1);
      if (live.length > 0) {
        setCurrentGame(live[0]);
        setGameStatus('live');
        return live[0];
      }
      const lobby = await appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 1);
      if (lobby.length > 0) {
        setCurrentGame(lobby[0]);
        setGameStatus('lobby');
        return lobby[0];
      }
      setCurrentGame(null);
      setGameStatus('idle');
      return null;
    } catch (e) { console.error(e); }
    return null;
  }, []);

  // Anti-cheat: one warning, then game-specific ban for focus or visibility abuse.
  useEffect(() => {
    const shouldTrack = () => gameStatus === 'live' && currentQuestion && currentUser && currentGame;

    const handleVisibilityChange = () => {
      if (document.hidden && gameStatus === 'live' && currentQuestion) {
        recordSuspicious({
          eventType: 'mini_app_hidden',
          reason: `Player hid or left the mini app during question ${questionIndex + 1}`,
        });
      }
    };

    const handleBlur = () => {
      if (!shouldTrack()) return;
      const now = Date.now();
      if (now - lastFocusEventRef.current < 2500) return;
      lastFocusEventRef.current = now;
      recordSuspicious({
        eventType: 'app_blur',
        reason: `Player left Telegram focus during question ${questionIndex + 1}`,
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [currentGame, currentQuestion, currentUser, gameStatus, questionIndex, recordSuspicious]);

  const submitAnswer = useCallback(async (optionLabel) => {
    if (isAnswerLocked || !currentQuestion || !currentUser || !currentGame) return null;
    const responseTimeMs = Date.now() - (questionStartTimeRef.current || Date.now());
    if (responseTimeMs < 300) {
      recordSuspicious({
        eventType: 'impossible_speed',
        reason: `Answer submitted in ${responseTimeMs}ms`,
        forceBan: true,
      });
      return null;
    }
    setMyAnswer(optionLabel);
    setIsAnswerLocked(true);
    try {
      const existing = await appClient.entities.Answer.filter({
        game_id: currentGame.id,
        question_id: currentQuestion.id,
        user_id: currentUser.id,
      }, '-created_date', 1);

      const payload = {
        game_id: currentGame.id,
        question_id: currentQuestion.id,
        user_id: currentUser.id,
        selected_option: optionLabel,
        response_time_ms: responseTimeMs,
        submitted_at: new Date().toISOString(),
      };

      if (existing.length > 0) {
        return await appClient.entities.Answer.update(existing[0].id, payload);
      }

      return await appClient.entities.Answer.create(payload);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [isAnswerLocked, currentQuestion, currentUser, currentGame, recordSuspicious]);

  const value = {
    currentUser, setCurrentUser,
    currentGame, setCurrentGame,
    gameStatus, setGameStatus,
    currentQuestion, setCurrentQuestion,
    questionIndex, setQuestionIndex,
    totalQuestions, setTotalQuestions,
    myAnswer, setMyAnswer,
    answerResult, setAnswerResult,
    myScore, setMyScore,
    myRank, setMyRank,
    liveCount, setLiveCount,
    lobbyCount, setLobbyCount,
    leaderboard, setLeaderboard,
    announcements, setAnnouncements,
    timeLeft, setTimeLeft,
    isAnswerLocked, setIsAnswerLocked,
    tabSwitchCount, isSuspicious,
    nextGame, winners, setWinners,
    questionStartTimeRef, timerRef,
    loadNextGame, loadActiveGame,
    submitAnswer,
    recordSuspicious,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};
