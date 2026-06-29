import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Megaphone, PlayCircle, RefreshCw, Send, UserPlus, Wallet } from 'lucide-react';
import { appClient } from '@/api/appClient';
import { useGame } from '@/lib/gameContext';

const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);
const todayKey = () => new Date().toISOString().slice(0, 10);

const TASKS = [
  {
    id: 'watch_ad_daily',
    title: 'Watch Ad',
    desc: 'Watch today\'s sponsor clip and receive wallet money.',
    reward: 2,
    icon: PlayCircle,
    repeat: 'daily',
    action: 'Watch',
  },
  {
    id: 'subscribe_youtube',
    title: 'Subscribe YouTube',
    desc: 'Open @DinkGame on YouTube, subscribe, then claim once.',
    reward: 5,
    icon: Megaphone,
    repeat: 'once',
    action: 'Open',
    url: 'https://www.youtube.com/@DinkGame',
  },
  {
    id: 'follow_tiktok',
    title: 'Follow TikTok',
    desc: 'Open @DinkGame on TikTok, follow, then claim once.',
    reward: 5,
    icon: Send,
    repeat: 'once',
    action: 'Open',
    url: 'https://www.tiktok.com/@DinkGame',
  },
  {
    id: 'refer_friend_daily',
    title: 'Refer Friend',
    desc: 'Share Dink Game with a friend and claim today\'s referral reward.',
    reward: 10,
    icon: UserPlus,
    repeat: 'daily',
    action: 'Share',
  },
  {
    id: 'daily_checkin',
    title: 'Daily Check-In',
    desc: 'Open the app and claim a daily wallet reward.',
    reward: 3,
    icon: RefreshCw,
    repeat: 'daily',
    action: 'Claim',
  },
];

function taskSource(task) {
  return task.repeat === 'daily' ? `task_${task.id}_${todayKey()}` : `task_${task.id}`;
}

export default function Tasks() {
  const { currentUser, setCurrentUser } = useGame();
  const [transactions, setTransactions] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!currentUser?.id) return;
    const rows = await appClient.entities.WalletTransaction.filter({ user_id: currentUser.id }, '-created_date', 200).catch(() => []);
    setTransactions(rows);
  };

  useEffect(() => { load(); }, [currentUser?.id]);

  const claimed = useMemo(() => {
    const set = new Set();
    transactions.forEach(tx => {
      if (tx.source?.startsWith('task_') && tx.status === 'posted') set.add(tx.source);
    });
    return set;
  }, [transactions]);

  const totalTaskMoney = transactions
    .filter(tx => tx.source?.startsWith('task_') && tx.type === 'credit')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const openTask = async (task) => {
    if (task.url) window.open(task.url, '_blank', 'noopener,noreferrer');
    if (task.id === 'refer_friend_daily') {
      const shareUrl = 'https://t.me/DinkGame';
      const text = 'Join Dink Game @DinkGame';
      if (navigator.share) await navigator.share({ title: 'Dink Game', text, url: shareUrl }).catch(() => {});
      else await navigator.clipboard?.writeText(`${text} ${shareUrl}`).catch(() => {});
    }
  };

  const claimTask = async (task) => {
    if (!currentUser?.id || busy) return;
    const source = taskSource(task);
    if (claimed.has(source)) {
      setMessage('Already claimed.');
      return;
    }

    setBusy(task.id);
    setMessage('');
    try {
      await openTask(task);
      const reward = Number(task.reward || 0);
      const updated = await appClient.entities.User.update(currentUser.id, {
        wallet_balance: Number(currentUser.wallet_balance || 0) + reward,
        total_task_rewards: Number(currentUser.total_task_rewards || 0) + reward,
      });
      await appClient.entities.WalletTransaction.create({
        user_id: currentUser.id,
        amount: reward,
        type: 'credit',
        status: 'posted',
        source,
        currency: 'ETB',
        note: `${task.title} reward`,
      });
      setCurrentUser(updated);
      setMessage(`${fmt(reward)} added to wallet.`);
      await load();
    } catch (error) {
      setMessage(error.message || 'Could not claim task');
    }
    setBusy('');
  };

  return (
    <div className="min-h-screen player-page pb-32 text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-5 pb-3 bg-navy-dark/75 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-game text-xl font-black text-white">Tasks</h1>
            <p className="text-xs text-white/60 mt-0.5">Complete tasks and receive wallet money</p>
          </div>
          <div className="rounded-full bg-white/10 border border-white/10 text-white px-3 py-2 flex items-center gap-2">
            <Wallet size={15} />
            <span className="text-xs font-black">{fmt(totalTaskMoney)}</span>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-3">
        {message && (
          <div className="liquid-glass rounded-2xl p-3 text-sm font-black text-gold text-center">
            {message}
          </div>
        )}

        {TASKS.map((task) => {
          const Icon = task.icon;
          const done = claimed.has(taskSource(task));
          return (
            <section key={task.id} className="liquid-glass rounded-[1.35rem] p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10 text-gold flex items-center justify-center flex-shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-white text-sm truncate">{task.title}</h2>
                  <span className="rounded-full bg-gold/20 text-gold px-2 py-0.5 text-[10px] font-black">{fmt(task.reward)}</span>
                </div>
                <p className="text-xs text-white/[0.58] mt-1 leading-relaxed">{task.desc}</p>
              </div>
              <button
                onClick={() => claimTask(task)}
                disabled={done || busy === task.id}
                className={`h-10 px-3 rounded-full text-xs font-black flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-55 ${
                  done ? 'bg-white/10 text-white/60 border border-white/10' : 'gold-action'
                }`}
              >
                {task.url && !done && <ExternalLink size={12} />}
                {done ? 'Done' : busy === task.id ? 'Claiming' : task.action}
              </button>
            </section>
          );
        })}
      </main>
    </div>
  );
}
