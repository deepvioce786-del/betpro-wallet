import { useEffect, useRef, useState } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, History as HistoryIcon,
  ArrowDownToLine, ArrowUpFromLine, Loader2, AlertCircle, User as UserIcon,
  MessageCircle, Megaphone, X, Clock,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { getWalletInfo, getLatestAnnouncement, getRegistrationStatus, type Announcement } from '@/lib/api';
import type { WalletInfo } from '@/lib/types';
import { CopyField } from '@/components/CopyField';
import { BETPRO_LOGO_URL } from '@/lib/config';

export function DashboardPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { username, registrationId, isPending, signOut } = useUserAuth();
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [pendingStatus, setPendingStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!username) {
      navigate('signin');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getWalletInfo(username);
      if (cancelled) return;
      if (res.error) {
        // If the wallet endpoint returns 403 with status=pending, the user is
        // still waiting for approval — show the pending state instead of an error.
        if (res.status === 'pending') {
          setError(null);
          setLoading(false);
          return;
        }
        setError(res.error);
        setLoading(false);
      } else if (res.info) {
        if (!res.info.wallet.is_active) {
          await signOut();
          navigate('signin');
          return;
        }
        setInfo(res.info);
        setLoading(false);
      }
    })();
    (async () => {
      const res = await getLatestAnnouncement();
      if (cancelled) return;
      if (res.announcement) {
        const dismissedId = localStorage.getItem('betpro_dismissed_announcement');
        if (dismissedId !== res.announcement.id) {
          setAnnouncement(res.announcement);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username, navigate]);

  // Poll registration status every 30 seconds while pending
  useEffect(() => {
    if (!isPending || !registrationId) return;

    const poll = async () => {
      const result = await getRegistrationStatus(registrationId);
      if ('error' in result) return;
      const status = result.status;
      if (status === 'approved') {
        setPendingStatus('approved');
        // Reload the page data so credentials appear
        window.location.reload();
      } else if (status === 'rejected') {
        setPendingStatus('rejected');
      }
    };

    // Initial check after 5 minutes, then every 30 seconds
    const initialDelay = setTimeout(() => {
      poll();
      pollTimer.current = setInterval(poll, 30000);
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [isPending, registrationId]);

  const dismissAnnouncement = () => {
    if (announcement) {
      localStorage.setItem('betpro_dismissed_announcement', announcement.id);
    }
    setAnnouncement(null);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('home');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Pending approval state — show waiting message, hide username/password
  if (isPending && pendingStatus !== 'approved' && !info) {
    const rejected = pendingStatus === 'rejected';
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full">
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8 sm:p-10 text-center animate-scale-in">
            {rejected ? (
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            ) : (
              <div className="relative inline-flex mb-6">
                <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-pulse-ring" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/40">
                  <Clock className="w-9 h-9 text-white" />
                </div>
              </div>
            )}

            {rejected ? (
              <>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
                  {dir === 'rtl' ? 'اکاؤنٹ مسترد کر دیا گیا' : 'Account Rejected'}
                </h1>
                <p className="text-slate-600 mb-6">
                  {dir === 'rtl' ? 'آپ کی رجسٹریشن مسترد کر دی گئی ہے۔ براہ کرم ایڈمن سے رابطہ کریں۔' : 'Your registration was rejected. Please contact admin.'}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
                  {dir === 'rtl' ? 'اکاؤنٹ جائزے میں' : 'Account Under Review'}
                </h1>
                <p className="text-sm text-slate-500 mb-7">
                  {dir === 'rtl' ? 'آپ کی رجسٹریشن موصول ہوگئی ہے۔ ایڈمن کو مطلع کر دیا گیا ہے۔' : 'Your registration has been received. An administrator has been notified.'}
                </p>

                <div className="p-5 rounded-xl bg-teal-50/60 border border-teal-100 mb-6">
                  <p className="text-base text-slate-800 leading-loose" dir="rtl">
                    آپ کی آئی ڈی ورکنگ میں ہے۔ براہِ کرم 5 منٹ انتظار کریں۔ آپ کا اکاؤنٹ جلد فعال ہو جائے گا۔
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span>{dir === 'rtl' ? 'حالت کی جانچ جاری ہے...' : 'Checking status...'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">{error || 'Unable to load wallet'}</p>
          <button onClick={handleSignOut} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold">
            {t.signOut}
          </button>
        </div>
      </div>
    );
  }

  const balance = Number(info.wallet.balance || 0);

  const actions = [
    {
      icon: ArrowDownToLine,
      label: t.deposit,
      desc: t.depositDesc,
      route: 'deposit' as const,
      color: 'from-teal-500 to-emerald-500',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      icon: ArrowUpFromLine,
      label: t.withdraw,
      desc: t.withdrawDesc,
      route: 'withdraw' as const,
      color: 'from-slate-600 to-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-100',
      iconColor: 'text-slate-600',
    },
    {
      icon: HistoryIcon,
      label: t.history,
      desc: t.historyDesc,
      route: 'history' as const,
      color: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      icon: MessageCircle,
      label: t.helpline,
      desc: t.helplineDesc,
      route: 'helpline' as const,
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* BP Logo + Welcome */}
        <div className="mb-8 animate-fade-in-up flex items-center gap-4">
          <a
            href={BETPRO_LOGO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 group"
            title="BetPro"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-600/30 group-hover:shadow-teal-600/50 group-hover:scale-105 transition-all">
              <span className="text-2xl font-extrabold text-white tracking-tight">BP</span>
            </div>
          </a>
          <div>
            <p className="text-sm text-slate-500">{t.welcomeUser}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
              {info.display_name}
            </h1>
          </div>
        </div>

        {/* Announcement notification card */}
        {announcement && (
          <div className="mb-6 animate-fade-in-up relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-5 shadow-lg shadow-blue-600/20">
            <button
              onClick={dismissAnnouncement}
              className="absolute top-3 end-3 p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
              aria-label={t.closeAnnouncement}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pe-8">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-1">{t.announcement}</p>
                <p className="font-bold text-white text-base mb-1.5">{announcement.title}</p>
                <p className="text-sm text-blue-50 leading-relaxed whitespace-pre-wrap">{announcement.body}</p>
              </div>
            </div>
          </div>
        )}

        {/* User ID + Password copy fields */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8 animate-fade-in-up delay-100">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <CopyField
              label={t.userId}
              value={info.user_id}
              copyLabel={t.copy}
              copiedLabel={t.copied}
            />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <CopyField
              label={t.password}
              value={info.password}
              copyLabel={t.copy}
              copiedLabel={t.copied}
            />
          </div>
        </div>

        {/* Balance card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-7 sm:p-8 shadow-xl shadow-teal-800/20 mb-8 animate-fade-in-up delay-200">
          <div className="absolute -top-12 -end-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -start-8 w-56 h-56 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-teal-100 mb-2">
                <Wallet className="w-4 h-4" />
                <span className="text-sm font-medium">{t.walletBalance}</span>
              </div>
              <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                Rs {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-teal-200/80 text-sm mt-2">
                {info.wallet.is_active ? (t.welcomeUser + ', ' + info.display_name) : ''}
              </p>
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/15 backdrop-blur items-center justify-center">
              <UserIcon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up delay-300">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => navigate(a.route)}
              className={`group text-start bg-white rounded-2xl border ${a.border} p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all`}
            >
              <div className={`w-11 h-11 rounded-xl ${a.bg} flex items-center justify-center mb-3 group-hover:bg-gradient-to-br group-hover:from-teal-600 group-hover:to-emerald-600 transition-all`}>
                <a.icon className={`w-5.5 h-5.5 ${a.iconColor} group-hover:text-white transition-colors`} />
              </div>
              <p className="font-bold text-slate-900 mb-0.5">{a.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{a.desc}</p>
            </button>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 animate-fade-in-up delay-400">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t.deposits}</p>
              <p className="text-lg font-bold text-slate-900">{info.wallet.display_name}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">{t.status}</p>
              <p className="text-lg font-bold text-green-600">{t.approved}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
