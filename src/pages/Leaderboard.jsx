import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Zap } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import RankBadge from '@/components/RankBadge';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import PullToRefresh from '@/components/PullToRefresh';

const TABS = ['LIVE', 'WEEKLY', 'ALL TIME'];

function PlayerAvatar({ userRecord }) {
  const initial = userRecord?.full_name?.[0] || userRecord?.username?.[0] || 'P';
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {userRecord?.photo_url
        ? <img src={userRecord.photo_url} className="w-full h-full object-cover" alt="" />
        : <span className="font-bold text-primary text-sm uppercase">{initial}</span>}
    </div>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('LIVE');
  const [entries, setEntries] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const { currentUser, currentGame, myScore } = useGame();
  const intervalRef = useRef(null);

  useEffect(() => {
    loadLeaderboard(true);
    clearInterval(intervalRef.current);
    if (activeTab === 'LIVE') {
      intervalRef.current = setInterval(() => loadLeaderboard(false), 4000);
    }
    return () => clearInterval(intervalRef.current);
  }, [activeTab, currentGame?.id]);

  const loadLeaderboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const query = activeTab === 'LIVE' && currentGame ? { game_id: currentGame.id } : {};
      const players = await appClient.entities.GamePlayer.filter(query, '-total_score', 50);
      const sorted = players
        .filter(p => !p.is_disqualified && !p.is_eliminated)
        .sort((a, b) => b.total_score - a.total_score || a.total_response_time_ms - b.total_response_time_ms);
      setEntries(sorted);
      setLastUpdated(new Date());
      const top = sorted.slice(0, 10);
      if (top.length > 0) {
        const users = await appClient.entities.User.list();
        const map = {};
        users.forEach(u => { map[u.id] = u; });
        setUserMap(map);
      }
    } catch (e) {}
    if (showLoading) setLoading(false);
  };

  const myPosition = entries.findIndex(e => e.user_id === currentUser?.id) + 1;
  const myEntry = entries.find(e => e.user_id === currentUser?.id);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3, 10);

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 pt-8 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <h1 className="font-game text-xl font-black text-foreground flex items-center gap-2">
            <Trophy size={20} className="text-gold" /> Leaderboard
          </h1>
          {activeTab === 'LIVE' && lastUpdated && (
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-correct-green animate-live-pulse" />
              <span className="text-xs text-correct-green font-semibold">Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="bg-muted rounded-2xl p-1 flex gap-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1 ${
                activeTab === tab ? 'bg-card text-primary shadow-sm font-bold' : 'text-muted-foreground'
              }`}>
              {tab === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-correct-green animate-live-pulse" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      <PullToRefresh onRefresh={() => loadLeaderboard(true)}>
      {loading ? (
        <div className="px-4 pt-4"><LeaderboardSkeleton /></div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <Trophy size={44} className="text-muted-foreground/20 mb-3" />
          <p className="text-muted-foreground font-semibold">No players yet</p>
          <p className="text-muted-foreground/60 text-sm mt-1">Rankings appear when the game starts</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length >= 3 && (
            <div className="px-4 pt-4 mb-2">
              <div className="flex items-end justify-center gap-2">
                {/* 2nd */}
                <div className="flex flex-col items-center flex-1">
                  <div className="relative mb-1">
                    <PlayerAvatar userRecord={userMap[top3[1]?.user_id]} />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted-foreground/60 border-2 border-background flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">2</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-foreground text-center truncate w-full px-1 mt-1.5">
                    {userMap[top3[1]?.user_id]?.full_name?.split(' ')[0] || 'Player 2'}
                  </p>
                  <div className="w-full h-16 bg-muted rounded-t-xl flex flex-col items-center justify-center mt-1">
                    <span className="font-game text-sm font-black text-foreground">{top3[1]?.total_score?.toLocaleString()}</span>
                    <span className="text-[9px] text-muted-foreground">pts</span>
                  </div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center flex-1">
                  <Trophy size={16} className="text-gold mb-1" />
                  <div className="relative mb-1">
                    <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-gold flex items-center justify-center overflow-hidden">
                      {userMap[top3[0]?.user_id]?.photo_url
                        ? <img src={userMap[top3[0]?.user_id].photo_url} className="w-full h-full object-cover" alt="" />
                        : <span className="font-bold text-primary text-lg">{(userMap[top3[0]?.user_id]?.full_name || 'P')[0]}</span>}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full gradient-gold border-2 border-background flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">1</span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-gold text-center truncate w-full px-1 mt-1.5">
                    {userMap[top3[0]?.user_id]?.full_name?.split(' ')[0] || 'Player 1'}
                  </p>
                  <div className="w-full h-24 gradient-purple-blue rounded-t-xl flex flex-col items-center justify-center mt-1 glow-purple">
                    <span className="font-game text-lg font-black text-white">{top3[0]?.total_score?.toLocaleString()}</span>
                    <span className="text-[9px] text-white/70">pts</span>
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center flex-1">
                  <div className="relative mb-1">
                    <PlayerAvatar userRecord={userMap[top3[2]?.user_id]} />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-700 border-2 border-background flex items-center justify-center">
                      <span className="text-[9px] font-black text-white">3</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-foreground text-center truncate w-full px-1 mt-1.5">
                    {userMap[top3[2]?.user_id]?.full_name?.split(' ')[0] || 'Player 3'}
                  </p>
                  <div className="w-full h-12 bg-amber-100 border border-amber-200 rounded-t-xl flex flex-col items-center justify-center mt-1">
                    <span className="font-game text-sm font-black text-amber-700">{top3[2]?.total_score?.toLocaleString()}</span>
                    <span className="text-[9px] text-amber-600">pts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My rank pinned */}
          {currentUser && myPosition > 3 && myEntry && (
            <div className="mx-4 my-2 bg-primary/5 rounded-2xl p-3 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RankBadge rank={myPosition} />
                <PlayerAvatar userRecord={userMap[currentUser.id] || currentUser} />
                <div>
                  <p className="text-sm font-bold text-foreground">You</p>
                  <p className="text-xs text-muted-foreground">{myEntry?.correct_answers || 0} correct</p>
                </div>
              </div>
              <span className="font-game text-primary font-bold">{myScore || myEntry?.total_score || 0} pts</span>
            </div>
          )}

          {/* Rest list */}
          <div className="px-4 space-y-2 pt-2">
            {rest.map((e, i) => {
              const rank = i + 4;
              const user = userMap[e.user_id];
              const isMe = e.user_id === currentUser?.id;
              return (
                <div key={e.id}
                  className={`bg-card rounded-xl p-3 border flex items-center gap-3 ${isMe ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                  <RankBadge rank={rank} />
                  <PlayerAvatar userRecord={user} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {user?.full_name || user?.username || `Player ${rank}`}
                      </p>
                      {isMe && <span className="text-[10px] text-primary font-bold">• You</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Zap size={9} className="text-gold" />
                      <span className="text-xs text-muted-foreground">{e.correct_answers || 0} correct</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-game text-foreground font-bold text-sm">{e.total_score?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-muted-foreground">pts</p>
                  </div>
                </div>
              );
            })}
          </div>

          {activeTab === 'LIVE' && lastUpdated && (
            <p className="text-center text-xs text-muted-foreground/50 mt-3 pb-2">
              Updates every 4s · {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </>
      )}
      </PullToRefresh>
      <BottomNav />
    </div>
  );
}
