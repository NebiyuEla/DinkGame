import React, { useEffect, useState } from 'react';
import { Medal, Trophy, Zap } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import RankBadge from '@/components/RankBadge';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import PullToRefresh from '@/components/PullToRefresh';

const TABS = ['WEEKLY', 'ALL TIME'];

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function PlayerAvatar({ user }) {
  const initial = user?.full_name?.[0] || user?.username?.[0] || 'P';
  return (
    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {user?.photo_url
        ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
        : <span className="font-bold text-primary text-sm uppercase">{initial}</span>}
    </div>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('WEEKLY');
  const [entries, setEntries] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentUser, myScore } = useGame();

  useEffect(() => { loadLeaderboard(true); }, [activeTab]);

  const loadLeaderboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [players, users] = await Promise.all([
        appClient.entities.GamePlayer.filter({}, '-total_score', 150),
        appClient.entities.User.list(),
      ]);
      const weekStart = getWeekStart();
      const sorted = players
        .filter(player => !player.is_disqualified && !player.is_eliminated && Number(player.total_score || 0) > 0)
        .filter(player => activeTab === 'ALL TIME' || new Date(player.joined_at || player.created_date) >= weekStart)
        .sort((a, b) => Number(b.total_score || 0) - Number(a.total_score || 0) || Number(a.total_response_time_ms || 0) - Number(b.total_response_time_ms || 0))
        .slice(0, 30);
      const map = {};
      users.forEach(user => { map[user.id] = user; });
      setEntries(sorted);
      setUserMap(map);
    } catch {
      setEntries([]);
    }
    if (showLoading) setLoading(false);
  };

  const myPosition = entries.findIndex(entry => entry.user_id === currentUser?.id) + 1;
  const myEntry = entries.find(entry => entry.user_id === currentUser?.id);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="min-h-screen bg-background pb-24 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-5 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-foreground flex items-center gap-2">
              <Trophy size={20} className="text-gold" />
              Ranks
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Score history after games finish</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Medal size={18} className="text-primary" />
          </div>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-border bg-card">
        <div className="bg-muted rounded-2xl p-1 flex gap-1">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl font-black text-xs transition-all duration-200 ${
                activeTab === tab ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'
              }`}>
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
            <p className="text-muted-foreground font-semibold">No ranks yet</p>
            <p className="text-muted-foreground/60 text-sm mt-1">Rankings appear when a game ends.</p>
          </div>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="px-4 pt-4 space-y-2">
                {top3.map((entry, index) => {
                  const user = userMap[entry.user_id];
                  const isMe = entry.user_id === currentUser?.id;
                  return (
                    <div key={entry.id} className={`rounded-2xl p-4 border flex items-center gap-3 ${index === 0 ? 'bg-gold/10 border-gold/35' : 'bg-card border-border'} ${isMe ? 'ring-1 ring-primary/30' : ''}`}>
                      <RankBadge rank={index + 1} />
                      <PlayerAvatar user={user} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground text-sm truncate">{user?.full_name || user?.username || `Player ${index + 1}`}</p>
                        <p className="text-xs text-muted-foreground">{entry.correct_answers || 0} correct</p>
                      </div>
                      <p className="font-game text-primary font-black">{Number(entry.total_score || 0).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {currentUser && myPosition > 3 && myEntry && (
              <div className="mx-4 my-3 bg-primary/5 rounded-2xl p-3 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RankBadge rank={myPosition} />
                  <PlayerAvatar user={userMap[currentUser.id] || currentUser} />
                  <div>
                    <p className="text-sm font-bold text-foreground">You</p>
                    <p className="text-xs text-muted-foreground">{myEntry.correct_answers || 0} correct</p>
                  </div>
                </div>
                <span className="font-game text-primary font-bold">{myScore || myEntry.total_score || 0} pts</span>
              </div>
            )}

            <div className="px-4 space-y-2 pt-3">
              {rest.map((entry, index) => {
                const rank = index + 4;
                const user = userMap[entry.user_id];
                const isMe = entry.user_id === currentUser?.id;
                return (
                  <div key={entry.id}
                    className={`bg-card rounded-xl p-3 border flex items-center gap-3 ${isMe ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
                    <RankBadge rank={rank} />
                    <PlayerAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{user?.full_name || user?.username || `Player ${rank}`}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Zap size={9} className="text-gold" />
                        <span className="text-xs text-muted-foreground">{entry.correct_answers || 0} correct</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-game text-foreground font-bold text-sm">{Number(entry.total_score || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PullToRefresh>

      <BottomNav />
    </div>
  );
}
