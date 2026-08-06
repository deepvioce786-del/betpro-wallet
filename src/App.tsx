import { useEffect } from 'react';
import { LanguageProvider, useLang } from '@/lib/LanguageContext';
import { RouterProvider, useRouter } from '@/lib/Router';
import { UserAuthProvider, useUserAuth } from '@/lib/UserAuthContext';
import { Navbar } from '@/components/Navbar';
import { HomePage } from '@/pages/HomePage';
import { SignUpPage } from '@/pages/SignUpPage';
import { SignInPage } from '@/pages/SignInPage';
import { PendingPage } from '@/pages/PendingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { DepositPage } from '@/pages/DepositPage';
import { WithdrawPage } from '@/pages/WithdrawPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { getAdminToken } from '@/lib/adminAuth';
import { HelplinePage } from '@/pages/HelplinePage';
import { ReferralPage } from '@/pages/ReferralPage';

function AppContent() {
  const { route } = useRouter();
  const { username, signOut, loading: authLoading } = useUserAuth();
  const { t } = useLang();

  // Update document title per route
  useEffect(() => {
    const titles: Record<string, string> = {
      home: t.appName,
      signup: `${t.signUp} — ${t.appName}`,
      signin: `${t.signIn} — ${t.appName}`,
      pending: `${t.pendingTitle} — ${t.appName}`,
      dashboard: `${t.dashboard} — ${t.appName}`,
      deposit: `${t.deposit} — ${t.appName}`,
      withdraw: `${t.withdraw} — ${t.appName}`,
      history: `${t.history} — ${t.appName}`,
      helpline: `${t.helpline} — ${t.appName}`,
      admin: `${t.adminLogin} — ${t.appName}`,
      'admin-dashboard': `${t.adminDashboard} — ${t.appName}`,
    };
    document.title = titles[route] || t.appName;
  }, [route, t]);

  // Protected routes: redirect to sign-in if not authenticated and not loading
  const protectedRoutes = ['dashboard', 'deposit', 'withdraw', 'history', 'helpline', 'referral'];
  if (!authLoading && !username && protectedRoutes.includes(route)) {
    // Redirect after render
    setTimeout(() => { window.location.hash = '#/signin'; }, 0);
    return null;
  }

  // Admin dashboard requires an admin token in localStorage
  if (route === 'admin-dashboard' && !getAdminToken()) {
    setTimeout(() => { window.location.hash = '#/signin'; }, 0);
    return null;
  }

  // Auto-redirect: if on sign-in page but already logged in, go to the right dashboard
  if (route === 'signin' && !authLoading) {
    if (getAdminToken()) {
      setTimeout(() => { window.location.hash = '#/admin-dashboard'; }, 0);
      return null;
    }
    if (username) {
      setTimeout(() => { window.location.hash = '#/dashboard'; }, 0);
      return null;
    }
  }

  // If navigating to the old admin route, redirect to sign-in (unified login)
  if (route === 'admin') {
    setTimeout(() => { window.location.hash = '#/signin'; }, 0);
    return null;
  }

  // While session is being restored on refresh, show nothing for protected routes
  // to avoid a flash of the sign-in page before the session resolves
  if (authLoading && protectedRoutes.includes(route)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Admin dashboard has its own full-screen dark layout; no public navbar.
  const isAdminRoute = route === 'admin-dashboard';
  // Pending page is a focused full-screen flow; no navbar.
  const isFocusedRoute = route === 'pending';

  const showNavbar = !isAdminRoute && !isFocusedRoute;
  const isLoggedIn = !!username;

  const handleSignOut = async () => {
    await signOut();
  };

  let page: React.ReactNode;
  switch (route) {
    case 'home':
      page = <HomePage />;
      break;
    case 'signup':
      page = <SignUpPage />;
      break;
    case 'signin':
      page = <SignInPage />;
      break;
    case 'pending':
      page = <PendingPage />;
      break;
    case 'dashboard':
      page = <DashboardPage />;
      break;
    case 'deposit':
      page = <DepositPage />;
      break;
    case 'withdraw':
      page = <WithdrawPage />;
      break;
    case 'history':
      page = <HistoryPage />;
      break;
    case 'helpline':
      page = <HelplinePage />;
      break;
    case 'referral':
      page = <ReferralPage />;
      break;
    case 'admin-dashboard':
      page = <AdminDashboardPage />;
      break;
    default:
      page = <HomePage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {showNavbar && <Navbar isLoggedIn={isLoggedIn} username={username || undefined} onSignOut={handleSignOut} />}
      {page}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <RouterProvider>
        <UserAuthProvider>
          <AppContent />
        </UserAuthProvider>
      </RouterProvider>
    </LanguageProvider>
  );
}
