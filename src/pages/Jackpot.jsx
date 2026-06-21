import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, History } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { appClient } from '@/api/appClient';

export default function Jackpot() {
  const [jackpot, setJackpot] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const active = await appClient.entities.Jackpot.filter({ is_active: true }, '-created_date', 1);
        if (active.length > 0) setJackpot(active[0]);
        const all = await appClient.entities.Jackpot.filter({}, '-created_date', 10);
        setHistory(all.filter(j => j.winner_user_id));
      } catch (e) {}
      setLoading(false);
    };
    load();
  }, []);

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div className="min-h-screen gradient-bg pb-20">
      <div className="px-4 pt-8 pb-6">
        <h1 className="font-game text-xl font-black text-white mb-1">Jackpot</h1>
        <p className="text-muted-foreground text-sm">Current jackpot and winners</p>
      </div>

      {/* Main Jackpot Display */}
      {jackpot ? (
        <div className="mx-4 mb-6 relative overflow-hidden rounded-3xl p-[1px]">
          <div className="absolute inset-0 gradient-gold opacity-70 rounded-3xl" />
          <div className="relative bg-navy-dark/95 rounded-3xl p-8 text-center">
            <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
              <Trophy size={36} className="text-navy-dark" />
            </div>
            <p className="font-game text-gold text-xs tracking-widest mb-2 font-bold">{jackpot.label || 'WEEKLY JACKPOT'}</p>
            <p className="font-game text-5xl font-black text-gold mb-2 animate-float">{fmt(jackpot.amount)}</p>
            <p className="text-muted-foreground text-sm">Win by scoring #1 in the weekly game</p>
          </div>
        </div>
      ) : !loading && (
        <div className="mx-4 mb-6 glass-card rounded-3xl p-8 text-center border border-border/50">
          <p className="text-muted-foreground">No active jackpot at the moment</p>
        </div>
      )}

      {/* How to win */}
      <div className="mx-4 mb-4 glass-card rounded-2xl p-5 border border-neon-purple/20">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-neon-purple" />
          <p className="font-bold text-white text-sm">How to Win the Jackpot</p>
        </div>
        <div className="space-y-2">
          {[
            '🎯 Score #1 in the weekly live game',
            '⚡ Answer correctly and as fast as possible',
            '💰 Jackpot is awarded to the top scorer',
            '📋 Claim your prize within 48 hours',
          ].map((step, i) => (
            <p key={i} className="text-sm text-muted-foreground">{step}</p>
          ))}
        </div>
      </div>

      {/* Jackpot history */}
      <div className="px-4">
        <div className="flex items-center gap-2 mb-3">
          <History size={14} className="text-muted-foreground" />
          <p className="font-bold text-white text-sm">Past Jackpot Winners</p>
        </div>
        {history.length === 0 ? (
          <div className="glass-card rounded-2xl p-6 border border-border/50 text-center">
            <Trophy size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No jackpot winners yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((j, i) => (
              <div key={j.id} className="glass-card rounded-2xl p-4 border border-gold/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
                    <Trophy size={16} className="text-navy-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Winner #{i + 1}</p>
                    <p className="text-xs text-muted-foreground">
                      {j.won_at ? new Date(j.won_at).toLocaleDateString() : 'Past game'}
                    </p>
                  </div>
                </div>
                <p className="font-game text-gold font-bold">{fmt(j.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
