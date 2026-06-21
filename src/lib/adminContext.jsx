import React, { createContext, useContext, useState, useEffect } from 'react';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  const [adminUser, setAdminUser] = useState(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('dink_admin');
    if (stored) {
      try {
        setAdminUser(JSON.parse(stored));
      } catch (e) {}
    }
    setIsLoadingAdmin(false);
  }, []);

  const adminLogin = (admin) => {
    setAdminUser(admin);
    localStorage.setItem('dink_admin', JSON.stringify(admin));
  };

  const adminLogout = () => {
    setAdminUser(null);
    localStorage.removeItem('dink_admin');
  };

  const hasPermission = (permission) => {
    if (!adminUser) return false;
    if (adminUser.role === 'super_admin') return true;
    const rolePermissions = {
      game_manager: ['games', 'live_controller', 'users', 'leaderboard'],
      question_manager: ['questions'],
      wallet_manager: ['wallet', 'payments', 'withdrawals'],
      viewer: ['dashboard']
    };
    return (rolePermissions[adminUser.role] || []).includes(permission);
  };

  return (
    <AdminContext.Provider value={{ adminUser, isLoadingAdmin, adminLogin, adminLogout, hasPermission }}>
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
