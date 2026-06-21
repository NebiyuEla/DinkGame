import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Landmark, LogOut, ShieldCheck, Trash2, Trophy, Wallet } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

function DeleteAccountDialog({ onClose, onConfirm, loading }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 bg-card rounded-3xl p-6 border border-border shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-wrong-red/10 border border-wrong-red/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-wrong-red" />
        </div>
        <h3 className="font-game text-lg font-black text-foreground text-center mb-2">Delete Account?</h3>
        <p className="text-sm text-muted-foreground text-center mb-4 leading-relaxed">
          This will flag your account as removed and stop game access. Game records already used for payouts stay in the audit log.
        </p>
        <div className="space-y-2">
          <button onClick={onConfirm} disabled={loading}
            className="w-full bg-wrong-red text-white font-game font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60 active:scale-95 transition-transform">
            {loading ? 'Deleting...' : 'Delete My Account'}
          </button>
          <button onClick={onClose}
            className="w-full bg-muted text-foreground font-semibold py-3.5 rounded-2xl text-sm active:scale-95 transition-transform">
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

export default function Profile() {
  const { currentUser, setCurrentUser } = useGame();
  const [transactions, setTransactions] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    appClient.entities.WalletTransaction.filter({ user_id: currentUser.id }, '-created_date', 5)
      .then(setTransactions)
      .catch(() => setTransactions([]));
  }, [currentUser?.id]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await appClient.entities.User.update(currentUser.id, { is_banned: true, ban_reason: 'User requested account deletion' });
      await appClient.auth.logout('/');
    } catch {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const refreshUser = async () => {
    const user = await appClient.auth.me();
    setCurrentUser(user);
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="min-h-screen bg-background pb-24" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="px-4 pt-5 pb-4 bg-card border-b border-border">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentUser?.photo_url
              ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="" />
              : <span className="font-game text-2xl font-black text-primary">{(currentUser?.full_name || 'U')[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-foreground text-lg truncate">{currentUser?.full_name || 'Player'}</p>
            <p className="text-muted-foreground text-sm truncate">{currentUser?.telegram_username ? `@${currentUser.telegram_username}` : currentUser?.username || 'Telegram player'}</p>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-correct-green/10 border border-correct-green/20 px-2.5 py-1 text-[10px] font-black text-correct-green">
              <ShieldCheck size={11} />
              Telegram linked
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-3">
        <section className="rounded-[1.6rem] bg-primary text-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-white/70 tracking-widest">WALLET BALANCE</p>
              <p className="font-game text-3xl font-black mt-1">{fmt(currentUser?.wallet_balance)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center">
              <Wallet size={22} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Link to="/deposit" className="rounded-2xl bg-white text-primary py-3 text-center text-sm font-black active:scale-[0.98] transition-transform">
              Deposit
            </Link>
            <Link to="/deposit?mode=withdraw" className="rounded-2xl bg-white/12 border border-white/25 py-3 text-center text-sm font-black active:scale-[0.98] transition-transform">
              Withdraw
            </Link>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Winnings', value: fmt(currentUser?.total_winnings), icon: Trophy },
            { label: 'Games', value: currentUser?.games_played || 0, icon: ShieldCheck },
            { label: 'Best Rank', value: currentUser?.best_rank ? `#${currentUser.best_rank}` : '-', icon: Landmark },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card rounded-2xl p-3 border border-border text-center">
              <Icon size={16} className="text-primary mx-auto mb-1" />
              <p className="font-game font-black text-base text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        <section className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-primary" />
              <span className="font-semibold text-foreground text-sm">Recent Wallet Activity</span>
            </div>
            <button onClick={refreshUser} className="text-xs text-primary font-black">Refresh</button>
          </div>
          {transactions.length === 0 ? (
            <div className="px-4 py-5 text-sm text-muted-foreground text-center">No wallet activity yet</div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map(tx => (
                <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{tx.note || tx.source?.replaceAll('_', ' ') || 'Wallet transaction'}</p>
                    <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleDateString()}</p>
                  </div>
                  <p className={`font-game font-black text-sm ${tx.type === 'debit' ? 'text-wrong-red' : 'text-correct-green'}`}>
                    {tx.type === 'debit' ? '-' : '+'}{fmt(tx.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          <Link to="/leaderboard" className="flex items-center justify-between p-4 active:bg-muted/50">
            <div className="flex items-center gap-3">
              <Trophy size={15} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Ranks</span>
            </div>
            <ChevronRight size={15} className="text-muted-foreground" />
          </Link>
          <Link to="/winners" className="flex items-center justify-between p-4 active:bg-muted/50">
            <div className="flex items-center gap-3">
              <ShieldCheck size={15} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Winners</span>
            </div>
            <ChevronRight size={15} className="text-muted-foreground" />
          </Link>
        </div>

        <button onClick={() => appClient.auth.logout('/')}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <LogOut size={15} className="text-wrong-red" />
          <span className="font-semibold text-wrong-red text-sm">Sign Out</span>
        </button>

        <button onClick={() => setShowDeleteDialog(true)}
          className="w-full bg-card rounded-2xl p-4 border border-wrong-red/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Trash2 size={15} className="text-wrong-red/60" />
          <span className="font-semibold text-wrong-red/60 text-sm">Delete Account</span>
        </button>
      </main>

      <BottomNav />

      {showDeleteDialog && (
        <DeleteAccountDialog
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteAccount}
          loading={deleting}
        />
      )}
    </div>
  );
}
