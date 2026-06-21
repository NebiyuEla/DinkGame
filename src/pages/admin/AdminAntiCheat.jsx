import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const SEVERITY_COLORS = {
  low: 'text-muted-foreground bg-muted border-border',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  high: 'text-wrong-red bg-wrong-red/10 border-wrong-red/30',
};

const EVENT_ICONS = {
  tab_switch: '🔀',
  app_blur: '👁️',
  impossible_speed: '⚡',
  duplicate_session: '👥',
  repeated_perfect: '🎯',
  suspicious_pattern: '🚨',
  rate_limit: '⏱️',
};

export default function AdminAntiCheat() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('all');
  const [stats, setStats] = useState({ high: 0, medium: 0, low: 0 });

  useEffect(() => { loadLogs(); }, [severity]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const query = severity === 'all' ? {} : { severity };
      const l = await appClient.entities.AntiCheatLog.filter(query, '-created_date', 100);
      setLogs(l);
      const allLogs = await appClient.entities.AntiCheatLog.list();
      setStats({
        high: allLogs.filter(l => l.severity === 'high').length,
        medium: allLogs.filter(l => l.severity === 'medium').length,
        low: allLogs.filter(l => l.severity === 'low').length,
      });
    } catch (e) {}
    setLoading(false);
  };

  const updateLog = async (log, note) => {
    await appClient.entities.AntiCheatLog.update(log.id, { admin_note: note });
    loadLogs();
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
            <Shield size={20} className="text-neon-purple" /> Anti-Cheat Center
          </h1>
          <p className="text-muted-foreground text-sm">Monitor suspicious activity</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'High Risk', value: stats.high, color: 'text-wrong-red', bg: 'bg-wrong-red/10' },
            { label: 'Medium', value: stats.medium, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
            { label: 'Low', value: stats.low, color: 'text-muted-foreground', bg: 'bg-navy-light' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`glass-card rounded-xl p-3 border border-border/50 text-center ${bg}`}>
              <p className={`font-game text-xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {['all', 'high', 'medium', 'low'].map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              className={`py-2 px-3 rounded-xl font-bold text-xs capitalize transition-all ${
                severity === s ? 'gradient-purple-blue text-white' : 'glass-card border border-border/50 text-muted-foreground'
              }`}>
              {s}
            </button>
          ))}
        </div>

        {/* Logs */}
        <div className="space-y-3">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="glass-card rounded-xl p-4 h-16 animate-pulse border border-border/50" />)
          ) : logs.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border/50 text-center">
              <Shield size={32} className="text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground">No suspicious activity logged</p>
            </div>
          ) : logs.map(log => (
            <div key={log.id} className={`glass-card rounded-xl p-4 border ${SEVERITY_COLORS[log.severity] || 'border-border/50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{EVENT_ICONS[log.event_type] || '⚠️'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white capitalize">{log.event_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.details}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_date).toLocaleString()}</p>
                    {log.admin_note && <p className="text-xs text-neon-purple mt-1">Note: {log.admin_note}</p>}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${SEVERITY_COLORS[log.severity] || ''}`}>
                  {log.severity?.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}