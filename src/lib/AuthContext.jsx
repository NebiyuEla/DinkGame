import React, { createContext, useContext, useEffect, useState } from 'react';
import { appClient } from '@/api/appClient';
import { getTelegramProfile } from '@/lib/telegram';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({
    public_settings: {
      auth_required: false,
      local_backend: true,
    },
  });

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    setIsLoadingPublicSettings(false);
    setAuthError(null);

    try {
      const telegramProfile = getTelegramProfile();
      let currentUser = telegramProfile
        ? await appClient.auth.loginViaEmailPassword(telegramProfile.email)
        : await appClient.auth.me();
      if (telegramProfile && currentUser?.id) {
        currentUser = await appClient.entities.User.update(currentUser.id, {
          ...telegramProfile,
          telegram_linked: true,
          wallet_balance: Number(currentUser.wallet_balance || 0),
        });
      }
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (error) {
      setAuthError({
        type: 'local_auth_error',
        message: error.message || 'Unable to start local session',
      });
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = checkAppState;

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    await appClient.auth.logout(shouldRedirect ? '/' : undefined);
  };

  const navigateToLogin = () => {
    appClient.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
