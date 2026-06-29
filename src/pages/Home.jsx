import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Music2, ShieldCheck, Users, Trophy, Clock3, Youtube } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import CountdownTimer from '@/components/CountdownTimer';
import { GameCardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import PullToRefresh from '@/components/PullToRefresh';
import BrandMascot from '@/components/BrandMascot';

const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

export default function Home() {
  const { currentUser, currentGame, gameStatus, nextGame, loadNextGame, loadActiveGame, setCurrentUser } = useGame();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const liveGame = currentGame && ['lobby', 'live'].includes(currentGame.status) ? currentGame : null;
  const scheduledGame = nextGame && ['scheduled', 'lobby'].includes(nextGame.status) ? nextGame : null;
  const displayGame = liveGame || scheduledGame;
  const gameActive = displayGame && (gameStatus === 'lobby' || gameStatus === 'live' || ['lobby', 'live'].includes(displayGame.status));
  const prizePool = Number(displayGame?.prize_amount || 0);
  const entryFee = Number(displayGame?.entry_fee || 0);
  const isPaid = Boolean(displayGame?.is_paid && entryFee > 0);
  const walletBalance = Number(currentUser?.wallet_balance || 0);
  const activePlayerCount = players.filter(p => !p.is_disqualified && !p.is_eliminated && p.status !== 'disconnected').length;

  const load = useCallback(async () => {
    setLoading(true);
    const [next, active] = await Promise.all([loadNextGame(), loadActiveGame()]);
    const game = active || next;
    if (game?.id) {
      const gamePlayers = await appClient.entities.GamePlayer.filter({ game_id: game.id }, '-created_date', 200).catch(() => []);
      setPlayers(gamePlayers);
    } else {
      setPlayers([]);
    }
    setLoading(false);
  }, [loadActiveGame, loadNextGame]);

  useEffect(() => {
    load();
    const unsubscribe = appClient.events?.subscribe?.((detail) => {
      const event = String(detail?.event || '');
      if (/Game|GamePlayer|Deposit|WalletTransaction|User/.test(event)) load();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [load]);

  const ensurePaidEntry = async (game) => {
    if (!isPaid || !currentUser) return true;
    const existing = await appClient.entities.Deposit.filter({ user_id: currentUser.id, game_id: game.id, status: 'paid', purpose: 'game_entry' }, '-created_date', 1).catch(() => []);
    if (existing.length > 0) return true;

    if (walletBalance < entryFee) {
      navigate(`/deposit?amount=${entryFee}&game=${game.id}`);
      return false;
    }

    const updatedUser = await appClient.entities.User.update(currentUser.id, {
      wallet_balance: walletBalance - entryFee,
    });
    await appClient.entities.Deposit.create({
      user_id: currentUser.id,
      game_id: game.id,
      amount: entryFee,
      status: 'paid',
      provider: 'wallet',
      purpose: 'game_entry',
      verified_at: new Date().toISOString(),
    });
    await appClient.entities.WalletTransaction.create({
      user_id: currentUser.id,
      game_id: game.id,
      amount: entryFee,
      type: 'debit',
      status: 'posted',
      source: 'game_entry',
      note: `${game.title} entry fee`,
    });
    setCurrentUser(updatedUser);
    return true;
  };

  const handleJoinGame = async () => {
    if (!displayGame || !gameActive || joining) return;
    setJoining(true);
    const paid = await ensurePaidEntry(displayGame).catch(() => false);
    setJoining(false);
    if (!paid) return;
    if (gameStatus === 'live') navigate('/game');
    else navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 pt-3 pb-3 bg-card border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <DinkLogo size="sm" />
          <div className="flex items-center gap-2">
            <div className="h-9 px-3 rounded-full bg-primary text-white flex items-center gap-2">
              <img src="/brand/etb-coin-small.webp" alt="" className="w-5 h-5 object-contain" loading="eager" decoding="async" />
              <span className="font-black text-xs">{fmt(walletBalance)}</span>
            </div>
            <Link to="/profile" className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center overflow-hidden">
              {currentUser?.photo_url
                ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="" />
                : <span className="text-xs font-black text-primary">{(currentUser?.full_name || 'P')[0]?.toUpperCase()}</span>}
            </Link>
          </div>
        </div>
      </div>

      <PullToRefresh onRefresh={load}>
        <div className="px-4 pt-4 space-y-3">
          {loading ? (
            <><GameCardSkeleton /><GameCardSkeleton /></>
          ) : (
            <>
              <section className="rounded-[1.75rem] bg-card border border-border overflow-hidden shadow-sm">
                <div className="p-4 pb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${gameStatus === 'live' ? 'bg-correct-green' : gameStatus === 'lobby' ? 'bg-gold' : 'bg-muted-foreground/30'} animate-live-pulse`} />
                      <span className="text-[11px] font-black tracking-widest text-primary">
                        {gameStatus === 'live' ? 'LIVE GAME' : gameStatus === 'lobby' ? 'WAITING ROOM' : 'NEXT GAME'}
                      </span>
                    </div>
                    <h1 className="text-2xl font-black text-foreground leading-tight">{displayGame?.title || 'No coming games'}</h1>
                    {(isPaid || prizePool > 0) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isPaid ? `${fmt(entryFee)} entry` : ''}
                        {isPaid && prizePool > 0 ? ' - ' : ''}
                        {prizePool > 0 ? `${fmt(prizePool)} prize pool` : ''}
                      </p>
                    )}
                  </div>
                  <BrandMascot className="w-20 h-20 object-contain flex-shrink-0" small />
                </div>

                {displayGame?.scheduled_at && gameStatus !== 'lobby' && gameStatus !== 'live' && (
                  <div className="px-4 pb-4">
                    <CountdownTimer targetDate={displayGame.scheduled_at} onEnd={loadActiveGame} />
                  </div>
                )}

                <div className="grid grid-cols-3 border-t border-border">
                  <div className="p-3 text-center">
                    <Users size={16} className="mx-auto text-primary mb-1" />
                    <p className="text-lg font-black text-foreground">{activePlayerCount}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Players</p>
                  </div>
                  <div className="p-3 text-center border-x border-border">
                    <Trophy size={16} className="mx-auto text-gold mb-1" />
                    <p className="text-lg font-black text-foreground">{fmt(prizePool)}</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Prize</p>
                  </div>
                  <div className="p-3 text-center">
                    <ShieldCheck size={16} className="mx-auto text-primary mb-1" />
                    <p className="text-lg font-black text-foreground">{displayGame?.question_timer || 10}s</p>
                    <p className="text-[10px] text-muted-foreground font-bold">Timer</p>
                  </div>
                </div>
              </section>

              {prizePool > 0 && (
                <section className="rounded-3xl bg-primary text-white p-4 flex items-center gap-4">
                  <img src="/brand/etb-coin.webp" alt="" className="w-16 h-16 object-contain flex-shrink-0" loading="lazy" decoding="async" />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white/70 tracking-widest mb-2">TODAY'S PRIZE</p>
                    <p className="text-3xl font-black">{fmt(prizePool)}</p>
                    <p className="text-sm text-white/75 mt-1">
                      All players still in the game at the end split the prize equally into their wallet.
                    </p>
                  </div>
                </section>
              )}

              {gameActive && (
                <button
                  onClick={handleJoinGame}
                  disabled={joining}
                  className="w-full h-14 rounded-full bg-gold text-primary font-black text-base active:scale-[0.98] transition-transform shadow-[0_12px_24px_hsl(var(--gold)/0.24)] disabled:opacity-60"
                >
                  {joining ? 'Checking wallet...' : gameStatus === 'live' ? 'Open Game' : isPaid ? `Join for ${fmt(entryFee)}` : 'Enter Waiting Room'}
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Link to="/rules" className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-black text-foreground">Rules</span>
                </Link>
                <Link to="/winners" className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
                    <Trophy size={16} className="text-gold" />
                  </div>
                  <span className="text-sm font-black text-foreground">Winners</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a href="https://www.tiktok.com/@DinkGame" target="_blank" rel="noreferrer" className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Music2 size={16} className="text-primary" />
                  </div>
                  <span className="text-sm font-black text-foreground">TikTok @DinkGame</span>
                </a>
                <a href="https://www.youtube.com/@DinkGame" target="_blank" rel="noreferrer" className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center gap-3 active:scale-95 transition-transform">
                  <div className="w-9 h-9 rounded-full bg-gold/15 flex items-center justify-center">
                    <Youtube size={16} className="text-gold" />
                  </div>
                  <span className="text-sm font-black text-foreground">YouTube @DinkGame</span>
                </a>
              </div>

              {!displayGame && (
                <div className="rounded-2xl bg-card border border-border p-4 flex gap-3">
                  <Clock3 size={18} className="text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">No coming games</p>
                </div>
              )}
            </>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
