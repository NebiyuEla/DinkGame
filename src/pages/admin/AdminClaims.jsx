import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const STATUS_OPTIONS = ['all', 'pending', 'approved', 'paid', 'rejected'];
const STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  approved: 'text-electric-blue bg-electric-blue/10 border-electric-blue/30',
  paid: 'text-correct-green bg-correct-green/10 border-correct-green/30',
  rejected: 'text-wrong-red bg-wrong-red/10 border-wrong-red/30',
};

export default function AdminClaims() {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [updating, setUpdating] = useState('');

  useEffect(() => { loadClaims(); }, [filterStatus]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const query = filterStatus === 'all' ? {} : { status: filterStatus };
      const c = await appClient.entities.PrizeClaim.filter(query, '-created_date', 100);
      setClaims(c);
    } catch (e) {}
    setLoading(false);
  };

  const updateStatus = async (claim, newStatus) => {
    setUpdating(claim.id + newStatus);
    try {
      await appClient.entities.PrizeClaim.update(claim.id, {
        status: newStatus,
        admin_note: adminNote || claim.admin_note,
        reviewed_at: new Date().toISOString(),
      });
      await loadClaims();
      setSelectedClaim(null);
      setAdminNote('');
    } catch (e) { alert('Failed to update'); }
    setUpdating('');
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-game text-xl font-black text-white">Prize Claims</h1>
          <p className="text-muted-foreground text-sm">Review and approve prize claims</p>
        </div>

        {/* Status filter */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`flex-shrink-0 py-2 px-4 rounded-xl font-bold text-xs capitalize transition-all ${
                filterStatus === s ? 'gradient-purple-blue text-white' : 'glass-card text-muted-foreground border border-border/50'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Claims list */}
        <div className="space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="glass-card rounded-2xl p-4 h-24 animate-pulse border border-border/50" />)
          ) : claims.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <p className="text-muted-foreground">No {filterStatus} claims</p>
            </div>
          ) : claims.map(claim => (
            <div key={claim.id} className="glass-card rounded-2xl p-4 border border-border/50">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-bold text-white">{claim.full_name}</p>
                  <p className="text-xs text-muted-foreground">{claim.phone_number} · {claim.payment_method}</p>
                  <p className="text-xs text-muted-foreground">{new Date(claim.created_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-game text-gold font-black text-lg">{fmt(claim.prize_amount)}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${STATUS_COLORS[claim.status] || ''}`}>
                    {claim.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              {claim.note && <p className="text-xs text-muted-foreground mb-3 p-2 bg-navy-light rounded-lg">{claim.note}</p>}
              {claim.admin_note && <p className="text-xs text-neon-purple mb-3 p-2 bg-neon-purple/5 rounded-lg">Admin: {claim.admin_note}</p>}

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {claim.status !== 'approved' && (
                  <button onClick={() => { setSelectedClaim(claim); setAdminNote(''); }}
                    className="flex items-center gap-1 bg-electric-blue/20 text-electric-blue font-bold px-3 py-1.5 rounded-lg text-xs">
                    <CheckCircle size={12} /> Approve
                  </button>
                )}
                {claim.status !== 'paid' && (
                  <button onClick={() => updateStatus(claim, 'paid')} disabled={!!updating}
                    className="flex items-center gap-1 bg-correct-green/20 text-correct-green font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50">
                    <DollarSign size={12} /> Mark Paid
                  </button>
                )}
                {claim.status !== 'rejected' && (
                  <button onClick={() => updateStatus(claim, 'rejected')} disabled={!!updating}
                    className="flex items-center gap-1 bg-wrong-red/20 text-wrong-red font-bold px-3 py-1.5 rounded-lg text-xs disabled:opacity-50">
                    <XCircle size={12} /> Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Approve modal */}
        {selectedClaim && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl border border-neon-purple/30 w-full max-w-sm p-5">
              <h2 className="font-bold text-white mb-1">Approve Claim</h2>
              <p className="text-sm text-muted-foreground mb-4">{selectedClaim.full_name} — {fmt(selectedClaim.prize_amount)}</p>
              <div className="mb-4">
                <label className="text-xs font-bold text-muted-foreground mb-1.5 block">ADMIN NOTE (OPTIONAL)</label>
                <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                  placeholder="Payment note..."
                  className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none resize-none" rows={3} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelectedClaim(null)} className="flex-1 bg-navy-light text-muted-foreground font-bold py-3 rounded-xl text-sm">Cancel</button>
                <button onClick={() => updateStatus(selectedClaim, 'approved')} disabled={!!updating}
                  className="flex-1 gradient-purple-blue text-white font-bold py-3 rounded-xl text-sm disabled:opacity-50">
                  {updating ? 'Approving...' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}