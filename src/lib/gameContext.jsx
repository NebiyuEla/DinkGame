import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { appClient } from '@/api/appClient';

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
  useEffect(() => {
    let mounted = true;
    appClient.auth.me()
      .then((user) => {
        if (mounted) setCurrentUser(user);
      })
      .catch((error) => console.error(error));

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

  const loadNextGame = useCallback(async () => {
    try {
      const games = await appClient.entities.Game.filter({ status: 'scheduled' }, 'scheduled_at', 1);
      if (games.length > 0) setNextGame(games[0]);
      else {
        const lobby = await appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 1);
        if (lobby.length > 0) setNextGame(lobby[0]);
      }
    } catch (e) { console.error(e); }
  }, []);

  const loadActiveGame = useCallback(async () => {
    try {
      const live = await appClient.entities.Game.filter({ status: 'live' }, '-created_date', 1);
      if (live.length > 0) { setCurrentGame(live[0]); setGameStatus('live'); return; }
      const lobby = await appClient.entities.Game.filter({ status: 'lobby' }, '-created_date', 1);
      if (lobby.length > 0) { setCurrentGame(lobby[0]); setGameStatus('lobby'); return; }
      setGameStatus('idle');
    } catch (e) { console.error(e); }
  }, []);

  // Anti-cheat: track tab/visibility switches
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStatus === 'live' && currentQuestion) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) setIsSuspicious(true);
          if (currentUser && currentGame) {
            appClient.entities.AntiCheatLog.create({
              user_id: currentUser.id,
              game_id: currentGame.id,
              event_type: 'tab_switch',
              details: `Tab switch #${newCount} during question ${questionIndex + 1}`,
              severity: newCount >= 3 ? 'high' : 'medium'
            }).catch(() => {});
          }
          return newCount;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [gameStatus, currentQuestion, currentUser, currentGame, questionIndex]);

  const submitAnswer = useCallback(async (optionLabel) => {
    if (isAnswerLocked || !currentQuestion || !currentUser || !currentGame) return null;
    const responseTimeMs = Date.now() - (questionStartTimeRef.current || Date.now());
    if (responseTimeMs < 300) {
      appClient.entities.AntiCheatLog.create({
        user_id: currentUser.id,
        game_id: currentGame.id,
        event_type: 'impossible_speed',
        details: `Answer submitted in ${responseTimeMs}ms`,
        severity: 'high'
      }).catch(() => {});
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
  }, [isAnswerLocked, currentQuestion, currentUser, currentGame]);

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
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
};
