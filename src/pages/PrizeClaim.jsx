import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, ChevronDown } from 'lucide-react';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import PaymentMethodDrawer from '@/components/PaymentMethodDrawer';

export default function PrizeClaim() {
  const navigate = useNavigate();
  const { currentUser, currentGame } = useGame();
  const [form, setForm] = useState({ full_name: '', phone_number: '', payment_method: '', note: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [prizeAmount, setPrizeAmount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingClaim, setExistingClaim] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser) setForm(f => ({ ...f, full_name: currentUser.full_name || '' }));

    const checkWinner = async () => {
      setChecking(true);
      try {
        // Find ended games where this user is the winner
        const endedGames = await appClient.entities.Game.filter({ status: 'ended', winner_user_id: currentUser.id }, '-ended_at', 1);
        if (endedGames.length > 0) {
          const game = endedGames[0];
          setIsWinner(true);
          setPrizeAmount(game.prize_amount || 0);
          // Check if already claimed
          const claims = await appClient.entities.PrizeClaim.filter({ user_id: currentUser.id, game_id: game.id }, '-created_date', 1);
          if (claims.length > 0) setExistingClaim(claims[0]);
        } else if (currentGame) {
          setPrizeAmount(currentGame.prize_amount || 0);
        }
      } catch (e) {}
      setChecking(false);
    };
    checkWinner();
  }, [currentUser?.id]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'ሙሉ ስም ያስፈልጋል';
    if (!form.phone_number.trim()) e.phone_number = 'ስልክ ቁጥር ያስፈልጋል';
    if (!form.payment_method) e.payment_method = 'የክፍያ ዘዴ ምረጡ';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || !currentUser) return;
    setSubmitting(true);
    try {
      const endedGames = await appClient.entities.Game.filter({ status: 'ended', winner_user_id: currentUser.id }, '-ended_at', 1);
      const gameId = endedGames[0]?.id || currentGame?.id;
      await appClient.entities.PrizeClaim.create({
        game_id: gameId,
        user_id: currentUser.id,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim(),
        payment_method: form.payment_method,
        note: form.note.trim(),
        prize_amount: prizeAmount,
        status: 'pending',
      });
      setSubmitted(true);
    } catch {
      setErrors({ submit: 'ሊላክ አልቻለም። እንደገና ሞክሩ።' });
    }
    setSubmitting(false);
  };

  const fmt = (n) => new Intl.NumberFormat('am-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Not a winner — show blocked screen
  if (!isWinner) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔒</span>
        </div>
        <h2 className="font-game text-xl font-black text-foreground mb-2">Winners Only</h2>
        <p className="text-muted-foreground text-sm mb-6">Only the game winner can submit a prize claim. Keep playing to win!</p>
        <button onClick={() => navigate('/')}
          className="gradient-purple-blue text-white font-bold py-3 px-8 rounded-2xl">
          Back to Home
        </button>
      </div>
    );
  }

  // Already claimed
  if (existingClaim) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-20 h-20 rounded-full bg-correct-green/10 border border-correct-green/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={36} className="text-correct-green" />
        </div>
        <h2 className="font-game text-xl font-black text-foreground mb-2">Claim Submitted</h2>
        <p className="text-muted-foreground text-sm mb-2">Your claim for <span className="text-gold font-bold">{fmt(prizeAmount)}</span> is being reviewed.</p>
        <div className="bg-card rounded-2xl p-4 border border-border mb-6 w-full max-w-xs">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="font-bold text-amber-500 mt-1 capitalize">{existingClaim.status}</p>
        </div>
        <button onClick={() => navigate('/profile')} className="gradient-purple-blue text-white font-bold py-3 px-8 rounded-2xl">
          View in Profile
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="animate-bounce-in max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-correct-green/20 border border-correct-green/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-correct-green" />
          </div>
          <h2 className="font-game text-xl font-black text-foreground mb-2">ተልኳል!</h2>
          <p className="text-muted-foreground text-sm mb-2">
            <span className="text-gold font-bold">{fmt(prizeAmount)}</span> ጥያቄ ተልኳል
          </p>
          <p className="text-muted-foreground text-sm mb-6">ጥያቄዎ በ24 ሰዓት ውስጥ ይሰናዳል።</p>
          <div className="bg-card rounded-2xl p-4 border border-border mb-6">
            <p className="text-xs text-muted-foreground">የሽልማት ሁኔታ</p>
            <p className="font-bold text-amber-500 text-sm mt-1">በምርመራ ላይ</p>
          </div>
          <button onClick={() => navigate('/profile')} className="gradient-purple-blue text-white font-bold py-4 px-8 rounded-2xl w-full">
            ጥያቄዎቼን ይዩ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="font-game text-lg font-black text-foreground">ሽልማት ጥያቄ</h1>
        </div>

        <div className="bg-card rounded-3xl p-5 border border-gold/30 text-center mb-5 shadow-sm">
          <p className="font-game text-gold text-xs tracking-widest font-bold mb-1">እንኳን ደስ አለዎ!</p>
          <p className="text-foreground font-black text-2xl font-game">{fmt(prizeAmount)}</p>
          <p className="text-muted-foreground text-xs mt-1">ዝርዝርዎን ሞልተው ሽልማቱን ይቀበሉ</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'full_name', label: 'ሙሉ ስም *', placeholder: 'በዎ/ኢ.ቢ.ስ ላይ እንደሚታይ', type: 'text' },
            { key: 'phone_number', label: 'ስልክ ቁጥር *', placeholder: '+251 9XX XXX XXX', type: 'tel' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">{label.toUpperCase()}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-foreground text-sm outline-none focus:border-primary transition-colors" />
              {errors[key] && <p className="text-wrong-red text-xs mt-1">{errors[key]}</p>}
            </div>
          ))}

          {/* Payment method — custom drawer trigger */}
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">የክፍያ ዘዴ *</label>
            <button type="button" onClick={() => setDrawerOpen(true)}
              className={`w-full bg-muted border rounded-xl px-4 py-3.5 text-sm flex items-center justify-between transition-colors ${errors.payment_method ? 'border-wrong-red' : 'border-border focus:border-primary'}`}>
              <span className={form.payment_method ? 'text-foreground font-semibold' : 'text-muted-foreground'}>
                {form.payment_method || 'የክፍያ ዘዴ ምረጡ'}
              </span>
              <ChevronDown size={16} className="text-muted-foreground flex-shrink-0" />
            </button>
            {errors.payment_method && <p className="text-wrong-red text-xs mt-1">{errors.payment_method}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">ማስታወሻ (አማራጭ)</label>
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="የሂሳብ ቁጥር ወይም ተጨማሪ መረጃ..." rows={3}
              className="w-full bg-muted border border-border rounded-xl px-4 py-3.5 text-foreground text-sm outline-none focus:border-primary transition-colors resize-none" />
          </div>

          {errors.submit && <p className="text-wrong-red text-xs text-center">{errors.submit}</p>}

          <button type="submit" disabled={submitting}
            className="w-full gradient-gold text-navy-dark font-game font-black py-5 rounded-2xl text-lg tracking-wider transition-all active:scale-95 disabled:opacity-50 glow-gold">
            {submitting ? 'እየተላከ...' : 'ሽልማቱን ጠይቅ'}
          </button>
        </form>
      </div>

      <PaymentMethodDrawer
        open={drawerOpen}
        selected={form.payment_method}
        onSelect={m => setForm(f => ({ ...f, payment_method: m }))}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}