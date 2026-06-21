import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';

export default function Deposit() {
  const navigate = useNavigate();
  const { currentUser, currentGame, nextGame } = useGame();
  const game = currentGame || nextGame;

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deposit, setDeposit] = useState(null);
  const [checking, setChecking] = useState(false);
  const [existingDeposit, setExistingDeposit] = useState(null);

  const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

  useEffect(() => {
    if (!currentUser || !game) return;
    // Check for existing paid deposit
    appClient.entities.Deposit.filter({ user_id: currentUser.id, game_id: game.id, status: 'paid' }, '-created_date', 1)
      .then(d => { if (d.length > 0) setExistingDeposit(d[0]); })
      .catch(() => {});
  }, [currentUser?.id, game?.id]);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!game) { setError('No active game found'); return; }
    setLoading(true);
    setError('');

    try {
      // Create a pending deposit record
      const dep = await appClient.entities.Deposit.create({
        user_id: currentUser.id,
        game_id: game.id,
        amount: game.entry_fee,
        phone: phone.trim(),
        email: email.trim() || `${currentUser.id}@dinkgame.et`,
        status: 'pending',
        chapa_tx_ref: `DINK-${currentUser.id.slice(-6)}-${Date.now()}`,
      });

      // Build Chapa checkout URL (redirect-based)
      // In production, this would call a backend function to create the Chapa transaction
      // For now we construct the standard Chapa hosted checkout URL
      const chapaUrl = `https://checkout.chapa.co/checkout/payment?` + new URLSearchParams({
        public_key: 'CHAPUBK_TEST-placeholder', // Replace with real key
        amount: game.entry_fee,
        currency: 'ETB',
        tx_ref: dep.chapa_tx_ref,
        first_name: currentUser.full_name?.split(' ')[0] || 'Player',
        last_name: currentUser.full_name?.split(' ')[1] || '',
        phone_number: phone.trim(),
        email: email.trim() || `${currentUser.id}@dinkgame.et`,
        title: `Dink Game Entry - ${game.title}`,
        description: `Entry fee for ${game.title}`,
        return_url: `${window.location.origin}/deposit-verify?tx=${dep.chapa_tx_ref}&dep=${dep.id}`,
      });

      await appClient.entities.Deposit.update(dep.id, { chapa_checkout_url: chapaUrl });
      setDeposit(dep);

      // Open Chapa checkout
      window.open(chapaUrl, '_blank');
    } catch (err) {
      setError('Payment initiation failed. Please try again.');
    }
    setLoading(false);
  };

  const checkPayment = async () => {
    if (!deposit) return;
    setChecking(true);
    try {
      // Poll deposit status
      const updated = await appClient.entities.Deposit.filter({ id: deposit.id }, '-created_date', 1);
      if (updated.length > 0 && updated[0].status === 'paid') {
        setExistingDeposit(updated[0]);
      }
    } catch (e) {}
    setChecking(false);
  };

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-foreground font-semibold">No upcoming game found</p>
          <button onClick={() => navigate('/')} className="mt-4 text-primary font-semibold text-sm">Back to Home</button>
        </div>
      </div>
    );
  }

  if (existingDeposit || !game.is_paid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-correct-green/10 border border-correct-green/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-correct-green" />
          </div>
          <h2 className="font-game text-xl font-black text-foreground mb-1">
            {game.is_paid ? 'Entry Confirmed' : 'Free Game'}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            {game.is_paid ? `You're in for ${game.title}` : `${game.title} is free to enter`}
          </p>
          <button onClick={() => navigate('/lobby')}
            className="gradient-purple-blue text-white font-game font-bold px-8 py-3 rounded-2xl">
            Enter Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-6 pb-4 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <DinkLogo size="sm" />
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Game info */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <p className="text-xs text-muted-foreground font-semibold tracking-widest mb-1">ENTRY FEE</p>
          <p className="font-game text-3xl font-black text-primary">{fmt(game.entry_fee)}</p>
          <p className="text-sm text-muted-foreground mt-1">{game.title}</p>
          <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Prize pool</span>
            <span className="font-game text-gold font-bold text-sm">{fmt(game.prize_amount)}</span>
          </div>
        </div>

        {/* Payment pending state */}
        {deposit && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-center">
            <Clock size={28} className="text-amber-600 mx-auto mb-2" />
            <p className="font-semibold text-amber-700 text-sm">Payment window opened</p>
            <p className="text-amber-600 text-xs mt-1 mb-3">Complete payment in the Chapa tab, then come back and verify</p>
            <button onClick={checkPayment} disabled={checking}
              className="bg-amber-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm w-full disabled:opacity-60">
              {checking ? 'Checking...' : 'Verify Payment'}
            </button>
          </div>
        )}

        {/* Payment form */}
        {!deposit && (
          <form onSubmit={handlePay} className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-4">
            <h2 className="font-game text-base font-black text-foreground">Pay with Chapa</h2>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-widest">PHONE NUMBER</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="09xxxxxxxx"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 tracking-widest">EMAIL (OPTIONAL)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-foreground text-sm outline-none focus:border-primary" />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-wrong-red text-sm">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full gradient-purple-blue text-white font-game font-bold py-3.5 rounded-xl tracking-wide disabled:opacity-60 flex items-center justify-center gap-2">
              <CreditCard size={16} />
              {loading ? 'Processing...' : `Pay ${fmt(game.entry_fee)}`}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              Powered by Chapa · Secure Ethiopian payment
            </p>
          </form>
        )}

        {/* How it works */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm space-y-2.5">
          <p className="text-xs font-semibold text-muted-foreground tracking-widest">HOW IT WORKS</p>
          {[
            'Pay the entry fee using Chapa (Telebirr, CBE, bank card)',
            'Your payment is verified automatically',
            'Join the lobby once payment is confirmed',
            'Win prizes and claim your earnings',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}