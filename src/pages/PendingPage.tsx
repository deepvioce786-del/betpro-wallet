import { useEffect, useRef, useState } from 'react';
import { Clock, Loader2, CheckCircle2, XCircle, ShieldCheck, Home, RefreshCw } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { getRegistrationStatus } from '@/lib/api';
import { useUserAuth } from '@/lib/UserAuthContext';

type Phase = 'pending' | 'approved' | 'rejected' | 'error';

export function PendingPage() {
  const { t, dir, lang } = useLang();
  const { params, navigate } = useRouter();
  const registrationId = params.id;

  const { signInWithCredentials } = useUserAuth();
  const [phase, setPhase] = useState<Phase>('pending');
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [countdownDone, setCountdownDone] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown ticker
  useEffect(() => {
    if (phase !== 'pending') return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setCountdownDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [phase]);

  // Poll registration status every 5 seconds while pending
  useEffect(() => {
    if (!registrationId) {
      setPhase('error');
      return;
    }
    if (phase !== 'pending') return;

    const poll = async () => {
      const result = await getRegistrationStatus(registrationId);
      if ('error' in result) return;
      const status = result.status;
      if (status === 'approved') {
        setPhase('approved');
        // Auto-login: retrieve the credentials the user just registered with (stored
        // in sessionStorage during sign-up) and sign them in immediately, then route
        // to the dashboard. Credentials are cleared right after.
        const pendingUsername = sessionStorage.getItem('betpro_pending_username');
        const pendingPassword = sessionStorage.getItem('betpro_pending_password');
        sessionStorage.removeItem('betpro_pending_username');
        sessionStorage.removeItem('betpro_pending_password');

        if (pendingUsername && pendingPassword) {
          setAutoLoggingIn(true);
          const signInRes = await signInWithCredentials(pendingUsername, pendingPassword);
          if (signInRes.ok) {
            setTimeout(() => navigate('dashboard'), 1200);
            return;
          }
        }
        // Fallback: route to sign-in so the user can log in manually.
        setTimeout(() => navigate('signin'), 2000);
      } else if (status === 'rejected') {
        setPhase('rejected');
      }
    };

    poll();
    pollTimer.current = setInterval(poll, 5000);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [registrationId, phase, navigate]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const progress = ((120 - secondsLeft) / 120) * 100;

  // Approved state
  if (phase === 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 items-center justify-center shadow-xl shadow-teal-500/40 mb-6">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
            {dir === 'rtl' ? 'اکاؤنٹ فعال ہو گیا!' : 'Account Activated!'}
          </h1>
          <p className="text-slate-600 mb-6">
            {autoLoggingIn
              ? (dir === 'rtl' ? 'آپ کو سائن ان پیج پر بھیجا جا رہا ہے...' : 'Redirecting you to sign in...')
              : (dir === 'rtl' ? 'براہ کرم سائن ان کریں' : 'Please sign in to continue')}
          </p>
          <div className="inline-flex items-center gap-2 text-teal-600 font-semibold">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  // Rejected state
  if (phase === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center animate-scale-in">
          <div className="inline-flex w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-500 items-center justify-center shadow-xl shadow-red-500/40 mb-6">
            <XCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-3">{t.accountRejectedTitle}</h1>
          <p className="text-slate-600 mb-8">{t.accountRejectedDesc}</p>
          <button
            onClick={() => navigate('home')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-colors"
          >
            <Home className="w-4 h-4" /> {t.backToHome}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 mb-6">{dir === 'rtl' ? 'رجسٹریشن نہیں ملی' : 'Registration not found'}</p>
          <button onClick={() => navigate('signup')} className="px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold">
            {t.signUp}
          </button>
        </div>
      </div>
    );
  }

  // Pending state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/30 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8 sm:p-10 text-center animate-scale-in">
          {/* Pulsing clock icon */}
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-full bg-teal-400/20 animate-pulse-ring" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/40">
              {countdownDone ? <RefreshCw className="w-9 h-9 text-white animate-spin" /> : <Clock className="w-9 h-9 text-white" />}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{t.pendingTitle}</h1>
          <p className="text-sm text-slate-500 mb-7">{t.pendingSubtitle}</p>

          {/* Countdown */}
          {!countdownDone ? (
            <>
              <div className="mb-6">
                <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">{t.countdownLabel}</p>
                <div className="text-5xl font-extrabold text-teal-700 tabular-nums tracking-tight">
                  {mm}:{ss}
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-7">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          ) : (
            <div className="mb-7 p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="font-semibold text-amber-800 mb-1">{t.pendingExpiredTitle}</p>
              <p className="text-sm text-amber-700">{t.pendingExpiredDesc}</p>
            </div>
          )}

          {/* Required messages — English and Urdu */}
          <div className="space-y-3 text-start">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">English</span>
              </div>
              <p className="text-sm text-slate-700 font-en">{t.pendingEn}</p>
            </div>
            <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-teal-500 uppercase tracking-wide">اردو</span>
              </div>
              <p className="text-base text-slate-800 font-ur leading-loose" dir="rtl">{t.pendingUr}</p>
            </div>
          </div>

          {/* status indicator */}
          <div className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
            <span>{dir === 'rtl' ? 'حالت کی جانچ جاری ہے...' : 'Checking status...'}</span>
          </div>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'ur' ? t.appName : 'BetPro Wallet'}</span>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate('home')}
            className="text-sm text-slate-500 hover:text-teal-700 transition-colors"
          >
            {t.backToHome}
          </button>
        </div>
      </div>
    </div>
  );
}
