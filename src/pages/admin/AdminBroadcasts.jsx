import React, { useEffect, useState } from 'react';
import { Clock, Megaphone, Radio, Send, Trophy, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const TARGETS = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'live', label: 'Live Players', icon: Radio },
  { value: 'winners', label: 'Winners Only', icon: Trophy },
];

export default function AdminBroadcasts() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ message: '', target: 'all' });
  const [sending, setSending] = useState(false);

  useEffect(() => { loadBroadcasts(); }, []);

  const loadBroadcasts = async () => {
    setLoading(true);
    try {
      setBroadcasts(await appClient.entities.Broadcast.list('-created_date', 50));
    } catch {
      setBroadcasts([]);
    }
    setLoading(false);
  };

  const sendBroadcast = async () => {
    if (!form.message.trim()) return;
    setSending(true);
    try {
      await appClient.entities.Broadcast.create({
        message: form.message.trim(),
        target: form.target,
        sent_by: 'admin',
        sent_at: new Date().toISOString(),
        status: 'sent',
      });
      setForm({ message: '', target: 'all' });
      await loadBroadcasts();
    } catch {
      alert('Failed to send');
    }
    setSending(false);
  };

  const targetColors = { all: 'text-electric-blue', live: 'text-correct-green', winners: 'text-gold' };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <p className="text-xs text-gold font-black tracking-widest">PLAYER MESSAGING</p>
          <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
            <Megaphone size={20} className="text-gold" /> Broadcasts
          </h1>
          <p className="text-muted-foreground text-sm">Send announcements and overlays to players.</p>
        </div>

        <section className="glass-card rounded-2xl p-5 border border-gold/20">
          <p className="font-black text-white text-sm mb-3">New Broadcast</p>
          <div className="mb-3">
            <label className="block text-xs font-black text-muted-foreground mb-2 tracking-widest">TARGET AUDIENCE</label>
            <div className="grid grid-cols-3 gap-2">
              {TARGETS.map(({ value, label, icon: Icon }) => (
                <button key={value} onClick={() => setForm(prev => ({ ...prev, target: value }))}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-full border text-sm font-black transition-all ${
                    form.target === value ? 'bg-primary text-white border-transparent' : 'border-border/50 text-muted-foreground'
                  }`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-black text-muted-foreground mb-1.5 tracking-widest">MESSAGE</label>
            <textarea value={form.message} onChange={event => setForm(prev => ({ ...prev, message: event.target.value }))}
              placeholder="Type your announcement..."
              rows={4}
              maxLength={500}
              className="w-full bg-navy-dark border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-gold resize-none" />
            <p className="text-xs text-muted-foreground mt-1">{form.message.length}/500 characters</p>
          </div>
          <button onClick={sendBroadcast} disabled={sending || !form.message.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white font-black py-3.5 rounded-full disabled:opacity-50 transition-all active:scale-95">
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </section>

        <section>
          <p className="font-black text-white text-sm mb-3 flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" /> Broadcast History
          </p>
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-4 h-16 animate-pulse border border-border/50" />)
            ) : broadcasts.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
                <Megaphone size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground">No broadcasts sent yet</p>
              </div>
            ) : broadcasts.map(broadcast => {
              const target = TARGETS.find(item => item.value === broadcast.target);
              const Icon = target?.icon || Megaphone;
              return (
                <div key={broadcast.id} className="glass-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white mb-1">{broadcast.message}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold flex items-center gap-1 ${targetColors[broadcast.target] || 'text-muted-foreground'}`}>
                          <Icon size={11} /> {target?.label || broadcast.target}
                        </span>
                        <span className="text-xs text-muted-foreground">{new Date(broadcast.created_date).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 ${broadcast.status === 'sent' ? 'text-correct-green bg-correct-green/10' : 'text-muted-foreground bg-navy-light'}`}>
                      {broadcast.status?.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
