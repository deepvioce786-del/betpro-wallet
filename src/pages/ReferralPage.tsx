import { useEffect, useState } from 'react';
import {
  Share2, Copy, Check, ExternalLink, Users, Wallet,
  Clock, Gift, ChevronDown, ChevronUp, Loader2, AlertCircle,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { getReferralInfo } from '@/lib/api';

export function ReferralPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { username } = useUserAuth();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (!username) { navigate('signin'); return; }
    (async () => {
      setLoading(true);
      const res = await getReferralInfo(username);
      setLoading(false);
      if (res.error) { setError(res.error); return; }
      setReferralCode(res.referralCode ?? null);
    })();
  }, [username, navigate]);

  const appUrl = window.location.origin;
  const referralLink = referralCode
    ? `${appUrl}/#/signup?ref=${referralCode}`
    : null;

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard?.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!referralLink) return;
    const msg =
      `Join BetPro Wallet using my referral link and get a bonus!\n\n` +
      `${referralLink}\n\n` +
      `میرے ریفرل لنک سے جوائن کریں اور بونس پائیں!\n\n` +
      `${referralLink}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-slate-600 mb-4">{error}</p>
          <button onClick={() => navigate('dashboard')} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold">
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir={dir}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 lg:py-12 space-y-6">

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-7 sm:p-8 shadow-xl shadow-teal-800/25">
          <div className="absolute -top-10 -end-10 w-44 h-44 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-12 -start-6 w-52 h-52 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">Share &amp; Earn</h1>
            <p className="text-teal-200 text-sm leading-relaxed">
              Invite friends and earn bonuses when they join and deposit.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Users, label: 'Total Referrals', value: '—', color: 'text-teal-600', bg: 'bg-teal-50' },
            { icon: Wallet, label: 'Successful Deposits', value: '—', color: 'text-green-600', bg: 'bg-green-50' },
            { icon: Clock, label: 'Pending', value: '—', color: 'text-amber-600', bg: 'bg-amber-50' },
            { icon: Gift, label: 'Bonus Earned', value: '—', color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
              </div>
              <p className="text-xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Referral link card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900">Your Referral Link</h2>

          {referralCode ? (
            <>
              {/* Referral code badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Your code:</span>
                <span className="font-mono font-bold text-teal-700 tracking-widest text-sm bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                  {referralCode}
                </span>
              </div>

              {/* Link input + copy */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-xs text-slate-600 font-mono truncate">
                  {referralLink}
                </span>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    copied
                      ? 'bg-green-100 text-green-700'
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300 hover:text-teal-700'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* WhatsApp button */}
              <button
                onClick={handleWhatsApp}
                className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold rounded-xl shadow-sm shadow-green-500/30 transition-all hover:shadow-md hover:shadow-green-500/40 hover:-translate-y-0.5"
              >
                <ExternalLink className="w-4.5 h-4.5" />
                Share on WhatsApp
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-500">Referral code not available. Please contact support.</p>
          )}
        </div>

        {/* Referral rules */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowRules((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Gift className="w-4.5 h-4.5 text-teal-600" />
              <span className="text-sm font-bold text-slate-800">
                Referral Bonus Rules / ریفرل بونس کے قواعد
              </span>
            </div>
            {showRules
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />
            }
          </button>

          {showRules && (
            <div className="px-5 pb-5 space-y-5 border-t border-slate-100">
              {/* English */}
              <div className="pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">English</p>
                <p className="text-sm font-bold text-slate-800 mb-2">Referral Bonus Rules</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                  <li>The referred user must make a minimum deposit of <strong>Rs. 3000</strong> to qualify.</li>
                  <li>The referral bonus cannot be withdrawn immediately.</li>
                  <li>The referral bonus must first be used to play games.</li>
                  <li>Only the <strong>profit earned from playing with the referral bonus</strong> can be withdrawn, according to the website's withdrawal policy.</li>
                  <li>The platform reserves the right to reject fraudulent or fake referrals.</li>
                </ol>
              </div>

              <hr className="border-slate-100" />

              {/* Urdu */}
              <div dir="rtl" className="text-right">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">اردو</p>
                <p className="text-sm font-bold text-slate-800 mb-2">ریفرل بونس کے قواعد</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-slate-600">
                  <li>ریفرل کے ذریعے آنے والے نئے صارف کو کم از کم <strong>3000 روپے</strong> کا ڈپازٹ کرنا ہوگا۔</li>
                  <li>ریفرل بونس فوری طور پر نکالا نہیں جا سکتا۔</li>
                  <li>پہلے ریفرل بونس سے گیم کھیلنا ضروری ہوگا۔</li>
                  <li>ریفرل بونس سے حاصل ہونے والا <strong>منافع</strong> ہی ویب سائٹ کی پالیسی کے مطابق نکالا جا سکتا ہے۔</li>
                  <li>جعلی یا فراڈ ریفرلز کی صورت میں بونس منسوخ کیا جا سکتا ہے۔</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Back to dashboard */}
        <button
          onClick={() => navigate('dashboard')}
          className="w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
        >
          {t.back} to Dashboard
        </button>
      </div>
    </div>
  );
}
