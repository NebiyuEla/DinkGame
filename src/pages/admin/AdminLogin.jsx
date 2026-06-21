import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAdmin } from '@/lib/adminContext';
import { appClient } from '@/api/appClient';
import DinkLogo from '@/components/DinkLogo';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin } = useAdmin();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const admins = await appClient.entities.AdminUser.filter({ username: form.username, is_active: true });
      if (admins.length === 0) {
        setError('Invalid credentials');
        setLoading(false);
        return;
      }
      const admin = admins[0];
      if (admin.password_hash !== btoa(form.password)) {
        setError('Invalid credentials');
        setLoading(false);
        return;
      }
      await appClient.entities.AdminUser.update(admin.id, { last_login: new Date().toISOString() });
      adminLogin(admin);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Login failed. Check credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="admin-theme min-h-screen gradient-bg flex items-center justify-center px-5 overflow-x-hidden">
      <div className="w-full max-w-[18.5rem] mx-auto min-w-0">
        <div className="text-center mb-8 animate-slide-up">
          <DinkLogo size="md" className="mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Admin Control Center</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-neon-purple/20 animate-slide-up w-full min-w-0" style={{ animationDelay: '0.1s' }}>
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl gradient-purple-blue flex items-center justify-center glow-purple">
              <Lock size={24} className="text-white" />
            </div>
          </div>
          <h1 className="font-game text-lg font-black text-white text-center mb-5">Admin Login</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">USERNAME</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                className="w-full min-w-0 bg-navy-dark border border-border rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-neon-purple transition-colors"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 tracking-widest">PASSWORD</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Password"
                  className="w-full min-w-0 bg-navy-dark border border-border rounded-xl px-4 py-3.5 text-white text-sm outline-none focus:border-neon-purple transition-colors pr-12"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <p className="text-wrong-red text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-purple-blue text-white font-game font-black py-4 rounded-2xl text-base tracking-wider transition-all active:scale-95 disabled:opacity-50 glow-purple mt-2"
            >
              {loading ? 'Verifying...' : 'LOGIN'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
