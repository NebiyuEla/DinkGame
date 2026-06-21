import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Clock } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const TARGETS = [
  { value: 'all', label: 'All Users', icon: '👥' },
  { value: 'live', label: 'Live Players', icon: '🔴' },
  { value: 'winners', label: 'Winners Only', icon: '🏆' },
  { value: 'pending_prize', label: 'Pending Prize', icon: '💰' },
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
      const b = await appClient.entities.Broadcast.list('-created_date', 30);
      setBroadcasts(b);
    } catch (e) {}
    setLoading(false);
  };

  const sendBroadcast = async () => {
    if (!form.message.trim()) return;
    setSending(true);
    try {
      await appClient.entities.Broadcast.create({
        message: form.message,
        target: form.target,
        sent_by: 'admin',
        sent_at: new Date().toISOString(),
        status: 'sent',
      });
      setForm({ message: '', target: 'all' });
      await loadBroadcasts();
    } catch (e) { alert('Failed to send'); }
    setSending(false);
  };

  const targetColors = { all: 'text-electric-blue', live: 'text-correct-green', winners: 'text-gold', pending_prize: 'text-yellow-400' };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
            <Megaphone size={20} className="text-neon-purple" /> Broadcasts
          </h1>
          <p className="text-muted-foreground text-sm">Send announcements to players</p>
        </div>

        {/* Compose */}
        <div className="glass-card rounded-2xl p-5 border border-neon-purple/20">
          <p className="font-bold text-white text-sm mb-3">New Broadcast</p>
          <div className="mb-3">
            <label className="block text-xs font-bold text-muted-foreground mb-2 tracking-widest">TARGET AUDIENCE</label>
            <div className="grid grid-cols-2 gap-2">
              {TARGETS.map(t => (
                <button key={t.value} onClick={() => setForm(f => ({ ...f, target: t.value }))}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold transition-all ${
                    form.target === t.value ? 'gradient-purple-blue text-white border-transparent' : 'border-border/50 text-muted-foreground'
                  }`}>
                  <span>{t.icon}</span> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">MESSAGE</label>
            <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder="Type your announcement..."
              rows={4}
              className="w-full bg-navy-dark border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-neon-purple resize-none" />
            <p className="text-xs text-muted-foreground mt-1">{form.message.length}/500 characters</p>
          </div>
          <button onClick={sendBroadcast} disabled={sending || !form.message.trim()}
            className="w-full flex items-center justify-center gap-2 gradient-purple-blue text-white font-bold py-3.5 rounded-xl disabled:opacity-50 transition-all active:scale-95">
            <Send size={16} />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>

        {/* Broadcast history */}
        <div>
          <p className="font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Clock size={14} className="text-muted-foreground" /> Broadcast History
          </p>
          <div className="space-y-3">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-4 h-16 animate-pulse border border-border/50" />)
            ) : broadcasts.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
                <Megaphone size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-muted-foreground">No broadcasts sent yet</p>
              </div>
            ) : broadcasts.map(b => (
              <div key={b.id} className="glass-card rounded-xl p-4 border border-border/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white mb-1">{b.message}</p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${targetColors[b.target] || 'text-muted-foreground'}`}>
                        {TARGETS.find(t => t.value === b.target)?.icon} {TARGETS.find(t => t.value === b.target)?.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{new Date(b.created_date).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ${b.status === 'sent' ? 'text-correct-green bg-correct-green/10' : 'text-muted-foreground bg-navy-light'}`}>
                    {b.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}