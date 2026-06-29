import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { GameProvider } from '@/lib/gameContext';
import { AdminProvider, useAdmin } from '@/lib/adminContext';
import { useEffect, useState } from 'react';
import { useGame } from '@/lib/gameContext';

// User pages
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import LiveGame from './pages/LiveGame';
import Leaderboard from './pages/Leaderboard';
import Winners from './pages/Winners';
import Profile from './pages/Profile';
import Deposit from './pages/Deposit';
import Rules from './pages/Rules';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin routes
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGames from './pages/admin/AdminGames';
import AdminQuestions from './pages/admin/AdminQuestions';
import AdminLiveController from './pages/admin/AdminLiveController';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAntiCheat from './pages/admin/AdminAntiCheat';
import AdminBroadcasts from './pages/admin/AdminBroadcasts';
import AdminWithdrawals from './pages/admin/AdminWithdrawals';
import AdminSettings from './pages/admin/AdminSettings';
import SplashScreen from './components/SplashScreen';
import TelegramGate from './components/TelegramGate';
import WelcomeSplash from './components/WelcomeSplash';
import BottomNav from './components/BottomNav';

function AdminGuard({ children }) {
  const { adminUser, isLoadingAdmin } = useAdmin();
  if (isLoadingAdmin) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!adminUser) return <Navigate to="/admin/login" replace />;
  return children;
}

function PlayerRoute() {
  const { currentUser } = useGame();
  const location = useLocation();
  const showNav = ['/', '/leaderboard', '/winners', '/rules', '/profile'].includes(location.pathname);
  const key = currentUser?.id ? `dink_welcome_seen_${currentUser.id}` : 'dink_welcome_seen_guest';
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.localStorage.getItem(key);
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    setShowWelcome(!window.localStorage.getItem(`dink_welcome_seen_${currentUser.id}`));
  }, [currentUser?.id]);

  const finishWelcome = () => {
    window.localStorage.setItem(key, '1');
    setShowWelcome(false);
  };

  return (
    <TelegramGate>
      {showWelcome && currentUser && <WelcomeSplash user={currentUser} onDone={finishWelcome} />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
      {showNav && <BottomNav />}
    </TelegramGate>
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const [showSplash, setShowSplash] = useState(!sessionStorage.getItem('dink_splashed'));

  const handleSplashDone = () => {
    sessionStorage.setItem('dink_splashed', '1');
    setShowSplash(false);
  };

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  return (
    <>
      {showSplash && <SplashScreen onDone={handleSplashDone} />}
      <Routes>
        {/* Legacy Admin routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/games" element={<AdminGuard><AdminGames /></AdminGuard>} />
        <Route path="/admin/questions" element={<AdminGuard><AdminQuestions /></AdminGuard>} />
        <Route path="/admin/live" element={<AdminGuard><AdminLiveController /></AdminGuard>} />
        <Route path="/admin/users" element={<AdminGuard><AdminUsers /></AdminGuard>} />
        <Route path="/admin/winners" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
        <Route path="/admin/withdrawals" element={<AdminGuard><AdminWithdrawals /></AdminGuard>} />
        <Route path="/admin/broadcasts" element={<AdminGuard><AdminBroadcasts /></AdminGuard>} />
        <Route path="/admin/anticheat" element={<AdminGuard><AdminAntiCheat /></AdminGuard>} />
        <Route path="/admin/settings" element={<AdminGuard><AdminSettings /></AdminGuard>} />
        <Route path="/admin" element={<Navigate to="/admin/login" replace />} />

        {/* Auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* User routes */}
        <Route element={<PlayerRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/game" element={<LiveGame />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/winners" element={<Winners />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/rules" element={<Rules />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <GameProvider>
          <QueryClientProvider client={queryClientInstance}>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </QueryClientProvider>
        </GameProvider>
      </AdminProvider>
    </AuthProvider>
  );
}

export default App;
