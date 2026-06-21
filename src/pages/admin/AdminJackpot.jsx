import React, { useState, useEffect } from 'react';
import { Trophy, Plus, Minus, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

export default function AdminJackpot() {
  const [jackpot, setJackpot] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAmount, setNewAmount] = useState('');
  const [label, setLabel] = useState('Weekly Jackpot');
  const [saving, setSaving] = useState('');

  useEffect(() => { loadJackpot(); }, []);

  const loadJackpot = async () => {
    setLoading(true);
    try {
      const active = await appClient.entities.Jackpot.filter({ is_active: true }, '-created_date', 1);
      if (active.length > 0) { setJackpot(active[0]); setLabel(active[0].label || 'Weekly Jackpot'); }
      const all = await appClient.entities.Jackpot.list('-created_date', 10);
      setHistory(all);
    } catch (e) {}
    setLoading(false);
  };

  const createJackpot = async () => {
    if (!newAmount) return;
    setSaving('create');
    try {
      if (jackpot) await appClient.entities.Jackpot.update(jackpot.id, { is_active: false });
      await appClient.entities.Jackpot.create({ amount: Number(newAmount), label, is_active: true });
      setNewAmount('');
      await loadJackpot();
    } catch (e) {}
    setSaving('');
  };

  const adjustAmount = async (delta) => {
    if (!jackpot) return;
    const newAmt = Math.max(0, jackpot.amount + delta);
    setSaving('adjust');
    await appClient.entities.Jackpot.update(jackpot.id, { amount: newAmt });
    await loadJackpot();
    setSaving('');
  };

  const resetJackpot = async () => {
    if (!jackpot || !confirm('Reset jackpot to 0?')) return;
    setSaving('reset');
    await appClient.entities.Jackpot.update(jackpot.id, { amount: 0 });
    await loadJackpot();
    setSaving('');
  };

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
            <Trophy size={20} className="text-gold" /> Jackpot Settings
          </h1>
          <p className="text-muted-foreground text-sm">Manage the weekly jackpot prize</p>
        </div>

        {/* Active jackpot */}
        {jackpot ? (
          <div className="relative overflow-hidden rounded-2xl p-[1px]">
            <div className="absolute inset-0 gradient-gold opacity-50 rounded-2xl" />
            <div className="relative bg-navy-dark/95 rounded-2xl p-5">
              <p className="text-xs font-bold text-gold tracking-widest mb-1">{jackpot.label || 'WEEKLY JACKPOT'}</p>
              <p className="font-game text-4xl font-black text-gold mb-4">{fmt(jackpot.amount)}</p>
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => adjustAmount(-1000)} disabled={!!saving}
                  className="flex items-center justify-center gap-1 bg-wrong-red/20 text-wrong-red font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  <Minus size={14} /> 1K
                </button>
                <button onClick={resetJackpot} disabled={!!saving}
                  className="flex items-center justify-center gap-1 bg-navy-light text-muted-foreground font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  <RefreshCw size={14} /> Reset
                </button>
                <button onClick={() => adjustAmount(1000)} disabled={!!saving}
                  className="flex items-center justify-center gap-1 bg-correct-green/20 text-correct-green font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
                  <Plus size={14} /> 1K
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={() => adjustAmount(-5000)} disabled={!!saving}
                  className="bg-wrong-red/10 text-wrong-red font-bold py-2 rounded-xl text-xs disabled:opacity-50">- 5K</button>
                <button onClick={() => adjustAmount(5000)} disabled={!!saving}
                  className="bg-correct-green/10 text-correct-green font-bold py-2 rounded-xl text-xs disabled:opacity-50">+ 5K</button>
              </div>
            </div>
          </div>
        ) : !loading && (
          <div className="glass-card rounded-2xl p-6 border border-border/50 text-center">
            <p className="text-muted-foreground mb-3">No active jackpot</p>
          </div>
        )}

        {/* Create new */}
        <div className="glass-card rounded-2xl p-5 border border-neon-purple/20">
          <p className="font-bold text-white text-sm mb-3">{jackpot ? 'Replace Jackpot' : 'Create New Jackpot'}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">LABEL</label>
              <input value={label} onChange={e => setLabel(e.target.value)}
                className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple" />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">AMOUNT (ETB)</label>
              <input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="50000"
                className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple" />
            </div>
            <button onClick={createJackpot} disabled={!!saving || !newAmount}
              className="w-full gradient-gold text-navy-dark font-black py-3 rounded-xl font-bold disabled:opacity-50">
              {saving === 'create' ? 'Creating...' : jackpot ? '🔄 Replace Jackpot' : '✨ Create Jackpot'}
            </button>
          </div>
        </div>

        {/* History */}
        <div>
          <p className="font-bold text-white text-sm mb-3">Jackpot History</p>
          <div className="space-y-2">
            {history.map(j => (
              <div key={j.id} className="glass-card rounded-xl p-3 border border-border/50 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{j.label || 'Jackpot'}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.winner_user_id ? '🏆 Won' : j.is_active ? '🟢 Active' : '⚫ Inactive'}
                    {j.won_at && ` · ${new Date(j.won_at).toLocaleDateString()}`}
                  </p>
                </div>
                <p className="font-game text-gold font-bold">{fmt(j.amount)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}