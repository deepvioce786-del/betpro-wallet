import { useState, type ReactNode } from 'react';
import {
  ShieldCheck, LogOut, LayoutDashboard, Users, UserCheck, Clock,
  ArrowDownToLine, ArrowUpFromLine, History as HistoryIcon, Wallet,
  Send, Settings, BarChart3, Menu, X, MessageCircle, Megaphone, Share2,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export type AdminSection =
  | 'overview' | 'registrations' | 'deposits' | 'withdrawals'
  | 'users' | 'transactions' | 'wallet' | 'telegram' | 'helpline' | 'announcements'
  | 'settings' | 'referrals' | 'whatsapp';

interface AdminLayoutProps {
  active: AdminSection;
  onNavigate: (s: AdminSection) => void;
  onLogout: () => void;
  adminName: string;
  badgeCounts?: Partial<Record<AdminSection, number>>;
  children: ReactNode;
}

export function AdminLayout({ active, onNavigate, onLogout, adminName, badgeCounts = {}, children }: AdminLayoutProps) {
  const { t } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: { key: AdminSection; label: string; icon: typeof LayoutDashboard }[] = [
    { key: 'overview', label: t.overview, icon: LayoutDashboard },
    { key: 'registrations', label: t.pendingApprovals, icon: Clock },
    { key: 'deposits', label: t.depositRequests, icon: ArrowDownToLine },
    { key: 'withdrawals', label: t.withdrawRequests, icon: ArrowUpFromLine },
    { key: 'users', label: t.userManagement, icon: Users },
    { key: 'transactions', label: t.transactionHistory, icon: HistoryIcon },
    { key: 'wallet', label: t.walletManagement, icon: Wallet },
    { key: 'telegram', label: t.telegramSettings, icon: Send },
    { key: 'helpline', label: t.adminHelpline, icon: MessageCircle },
    { key: 'announcements', label: t.adminAnnouncements, icon: Megaphone },
    { key: 'referrals', label: 'Referrals', icon: Share2 },
    { key: 'whatsapp', label: 'WhatsApp Support Management', icon: MessageCircle },
    { key: 'settings', label: t.systemSettings, icon: Settings },
  ];

  const go = (s: AdminSection) => {
    onNavigate(s);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent navItems={navItems} active={active} onNavigate={go} onLogout={onLogout} adminName={adminName} t={t} badgeCounts={badgeCounts} />
      </aside>

      {/* Sidebar — mobile drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900 animate-slide-in-right">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent navItems={navItems} active={active} onNavigate={go} onLogout={onLogout} adminName={adminName} t={t} badgeCounts={badgeCounts} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100">
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center">
                  <ShieldCheck className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-bold text-slate-900 hidden sm:inline">{t.adminDashboard}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <LanguageSwitcher compact />
              <button onClick={onLogout} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-6xl">
          {children}
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ navItems, active, onNavigate, onLogout, adminName, t, badgeCounts }: {
  navItems: { key: AdminSection; label: string; icon: typeof LayoutDashboard }[];
  active: AdminSection; onNavigate: (s: AdminSection) => void; onLogout: () => void;
  adminName: string; t: ReturnType<typeof useLang>['t'];
  badgeCounts: Partial<Record<AdminSection, number>>;
}) {
  return (
    <>
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{t.adminDashboard}</p>
            <p className="text-xs text-slate-400 leading-tight">{adminName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => {
          const badge = badgeCounts[item.key];
          return (
            <button key={item.key} onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active === item.key ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}>
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1 text-start">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
          <LogOut className="w-4.5 h-4.5" />
          {t.signOut}
        </button>
      </div>
    </>
  );
}

// Re-export icons used by sections
export { BarChart3, UserCheck };
