import React, { useState, useEffect, useRef } from 'react';
import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import RankBadge from '@/components/RankBadge';
import Confetti from '@/components/Confetti';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

const TABS = ['This Week', 'All Time', 'Jackpot'];

// Get start of this ISO week (Monday 00:00)
function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function WinnerAvatar({ name, photoUrl }) {
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
      {photoUrl
        ? <img src={photoUrl} className="w-full h-full object-cover" alt="" />
        : <span className="text-sm font-bold text-primary uppercase">{(name || 'P')[0]}</span>}
    </div>
  );
}

export default function Winners() {
  const [activeTab, setActiveTab] = useState('This Week');
  const [winners, setWinners] = useState([]);
  const [jackpotWinners, setJackpotWinners] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const { currentGame, gameStatus, currentUser } = useGame();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (gameStatus === 'ended') {
      setShowConfetti(true);
      setTimeout(() => { if (mountedRef.current) setShowConfetti(false); }, 6000);
    }
  }, [gameStatus]);

  useEffect(() => {
    loadWinners();
  }, [activeTab]);

  const loadWinners = async () => {
    setLoading(true);
    try {
      let players = [];

      if (activeTab === 'This Week') {
        const weekStart = getWeekStart();
        const all = await appClient.entities.GamePlayer.filter({}, '-total_score', 100);
        // Filter to only records from this week
        players = all.filter(p =>
          !p.is_disqualified &&
          !p.is_eliminated &&
          p.rank >= 1 &&
          new Date(p.joined_at || p.created_date) >= weekStart
        ).sort((a, b) => b.total_score - a.total_score || a.total_response_time_ms - b.total_response_time_ms);
      } else if (activeTab === 'All Time') {
        const all = await appClient.entities.GamePlayer.filter({}, '-total_score', 50);
        players = all.filter(p => !p.is_disqualified && !p.is_eliminated).sort((a, b) => b.total_score - a.total_score);
      } else if (activeTab === 'Jackpot') {
        const j = await appClient.entities.Jackpot.filter({ winner_user_id: { $exists: true } }, '-won_at', 20);
        setJackpotWinners(j);
        setLoading(false);
        return;
      }

      setWinners(players.slice(0, 20));

      if (players.length > 0) {
        const users = await appClient.entities.User.list();
        const map = {};
        users.forEach(u => { map[u.id] = u; });
        if (mountedRef.current) setUserMap(map);
      }
    } catch (e) {}
    if (mountedRef.current) setLoading(false);
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  const jackpotShare = currentGame?.jackpot_amount ? Math.floor(currentGame.jackpot_amount / 3) : 0;
  const prizeForRank = (i) => {
    if (i === 0) return currentGame?.prize_amount || 0;
    if (i < 3) return jackpotShare;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Confetti active={showConfetti} />

      {/* Game ended banner */}
      {gameStatus === 'ended' && currentGame && (
        <div className="mx-4 mt-4 bg-card rounded-2xl p-4 border border-gold/40 text-center animate-bounce-in">
          <Trophy size={28} className="text-gold mx-auto mb-2" />
          <h2 className="font-game text-lg font-black text-foreground">Game Over</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{currentGame.title} has ended</p>
        </div>
      )}

      <div className="px-4 pt-5 pb-3 border-b border-border bg-card">
        <h1 className="font-game text-xl font-black text-foreground flex items-center gap-2">
          <Trophy size={18} className="text-gold" />
          Winners
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">Top players and their prizes</p>
      </div>

      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="bg-muted rounded-2xl p-1 flex gap-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-all duration-200 ${
                activeTab === tab ? 'bg-card text-foreground shadow-sm font-bold' : 'text-muted-foreground'
              }`}>{tab}</button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-2.5">
        {loading ? <LeaderboardSkeleton /> : activeTab === 'Jackpot' ? (
          jackpotWinners.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={44} className="text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-foreground font-semibold">No jackpot winners yet</p>
            </div>
          ) : jackpotWinners.map((j, i) => (
            <div key={j.id} className="bg-card rounded-2xl p-4 border border-gold/30 flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground text-sm">{userMap[j.winner_user_id]?.full_name || 'Winner'}</p>
                <p className="text-xs text-muted-foreground">{j.label || 'Jackpot'} · {j.won_at ? new Date(j.won_at).toLocaleDateString() : ''}</p>
              </div>
              <p className="font-game text-gold font-black text-sm">{fmt(j.amount)}</p>
            </div>
          ))
        ) : winners.length === 0 ? (
          <div className="text-center py-12">
            <Trophy size={44} className="text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-foreground font-semibold">No winners yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              {activeTab === 'This Week' ? 'Play this week to appear here' : 'Winners appear after games end'}
            </p>
          </div>
        ) : winners.map((player, i) => {
          const user = userMap[player.user_id];
          const prize = prizeForRank(i);
          const isMe = player.user_id === currentUser?.id;
          return (
            <div key={player.id}
              className={`bg-card rounded-2xl p-4 border flex items-center gap-3 ${
                i === 0 ? 'border-gold/40' : isMe ? 'border-primary/30' : 'border-border'
              }`}>
              <RankBadge rank={i + 1} />
              <WinnerAvatar name={user?.full_name || user?.username} photoUrl={user?.photo_url} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">
                  {user?.full_name || `Player ${i + 1}`}
                  {isMe && <span className="text-primary text-xs ml-1 font-bold">· You</span>}
                </p>
                <p className="text-xs text-muted-foreground">{player.total_score?.toLocaleString()} pts</p>
              </div>
              <div className="text-right flex-shrink-0">
                {prize > 0 ? (
                  <>
                    <p className="font-game text-gold font-black text-sm">{fmt(prize)}</p>
                    {isMe && <Link to="/claim" className="text-[10px] text-primary font-semibold">Claim</Link>}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
