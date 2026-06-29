import React from 'react';
import { ArrowLeft, Clock, Lock, Shield, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RULES = [
  { icon: Clock, title: 'Question Timer', desc: 'Each question runs by countdown. When time ends, the answer is locked.' },
  { icon: Lock, title: 'One Mistake Ends Play', desc: 'Wrong answers and missed answers remove the player from answering. They can keep watching.' },
  { icon: Wallet, title: 'Prize Split', desc: 'All players still in the game when it ends split the prize pool equally. The share is added to their wallet automatically.' },
  { icon: Wallet, title: 'Telebirr Withdrawal', desc: 'Withdrawals are available to Telebirr from 100 ETB and above.' },
  { icon: Shield, title: 'Fair Play', desc: 'The game protects the prize pool from focus abuse, overlays, impossible answer speed, and admin-reviewed cheating reports.' },
];

export default function Rules() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-4 pt-6 pb-4 bg-card border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" />
          </button>
          <h1 className="font-game text-lg font-black text-foreground">Game Rules</h1>
        </div>
      </div>
      <div className="px-4 pt-4 space-y-2.5">
        {RULES.map(({ icon: Icon, title, desc }, i) => (
          <div
            key={title}
            className="bg-card rounded-2xl p-4 border border-border flex gap-3 shadow-sm animate-slide-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border text-primary bg-primary/5 border-primary/10">
              <Icon size={16} />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm mb-0.5">{title}</p>
              <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
        <div className="mt-4 p-4 bg-card rounded-2xl border border-border text-center">
          <p className="text-xs text-muted-foreground">Prize and wallet rules apply automatically after every finished game.</p>
        </div>
      </div>
    </div>
  );
}
