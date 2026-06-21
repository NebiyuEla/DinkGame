import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Trophy, Bell, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

const RULES = [
  'Each question has a time limit. Answer fast for bonus points',
  'Once submitted, answers cannot be changed',
  'Top 3 players share the jackpot equally',
  'First place wins the main prize',
  'Cheating tools and bots are strictly banned',
  'Mobile-first layout for Telegram and Render testing',
];

const isActivePlayer = (player) => (
  !player.is_disqualified &&
  !player.is_eliminated &&
  ['lobby', 'playing'].includes(player.status || 'lobby')
);

export default function Lobby() {
  const navigate = useNavigate();
  const { currentGame, currentUser, gameStatus, setGameStatus, loadActiveGame } = useGame();
  const [playerCount, setPlayerCount] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [joined, setJoined] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!currentGame) { loadActiveGame(); return; }
    if (gameStatus === 'live') { navigate('/game'); return; }

    const joinLobby = async () => {
      if (!currentUser || joined) return;
      try {
        const existing = await appClient.entities.GamePlayer.filter({ game_id: currentGame.id, user_id: currentUser.id });
        if (existing.length === 0) {
          await appClient.entities.GamePlayer.create({
            game_id: currentGame.id, user_id: currentUser.id,
            joined_at: new Date().toISOString(), status: 'lobby'
          });
        } else {
          await appClient.entities.GamePlayer.update(existing[0].id, {
            status: 'lobby',
            last_seen: new Date().toISOString(),
          });
        }
        setJoined(true);
        const players = await appClient.entities.GamePlayer.filter({ game_id: currentGame.id });
        const activeCount = players.filter(isActivePlayer).length;
        await appClient.entities.Game.update(currentGame.id, { total_players: activeCount });
        setPlayerCount(activeCount);
      } catch (e) {}
    };
    joinLobby();

    pollRef.current = setInterval(async () => {
      try {
        const games = await appClient.entities.Game.filter({ id: currentGame.id }, '-created_date', 1);
        if (games.length > 0) {
          const g = games[0];
          if (g.status === 'live') { setGameStatus('live'); clearInterval(pollRef.current); navigate('/game'); return; }
          if (g.status === 'ended') { clearInterval(pollRef.current); navigate('/winners'); return; }
          const players = await appClient.entities.GamePlayer.filter({ game_id: currentGame.id });
          const activeCount = players.filter(isActivePlayer).length;
          setPlayerCount(activeCount);
          if (activeCount !== g.total_players) {
            await appClient.entities.Game.update(currentGame.id, { total_players: activeCount });
          }
        }
      } catch (e) {}
    }, 3000);

    // Decrease player count on unload
    const handleUnload = async () => {
      if (currentUser) {
        try {
          const existing = await appClient.entities.GamePlayer.filter({ game_id: currentGame.id, user_id: currentUser.id });
          if (existing.length > 0) {
            await appClient.entities.GamePlayer.update(existing[0].id, { status: 'disconnected' });
          }
        } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(pollRef.current);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentGame?.id, currentUser?.id]);

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <DinkLogo size="sm" />
          <div className="w-9" />
        </div>

        {/* Live player counter */}
        <div className="bg-card rounded-2xl p-5 border border-border text-center mb-3 shadow-sm">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary animate-live-pulse" />
            <span className="font-game text-primary text-sm font-bold tracking-widest">LOBBY OPEN</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Users size={20} className="text-muted-foreground" />
            <span className="font-game text-foreground font-black text-4xl">{playerCount.toLocaleString()}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">players in lobby</p>
          {currentGame && <p className="text-foreground font-semibold text-sm mt-2">{currentGame.title}</p>}
        </div>

        {/* Status */}
        <div className="bg-card rounded-2xl p-4 border border-border text-center mb-3 shadow-sm">
          <div className="w-12 h-12 rounded-2xl gradient-purple-blue flex items-center justify-center mx-auto mb-3 glow-purple animate-float">
            <Trophy size={22} className="text-white" />
          </div>
          <h2 className="font-game text-base font-black text-foreground mb-1">Game Starts Soon</h2>
          <p className="text-muted-foreground text-sm">The host will start the game shortly</p>
          {currentGame?.scheduled_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled: {new Date(currentGame.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Prize */}
        {currentGame?.prize_amount > 0 && (
          <div className="mb-3 bg-card rounded-2xl p-4 border border-gold/30 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs text-muted-foreground font-semibold tracking-widest">PRIZE POOL</p>
              <p className="font-game text-xl font-black text-gold">{fmt(currentGame.prize_amount)}</p>
              {currentGame.jackpot_amount > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">+{fmt(currentGame.jackpot_amount)} jackpot (top 3)</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center">
              <Trophy size={18} className="text-gold" />
            </div>
          </div>
        )}

        {/* Rules */}
        <button onClick={() => setShowRules(!showRules)}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm mb-1">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-primary" />
            <span className="font-semibold text-foreground text-sm">Game Rules</span>
          </div>
          {showRules ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </button>
        {showRules && (
          <div className="bg-muted/50 rounded-2xl p-4 border border-border animate-slide-up space-y-2.5">
            {RULES.map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{rule}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
