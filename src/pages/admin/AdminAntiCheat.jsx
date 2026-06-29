import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, EyeOff, Gauge, MessageSquare, Shield, Target, Timer, Users } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const SEVERITY_COLORS = {
  low: 'text-muted-foreground bg-muted border-border',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  high: 'text-wrong-red bg-wrong-red/10 border-wrong-red/30',
};

const EVENT_ICONS = {
  mini_app_hidden: EyeOff,
  app_blur: EyeOff,
  tab_switch: EyeOff,
  impossible_speed: Gauge,
  duplicate_session: Users,
  repeated_perfect: Target,
  suspicious_pattern: AlertTriangle,
  rate_limit: Timer,
};

function EventIcon({ type }) {
  const Icon = EVENT_ICONS[type] || Shield;
  return <Icon size={18} className="text-gold" />;
}

export default function AdminAntiCheat() {
  const [logs, setLogs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('all');
  const [activeLogId, setActiveLogId] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => { loadLogs(); }, [severity]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const query = severity === 'all' ? {} : { severity };
      const [logRows, playerRows, banRows] = await Promise.all([
        appClient.entities.AntiCheatLog.filter(query, '-created_date', 150),
        appClient.entities.GamePlayer.list('-created_date', 1000),
        appClient.entities.GameBan.filter({ is_active: true }, '-created_date', 500),
      ]);
      setLogs(logRows);
      setPlayers(playerRows);
      setBans(banRows);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  };

  const stats = useMemo(() => ({
    high: logs.filter(log => log.severity === 'high').length,
    medium: logs.filter(log => log.severity === 'medium').length,
    low: logs.filter(log => log.severity === 'low').length,
    banned: bans.length,
  }), [bans.length, logs]);

  const openActions = (log) => {
    setActiveLogId(activeLogId === log.id ? '' : log.id);
    setReason(log.details || 'Suspicious activity during live game');
    setMessage('Suspicious activity detected. You can watch, but you cannot answer in this game.');
  };

  const sendOverlay = async (log) => {
    if (!message.trim()) return;
    setBusy(`msg_${log.id}`);
    try {
      await appClient.entities.Broadcast.create({
        game_id: log.game_id,
        target: 'user',
        target_user_id: log.user_id,
        message: message.trim(),
        sent_by: 'admin',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      await appClient.entities.AntiCheatLog.update(log.id, { action_taken: 'overlay_message', admin_note: message.trim() });
      await loadLogs();
    } catch (error) {
      alert(error.message || 'Failed to send overlay message');
    }
    setBusy('');
  };

  const banFromGame = async (log) => {
    if (!reason.trim()) {
      alert('Ban reason is required.');
      return;
    }
    setBusy(`ban_${log.id}`);
    try {
      const existing = await appClient.entities.GameBan.filter({ game_id: log.game_id, user_id: log.user_id, is_active: true }, '-created_date', 1);
      if (existing.length === 0) {
        await appClient.entities.GameBan.create({
          game_id: log.game_id,
          user_id: log.user_id,
          username: log.username || 'Dink user',
          reason: reason.trim(),
          is_active: true,
        });
      }
      const playerRows = players.filter(player => player.game_id === log.game_id && player.user_id === log.user_id);
      for (const player of playerRows) {
        await appClient.entities.GamePlayer.update(player.id, {
          is_disqualified: true,
          game_banned: true,
          disqualify_reason: reason.trim(),
          status: 'finished',
        });
      }
      await appClient.entities.Broadcast.create({
        game_id: log.game_id,
        target: 'user',
        target_user_id: log.user_id,
        message: `Game ban: ${reason.trim()}`,
        sent_by: 'admin',
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      await appClient.entities.AntiCheatLog.update(log.id, { action_taken: 'game_ban', admin_note: reason.trim() });
      await loadLogs();
    } catch (error) {
      alert(error.message || 'Failed to ban user');
    }
    setBusy('');
  };

  const activeBanFor = (log) => bans.some(ban => ban.game_id === log.game_id && ban.user_id === log.user_id && ban.is_active);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <p className="text-xs text-gold font-black tracking-widest">GAME SECURITY</p>
          <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
            <Shield size={20} className="text-gold" /> Anti-Cheat Center
          </h1>
          <p className="text-muted-foreground text-sm">Warn users, send overlays, or ban them from a specific game.</p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'High Risk', value: stats.high, color: 'text-wrong-red', bg: 'bg-wrong-red/10' },
            { label: 'Medium', value: stats.medium, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { label: 'Low', value: stats.low, color: 'text-muted-foreground', bg: 'bg-navy-light' },
            { label: 'Game Bans', value: stats.banned, color: 'text-gold', bg: 'bg-gold/10' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`glass-card rounded-xl p-3 border border-border/50 text-center ${bg}`}>
              <p className={`font-game text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {['all', 'high', 'medium', 'low'].map(item => (
            <button key={item} onClick={() => setSeverity(item)}
              className={`py-2 px-3 rounded-full font-black text-xs capitalize transition-all ${
                severity === item ? 'bg-primary text-white' : 'glass-card border border-border/50 text-muted-foreground'
              }`}>
              {item}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-4 h-20 animate-pulse border border-border/50" />)
          ) : logs.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <Shield size={32} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No suspicious activity logged</p>
            </div>
          ) : logs.map(log => {
            const isOpen = activeLogId === log.id;
            const banned = activeBanFor(log);
            return (
              <div key={log.id} className={`glass-card rounded-2xl p-4 border ${SEVERITY_COLORS[log.severity] || 'border-border/50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                      <EventIcon type={log.event_type} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white capitalize">{log.event_type?.replace(/_/g, ' ') || 'Suspicious event'}</p>
                      <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.created_date).toLocaleString()}</p>
                      {log.admin_note && <p className="text-xs text-gold mt-1">Admin note: {log.admin_note}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {banned && <span className="text-xs font-black px-2 py-1 rounded-full bg-wrong-red/15 text-wrong-red">BANNED</span>}
                    <span className={`text-xs font-black px-2 py-1 rounded-full border flex-shrink-0 ${SEVERITY_COLORS[log.severity] || ''}`}>{log.severity?.toUpperCase()}</span>
                    <button onClick={() => openActions(log)} className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                      <MessageSquare size={15} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto] gap-2 border-t border-border/30 pt-4">
                    <input value={message} onChange={e => setMessage(e.target.value)}
                      className="bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold"
                      placeholder="Overlay message to the player" />
                    <input value={reason} onChange={e => setReason(e.target.value)}
                      className="bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-gold"
                      placeholder="Game ban reason" />
                    <button onClick={() => sendOverlay(log)} disabled={busy === `msg_${log.id}`}
                      className="rounded-full bg-gold text-primary px-4 py-2.5 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      <MessageSquare size={14} /> Notify
                    </button>
                    <button onClick={() => banFromGame(log)} disabled={busy === `ban_${log.id}` || banned}
                      className="rounded-full bg-wrong-red text-white px-4 py-2.5 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                      <Ban size={14} /> Ban Game
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
