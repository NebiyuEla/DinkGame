import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Edit3, Landmark } from 'lucide-react';
import DinkLogo from '@/components/DinkLogo';
import { useGame } from '@/lib/gameContext';
import { appClient } from '@/api/appClient';
import { getTelegramWebApp } from '@/lib/telegram';

const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);

export default function Deposit() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, setCurrentUser, currentGame, nextGame } = useGame();
  const game = currentGame || nextGame;
  const suggestedAmount = Number(searchParams.get('amount') || game?.entry_fee || 50);
  const [amount, setAmount] = useState(suggestedAmount || 50);
  const [phone, setPhone] = useState('');
  const [phoneLocked, setPhoneLocked] = useState(true);
  const [email, setEmail] = useState('');
  const [deposit, setDeposit] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState(100);
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawPhoneLocked, setWithdrawPhoneLocked] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifyingReturn, setVerifyingReturn] = useState(false);
  const [message, setMessage] = useState('');

  const walletBalance = Number(currentUser?.wallet_balance || 0);
  const defaultPhone = currentUser?.telebirr_phone || currentUser?.phone || currentUser?.telegram_phone || '';

  const refresh = useCallback(async () => {
    if (!currentUser?.id) return;
    const [users, txs] = await Promise.all([
      appClient.entities.User.filter({ id: currentUser.id }, '-created_date', 1),
      appClient.entities.WalletTransaction.filter({ user_id: currentUser.id }, '-created_date', 20),
    ]);
    if (users[0]) setCurrentUser(users[0]);
    setTransactions(txs);
  }, [currentUser?.id, setCurrentUser]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!defaultPhone) return;
    setPhone(prev => prev || defaultPhone);
    setWithdrawPhone(prev => prev || defaultPhone);
  }, [defaultPhone]);

  const saveDefaultPhone = async (value) => {
    const clean = String(value || '').trim();
    if (!clean || !currentUser?.id) return;
    if (clean === currentUser.telebirr_phone && clean === currentUser.phone) return;
    const updated = await appClient.entities.User.update(currentUser.id, {
      telebirr_phone: clean,
      phone: currentUser.phone || clean,
    });
    setCurrentUser(updated);
  };

  useEffect(() => {
    const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref');
    if (!txRef || verifyingReturn) return;

    let cancelled = false;
    const verifyReturn = async () => {
      setVerifyingReturn(true);
      setLoading(true);
      setMessage('Checking payment...');
      try {
        const result = await appClient.payments.verifyChapa({ tx_ref: txRef });
        if (cancelled) return;
        setDeposit(result.deposit);
        await refresh();
        setMessage(result.paid ? 'Wallet updated.' : 'Payment is still pending.');
        const nextParams = new URLSearchParams(searchParams);
        ['tx_ref', 'trx_ref', 'status', 'demo', 'source'].forEach(key => nextParams.delete(key));
        setSearchParams(nextParams, { replace: true });
      } catch (error) {
        if (!cancelled) setMessage(error.message || 'Could not verify payment');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setVerifyingReturn(false);
        }
      }
    };

    verifyReturn();
    return () => { cancelled = true; };
  }, [refresh, searchParams, setSearchParams, verifyingReturn]);

  const startDeposit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id || amount <= 0) return;
    setLoading(true);
    setMessage('');
    try {
      const returnUrl = new URL('/deposit', window.location.origin);
      returnUrl.searchParams.set('source', 'chapa');
      const gameId = searchParams.get('game') || game?.id;
      if (gameId) returnUrl.searchParams.set('game', gameId);

      const result = await appClient.payments.initializeChapa({
        user_id: currentUser.id,
        game_id: game?.id || '',
        amount: Number(amount),
        phone: phone.trim() || defaultPhone,
        email: email || currentUser.email,
        purpose: 'wallet',
        return_url: returnUrl.toString(),
        callback_url: `${window.location.origin}/api/payments/chapa/webhook`,
      });
      await saveDefaultPhone(phone.trim() || defaultPhone);
      setDeposit(result.deposit);
      if (result.checkout_url) {
        const webApp = getTelegramWebApp();
        if (webApp?.openLink) webApp.openLink(result.checkout_url);
        else window.location.assign(result.checkout_url);
      }
      setMessage('Complete payment. Your wallet updates here after Chapa returns.');
    } catch (error) {
      setMessage(error.message || 'Could not start payment');
    }
    setLoading(false);
  };

  const verifyDeposit = async () => {
    if (!deposit) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await appClient.payments.verifyChapa({ tx_ref: deposit.chapa_tx_ref, deposit_id: deposit.id });
      setDeposit(result.deposit);
      await refresh();
      setMessage(result.paid ? 'Wallet updated.' : 'Payment is still pending.');
    } catch (error) {
      setMessage(error.message || 'Could not verify payment');
    }
    setLoading(false);
  };

  const requestWithdrawal = async (e) => {
    e.preventDefault();
    setMessage('');
    const value = Number(withdrawAmount || 0);
    if (value < 100) { setMessage('Minimum Telebirr withdrawal is 100 ETB.'); return; }
    if (value > walletBalance) { setMessage('Wallet balance is not enough.'); return; }
    const cleanPhone = withdrawPhone.trim() || defaultPhone;
    if (!cleanPhone) { setMessage('Telebirr phone is required.'); return; }

    setLoading(true);
    try {
      await appClient.entities.Withdrawal.create({
        user_id: currentUser.id,
        amount: value,
        phone: cleanPhone,
        provider: 'telebirr',
        status: 'pending',
      });
      await saveDefaultPhone(cleanPhone);
      const updated = await appClient.entities.User.update(currentUser.id, {
        wallet_balance: walletBalance - value,
      });
      await appClient.entities.WalletTransaction.create({
        user_id: currentUser.id,
        amount: value,
        type: 'debit',
        status: 'pending',
        source: 'telebirr_withdrawal',
        note: `Telebirr withdrawal to ${cleanPhone}`,
      });
      setCurrentUser(updated);
      setMessage('Telebirr withdrawal request sent.');
      await refresh();
    } catch (error) {
      setMessage(error.message || 'Withdrawal failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="px-4 pt-4 pb-3 bg-card border-b border-border flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft size={18} className="text-foreground" />
        </button>
        <DinkLogo size="sm" />
        <div className="w-10" />
      </div>

      <div className="px-4 pt-4 space-y-3">
        <section className="rounded-[1.75rem] bg-primary text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black text-white/60 tracking-widest">WALLET BALANCE</p>
              <p className="text-4xl font-black mt-1">{fmt(walletBalance)}</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <img src="/brand/etb-coin-small.webp" alt="" className="w-12 h-12 object-contain" loading="eager" decoding="async" />
            </div>
          </div>
          {game?.is_paid && (
            <p className="mt-4 text-sm text-white/75">
              {game.title} entry: {fmt(game.entry_fee)}. Add funds first, then join from Home.
            </p>
          )}
        </section>

        {message && (
          <div className="rounded-2xl bg-card border border-border p-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-primary flex-shrink-0" />
            <p className="text-sm font-semibold text-foreground">{message}</p>
          </div>
        )}

        <form onSubmit={startDeposit} className="rounded-[1.5rem] bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center">
              <CreditCard size={18} className="text-gold" />
            </div>
            <div>
              <h2 className="font-black text-foreground">Add money</h2>
              <p className="text-xs text-muted-foreground">Secure checkout through Chapa</p>
            </div>
          </div>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-lg font-black text-foreground outline-none focus:border-primary"
            placeholder="Amount"
          />
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={phoneLocked && Boolean(defaultPhone)}
              className="min-w-0 flex-1 rounded-2xl bg-muted border border-border px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary disabled:opacity-80"
              placeholder="Telebirr / phone number"
            />
            {defaultPhone && (
              <button type="button" onClick={() => setPhoneLocked(false)} className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Edit3 size={16} />
              </button>
            )}
          </div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary"
            placeholder="Email optional"
          />
          <button disabled={loading} className="w-full rounded-full bg-gold text-primary font-black py-4 active:scale-95 transition-transform disabled:opacity-60">
            {loading ? 'Processing...' : `Pay ${fmt(amount)}`}
          </button>
          {deposit && (
            <button type="button" onClick={verifyDeposit} disabled={loading} className="w-full rounded-full bg-primary text-white font-black py-4 active:scale-95 transition-transform disabled:opacity-60">
              Verify Payment
            </button>
          )}
        </form>

        <form onSubmit={requestWithdrawal} className="rounded-[1.5rem] bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Landmark size={18} className="text-primary" />
            </div>
            <div>
              <h2 className="font-black text-foreground">Withdraw to Telebirr</h2>
              <p className="text-xs text-muted-foreground">Minimum withdrawal is 100 ETB</p>
            </div>
          </div>
          <input
            type="number"
            min="100"
            value={withdrawAmount}
            onChange={e => setWithdrawAmount(e.target.value)}
            className="w-full rounded-2xl bg-muted border border-border px-4 py-3 text-lg font-black text-foreground outline-none focus:border-primary"
            placeholder="Amount"
          />
          <div className="flex gap-2">
            <input
              type="tel"
              value={withdrawPhone}
              onChange={e => setWithdrawPhone(e.target.value)}
              disabled={withdrawPhoneLocked && Boolean(defaultPhone)}
              className="min-w-0 flex-1 rounded-2xl bg-muted border border-border px-4 py-3 text-sm font-semibold text-foreground outline-none focus:border-primary disabled:opacity-80"
              placeholder="Telebirr phone"
            />
            {defaultPhone && (
              <button type="button" onClick={() => setWithdrawPhoneLocked(false)} className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Edit3 size={16} />
              </button>
            )}
          </div>
          <button disabled={loading || walletBalance < 100} className="w-full rounded-full bg-primary text-white font-black py-4 active:scale-95 transition-transform disabled:opacity-50">
            Request Withdrawal
          </button>
        </form>

        <section className="rounded-[1.5rem] bg-card border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-black text-foreground">Wallet history</p>
          </div>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No wallet activity yet</p>
          ) : transactions.map(tx => (
            <div key={tx.id} className="px-4 py-3 border-b border-border last:border-0 flex justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{tx.note || tx.source}</p>
                <p className="text-xs text-muted-foreground">{new Date(tx.created_date).toLocaleString()}</p>
              </div>
              <p className={`text-sm font-black ${tx.type === 'debit' ? 'text-wrong-red' : 'text-correct-green'}`}>
                {tx.type === 'debit' ? '-' : '+'}{fmt(tx.amount)}
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
