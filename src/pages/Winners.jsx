import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Medal, Trophy, WalletCards } from 'lucide-react';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

function WinnerAvatar({ user }) {
  const initial = user?.telegram_username?.[0] || user?.full_name?.[0] || user?.username?.[0] || 'D';
  return (
    <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden">
      {user?.photo_url
        ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
        : <span className="text-sm font-black text-gold uppercase">{initial}</span>}
    </div>
  );
}

const displayName = (user, fallback) => {
  if (user?.telegram_username) return `@${user.telegram_username}`;
  if (user?.username) return user.username.startsWith('@') ? user.username : `@${user.username}`;
  return user?.full_name || fallback || 'Dink user';
};

export default function Winners() {
  const { search } = useLocation();
  const { currentUser } = useGame();
  const [players, setPlayers] = useState([]);
  const [game, setGame] = useState(null);
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);
  const gameId = useMemo(() => new URLSearchParams(search).get('game'), [search]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [allUsers, games] = await Promise.all([
          appClient.entities.User.list(),
          gameId ? appClient.entities.Game.filter({ id: gameId }, '-created_date', 1) : Promise.resolve([]),
        ]);
        const rows = gameId
          ? await appClient.entities.GamePlayer.filter({ game_id: gameId }, '-wallet_credit', 200)
          : await appClient.entities.GamePlayer.filter({ status: 'winner' }, '-updated_date', 200);

        const winners = rows
          .filter(player => !player.is_disqualified && !player.is_eliminated && Number(player.wallet_credit || player.prize_share || 0) > 0)
          .sort((a, b) => Number(b.wallet_credit || b.prize_share || 0) - Number(a.wallet_credit || a.prize_share || 0));

        const map = {};
        allUsers.forEach(user => { map[user.id] = user; });
        if (mounted) {
          setUserMap(map);
          setPlayers(winners);
          setGame(games[0] || null);
        }
      } catch {
        if (mounted) setPlayers([]);
      }
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, [gameId]);

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);
  const myWin = players.find(player => player.user_id === currentUser?.id);
  const totalPaid = players.reduce((sum, player) => sum + Number(player.wallet_credit || player.prize_share || 0), 0);

  return (
    <div className="min-h-screen player-page pb-24 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-4 pb-3 bg-navy-dark/75 border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
              <Trophy size={19} className="text-gold" />
              Winners
            </h1>
            <p className="text-xs text-white/60 mt-0.5">{game?.title || 'Wallet payouts after games end'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Medal size={18} className="text-gold" />
          </div>
        </div>
      </header>

      {myWin && (
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-[1.7rem] liquid-glass border border-gold/35 p-5 text-center animate-bounce-in">
            <WalletCards size={24} className="mx-auto text-gold mb-2" />
            <p className="text-sm font-black text-white">{displayName(currentUser)}</p>
            <p className="text-lg font-black text-white mt-1">Your winnings are ready</p>
            <div className="mx-auto my-5 max-w-[14rem] rounded-[1.5rem] bg-white/10 border border-white/10 p-5 text-white shadow-xl">
              <p className="text-[10px] font-black tracking-widest text-white/60">WALLET CREDIT</p>
              <p className="font-game text-4xl font-black mt-1 text-gold">{fmt(myWin.wallet_credit || myWin.prize_share)}</p>
            </div>
            <p className="text-xs text-white/60">The amount has been added to your wallet. Telebirr withdrawal starts from 100 ETB.</p>
          </div>
        </section>
      )}

      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="liquid-glass rounded-2xl p-4">
            <p className="text-[10px] font-black text-white/50 tracking-widest">GAME FINISHED</p>
            <p className="font-game text-xl font-black text-white mt-1">{game?.title || 'Latest game'}</p>
          </div>
          <div className="liquid-glass rounded-2xl p-4">
            <p className="text-[10px] font-black text-white/50 tracking-widest">TOTAL WINNERS</p>
            <p className="font-game text-2xl font-black text-white mt-1">{players.length}</p>
          </div>
          <div className="liquid-glass rounded-2xl p-4">
            <p className="text-[10px] font-black text-white/50 tracking-widest">PRIZE POOL</p>
            <p className="font-game text-2xl font-black text-gold mt-1">{fmt(game?.prize_amount || totalPaid)}</p>
          </div>
          <div className="liquid-glass rounded-2xl p-4">
            <p className="text-[10px] font-black text-white/50 tracking-widest">YOUR WINNINGS</p>
            <p className="font-game text-2xl font-black text-gold mt-1">{fmt(myWin?.wallet_credit || myWin?.prize_share || 0)}</p>
          </div>
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : players.length === 0 ? (
          <div className="liquid-glass rounded-2xl p-8 text-center">
            <Trophy size={42} className="text-white/25 mx-auto mb-3" />
            <p className="font-bold text-white">No winners yet</p>
            <p className="text-sm text-white/[0.55] mt-1">Winners appear after the game ends.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {players.map((player, index) => {
              const user = userMap[player.user_id];
              const isMe = player.user_id === currentUser?.id;
              return (
                <div key={player.id} className={`liquid-glass rounded-2xl p-4 border flex items-center gap-3 ${isMe ? 'border-gold/35' : 'border-white/10'}`}>
                  <div className="w-8 h-8 rounded-full bg-gold/15 text-gold flex items-center justify-center font-black text-sm">{index + 1}</div>
                  <WinnerAvatar user={user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{displayName(user, player.username || `Dink user ${index + 1}`)}</p>
                    <p className="text-xs text-white/[0.55]">Winner share</p>
                  </div>
                  <div className="text-right">
                    <p className="font-game text-gold font-black text-sm">{fmt(player.wallet_credit || player.prize_share)}</p>
                    <p className="text-[10px] text-white/[0.45] flex items-center gap-1 justify-end">
                      <img src="/brand/etb-coin-small.webp" alt="" className="w-3 h-3 object-contain" loading="lazy" decoding="async" />
                      wallet
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
