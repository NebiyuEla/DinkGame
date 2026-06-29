import React, { useEffect, useState } from 'react';
import { Medal, Trophy, Timer } from 'lucide-react';
import RankBadge from '@/components/RankBadge';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import PullToRefresh from '@/components/PullToRefresh';

const TABS = ['THIS WEEK', 'THIS MONTH', 'ALL TIME'];
const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function PlayerAvatar({ user }) {
  const initial = user?.telegram_username?.[0] || user?.username?.[0] || user?.full_name?.[0] || 'D';
  return (
    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
      {user?.photo_url
        ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
        : <span className="font-bold text-gold text-sm uppercase">{initial}</span>}
    </div>
  );
}

export default function Leaderboard() {
  const [activeTab, setActiveTab] = useState('WEEKLY');
  const [entries, setEntries] = useState([]);
  const [userMap, setUserMap] = useState({});
  const [winningsMap, setWinningsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { currentUser } = useGame();

  useEffect(() => { loadLeaderboard(true); }, [activeTab]);

  const loadLeaderboard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [players, users, transactions] = await Promise.all([
        appClient.entities.GamePlayer.filter({}, '-created_date', 1000),
        appClient.entities.User.list(),
        appClient.entities.WalletTransaction.filter({ source: 'game_prize' }, '-created_date', 1000).catch(() => []),
      ]);
      const weekStart = getWeekStart();
      const monthStart = getMonthStart();
      const inRange = (dateValue) => {
        if (activeTab === 'ALL TIME') return true;
        const date = new Date(dateValue);
        if (activeTab === 'THIS MONTH') return date >= monthStart;
        return date >= weekStart;
      };
      const map = {};
      users.forEach(user => { map[user.id] = user; });
      const won = {};
      transactions
        .filter(tx => inRange(tx.created_date))
        .forEach(tx => {
          won[tx.user_id] = Number(won[tx.user_id] || 0) + Number(tx.amount || 0);
        });
      const aggregated = {};
      players
        .filter(player => !player.is_disqualified)
        .filter(player => inRange(player.joined_at || player.created_date))
        .forEach(player => {
          const key = player.user_id;
          if (!key) return;
          if (!aggregated[key]) {
            aggregated[key] = {
              id: key,
              user_id: key,
              total_score: 0,
              correct_answers: 0,
              total_response_time_ms: 0,
              games_played: 0,
            };
          }
          aggregated[key].total_score += Number(player.total_score || 0);
          aggregated[key].correct_answers += Number(player.correct_answers || 0);
          aggregated[key].total_response_time_ms += Number(player.total_response_time_ms || 0);
          aggregated[key].games_played += 1;
        });
      Object.entries(won).forEach(([userId, amount]) => {
        if (!aggregated[userId]) aggregated[userId] = { id: userId, user_id: userId, total_score: 0, correct_answers: 0, total_response_time_ms: 0, games_played: 0 };
        aggregated[userId].wallet_won = amount;
      });
      const sorted = Object.values(aggregated)
        .map(entry => ({ ...entry, wallet_won: Number(won[entry.user_id] || entry.wallet_won || 0) }))
        .filter(entry => entry.wallet_won > 0 || entry.total_score > 0)
        .sort((a, b) => Number(b.wallet_won || 0) - Number(a.wallet_won || 0) || Number(b.total_score || 0) - Number(a.total_score || 0) || Number(a.total_response_time_ms || 0) - Number(b.total_response_time_ms || 0))
        .slice(0, 30);
      setEntries(sorted);
      setUserMap(map);
      setWinningsMap(won);
    } catch {
      setEntries([]);
    }
    if (showLoading) setLoading(false);
  };

  const myPosition = entries.findIndex(entry => entry.user_id === currentUser?.id) + 1;
  const myEntry = entries.find(entry => entry.user_id === currentUser?.id);
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const displayName = (user, rank) => {
    if (user?.telegram_username) return `@${user.telegram_username}`;
    if (user?.username) return user.username.startsWith('@') ? user.username : `@${user.username}`;
    if (user?.full_name) return user.full_name;
    return `Dink user ${rank}`;
  };

  return (
    <div className="min-h-screen player-page pb-24 flex flex-col text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-5 pb-3 border-b border-white/10 bg-navy-dark/75 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
              <Trophy size={20} className="text-gold" />
              Ranks
            </h1>
            <p className="text-xs text-white/60 mt-0.5">Ranked by ETB won</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center">
            <Medal size={18} className="text-gold" />
          </div>
        </div>
      </header>

      <div className="px-4 py-3 border-b border-white/10 bg-navy-dark/40 backdrop-blur">
        <div className="bg-white/[0.08] rounded-2xl p-1 flex gap-1 border border-white/10">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-xl font-black text-xs transition-all duration-200 ${
                activeTab === tab ? 'gold-action' : 'text-white/60'
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
            <Trophy size={44} className="text-white/20 mb-3" />
            <p className="text-white/70 font-semibold">No ranks yet</p>
            <p className="text-white/[0.45] text-sm mt-1">Rankings appear when a game ends.</p>
          </div>
        ) : (
          <>
            {top3.length > 0 && (
              <div className="px-4 pt-4 space-y-2">
                {top3.map((entry, index) => {
                  const user = userMap[entry.user_id];
                  const isMe = entry.user_id === currentUser?.id;
                  return (
                    <div key={entry.id} className={`rounded-2xl p-4 border flex items-center gap-3 liquid-glass ${index === 0 ? 'border-gold/45' : 'border-white/10'} ${isMe ? 'ring-1 ring-gold/40' : ''}`}>
                      <RankBadge rank={index + 1} />
                      <PlayerAvatar user={user} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm truncate">{displayName(user, index + 1)}</p>
                        <p className="text-xs text-white/[0.55]">{entry.correct_answers || 0} correct - {entry.games_played || 0} games</p>
                      </div>
                      <p className="font-game text-gold font-black">{fmt(entry.wallet_won || winningsMap[entry.user_id])}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {currentUser && myPosition > 3 && myEntry && (
              <div className="mx-4 my-3 liquid-glass rounded-2xl p-3 border border-gold/25 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RankBadge rank={myPosition} />
                  <PlayerAvatar user={userMap[currentUser.id] || currentUser} />
                  <div>
                    <p className="text-sm font-bold text-white">You</p>
                    <p className="text-xs text-white/[0.55]">{myEntry.correct_answers || 0} correct - {fmt(myEntry.wallet_won || winningsMap[myEntry.user_id])} won</p>
                  </div>
                </div>
                <span className="font-game text-gold font-bold">{fmt(myEntry.wallet_won || winningsMap[myEntry.user_id])}</span>
              </div>
            )}

            <div className="px-4 space-y-2 pt-3">
              {rest.map((entry, index) => {
                const rank = index + 4;
                const user = userMap[entry.user_id];
                const isMe = entry.user_id === currentUser?.id;
                return (
                  <div key={entry.id}
                    className={`liquid-glass rounded-xl p-3 border flex items-center gap-3 ${isMe ? 'border-gold/35' : 'border-white/10'}`}>
                    <RankBadge rank={rank} />
                    <PlayerAvatar user={user} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{displayName(user, rank)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Timer size={9} className="text-gold" />
                        <span className="text-xs text-white/[0.55]">{entry.correct_answers || 0} correct - {entry.games_played || 0} games</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-game text-gold font-bold text-sm">{fmt(entry.wallet_won || winningsMap[entry.user_id])}</p>
                      <p className="text-[10px] text-white/[0.45]">won</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </PullToRefresh>

    </div>
  );
}
