import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Medal, Sparkles, Trophy } from 'lucide-react';
import Confetti from '@/components/Confetti';
import { LeaderboardSkeleton } from '@/components/LoadingSkeleton';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

const CONGRATS_TEXT = '\u12a5\u1295\u12b3\u1295 \u12f0\u1235 \u12a0\u1208\u12ce\u1275';

function WinnerAvatar({ user }) {
  const initial = user?.full_name?.[0] || user?.username?.[0] || 'P';
  return (
    <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center overflow-hidden">
      {user?.photo_url
        ? <img src={user.photo_url} className="w-full h-full object-cover" alt="" />
        : <span className="text-sm font-black text-primary uppercase">{initial}</span>}
    </div>
  );
}

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
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <Confetti active={Boolean(myWin)} />

      <header className="px-4 pt-4 pb-3 bg-card border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-foreground flex items-center gap-2">
              <Trophy size={19} className="text-gold" />
              Winners
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">{game?.title || 'Wallet payouts after games end'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
            <Medal size={18} className="text-gold" />
          </div>
        </div>
      </header>

      {myWin && (
        <section className="px-4 pt-4">
          <div className="relative overflow-hidden rounded-[1.7rem] bg-card border border-gold/35 p-5 text-center animate-bounce-in">
            <div className="absolute -left-8 top-5 w-20 h-20 rounded-full border-4 border-gold/20" />
            <div className="absolute right-4 bottom-4 w-3 h-3 rounded-full bg-gold" />
            <Sparkles size={22} className="mx-auto text-gold mb-2" />
            <p className="text-sm font-black text-foreground">{currentUser?.full_name || 'Player'}</p>
            <p className="font-amharic text-lg font-black text-foreground mt-1">{CONGRATS_TEXT}</p>
            <div className="mx-auto my-5 max-w-[14rem] rounded-[1.5rem] bg-primary p-5 text-white shadow-xl">
              <p className="text-[10px] font-black tracking-widest text-white/60">WALLET CREDIT</p>
              <p className="font-game text-4xl font-black mt-1">{fmt(myWin.wallet_credit || myWin.prize_share)}</p>
            </div>
            <p className="text-xs text-muted-foreground">The amount has been added to your wallet. Telebirr withdrawal starts from 100 ETB.</p>
          </div>
        </section>
      )}

      <section className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-card rounded-2xl p-4 border border-border">
            <p className="text-[10px] font-black text-muted-foreground tracking-widest">WINNERS</p>
            <p className="font-game text-2xl font-black text-foreground mt-1">{players.length}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <p className="text-[10px] font-black text-muted-foreground tracking-widest">PAID OUT</p>
            <p className="font-game text-2xl font-black text-primary mt-1">{fmt(totalPaid)}</p>
          </div>
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : players.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <Trophy size={42} className="text-muted-foreground/25 mx-auto mb-3" />
            <p className="font-bold text-foreground">No winners yet</p>
            <p className="text-sm text-muted-foreground mt-1">Winners appear after the game ends.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {players.map((player, index) => {
              const user = userMap[player.user_id];
              const isMe = player.user_id === currentUser?.id;
              return (
                <div key={player.id} className={`bg-card rounded-2xl p-4 border flex items-center gap-3 ${isMe ? 'border-primary/35 bg-primary/5' : 'border-border'}`}>
                  <div className="w-8 h-8 rounded-full bg-gold/15 text-gold flex items-center justify-center font-black text-sm">{index + 1}</div>
                  <WinnerAvatar user={user} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-foreground truncate">{user?.full_name || player.username || `Player ${index + 1}`}</p>
                    <p className="text-xs text-muted-foreground">{player.total_score || 0} pts</p>
                  </div>
                  <div className="text-right">
                    <p className="font-game text-primary font-black text-sm">{fmt(player.wallet_credit || player.prize_share)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
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
