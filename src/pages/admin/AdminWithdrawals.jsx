import React, { useEffect, useState } from 'react';
import { CheckCircle, RotateCcw, SearchCheck, Send, Wallet } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const fmt = (n) => new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', minimumFractionDigits: 0 }).format(n || 0);
const PAYOUT_TOKEN_KEY = 'dink_admin_payout_token';

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState({});
  const [busy, setBusy] = useState('');

  const load = async () => {
    const [rows, userRows] = await Promise.all([
      appClient.entities.Withdrawal.list('-created_date', 200),
      appClient.entities.User.list('-created_date', 5000),
    ]);
    const userMap = {};
    userRows.forEach(user => { userMap[user.id] = user; });
    setWithdrawals(rows);
    setUsers(userMap);
  };

  useEffect(() => { load(); }, []);

  const settleWithdrawalTransaction = async (withdrawal) => {
    const pending = await appClient.entities.WalletTransaction.filter({
      user_id: withdrawal.user_id,
      source: 'telebirr_withdrawal',
      status: 'pending',
    }, '-created_date', 20).catch(() => []);
    const match = pending.find(tx => Number(tx.amount || 0) === Number(withdrawal.amount || 0));
    if (match) {
      await appClient.entities.WalletTransaction.update(match.id, {
        status: 'posted',
        source: 'telebirr_withdrawal_paid',
        note: `Telebirr paid to ${withdrawal.phone}`,
      });
      return;
    }
    await appClient.entities.WalletTransaction.create({
      user_id: withdrawal.user_id,
      amount: Number(withdrawal.amount || 0),
      type: 'debit',
      status: 'posted',
      source: 'telebirr_withdrawal_paid',
      note: `Telebirr paid to ${withdrawal.phone}`,
    });
  };

  const markPaid = async (withdrawal) => {
    setBusy(withdrawal.id);
    await appClient.entities.Withdrawal.update(withdrawal.id, {
      status: 'paid',
      processed_at: new Date().toISOString(),
    });
    await settleWithdrawalTransaction(withdrawal);
    await load();
    setBusy('');
  };

  const getPayoutToken = () => {
    if (typeof window === 'undefined') return '';
    const stored = window.localStorage.getItem(PAYOUT_TOKEN_KEY);
    if (stored) return stored;
    const token = prompt('Enter payout token for Chapa transfers. Leave blank for local demo.');
    if (token) window.localStorage.setItem(PAYOUT_TOKEN_KEY, token);
    return token || '';
  };

  const sendWithChapa = async (withdrawal) => {
    const user = users[withdrawal.user_id];
    const payoutToken = getPayoutToken();
    setBusy(withdrawal.id);
    try {
      const result = await appClient.payments.initializeChapaTransfer({
        withdrawal_id: withdrawal.id,
        account_name: user?.full_name || withdrawal.phone,
        account_number: withdrawal.phone,
        payout_token: payoutToken,
      });
      if (result.withdrawal?.status === 'paid') await settleWithdrawalTransaction(result.withdrawal);
      await load();
    } catch (error) {
      alert(error.message || 'Could not send Chapa transfer');
    }
    setBusy('');
  };

  const checkChapaTransfer = async (withdrawal) => {
    const payoutToken = getPayoutToken();
    setBusy(withdrawal.id);
    try {
      const result = await appClient.payments.verifyChapaTransfer({
        withdrawal_id: withdrawal.id,
        reference: withdrawal.chapa_transfer_ref,
        payout_token: payoutToken,
      });
      if (result.withdrawal?.status === 'paid') await settleWithdrawalTransaction(result.withdrawal);
      await load();
    } catch (error) {
      alert(error.message || 'Could not verify transfer');
    }
    setBusy('');
  };

  const rejectAndRefund = async (withdrawal) => {
    const user = users[withdrawal.user_id];
    setBusy(withdrawal.id);
    await appClient.entities.Withdrawal.update(withdrawal.id, {
      status: 'rejected',
      processed_at: new Date().toISOString(),
    });
    if (user) {
      await appClient.entities.User.update(user.id, {
        wallet_balance: Number(user.wallet_balance || 0) + Number(withdrawal.amount || 0),
      });
      await appClient.entities.WalletTransaction.create({
        user_id: user.id,
        amount: Number(withdrawal.amount || 0),
        type: 'credit',
        status: 'posted',
        source: 'telebirr_withdrawal_refund',
        note: `Telebirr withdrawal refund for ${withdrawal.phone}`,
      });
    }
    await load();
    setBusy('');
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <p className="text-xs text-gold font-black tracking-widest">TELEBIRR PAYOUTS</p>
          <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
            <Wallet size={20} className="text-gold" /> Withdrawals
          </h1>
          <p className="text-muted-foreground text-sm">Minimum user withdrawal is enforced at 100 ETB.</p>
        </div>

        <div className="space-y-3">
          {withdrawals.length === 0 ? (
            <div className="glass-card rounded-2xl border border-border/50 p-8 text-center text-muted-foreground">No withdrawal requests yet</div>
          ) : withdrawals.map(withdrawal => {
            const user = users[withdrawal.user_id];
            const userName = user?.telegram_username ? `@${user.telegram_username}` : user?.full_name || 'Dink user';
            return (
              <div key={withdrawal.id} className="glass-card rounded-2xl border border-border/50 p-4 flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                <div>
                  <p className="text-white font-black">{userName} - {fmt(withdrawal.amount)}</p>
                  <p className="text-xs text-muted-foreground">Telebirr {withdrawal.phone || 'no phone'} - {new Date(withdrawal.created_date).toLocaleString()}</p>
                  {withdrawal.chapa_transfer_ref && (
                    <p className="text-xs text-gold mt-1">Chapa {withdrawal.chapa_transfer_ref} - {withdrawal.transfer_status || 'processing'}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-2 py-1 rounded-full ${
                    withdrawal.status === 'paid' ? 'bg-correct-green/15 text-correct-green' :
                    withdrawal.status === 'rejected' ? 'bg-wrong-red/15 text-wrong-red' :
                    withdrawal.status === 'processing' ? 'bg-primary/15 text-primary' :
                    'bg-yellow-400/15 text-yellow-400'
                  }`}>{withdrawal.status?.toUpperCase()}</span>
                  {['pending', 'processing'].includes(withdrawal.status) && (
                    <>
                      <button onClick={() => sendWithChapa(withdrawal)} disabled={busy === withdrawal.id || !withdrawal.phone}
                        className="rounded-full bg-primary text-white px-4 py-2 text-xs font-black flex items-center gap-1 disabled:opacity-50">
                        <Send size={13} /> Chapa
                      </button>
                      {withdrawal.chapa_transfer_ref && (
                        <button onClick={() => checkChapaTransfer(withdrawal)} disabled={busy === withdrawal.id}
                          className="rounded-full bg-gold text-primary px-4 py-2 text-xs font-black flex items-center gap-1 disabled:opacity-50">
                          <SearchCheck size={13} /> Check
                        </button>
                      )}
                      <button onClick={() => markPaid(withdrawal)} disabled={busy === withdrawal.id}
                        className="rounded-full bg-correct-green text-white px-4 py-2 text-xs font-black flex items-center gap-1 disabled:opacity-50">
                        <CheckCircle size={13} /> Paid
                      </button>
                      <button onClick={() => rejectAndRefund(withdrawal)} disabled={busy === withdrawal.id}
                        className="rounded-full bg-wrong-red text-white px-4 py-2 text-xs font-black flex items-center gap-1 disabled:opacity-50">
                        <RotateCcw size={13} /> Refund
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
