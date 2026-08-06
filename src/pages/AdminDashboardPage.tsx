import { useEffect, useState, type ReactNode } from 'react';
import {
  Loader2, Check, X, AlertCircle, CheckCircle2, Search, Users as UsersIcon,
  TrendingUp, TrendingDown, Clock, Wallet, Send, Save, RefreshCw,
  ExternalLink, Ban, CheckCircle, Plus, Minus, History as HistoryIcon, KeyRound, Webhook,
  ArrowDownToLine, ArrowUpFromLine, MessageCircle, Megaphone, Trash2, Pencil,
  Eye, Copy, AlertTriangle, Share2, Pin,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { AdminLayout, type AdminSection } from '@/components/AdminLayout';
import { CopyField } from '@/components/CopyField';
import { getAdminToken, clearAdminToken } from '@/lib/adminAuth';
import {
  adminGetStats, adminGetRegistrations, adminApproveRegistration, adminRejectRegistration,
  adminGetDeposits, adminGetWithdrawals, adminApproveDeposit, adminRejectDeposit,
  adminApproveWithdraw, adminRejectWithdraw, adminGetUsers, adminSuspendUser, adminActivateUser,
  adminAdjustBalance, adminGetUserTransactions, adminGetAllTransactions,
  adminUpdateUsername, adminChangeUserPassword,
  adminGetConfig, adminSaveConfig, adminTestTelegram, adminSetWebhook, adminGetWebhookInfo,
  adminLogout, adminGetHelpline, adminReplyHelpline, adminMarkHelplineRead,
  adminGetAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement,
  adminGetReferrals, adminUpdateReferralStatus,
  validatePassword, type AdminAnnouncement, type ReferralEvent,
} from '@/lib/api';
import type {
  AdminStats, AdminRegistration, AdminDeposit, AdminWithdraw, AdminUser,
  AdminTransaction, AdminConfig, HelplineConversation,
} from '@/lib/types';

const WEBHOOK_HINT = 'https://your-project.supabase.co/functions/v1/telegram-webhook';

export function AdminDashboardPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [section, setSection] = useState<AdminSection>('overview');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [registrations, setRegistrations] = useState<AdminRegistration[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdraw[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allTxns, setAllTxns] = useState<AdminTransaction[]>([]);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [conversations, setConversations] = useState<HelplineConversation[]>([]);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [referrals, setReferrals] = useState<ReferralEvent[]>([]);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const tk = getAdminToken();
    if (!tk) { navigate('signin'); return; }
    setToken(tk);
    loadInitial(tk);
  }, [navigate]);

  // Auto-refresh helpline conversations when admin is on helpline section
  useEffect(() => {
    if (section !== 'helpline' || !token) return;
    const interval = setInterval(async () => {
      const r = await adminGetHelpline(token);
      if (r.conversations) setConversations(r.conversations);
      if (r.error) showToast('err', r.error);
    }, 5000);
    return () => clearInterval(interval);
  }, [section, token]);

  const loadInitial = async (tk: string) => {
    setLoading(true);
    const [statsRes, regsRes, depsRes, wdsRes, usersRes, cfgRes] = await Promise.all([
      adminGetStats(tk), adminGetRegistrations(tk),
      adminGetDeposits(tk, 'pending'), adminGetWithdrawals(tk, 'pending'),
      adminGetUsers(tk), adminGetConfig(tk),
    ]);
    if (statsRes.stats) setStats(statsRes.stats);
    if (regsRes.registrations) setRegistrations(regsRes.registrations);
    if (depsRes.deposits) setDeposits(depsRes.deposits);
    if (wdsRes.withdrawals) setWithdrawals(wdsRes.withdrawals);
    if (usersRes.users) setUsers(usersRes.users);
    if (cfgRes.config) setConfig(cfgRes.config);
    setLoading(false);
  };

  const reloadSection = async (s: AdminSection) => {
    if (!token) return;
    if (s === 'registrations') { const r = await adminGetRegistrations(token); if (r.registrations) setRegistrations(r.registrations); }
    if (s === 'deposits') { const r = await adminGetDeposits(token, 'pending'); if (r.deposits) setDeposits(r.deposits); }
    if (s === 'withdrawals') { const r = await adminGetWithdrawals(token, 'pending'); if (r.withdrawals) setWithdrawals(r.withdrawals); }
    if (s === 'users') { const r = await adminGetUsers(token); if (r.users) setUsers(r.users); }
    if (s === 'transactions') { const r = await adminGetAllTransactions(token); if (r.transactions) setAllTxns(r.transactions); }
    if (s === 'helpline') { const r = await adminGetHelpline(token); if (r.conversations) setConversations(r.conversations); }
    if (s === 'announcements') { const r = await adminGetAnnouncements(token); if (r.announcements) setAnnouncements(r.announcements); }
    if (s === 'referrals') { const r = await adminGetReferrals(token); if (r.referrals) setReferrals(r.referrals); }
    const sRes = await adminGetStats(token); if (sRes.stats) setStats(sRes.stats);
  };

  const handleLogout = async () => {
    if (token) await adminLogout(token);
    clearAdminToken();
    navigate('signin');
  };

  const fmtDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };
  const fmtAmt = (n: number) => `Rs ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const badgeCounts: Partial<Record<AdminSection, number>> = {
    registrations: registrations.filter((r) => r.status === 'pending').length,
    deposits: deposits.length,
    withdrawals: withdrawals.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <AdminLayout active={section} onNavigate={setSection} onLogout={handleLogout} adminName={config?.adminUsername || 'Admin'} badgeCounts={badgeCounts}>
      {toast && (
        <div className={`mb-5 flex items-center gap-2.5 p-3.5 rounded-xl text-sm animate-fade-in ${
          toast.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.type === 'ok' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {section === 'overview' && <OverviewSection stats={stats} t={t} dir={dir} onNavigate={setSection} badgeCounts={badgeCounts} />}
      {section === 'registrations' && (
        <RegistrationsSection registrations={registrations} token={token} t={t} dir={dir}
          onApprove={async (id) => { const r = await adminApproveRegistration(token!, id); if (r.ok) { showToast('ok', t.approve); reloadSection('registrations'); } else showToast('err', r.error || 'Failed'); }}
          onReject={async (id) => { const r = await adminRejectRegistration(token!, id); if (r.ok) { showToast('ok', t.reject); reloadSection('registrations'); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'deposits' && (
        <DepositsSection deposits={deposits} token={token} t={t} dir={dir} fmtDate={fmtDate} fmtAmt={fmtAmt}
          onApprove={async (id) => { const r = await adminApproveDeposit(token!, id); if (r.ok) { showToast('ok', t.approve); reloadSection('deposits'); } else showToast('err', r.error || 'Failed'); }}
          onReject={async (id) => { const r = await adminRejectDeposit(token!, id); if (r.ok) { showToast('ok', t.reject); reloadSection('deposits'); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'withdrawals' && (
        <WithdrawalsSection withdrawals={withdrawals} token={token} t={t} dir={dir} fmtDate={fmtDate} fmtAmt={fmtAmt}
          onApprove={async (id) => { const r = await adminApproveWithdraw(token!, id); if (r.ok) { showToast('ok', t.approve); reloadSection('withdrawals'); } else showToast('err', r.error || 'Failed'); }}
          onReject={async (id) => { const r = await adminRejectWithdraw(token!, id); if (r.ok) { showToast('ok', t.reject); reloadSection('withdrawals'); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'users' && (
        <UsersSection users={users} token={token} t={t} dir={dir} fmtDate={fmtDate} fmtAmt={fmtAmt}
          onSuspend={async (wid) => { const r = await adminSuspendUser(token!, wid); if (r.ok) { showToast('ok', t.suspendUser); reloadSection('users'); } else showToast('err', r.error || 'Failed'); }}
          onActivate={async (wid) => { const r = await adminActivateUser(token!, wid); if (r.ok) { showToast('ok', t.activateUser); reloadSection('users'); } else showToast('err', r.error || 'Failed'); }}
          onAdjust={async (wid, amt, action, note) => { const r = await adminAdjustBalance(token!, wid, amt, action, note); if (r.ok) { showToast('ok', t.save); reloadSection('users'); } else showToast('err', r.error || 'Failed'); }}
          onViewHistory={async (wid) => { const r = await adminGetUserTransactions(token!, wid); return r.transactions || []; }}
          onEditUsername={async (regId, newUsername) => { const r = await adminUpdateUsername(token!, regId, newUsername); if (r.ok) { showToast('ok', t.usernameUpdatedSuccess); reloadSection('users'); } else showToast('err', r.error || 'Failed'); }}
          onChangePassword={async (regId, newPassword) => { const r = await adminChangeUserPassword(token!, regId, newPassword); if (r.ok) { showToast('ok', t.passwordUpdatedSuccess); reloadSection('users'); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'transactions' && (
        <TransactionsSection token={token} t={t} dir={dir} fmtDate={fmtDate} fmtAmt={fmtAmt} transactions={allTxns} onLoad={async () => { const r = await adminGetAllTransactions(token!); if (r.transactions) setAllTxns(r.transactions); }} />
      )}
      {section === 'wallet' && config && (
        <WalletSection config={config} token={token} t={t} dir={dir}
          onSave={async (payload) => { const r = await adminSaveConfig(token!, payload); if (r.ok) { showToast('ok', t.save); const c = await adminGetConfig(token!); if (c.config) setConfig(c.config); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'telegram' && config && (
        <TelegramSection config={config} token={token} t={t} dir={dir}
          onSave={async (payload) => { const r = await adminSaveConfig(token!, payload); if (r.ok) { showToast('ok', t.save); const c = await adminGetConfig(token!); if (c.config) setConfig(c.config); } else showToast('err', r.error || 'Failed'); }}
          onTest={async (bt, ci) => { const r = await adminTestTelegram(token!, bt, ci); if (r.ok) showToast('ok', t.testSuccess); else showToast('err', r.error || t.testFailed); }}
          onSetWebhook={async (url) => { const r = await adminSetWebhook(token!, url); if (r.ok) showToast('ok', t.setWebhook); else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'helpline' && (
        <HelplineSection conversations={conversations} token={token} t={t} dir={dir} fmtDate={fmtDate}
          onReply={async (rid, msg) => { const r = await adminReplyHelpline(token!, rid, msg); if (r.ok) { showToast('ok', t.save); const c = await adminGetHelpline(token!); if (c.conversations) setConversations(c.conversations); } else showToast('err', r.error || 'Failed'); }}
          onMarkRead={async (rid) => { await adminMarkHelplineRead(token!, rid); const c = await adminGetHelpline(token!); if (c.conversations) setConversations(c.conversations); }}
        />
      )}
      {section === 'announcements' && (
        <AnnouncementsSection announcements={announcements} token={token} t={t} dir={dir} fmtDate={fmtDate}
          onCreate={async (title, body, isPinned) => { const r = await adminCreateAnnouncement(token!, title, body, isPinned); if (r.ok) { showToast('ok', t.save); const a = await adminGetAnnouncements(token!); if (a.announcements) setAnnouncements(a.announcements); } else showToast('err', r.error || 'Failed'); }}
          onUpdate={async (id, payload) => { const r = await adminUpdateAnnouncement(token!, id, payload); if (r.ok) { showToast('ok', t.save); const a = await adminGetAnnouncements(token!); if (a.announcements) setAnnouncements(a.announcements); } else showToast('err', r.error || 'Failed'); }}
          onDelete={async (id) => { const r = await adminDeleteAnnouncement(token!, id); if (r.ok) { showToast('ok', t.save); const a = await adminGetAnnouncements(token!); if (a.announcements) setAnnouncements(a.announcements); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'referrals' && (
        <ReferralsSection
          referrals={referrals}
          onRefresh={async () => { const r = await adminGetReferrals(token!); if (r.referrals) setReferrals(r.referrals); }}
          onUpdateStatus={async (id, status) => { const r = await adminUpdateReferralStatus(token!, id, status); if (r.ok) { showToast('ok', 'Status updated'); const ref = await adminGetReferrals(token!); if (ref.referrals) setReferrals(ref.referrals); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'whatsapp' && config && (
        <WhatsAppSection config={config} t={t} dir={dir}
          onSave={async (payload) => { const r = await adminSaveConfig(token!, payload); if (r.ok) { showToast('ok', t.save); const c = await adminGetConfig(token!); if (c.config) setConfig(c.config); } else showToast('err', r.error || 'Failed'); }}
        />
      )}
      {section === 'settings' && config && (
        <SettingsSection config={config} token={token} t={t} dir={dir}
          onSave={async (payload) => {
            if (payload.newAdminPassword) {
              const pwErr = validatePassword(payload.newAdminPassword);
              if (pwErr) { showToast('err', pwErr); return; }
            }
            const r = await adminSaveConfig(token!, payload); if (r.ok) { showToast('ok', t.save); const c = await adminGetConfig(token!); if (c.config) setConfig(c.config); } else showToast('err', r.error || 'Failed');
          }}
        />
      )}

    </AdminLayout>
  );
}

// ============ OVERVIEW ============
function OverviewSection({ stats, t, dir, onNavigate, badgeCounts }: {
  stats: AdminStats | null; t: ReturnType<typeof useLang>['t']; dir: string;
  onNavigate: (s: AdminSection) => void; badgeCounts: Partial<Record<AdminSection, number>>;
}) {
  const cards = [
    { label: t.totalUsers, value: stats?.total_users ?? 0, icon: UsersIcon, color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
    { label: t.activeUsers, value: stats?.active_users ?? 0, icon: CheckCircle, color: 'from-teal-500 to-emerald-500', bg: 'bg-teal-50', iconColor: 'text-teal-600' },
    { label: t.pendingUsers, value: stats?.pending_users ?? 0, icon: Clock, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
    { label: t.totalDeposits, value: `Rs ${(stats?.total_deposits ?? 0).toLocaleString()}`, icon: TrendingUp, color: 'from-green-500 to-teal-500', bg: 'bg-green-50', iconColor: 'text-green-600' },
    { label: t.totalWithdrawals, value: `Rs ${(stats?.total_withdrawals ?? 0).toLocaleString()}`, icon: TrendingDown, color: 'from-slate-600 to-slate-700', bg: 'bg-slate-100', iconColor: 'text-slate-600' },
    { label: t.pendingReqs, value: stats?.pending_requests ?? 0, icon: Clock, color: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', iconColor: 'text-purple-600' },
    { label: t.walletBalanceStats, value: `Rs ${(stats?.wallet_balance_total ?? 0).toLocaleString()}`, icon: Wallet, color: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  ];

  const quickLinks: { section: AdminSection; label: string; count?: number }[] = [
    { section: 'registrations', label: t.pendingApprovals, count: badgeCounts.registrations },
    { section: 'deposits', label: t.depositRequests, count: badgeCounts.deposits },
    { section: 'withdrawals', label: t.withdrawRequests, count: badgeCounts.withdrawals },
  ];

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.overview}</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <div key={i} className={`bg-white rounded-2xl border border-slate-200 p-5 animate-fade-in-up delay-${Math.min(i + 1, 5) * 100}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-5 h-5 ${c.iconColor}`} />
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-1">{c.label}</p>
            <p className="text-xl font-extrabold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-lg font-bold text-slate-900 mb-4">{t.actions}</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {quickLinks.map((ql) => (
          <button key={ql.section} onClick={() => onNavigate(ql.section)}
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition-all">
            <span className="font-semibold text-slate-700 text-sm">{ql.label}</span>
            {ql.count !== undefined && ql.count > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-amber-500 text-white text-xs font-bold">{ql.count}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============ REGISTRATIONS ============
function RegistrationsSection({ registrations, t, onApprove, onReject }: {
  registrations: AdminRegistration[]; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const counts = {
    all: registrations.length,
    pending: registrations.filter((r) => r.status === 'pending').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
  };

  const filtered = filter === 'all' ? registrations : registrations.filter((r) => r.status === filter);

  const statusBadge = (status: string) => {
    if (status === 'approved') return 'bg-green-50 text-green-700 border-green-200';
    if (status === 'rejected') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };
  const statusLabel = (status: string) => status === 'approved' ? t.approved : status === 'rejected' ? t.rejected : t.pending;

  const tabs: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: t.allRegistrations, count: counts.all },
    { key: 'pending', label: t.pending, count: counts.pending },
    { key: 'approved', label: t.approved, count: counts.approved },
    { key: 'rejected', label: t.rejected, count: counts.rejected },
  ];

  if (registrations.length === 0) {
    return <EmptyState icon={Clock} label={t.noPendingRequests} />;
  }
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.allRegistrations}</h1>

      <div className="flex flex-wrap gap-2 mb-5">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === tab.key ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300'
            }`}>
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${filter === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Clock} label={t.noPendingRequests} />
      ) : (
        <div className="space-y-3">
          {filtered.map((reg) => (
            <div key={reg.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-slate-900">{reg.full_name}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(reg.status)}`}>{statusLabel(reg.status)}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <CopyField label={t.usernameCol} value={reg.username} copyLabel={t.copy} copiedLabel={t.copied} />
                    <CopyField label={t.passwordCol} value={reg.password_plain || '—'} copyLabel={t.copy} copiedLabel={t.copied} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 mt-3">
                    <p><span className="text-slate-400">{t.phoneCol}:</span> <span className="font-medium text-slate-800">{reg.phone_number}</span></p>
                    <p><span className="text-slate-400">{t.registeredAt}:</span> {new Date(reg.created_at).toLocaleString()}</p>
                  </div>
                </div>
                {reg.status === 'pending' && (
                  <div className="flex gap-2 shrink-0">
                    <ActionBtn onClick={() => onApprove(reg.id)} variant="approve" icon={Check} label={t.approve} />
                    <ActionBtn onClick={() => onReject(reg.id)} variant="reject" icon={X} label={t.reject} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ DEPOSITS ============
function DepositsSection({ deposits, t, dir, fmtDate, fmtAmt, onApprove, onReject }: {
  deposits: AdminDeposit[]; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  fmtDate: (s: string) => string; fmtAmt: (n: number) => string;
  onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  if (deposits.length === 0) return <EmptyState icon={ArrowDownToLine} label={t.noDeposits} />;
  const methodLabel = (m: string) => m === 'easypaisa' ? t.easypaisa : m === 'jazzcash' ? t.jazzcash : t.bankAccount;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.depositRequests}</h1>
      <div className="space-y-3">
        {deposits.map((dep) => (
          <div key={dep.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-slate-900">{dep.owner_username}</span>
                  <span className="font-bold text-teal-700">{fmtAmt(dep.amount)}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">{t.pending}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                  <p><span className="text-slate-400">{t.method}:</span> {methodLabel(dep.payment_method)}</p>
                  <p><span className="text-slate-400">{t.date}:</span> {fmtDate(dep.created_at)}</p>
                </div>
                {dep.screenshot_url && (
                  <a href={dep.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 mt-2">
                    <ExternalLink className="w-3.5 h-3.5" /> {t.viewScreenshot}
                  </a>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <ActionBtn onClick={() => onApprove(dep.id)} variant="approve" icon={Check} label={t.approve} />
                <ActionBtn onClick={() => onReject(dep.id)} variant="reject" icon={X} label={t.reject} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ WITHDRAWALS ============
function WithdrawalsSection({ withdrawals, t, dir, fmtDate, fmtAmt, onApprove, onReject }: {
  withdrawals: AdminWithdraw[]; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  fmtDate: (s: string) => string; fmtAmt: (n: number) => string;
  onApprove: (id: string) => void; onReject: (id: string) => void;
}) {
  if (withdrawals.length === 0) return <EmptyState icon={ArrowUpFromLine} label={t.noWithdrawals} />;
  const methodLabel = (m: string) => m === 'easypaisa' ? t.easypaisa : m === 'jazzcash' ? t.jazzcash : t.bankAccount;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.withdrawRequests}</h1>
      <div className="space-y-3">
        {withdrawals.map((wd) => (
          <div key={wd.id} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-bold text-slate-900">{wd.owner_username}</span>
                  <span className="font-bold text-slate-700">{fmtAmt(wd.amount)}</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">{t.pending}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600">
                  <p><span className="text-slate-400">{t.method}:</span> {methodLabel(wd.payment_method)}</p>
                  <p><span className="text-slate-400">{t.accountNumber}:</span> <span className="font-mono">{wd.account_detail}</span></p>
                  {wd.account_holder_name && <p><span className="text-slate-400">{t.accountHolder}:</span> {wd.account_holder_name}</p>}
                  <p><span className="text-slate-400">{t.date}:</span> {fmtDate(wd.created_at)}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <ActionBtn onClick={() => onApprove(wd.id)} variant="approve" icon={Check} label={t.approve} />
                <ActionBtn onClick={() => onReject(wd.id)} variant="reject" icon={X} label={t.reject} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ USERS ============
function UsersSection({ users, t, dir, fmtDate, fmtAmt, onSuspend, onActivate, onAdjust, onViewHistory, onEditUsername, onChangePassword }: {
  users: AdminUser[]; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  fmtDate: (s: string) => string; fmtAmt: (n: number) => string;
  onSuspend: (wid: string) => void; onActivate: (wid: string) => void;
  onAdjust: (wid: string, amt: number, action: 'add' | 'remove', note?: string) => void;
  onViewHistory: (wid: string) => Promise<AdminTransaction[]>;
  onEditUsername: (regId: string, newUsername: string) => Promise<void>;
  onChangePassword: (regId: string, newPassword: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [historyUser, setHistoryUser] = useState<{ name: string; txns: AdminTransaction[] } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [newUsernameInput, setNewUsernameInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q) || u.phone_number.includes(q);
  });

  const handleViewHistory = async (wid: string, name: string) => {
    setLoadingHistory(true);
    const txns = await onViewHistory(wid);
    setHistoryUser({ name, txns });
    setLoadingHistory(false);
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.userManagement}</h1>

      <div className="relative mb-5">
        <Search className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder}
          className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900`} />
      </div>

      {filtered.length === 0 ? <EmptyState icon={UsersIcon} label={t.noUsers} /> : (
        <div className="space-y-3">
          {filtered.map((u) => {
            const wallet = u.wallet_accounts?.[0];
            const isActive = wallet?.is_active ?? false;
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-slate-900">{u.full_name}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}>{isActive ? t.active : t.suspended}</span>
                    </div>
                    <div className="grid sm:grid-cols-4 gap-x-6 gap-y-1 text-sm text-slate-600">
                      <p><span className="text-slate-400">{t.usernameCol}:</span> <span className="font-mono font-medium text-slate-800">{u.username}</span></p>
                      <p><span className="text-slate-400">{t.phoneCol}:</span> {u.phone_number}</p>
                      <p><span className="text-slate-400">Password:</span> <span className="font-mono font-medium text-slate-800">{u.password_plain || '—'}</span></p>
                      <p><span className="text-slate-400">{t.balanceCol}:</span> <span className="font-bold text-slate-800">{wallet ? fmtAmt(wallet.balance) : 'N/A'}</span></p>
                    </div>
                  </div>
                  {wallet && (
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <ActionBtn onClick={() => { setEditUser(u); setNewUsernameInput(u.username); setUsernameError(''); setShowConfirm(false); }} variant="neutral" icon={Pencil} label={t.editUsername} small />
                      <button onClick={() => { setPasswordUser(u); setNewPasswordInput(''); setConfirmPasswordInput(''); setPasswordError(''); setShowPwConfirm(false); }} title={t.changePassword} className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 hover:bg-teal-100 text-slate-600 hover:text-teal-700 transition-colors shrink-0">
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      <ActionBtn onClick={() => setAdjustUser(u)} variant="neutral" icon={Plus} label={t.adjustBalance} small />
                      {isActive ? (
                        <ActionBtn onClick={() => onSuspend(wallet.id)} variant="reject" icon={Ban} label={t.suspendUser} small />
                      ) : (
                        <ActionBtn onClick={() => onActivate(wallet.id)} variant="approve" icon={CheckCircle} label={t.activateUser} small />
                      )}
                      <ActionBtn onClick={() => handleViewHistory(wallet.id, u.full_name)} variant="neutral" icon={HistoryIcon} label={t.viewHistory} small />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adjust Balance Modal */}
      {adjustUser && (
        <AdjustModal user={adjustUser} t={t} dir={dir}
          onClose={() => setAdjustUser(null)}
          onSubmit={(amt, action, note) => { const wid = adjustUser.wallet_accounts?.[0]?.id; if (wid) onAdjust(wid, amt, action, note); setAdjustUser(null); }}
        />
      )}

      {/* Edit Username Modal */}
      {editUser && (
        <EditUsernameModal user={editUser} t={t} dir={dir}
          newUsername={newUsernameInput}
          onNewUsernameChange={(v) => { setNewUsernameInput(v); setUsernameError(''); }}
          showConfirm={showConfirm}
          saving={savingUsername}
          error={usernameError}
          onProceed={() => setShowConfirm(true)}
          onCancelConfirm={() => setShowConfirm(false)}
          onConfirm={async () => {
            const trimmed = newUsernameInput.trim();
            if (!trimmed || trimmed.length < 3) { setUsernameError(t.usernameTaken); return; }
            if (trimmed.toLowerCase() === editUser.username.toLowerCase()) { setEditUser(null); return; }
            setSavingUsername(true);
            await onEditUsername(editUser.id, trimmed);
            setSavingUsername(false);
            setEditUser(null);
            setShowConfirm(false);
          }}
          onClose={() => { setEditUser(null); setShowConfirm(false); setUsernameError(''); }}
        />
      )}

      {/* Change Password Modal */}
      {passwordUser && (
        <ChangePasswordModal user={passwordUser} t={t} dir={dir}
          newPassword={newPasswordInput}
          confirmPassword={confirmPasswordInput}
          onNewPasswordChange={(v) => { setNewPasswordInput(v); setPasswordError(''); }}
          onConfirmPasswordChange={(v) => { setConfirmPasswordInput(v); setPasswordError(''); }}
          showConfirm={showPwConfirm}
          saving={savingPassword}
          error={passwordError}
          onProceed={() => {
            const pwErr = validatePassword(newPasswordInput);
            if (pwErr) { setPasswordError(pwErr); return; }
            if (newPasswordInput !== confirmPasswordInput) { setPasswordError(t.passwordMismatch); return; }
            setShowPwConfirm(true);
          }}
          onCancelConfirm={() => setShowPwConfirm(false)}
          onConfirm={async () => {
            setSavingPassword(true);
            await onChangePassword(passwordUser.id, newPasswordInput);
            setSavingPassword(false);
            setPasswordUser(null);
            setShowPwConfirm(false);
          }}
          onClose={() => { setPasswordUser(null); setShowPwConfirm(false); setPasswordError(''); }}
        />
      )}

      {/* History Modal */}
      {historyUser && (
        <Modal title={`${t.userHistory} — ${historyUser.name}`} onClose={() => setHistoryUser(null)} t={t}>
          {loadingHistory ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
          ) : historyUser.txns.length === 0 ? (
            <p className="text-center text-slate-500 py-8">{t.noTransactions}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {historyUser.txns.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <span className={`font-semibold text-sm ${tx.type === 'deposit' ? 'text-teal-700' : 'text-slate-700'}`}>
                      {tx.type === 'deposit' ? '+' : '-'} {fmtAmt(tx.amount)}
                    </span>
                    <p className="text-xs text-slate-400">{tx.note} · {fmtDate(tx.created_at)}</p>
                  </div>
                  <span className="text-xs text-slate-400">{tx.status}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ============ TRANSACTIONS ============
function TransactionsSection({ t, dir, fmtDate, fmtAmt, transactions, onLoad }: {
  token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  fmtDate: (s: string) => string; fmtAmt: (n: number) => string;
  transactions: AdminTransaction[]; onLoad: () => void;
}) {
  useEffect(() => { onLoad(); }, [onLoad]);
  const statusBadge = (s: string) => {
    const map: Record<string, string> = { pending: 'bg-amber-50 text-amber-700 border-amber-200', approved: 'bg-green-50 text-green-700 border-green-200', rejected: 'bg-red-50 text-red-700 border-red-200' };
    return map[s] || 'bg-slate-50 text-slate-700 border-slate-200';
  };
  const statusLabel = (s: string) => s === 'approved' ? t.successful : s === 'pending' ? t.pending : s === 'rejected' ? t.rejected : s;
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.transactionHistory}</h1>
      {transactions.length === 0 ? <EmptyState icon={HistoryIcon} label={t.noTransactions} /> : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => (
              <div key={tx.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'deposit' ? 'bg-teal-50' : 'bg-slate-100'}`}>
                    {tx.type === 'deposit' ? <ArrowDownToLine className="w-4.5 h-4.5 text-teal-600" /> : <ArrowUpFromLine className="w-4.5 h-4.5 text-slate-600" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{tx.owner_username}</p>
                    <p className="text-xs text-slate-400">{fmtDate(tx.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`font-bold text-sm ${tx.type === 'deposit' ? 'text-teal-700' : 'text-slate-700'}`}>{tx.type === 'deposit' ? '+' : '-'}{fmtAmt(tx.amount)}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(tx.status)}`}>{statusLabel(tx.status)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ WALLET MANAGEMENT ============
function WalletSection({ config, t, dir, onSave }: {
  config: AdminConfig; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  onSave: (payload: Record<string, string>) => void;
}) {
  const [easypaisaName, setEasypaisaName] = useState(config.easypaisa.name);
  const [easypaisaNumber, setEasypaisaNumber] = useState(config.easypaisa.number);
  const [jazzcashName, setJazzcashName] = useState(config.jazzcash.name);
  const [jazzcashNumber, setJazzcashNumber] = useState(config.jazzcash.number);
  const [bankName, setBankName] = useState(config.bank.name);
  const [bankHolder, setBankHolder] = useState(config.bank.holder);
  const [bankAccount, setBankAccount] = useState(config.bank.account);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.walletManagement}</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <ConfigCard title={t.easypaisa} icon={Send} t={t}>
          <ConfigInput label={t.easypaisaName} value={easypaisaName} onChange={setEasypaisaName} dir={dir} />
          <ConfigInput label={t.easypaisaNumber} value={easypaisaNumber} onChange={setEasypaisaNumber} dir={dir} mono />
        </ConfigCard>
        <ConfigCard title={t.jazzcash} icon={Wallet} t={t}>
          <ConfigInput label={t.jazzcashName} value={jazzcashName} onChange={setJazzcashName} dir={dir} />
          <ConfigInput label={t.jazzcashNumber} value={jazzcashNumber} onChange={setJazzcashNumber} dir={dir} mono />
        </ConfigCard>
        <ConfigCard title={t.bankAccount} icon={Wallet} t={t}>
          <ConfigInput label={t.bankName} value={bankName} onChange={setBankName} dir={dir} />
          <ConfigInput label={t.bankHolder} value={bankHolder} onChange={setBankHolder} dir={dir} />
          <ConfigInput label={t.bankAccountNumber} value={bankAccount} onChange={setBankAccount} dir={dir} mono />
        </ConfigCard>
      </div>
      <button onClick={() => onSave({ easypaisaName, easypaisaNumber, jazzcashName, jazzcashNumber, bankName, bankHolder, bankAccount })}
        className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg transition-all">
        <Save className="w-5 h-5" /> {t.saveSettings}
      </button>
    </div>
  );
}

// ============ TELEGRAM SETTINGS ============
function TelegramSection({ config, t, dir, onSave, onTest, onSetWebhook }: {
  config: AdminConfig; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  onSave: (payload: Record<string, string>) => void;
  onTest: (botToken?: string, chatId?: string) => void;
  onSetWebhook: (url: string) => void;
}) {
  const [botToken, setBotToken] = useState(config.telegramBotToken);
  const [chatId, setChatId] = useState(config.telegramChatId);
  const [webhookUrl, setWebhookUrl] = useState('');

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.telegramSettings}</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bot config */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center"><Send className="w-5 h-5 text-teal-600" /></div>
            <h2 className="text-lg font-bold text-slate-900">{t.telegramConfig}</h2>
          </div>
          <div className="space-y-4">
            <ConfigInput label={t.botToken} value={botToken} onChange={setBotToken} dir={dir} mono placeholder="123456:ABC-DEF..." />
            <ConfigInput label={t.chatId} value={chatId} onChange={setChatId} dir={dir} mono placeholder="123456789" />
            <div className="flex gap-2">
              <button onClick={() => onSave({ telegramBotToken: botToken, telegramChatId: chatId })}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold transition-all">
                <Save className="w-5 h-5" /> {t.saveSettings}
              </button>
              <button onClick={() => onTest(botToken, chatId)}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-all">
                <RefreshCw className="w-5 h-5" /> {t.testConnection}
              </button>
            </div>
          </div>
        </div>

        {/* Webhook */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><Webhook className="w-5 h-5 text-indigo-600" /></div>
            <h2 className="text-lg font-bold text-slate-900">{t.setWebhook}</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3 font-mono break-all">{WEBHOOK_HINT}</p>
          <ConfigInput label="Webhook URL" value={webhookUrl} onChange={setWebhookUrl} dir={dir} mono placeholder={WEBHOOK_HINT} />
          <button onClick={() => onSetWebhook(webhookUrl)} disabled={!webhookUrl}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all disabled:opacity-50">
            <Send className="w-5 h-5" /> {t.setWebhook}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ SYSTEM SETTINGS ============
function SettingsSection({ config, t, dir, onSave }: {
  config: AdminConfig; token: string | null;
  t: ReturnType<typeof useLang>['t']; dir: string;
  onSave: (payload: Record<string, string>) => void;
}) {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [defaultBalance, setDefaultBalance] = useState(config.defaultWalletBalance);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">{t.systemSettings}</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><KeyRound className="w-5 h-5 text-amber-600" /></div>
            <h2 className="text-lg font-bold text-slate-900">{t.changeCredentials}</h2>
          </div>
          <div className="space-y-4">
            <ConfigInput label={t.adminUsername} value={config.adminUsername} onChange={() => {}} dir={dir} disabled />
            <ConfigInput label={t.newUsername} value={newUsername} onChange={setNewUsername} dir={dir} placeholder={config.adminUsername} />
            <ConfigInput label={t.newPassword} value={newPassword} onChange={setNewPassword} dir={dir} type="password" placeholder="••••••••" />
            <p className="text-xs text-slate-400">{t.newPasswordHint}</p>
            <button onClick={() => onSave({ newAdminUsername: newUsername, newAdminPassword: newPassword })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-all">
              <Save className="w-5 h-5" /> {t.saveSettings}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center"><Wallet className="w-5 h-5 text-teal-600" /></div>
            <h2 className="text-lg font-bold text-slate-900">{t.defaultBalance}</h2>
          </div>
          <ConfigInput label={t.defaultBalance} value={defaultBalance} onChange={setDefaultBalance} dir={dir} mono />
          <button onClick={() => onSave({ defaultWalletBalance: defaultBalance })}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold transition-all">
            <Save className="w-5 h-5" /> {t.saveSettings}
          </button>
        </div>

      </div>
    </div>
  );
}

// ============ WHATSAPP SUPPORT MANAGEMENT ============
function WhatsAppSection({ config, t, dir, onSave }: {
  config: AdminConfig;
  t: ReturnType<typeof useLang>['t'];
  dir: string;
  onSave: (payload: Record<string, string>) => void;
}) {
  const [whatsappNumber, setWhatsappNumber] = useState(config.whatsappSupportNumber || '');

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-6">WhatsApp Support Management</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-green-600" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-900">WhatsApp Support Number</h2>
            </div>
            <ConfigInput label="WhatsApp Support Number" value={whatsappNumber} onChange={setWhatsappNumber} dir={dir} mono placeholder="e.g. 923473669083" />
            <p className="text-xs text-slate-400 mt-2">Enter the full number with country code, digits only (e.g. 923473669083). This updates the WhatsApp help button for all users instantly.</p>
            <button onClick={() => onSave({ whatsappSupportNumber: whatsappNumber.trim() })}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold transition-all">
              <Save className="w-5 h-5" /> Save
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Current Number</h2>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-xs text-slate-400 mb-1">Active support number</p>
            <p className="text-lg font-mono font-bold text-slate-900 break-all">{config.whatsappSupportNumber || 'Not set'}</p>
          </div>
          <p className="text-xs text-slate-400 mt-4">The number loads automatically when the admin panel opens. Changes take effect for all users immediately after saving.</p>
        </div>
      </div>
    </div>
  );
}

// ============ Shared UI helpers ============
function ActionBtn({ onClick, variant, icon: Icon, label, small, onClick2 }: {
  onClick: () => void; variant: 'approve' | 'reject' | 'neutral'; icon: typeof Check;
  label: string; small?: boolean; onClick2?: () => void;
}) {
  const styles = {
    approve: 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-sm',
    reject: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
    neutral: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  };
  return (
    <button onClick={() => { if (onClick2) onClick2(); onClick(); }}
      className={`flex items-center gap-1.5 ${small ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'} rounded-xl font-semibold transition-all ${styles[variant]}`}>
      <Icon className={small ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> {label}
    </button>
  );
}

function EmptyState({ icon: Icon, label }: { icon: typeof Clock; label: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
      <Icon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-slate-500">{label}</p>
    </div>
  );
}

function ConfigCard({ title, icon: Icon, t, children }: {
  title: string; icon: typeof Wallet; t: ReturnType<typeof useLang>['t']; children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-teal-600" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ConfigInput({ label, value, onChange, dir, mono, placeholder, type = 'text', disabled }: {
  label: string; value: string; onChange: (v: string) => void; dir: string;
  mono?: boolean; placeholder?: string; type?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 ${mono ? 'font-mono' : ''} ${dir === 'rtl' && !mono ? 'font-ur' : ''} disabled:bg-slate-50 disabled:text-slate-400`} />
    </div>
  );
}

function Modal({ title, onClose, t, children }: {
  title: string; onClose: () => void; t: ReturnType<typeof useLang>['t']; children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ChangePasswordModal({ user, t, dir, newPassword, confirmPassword, onNewPasswordChange, onConfirmPasswordChange, showConfirm, saving, error, onProceed, onCancelConfirm, onConfirm, onClose }: {
  user: AdminUser;
  t: ReturnType<typeof useLang>['t']; dir: string;
  newPassword: string;
  confirmPassword: string;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  showConfirm: boolean;
  saving: boolean;
  error: string;
  onProceed: () => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`${t.changePasswordTitle} — ${user.full_name}`} onClose={onClose} t={t}>
      {!showConfirm ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.newPasswordLabel}</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm text-slate-900"
              placeholder="••••••••"
            />
            <p className="text-xs text-slate-400 mt-1.5">{t.newPasswordHint}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.confirmPasswordLabel}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm text-slate-900"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">{t.close}</button>
            <button
              onClick={onProceed}
              disabled={newPassword.length < 8 || !confirmPassword}
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t.save}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.confirmPasswordChange}</p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{user.username}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancelConfirm} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-50">{t.close}</button>
            <button
              onClick={onConfirm}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Clock className="w-4 h-4 animate-spin" /> {t.loading}</>
              ) : (
                <><Check className="w-4 h-4" /> {t.save}</>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function EditUsernameModal({ user, t, dir, newUsername, onNewUsernameChange, showConfirm, saving, error, onProceed, onCancelConfirm, onConfirm, onClose }: {
  user: AdminUser;
  t: ReturnType<typeof useLang>['t']; dir: string;
  newUsername: string;
  onNewUsernameChange: (v: string) => void;
  showConfirm: boolean;
  saving: boolean;
  error: string;
  onProceed: () => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={`${t.editUsernameTitle} — ${user.full_name}`} onClose={onClose} t={t}>
      {!showConfirm ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.newUsernameLabel}</label>
            <input
              type="text"
              value={newUsername}
              onChange={(e) => onNewUsernameChange(e.target.value)}
              autoFocus
              className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm font-mono text-slate-900 ${dir === 'rtl' ? 'font-ur' : ''}`}
              placeholder={user.username}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              {t.usernameCol}: <span className="font-semibold text-slate-600">{user.username}</span>
            </p>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">{t.close}</button>
            <button
              onClick={onProceed}
              disabled={newUsername.trim().length < 3 || newUsername.trim().toLowerCase() === user.username.toLowerCase()}
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {t.save}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{t.confirmUsernameChange}</p>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-semibold text-slate-700">{user.username}</span>
                {' → '}
                <span className="font-semibold text-teal-700">{newUsername.trim()}</span>
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onCancelConfirm} disabled={saving} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold disabled:opacity-50">{t.close}</button>
            <button
              onClick={onConfirm}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Clock className="w-4 h-4 animate-spin" /> {t.loading}</>
              ) : (
                <><Check className="w-4 h-4" /> {t.save}</>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function AdjustModal({ user, t, dir, onClose, onSubmit }: {
  user: AdminUser; t: ReturnType<typeof useLang>['t']; dir: string;
  onClose: () => void; onSubmit: (amt: number, action: 'add' | 'remove', note?: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [note, setNote] = useState('');

  return (
    <Modal title={`${t.adjustBalance} — ${user.full_name}`} onClose={onClose} t={t}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setAction('add')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${action === 'add' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Plus className="w-4 h-4" /> {t.addBalance}
          </button>
          <button onClick={() => setAction('remove')}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${action === 'remove' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Minus className="w-4 h-4" /> {t.removeBalance}
          </button>
        </div>
        <div className="relative">
          <span className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} text-slate-500 font-semibold`}>Rs</span>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t.enterAmount} autoFocus
            className={`w-full ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-lg font-semibold text-slate-900`} />
        </div>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.adminNote}
          className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm ${dir === 'rtl' ? 'font-ur' : ''}`} />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold">{t.close}</button>
          <button onClick={() => { const a = parseFloat(amount); if (a > 0) onSubmit(a, action, note.trim() || undefined); }}
            className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold">{t.save}</button>
        </div>
      </div>
    </Modal>
  );
}

// ---- Helpline Section ----
function HelplineSection({
  conversations, token, t, dir, fmtDate,
  onReply, onMarkRead,
}: {
  conversations: HelplineConversation[];
  token: string | null;
  t: Record<string, string> | typeof import('@/lib/translations').translations.en;
  dir: 'ltr' | 'rtl';
  fmtDate: (iso: string) => string;
  onReply: (registrationId: string, message: string) => Promise<void>;
  onMarkRead: (registrationId: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (conversations.length > 0 && !selected) {
      setSelected(conversations[0].registration_id);
    }
  }, [conversations, selected]);

  const conv = conversations.find((c) => c.registration_id === selected) || null;

  useEffect(() => {
    if (conv && conv.unread_count > 0) {
      onMarkRead(conv.registration_id);
    }
  }, [selected, conv?.unread_count]);

  const handleSend = async () => {
    const msg = reply.trim();
    if (!msg || !conv || sending) return;
    setSending(true);
    setReply('');
    await onReply(conv.registration_id, msg);
    setSending(false);
  };

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">{t.adminHelpline}</h2>
        <p className="text-sm text-slate-500 mt-1">{t.adminHelplineDesc}</p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t.adminHelplineNoConversations}</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4 h-[600px]">
          {/* Conversation list */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.registration_id}
                onClick={() => setSelected(c.registration_id)}
                className={`w-full text-start px-4 py-3 border-b border-slate-100 transition-colors ${
                  selected === c.registration_id ? 'bg-teal-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{c.username}</p>
                    <p className="text-xs text-slate-400 truncate">{c.full_name}</p>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                      {c.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">{fmtDate(c.last_message_at)}</p>
              </button>
            ))}
          </div>

          {/* Chat area */}
          <div className="lg:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {conv ? (
              <>
                <div className="px-4 py-3 border-b border-slate-200">
                  <p className="font-bold text-slate-900">{conv.username}</p>
                  <p className="text-xs text-slate-400">{conv.full_name}</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
                  {conv.messages.map((msg) => {
                    const isAdmin = msg.sender === 'admin';
                    return (
                      <div key={msg.id} className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                          isAdmin
                            ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                            : 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-br-md'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                          <div className={`flex items-center gap-1.5 mt-1 ${isAdmin ? 'text-slate-400' : 'text-teal-100'}`}>
                            <p className="text-[10px]">{fmtTime(msg.created_at)}</p>
                            {isAdmin && (
                              <span className="text-[9px] font-semibold">
                                {msg.is_read ? `✓✓ ${t.msgStatusSeen}` : `✓ ${t.msgStatusDelivered}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 border-t border-slate-200 flex items-center gap-3">
                  <input
                    type="text"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t.adminHelplineReplyPlaceholder}
                    className={`flex-1 ${dir === 'rtl' ? 'pr-4 pl-4 font-ur' : 'px-4'} py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm text-slate-900 placeholder:text-slate-400`}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!reply.trim()}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t.adminHelplineSend}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                {t.adminHelplineNoConversations}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Announcements Section ----
function AnnouncementsSection({
  announcements, token, t, dir, fmtDate,
  onCreate, onUpdate, onDelete,
}: {
  announcements: AdminAnnouncement[];
  token: string | null;
  t: Record<string, string> | typeof import('@/lib/translations').translations.en;
  dir: 'ltr' | 'rtl';
  fmtDate: (iso: string) => string;
  onCreate: (title: string, body: string, isPinned?: boolean) => Promise<void>;
  onUpdate: (id: string, payload: { title?: string; body?: string; isActive?: boolean; isPinned?: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setBody('');
    setIsPinned(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || saving) return;
    setSaving(true);
    if (editingId) {
      await onUpdate(editingId, { title: title.trim(), body: body.trim() });
    } else {
      await onCreate(title.trim(), body.trim(), isPinned);
    }
    setSaving(false);
    reset();
  };

  const startEdit = (a: AdminAnnouncement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setIsPinned(a.is_pinned || false);
    setShowForm(true);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{t.adminAnnouncements}</h2>
          <p className="text-sm text-slate-500 mt-1">{t.adminAnnouncementsDesc}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingId(null); setTitle(''); setBody(''); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> {t.adminAnnouncementNew}
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-6 animate-fade-in">
          <h3 className="font-bold text-slate-900 mb-4">
            {editingId ? t.adminAnnouncementEdit : t.adminAnnouncementNew}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.adminAnnouncementTitle}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm text-slate-900 ${dir === 'rtl' ? 'font-ur' : ''}`}
                placeholder={t.adminAnnouncementTitle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.adminAnnouncementBody}</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className={`w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-sm text-slate-900 resize-none ${dir === 'rtl' ? 'font-ur' : ''}`}
                placeholder={t.adminAnnouncementBody}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isPinned" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="rounded" />
              <label htmlFor="isPinned" className="text-sm text-slate-600 flex items-center gap-1"><Pin className="w-3.5 h-3.5 text-teal-500" /> Pin this announcement</label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
              >
                {t.close}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || !body.trim() || saving}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {saving ? t.loading : (editingId ? t.adminAnnouncementSave : t.adminAnnouncementCreate)}
              </button>
            </div>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">{t.noAnnouncements}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-700"><Pin className="w-2.5 h-2.5" /> Pinned</span>}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                      a.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {a.is_active ? t.adminAnnouncementActive : t.adminAnnouncementInactive}
                    </span>
                    <span className="text-xs text-slate-400">{fmtDate(a.created_at)}</span>
                  </div>
                  <p className="font-bold text-slate-900 text-base mb-1">{a.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onUpdate(a.id, { isActive: !a.is_active })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      a.is_active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {a.is_active ? t.adminAnnouncementInactive : t.adminAnnouncementActive}
                  </button>
                  <button
                    onClick={() => onUpdate(a.id, { isPinned: !a.is_pinned })}
                    className={`p-2 rounded-lg transition-colors ${a.is_pinned ? 'bg-teal-50 text-teal-600 hover:bg-teal-100' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    title={a.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (confirm(t.adminAnnouncementConfirmDelete)) onDelete(a.id); }}
                    className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ---- Referrals Section ----

function ReferralsSection({
  referrals,
  onRefresh,
  onUpdateStatus,
}: {
  referrals: ReferralEvent[];
  onRefresh: () => Promise<void>;
  onUpdateStatus: (id: string, status: 'pending' | 'qualified' | 'bonus_given') => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    await onRefresh();
    setLoading(false);
  };

  const statusColor = (s: string) => {
    if (s === 'qualified') return 'bg-green-100 text-green-700';
    if (s === 'bonus_given') return 'bg-teal-100 text-teal-700';
    return 'bg-amber-100 text-amber-700';
  };

  const statusLabel = (s: string) => {
    if (s === 'qualified') return 'Qualified';
    if (s === 'bonus_given') return 'Bonus Given';
    return 'Pending';
  };

  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Referral Tracking</h2>
          <p className="text-sm text-slate-500 mt-0.5">{referrals.length} total referral{referrals.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Referrals', value: referrals.length, color: 'bg-teal-50 text-teal-700' },
          { label: 'Pending', value: referrals.filter(r => r.status === 'pending').length, color: 'bg-amber-50 text-amber-700' },
          { label: 'Qualified', value: referrals.filter(r => r.status === 'qualified').length, color: 'bg-green-50 text-green-700' },
          { label: 'Bonus Given', value: referrals.filter(r => r.status === 'bonus_given').length, color: 'bg-teal-100 text-teal-800' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs font-medium mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {referrals.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
          <Share2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No referrals yet. Users can share their referral link to invite friends.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Referrer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">New User</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Joined</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">First Deposit</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Deposit Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-teal-700">@{r.referrer_username}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">@{r.referred_username}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">
                      {r.first_deposit_amount != null ? (
                        <span className="font-semibold text-green-700">Rs. {r.first_deposit_amount.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">No deposit yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(r.first_deposit_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => onUpdateStatus(r.id, e.target.value as 'pending' | 'qualified' | 'bonus_given')}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:border-teal-500 outline-none"
                      >
                        <option value="pending">Pending</option>
                        <option value="qualified">Qualified</option>
                        <option value="bonus_given">Bonus Given</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}