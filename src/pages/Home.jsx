import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Star, Zap, Trophy, Calendar } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import CountdownTimer from '@/components/CountdownTimer';
import BottomNav from '@/components/BottomNav';
import { GameCardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import PullToRefresh from '@/components/PullToRefresh';

export default function Home() {
  const { currentUser, currentGame, gameStatus, nextGame, loadNextGame, loadActiveGame } = useGame();
  const [jackpot, setJackpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadNextGame(), loadActiveGame()]);
      try {
        const jackpots = await appClient.entities.Jackpot.filter({ is_active: true }, '-created_date', 1);
        if (jackpots.length > 0) setJackpot(jackpots[0]);
      } catch (e) {}
      setLoading(false);
    };
    init();
    const interval = setInterval(loadActiveGame, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinGame = async () => {
    if (!gameActive) return;
    // Check if game is paid — if so, verify deposit first
    const g = currentGame || nextGame;
    if (g?.is_paid && currentUser) {
      const existing = await appClient.entities.Deposit.filter({ user_id: currentUser.id, game_id: g.id, status: 'paid' }, '-created_date', 1).catch(() => []);
      if (existing.length === 0) { navigate('/deposit'); return; }
    }
    if (gameStatus === 'lobby') navigate('/lobby');
    else if (gameStatus === 'live') navigate('/game');
  };

  const gameActive = gameStatus === 'lobby' || gameStatus === 'live';
  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);
  const displayGame = currentGame || nextGame;

  const handleRefresh = async () => {
    await Promise.all([loadNextGame(), loadActiveGame()]);
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="px-4 pt-8 pb-4 bg-card border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <DinkLogo size="md" />
          <Link to="/profile" className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
            {currentUser?.photo_url
              ? <img src={currentUser.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
              : <span className="text-sm font-bold text-foreground">{(currentUser?.full_name || 'U')[0]?.toUpperCase()}</span>}
          </Link>
        </div>
        {currentUser && (
          <p className="text-muted-foreground text-sm">
            Hey, <span className="text-foreground font-semibold">{currentUser.full_name || 'Player'}</span>
          </p>
        )}
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
      <div className="px-4 pt-4 space-y-3">
        {loading ? (
          <><GameCardSkeleton /><GameCardSkeleton /></>
        ) : (
          <>
            {/* Game status card */}
            <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
              {gameStatus === 'live' ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-correct-green animate-live-pulse" />
                    <span className="font-game text-correct-green font-bold text-sm tracking-wider">LIVE NOW</span>
                  </div>
                  <p className="text-foreground font-bold text-base">{currentGame?.title}</p>
                  <p className="text-muted-foreground text-sm mt-1">{currentGame?.total_players?.toLocaleString() || 0} players in game</p>
                </div>
              ) : gameStatus === 'lobby' ? (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-live-pulse" />
                    <span className="font-game text-primary font-bold text-sm tracking-wider">LOBBY OPEN</span>
                  </div>
                  <p className="text-foreground font-bold">{currentGame?.title || 'Game Starting Soon'}</p>
                  <p className="text-muted-foreground text-sm mt-1">{currentGame?.total_players?.toLocaleString() || 0} players waiting</p>
                </div>
              ) : nextGame?.scheduled_at ? (
                <div className="text-center">
                  <p className="text-muted-foreground text-xs font-semibold tracking-widest mb-1">NEXT GAME</p>
                  <p className="text-foreground font-semibold text-sm mb-3">{nextGame.title}</p>
                  <CountdownTimer targetDate={nextGame.scheduled_at} onEnd={loadActiveGame} />
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(nextGame.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <Calendar size={24} className="text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-foreground font-semibold text-sm">No games scheduled</p>
                  <p className="text-muted-foreground text-xs mt-1">Every Sunday at 9:00 PM (EAT)</p>
                </div>
              )}
            </div>

            {/* Jackpot */}
            {jackpot && (
              <div className="bg-card rounded-2xl p-4 border border-gold/30 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold tracking-widest">JACKPOT</p>
                  <p className="font-game text-2xl font-black text-gold">{fmt(jackpot.amount)}</p>
                  <p className="text-xs text-muted-foreground">{jackpot.label || 'Weekly Jackpot'}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Trophy size={22} className="text-gold" />
                </div>
              </div>
            )}

            {/* Prize */}
            {displayGame && displayGame.prize_amount > 0 && (
              <div className="bg-card rounded-2xl p-4 border border-border flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold tracking-widest">TODAY'S PRIZE</p>
                  <p className="font-game text-2xl font-black text-primary">{fmt(displayGame.prize_amount)}</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Zap size={22} className="text-primary" />
                </div>
              </div>
            )}

            {/* Join Button */}
            {gameActive && (
              <button onClick={handleJoinGame}
                className={`w-full py-4 rounded-2xl font-game text-base font-black tracking-wider transition-all duration-200 active:scale-[0.98] shadow-lg ${
                  gameStatus === 'live'
                    ? 'bg-correct-green text-white glow-green'
                    : 'gradient-purple-blue text-white glow-purple'
                }`}>
                {gameStatus === 'live' ? 'JOIN LIVE GAME' : 'ENTER LOBBY'}
              </button>
            )}

            {/* Quick links */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: BookOpen, label: 'Rules', path: '/rules', color: 'text-primary', bg: 'border-border' },
                { icon: Star, label: 'Winners', path: '/winners', color: 'text-gold', bg: 'border-border' },
              ].map(({ icon: Icon, label, path, color, bg }) => (
                <Link key={label} to={path}
                  className={`bg-card rounded-2xl p-3.5 flex items-center gap-2.5 border ${bg} active:scale-95 transition-transform shadow-sm`}>
                  <Icon size={17} className={color} />
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </Link>
              ))}
            </div>

            {/* Next game schedule */}
            {!gameActive && (
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                    <Calendar size={15} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Every Sunday · 9:00 PM</p>
                    <p className="text-xs text-muted-foreground">East Africa Time (EAT)</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </PullToRefresh>
      <BottomNav />
    </div>
  );
}