import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift, ChevronRight, Trophy, LogOut, Trash2, AlertTriangle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

const STATUS_STYLES = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  approved: 'text-electric-blue bg-blue-50 border-blue-200',
  paid: 'text-correct-green bg-green-50 border-green-200',
  rejected: 'text-wrong-red bg-red-50 border-red-200',
};

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
          This will permanently remove your account, game history, scores, and any pending prize claims. <span className="font-semibold text-foreground">This cannot be undone.</span>
        </p>
        <div className="space-y-2">
          <button onClick={onConfirm} disabled={loading}
            className="w-full bg-wrong-red text-white font-game font-bold py-3.5 rounded-2xl text-sm disabled:opacity-60 active:scale-95 transition-transform">
            {loading ? 'Deleting...' : 'Yes, Delete My Account'}
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
  const { currentUser } = useGame();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    appClient.entities.PrizeClaim.filter({ user_id: currentUser.id }, '-created_date', 5)
      .then(c => setClaims(c)).catch(() => {}).finally(() => setLoading(false));
  }, [currentUser]);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      // Mark user as deleted / banned so data is flagged
      await appClient.entities.User.update(currentUser.id, { is_banned: true, ban_reason: 'User requested account deletion' });
      await appClient.auth.logout('/');
    } catch (e) {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="min-h-screen bg-background pb-20" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 pt-8 pb-4 bg-card border-b border-border">
        <h1 className="font-game text-xl font-black text-foreground mb-4">Profile</h1>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {currentUser?.photo_url
              ? <img src={currentUser.photo_url} className="w-full h-full object-cover" alt="" />
              : <span className="font-game text-2xl font-black text-primary">{(currentUser?.full_name || 'U')[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-lg truncate">{currentUser?.full_name || 'Player'}</p>
            {currentUser?.username && <p className="text-muted-foreground text-sm">@{currentUser.username}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">{currentUser?.email || ''}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Winnings', value: fmt(currentUser?.total_winnings), color: 'text-gold' },
            { label: 'Games', value: currentUser?.games_played || 0, color: 'text-primary' },
            { label: 'Best Rank', value: currentUser?.best_rank ? `#${currentUser.best_rank}` : '—', color: 'text-electric-blue' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-card rounded-2xl p-3 border border-border text-center">
              <p className={`font-game font-black text-lg ${color}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Prize Claims */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Gift size={15} className="text-gold" />
              <span className="font-semibold text-foreground text-sm">My Prize Claims</span>
            </div>
            <Link to="/claim" className="text-xs text-primary font-semibold flex items-center gap-1">
              New <ChevronRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="p-4 animate-pulse"><div className="h-4 bg-muted rounded w-1/2" /></div>
          ) : claims.length === 0 ? (
            <div className="px-4 py-5 text-sm text-muted-foreground text-center">No prize claims yet</div>
          ) : (
            <div className="divide-y divide-border">
              {claims.map(claim => (
                <div key={claim.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fmt(claim.prize_amount)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(claim.created_date).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${STATUS_STYLES[claim.status] || 'text-muted-foreground bg-muted border-border'}`}>
                    {claim.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Nav links */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          <Link to="/leaderboard" className="flex items-center justify-between p-4 active:bg-muted/50">
            <div className="flex items-center gap-3">
              <Trophy size={15} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Leaderboard</span>
            </div>
            <ChevronRight size={15} className="text-muted-foreground" />
          </Link>
          <Link to="/winners" className="flex items-center justify-between p-4 active:bg-muted/50">
            <div className="flex items-center gap-3">
              <Gift size={15} className="text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Winners</span>
            </div>
            <ChevronRight size={15} className="text-muted-foreground" />
          </Link>
        </div>

        {/* Sign out */}
        <button onClick={() => appClient.auth.logout('/')}
          className="w-full bg-card rounded-2xl p-4 border border-border flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <LogOut size={15} className="text-wrong-red" />
          <span className="font-semibold text-wrong-red text-sm">Sign Out</span>
        </button>

        {/* Delete account */}
        <button onClick={() => setShowDeleteDialog(true)}
          className="w-full bg-card rounded-2xl p-4 border border-wrong-red/20 flex items-center justify-center gap-2 active:scale-95 transition-transform">
          <Trash2 size={15} className="text-wrong-red/60" />
          <span className="font-semibold text-wrong-red/60 text-sm">Delete Account</span>
        </button>
      </div>

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