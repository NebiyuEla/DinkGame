import React, { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, Settings, SlidersHorizontal, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { appClient } from '@/api/appClient';

const SETTING_DEFS = [
  { key: 'app_name', label: 'App Name', value: 'Dink Game', category: 'general', type: 'text' },
  { key: 'support_telegram', label: 'Support Telegram Username', value: '', category: 'general', type: 'text' },
  { key: 'game_schedule', label: 'Game Schedule Text', value: 'Every Sunday 9:00 PM', category: 'general', type: 'text' },
  { key: 'welcome_message', label: 'Lobby Welcome Message', value: 'Welcome to Dink Game.', category: 'general', type: 'textarea' },

  { key: 'default_total_questions', label: 'Default Questions Per Game', value: '15', category: 'gameplay', type: 'number', min: 1, max: 100 },
  { key: 'default_question_timer', label: 'Default Question Timer', value: '10', category: 'gameplay', type: 'number', min: 3, max: 120, suffix: 'sec' },
  { key: 'default_max_players', label: 'Default Max Players', value: '10000', category: 'gameplay', type: 'number', min: 1, max: 100000 },
  { key: 'allow_late_join_default', label: 'Allow Late Join By Default', value: 'false', category: 'gameplay', type: 'toggle' },
  { key: 'eliminate_on_wrong', label: 'Eliminate On Wrong Or No Answer', value: 'true', category: 'gameplay', type: 'toggle' },
  { key: 'allow_watch_after_elimination', label: 'Allow Eliminated Users To Watch', value: 'true', category: 'gameplay', type: 'toggle' },
  { key: 'min_answer_options', label: 'Minimum Answer Options', value: '3', category: 'gameplay', type: 'number', min: 3, max: 4 },
  { key: 'max_answer_options', label: 'Maximum Answer Options', value: '4', category: 'gameplay', type: 'number', min: 3, max: 4 },

  { key: 'speed_bonus_max', label: 'Quick Answer Tie Score', value: '50', category: 'scoring', type: 'number', min: 0, max: 10000 },
  { key: 'winner_split_mode', label: 'Winner Payout Mode', value: 'equal_split', category: 'scoring', type: 'select', options: ['equal_split'] },
  { key: 'tie_breaker', label: 'Rank Tie Breaker', value: 'fastest_total_time', category: 'scoring', type: 'select', options: ['fastest_total_time', 'earliest_joined'] },

  { key: 'anti_cheat_threshold', label: 'Warning Before Game Ban', value: '1', category: 'anti-cheat', type: 'number', min: 1, max: 2, suffix: 'warning' },
  { key: 'min_speed_ms', label: 'Minimum Answer Speed', value: '300', category: 'anti-cheat', type: 'number', min: 100, max: 5000, suffix: 'ms' },
  { key: 'max_tab_switches', label: 'Max Tab Switches', value: '2', category: 'anti-cheat', type: 'number', min: 0, max: 20 },
  { key: 'auto_flag_suspicious', label: 'Auto Flag Suspicious Users', value: 'true', category: 'anti-cheat', type: 'toggle' },
  { key: 'auto_ban_after_second_leave', label: 'Ban On Second Leave', value: 'true', category: 'anti-cheat', type: 'toggle' },
  { key: 'block_duplicate_sessions', label: 'Block Duplicate Sessions', value: 'true', category: 'anti-cheat', type: 'toggle' },

  { key: 'platform_fee_percent', label: 'Default Platform Fee', value: '25', category: 'wallet', type: 'number', min: 0, max: 90, suffix: '%' },
  { key: 'auto_prize_from_deposits', label: 'Auto Prize From Deposits', value: 'true', category: 'wallet', type: 'toggle' },
  { key: 'minimum_withdrawal_etb', label: 'Minimum Telebirr Withdrawal', value: '100', category: 'wallet', type: 'number', min: 100, max: 100000, suffix: 'ETB' },
  { key: 'telebirr_withdrawal_enabled', label: 'Telebirr Withdrawal Enabled', value: 'true', category: 'wallet', type: 'toggle' },

  { key: 'entry_payments_enabled', label: 'Entry Payments Enabled', value: 'false', category: 'payments', type: 'toggle' },
  { key: 'payment_provider', label: 'Payment Provider', value: 'chapa', category: 'payments', type: 'select', options: ['chapa', 'manual'] },
  { key: 'chapa_public_key_hint', label: 'Chapa Public Key Hint', value: '', category: 'payments', type: 'text' },
  { key: 'chapa_webhook_required', label: 'Require Chapa Webhook Signature', value: 'true', category: 'payments', type: 'toggle' },

  { key: 'bottom_nav_style', label: 'Bottom Nav Style', value: 'floating', category: 'appearance', type: 'select', options: ['floating', 'solid'] },
];

const CATEGORY_LABELS = {
  general: 'General',
  gameplay: 'Gameplay',
  scoring: 'Scoring',
  'anti-cheat': 'Anti-Cheat',
  wallet: 'Wallet & Payouts',
  payments: 'Payments',
  appearance: 'Appearance',
};

const normalizeValue = (setting) => String(setting.value ?? '');

function SettingControl({ setting, onChange }) {
  if (setting.type === 'toggle') {
    const checked = setting.value === 'true';
    return (
      <button
        type="button"
        onClick={() => onChange(checked ? 'false' : 'true')}
        className={`relative h-8 w-14 rounded-full border transition-colors ${checked ? 'bg-correct-green border-correct-green' : 'bg-navy-dark border-border'}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    );
  }

  if (setting.type === 'select') {
    return (
      <select
        value={setting.value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple"
      >
        {setting.options.map(option => (
          <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
        ))}
      </select>
    );
  }

  if (setting.type === 'textarea') {
    return (
      <textarea
        rows={3}
        value={setting.value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple resize-none"
      />
    );
  }

  return (
    <div className="relative">
      <input
        type={setting.type === 'number' ? 'number' : 'text'}
        min={setting.min}
        max={setting.max}
        value={setting.value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-navy-dark border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-neon-purple"
      />
      {setting.suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{setting.suffix}</span>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState([]);
  const [activeCategory, setActiveCategory] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const stored = await appClient.entities.Setting.list();
      const merged = SETTING_DEFS.map(def => {
        const found = stored.find(s => s.key === def.key);
        return found ? { ...def, value: normalizeValue(found), id: found.id } : def;
      });
      setSettings(merged);
    } catch {
      setSettings(SETTING_DEFS);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stored = await appClient.entities.Setting.list();
      for (const setting of settings) {
        const existing = stored.find(s => s.key === setting.key);
        const payload = {
          key: setting.key,
          value: normalizeValue(setting),
          label: setting.label,
          category: setting.category,
          type: setting.type,
        };
        if (existing) await appClient.entities.Setting.update(existing.id, payload);
        else await appClient.entities.Setting.create(payload);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to save settings.');
    }
    setSaving(false);
  };

  const resetDefaults = () => {
    if (!confirm('Reset visible settings to defaults? Save after reset to apply.')) return;
    setSettings(SETTING_DEFS.map(setting => ({ ...setting })));
  };

  const clearAllData = async () => {
    if (!confirm('Clear every Dink Game record and restore the seeded app state?')) return;
    if (!confirm('This removes users, games, questions, deposits, withdrawals, chats, bans, and logs. Continue?')) return;
    const resetToken = prompt('Enter reset token if Render requires it. Leave blank for local reset.');
    setSaving(true);
    try {
      await appClient.resetAllData(resetToken || '');
      window.location.reload();
    } catch (error) {
      alert(error.message || 'Failed to clear data.');
      setSaving(false);
    }
  };

  const categories = useMemo(() => [...new Set(settings.map(s => s.category))], [settings]);
  const visibleSettings = settings.filter(s => s.category === activeCategory);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-game text-xl font-black text-white flex items-center gap-2">
              <Settings size={20} className="text-neon-purple" /> Settings
            </h1>
            <p className="text-muted-foreground text-sm">Control gameplay, scoring, safety, payments, and UI defaults.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetDefaults}
              className="flex items-center gap-2 bg-navy-light text-muted-foreground font-bold px-4 py-2.5 rounded-xl text-sm">
              <RotateCcw size={14} />
              Defaults
            </button>
            <button onClick={clearAllData} disabled={saving}
              className="flex items-center gap-2 bg-wrong-red/15 text-wrong-red font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
              <Trash2 size={14} />
              Clear Data
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 gradient-purple-blue text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
              <Save size={14} />
              {saved ? 'Saved' : saving ? 'Saving' : 'Save'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="glass-card rounded-2xl p-4 h-20 animate-pulse border border-border/50" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
            <div className="glass-card rounded-2xl border border-border/50 p-2 h-fit">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    activeCategory === category ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-navy-light hover:text-white'
                  }`}
                >
                  <SlidersHorizontal size={14} />
                  {CATEGORY_LABELS[category] || category}
                </button>
              ))}
            </div>

            <div className="glass-card rounded-2xl border border-border/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 bg-navy-light/50">
                <p className="font-bold text-white text-sm">{CATEGORY_LABELS[activeCategory] || activeCategory}</p>
              </div>
              <div className="divide-y divide-border/20">
                {visibleSettings.map(setting => (
                  <div key={setting.key} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-3 md:items-center">
                    <div>
                      <label className="block text-sm font-bold text-white">{setting.label}</label>
                      <p className="text-xs text-muted-foreground mt-0.5">{setting.key}</p>
                    </div>
                    <SettingControl
                      setting={setting}
                      onChange={(value) => setSettings(prev => prev.map(item => item.key === setting.key ? { ...item, value } : item))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
