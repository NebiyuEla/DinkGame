import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, Users } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import BrandMascot from '@/components/BrandMascot';

const WAITING_LINES = [
  'Waiting for the game to start',
  'Keep your network stable',
  'Stay in the mini app when the game goes live',
];

const isActivePlayer = (player) => (
  !player.is_disqualified &&
  !player.is_eliminated &&
  !player.game_banned &&
  ['lobby', 'playing'].includes(player.status || 'lobby')
);

const displayName = (user) => {
  if (user?.telegram_username) return `@${user.telegram_username}`;
  if (user?.username) return user.username.startsWith('@') ? user.username : `@${user.username}`;
  return user?.full_name || 'Dink user';
};

const uniqueActivePlayers = (players) => {
  const seen = new Set();
  return players.filter((player) => {
    if (!isActivePlayer(player)) return false;
    const key = player.user_id || player.username || player.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export default function Lobby() {
  const navigate = useNavigate();
  const { currentGame, currentUser, gameStatus, setGameStatus, loadActiveGame } = useGame();
  const [playerCount, setPlayerCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState('');
  const [noticeIndex, setNoticeIndex] = useState(0);
  const pollRef = useRef(null);
  const chatEndRef = useRef(null);

  const activeNotice = useMemo(() => WAITING_LINES[noticeIndex % WAITING_LINES.length], [noticeIndex]);

  const loadLobby = async () => {
    if (!currentGame?.id) return;
    const [gameRows, players, chats] = await Promise.all([
      appClient.entities.Game.filter({ id: currentGame.id }, '-created_date', 1),
      appClient.entities.GamePlayer.filter({ game_id: currentGame.id }, '-created_date', 500),
      appClient.entities.ChatMessage.filter({ game_id: currentGame.id }, 'created_date', 80),
    ]);

    const game = gameRows[0] || currentGame;
    if (game.status === 'live') {
      setGameStatus('live');
      navigate('/game');
      return;
    }
    if (game.status === 'ended') {
      navigate('/winners');
      return;
    }

    const active = uniqueActivePlayers(players).length;
    setPlayerCount(active);
    setMessages(chats);
    if (active !== game.total_players) {
      await appClient.entities.Game.update(currentGame.id, { total_players: active });
    }
  };

  useEffect(() => {
    if (!currentGame) { loadActiveGame(); return undefined; }
    if (gameStatus === 'live') { navigate('/game'); return undefined; }

    const join = async () => {
      if (!currentUser?.id) return;
      const bans = await appClient.entities.GameBan.filter({ game_id: currentGame.id, user_id: currentUser.id, is_active: true }, '-created_date', 1).catch(() => []);
      if (bans.length > 0) {
        navigate('/');
        return;
      }
      const existing = await appClient.entities.GamePlayer.filter({ game_id: currentGame.id, user_id: currentUser.id }, '-created_date', 20);
      const [primary, ...duplicates] = existing;
      await Promise.all(duplicates.map(row => appClient.entities.GamePlayer.update(row.id, {
        status: 'disconnected',
        is_eliminated: true,
        disqualify_reason: 'Duplicate session closed',
      })));
      if (existing.length === 0) {
        await appClient.entities.GamePlayer.create({
          game_id: currentGame.id,
          user_id: currentUser.id,
          username: displayName(currentUser),
          joined_at: new Date().toISOString(),
          status: 'lobby',
        });
      } else {
        await appClient.entities.GamePlayer.update(primary.id, {
          username: displayName(currentUser),
          status: 'lobby',
          last_seen: new Date().toISOString(),
        });
      }
      await loadLobby();
    };

    join();
    pollRef.current = setInterval(loadLobby, 2000);
    const noticeTimer = setInterval(() => setNoticeIndex(i => i + 1), 2800);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(noticeTimer);
    };
  }, [currentGame?.id, currentUser?.id, gameStatus]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = chatText.trim();
    if (!text || !currentGame?.id || !currentUser?.id) return;
    setChatText('');
    await appClient.entities.ChatMessage.create({
      game_id: currentGame.id,
      user_id: currentUser.id,
      username: displayName(currentUser),
      message: text.slice(0, 120),
    });
    await loadLobby();
  };

  return (
    <div className="min-h-screen player-page text-white overflow-hidden flex flex-col">
      <div className="px-4 pt-4 pb-2 flex items-center justify-end relative z-10">
        <div className="flex items-center gap-2 rounded-full bg-white/10 border border-white/[0.12] px-3 py-2 backdrop-blur">
          <Users size={16} />
          <span className="font-black">{playerCount.toLocaleString()}</span>
        </div>
      </div>

      <section className="relative z-10 px-5 pt-6 text-center flex-shrink-0">
        <div className="liquid-glass rounded-[2rem] p-5">
          <p className="text-xs font-black text-gold tracking-[0.22em]">LIVE LOBBY</p>
          <h1 className="mt-3 text-3xl font-black">Waiting Room</h1>
          <p className="mt-3 text-sm font-semibold text-white/[0.68] min-h-10 flex items-center justify-center">
            {activeNotice}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-left">
            <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3">
              <p className="text-[10px] font-black tracking-widest text-white/50">PLAYERS</p>
              <p className="text-2xl font-black">{playerCount.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-3">
              <p className="text-[10px] font-black tracking-widest text-white/50">PRIZE POOL</p>
              <p className="text-2xl font-black text-gold">
                ETB {Number(currentGame?.prize_amount || 0).toLocaleString('en-ET')}
              </p>
            </div>
          </div>
        </div>
        <BrandMascot className="w-28 h-28 object-contain mx-auto mt-5 opacity-95" small />
      </section>

      <section className="relative z-10 mt-auto px-4 pb-4">
        <div className="rounded-[1.5rem] liquid-glass p-3 h-64 flex flex-col">
          <div className="flex items-center gap-2 mb-2 text-white/[0.85]">
            <MessageCircle size={15} />
            <span className="text-xs font-black tracking-widest">LIVE CHAT</span>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
            {messages.map((msg) => (
              <div key={msg.id} className={`text-sm leading-snug ${msg.is_system ? 'text-gold/85' : 'text-white'}`}>
                <span className="font-black text-white/70">{msg.username || 'Dink user'} </span>
                <span>{msg.message}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={sendMessage} className="mt-3 flex gap-2">
            <input
              value={chatText}
              onChange={event => setChatText(event.target.value)}
              maxLength={120}
              className="min-w-0 flex-1 rounded-full dark-input px-4 py-3 text-sm font-semibold outline-none"
              placeholder="Type message"
            />
            <button className="w-12 h-12 rounded-full gold-action flex items-center justify-center active:scale-95 transition-transform">
              <Send size={18} />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
