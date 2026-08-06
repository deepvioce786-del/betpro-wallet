import { useState, type FormEvent } from 'react';
import { AtSign, Lock, Loader2, AlertCircle, Wallet, ArrowLeft } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { adminLogin } from '@/lib/api';
import { setAdminToken } from '@/lib/adminAuth';

export function SignInPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { signInWithCredentials } = useUserAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password) {
      setError(dir === 'rtl' ? 'یوزر نیم اور پاس ورڈ درج کریں' : 'Please enter username and password');
      return;
    }

    setLoading(true);

    // Try admin login first — fast check against app_config table.
    // If the credentials match an admin account, redirect to the admin panel.
    const adminRes = await adminLogin(username.trim(), password);
    if (adminRes.ok && adminRes.token) {
      setAdminToken(adminRes.token);
      setLoading(false);
      navigate('admin-dashboard');
      return;
    }

    // Not an admin — fall through to user login.
    const result = await signInWithCredentials(username.trim(), password);
    setLoading(false);

    if (!result.ok) {
      if (result.status === 'pending') {
        setError(t.pendingEn);
      } else if (result.status === 'rejected') {
        setError(t.accountRejectedDesc);
      } else if (result.status === 'suspended') {
        setError(dir === 'rtl' ? 'آپ کا اکاؤنٹ معطل ہے۔ ایڈمن سے رابطہ کریں۔' : 'Your account has been suspended. Please contact admin.');
      } else {
        setError(result.error || 'Sign in failed');
      }
      return;
    }
    navigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/30 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('home')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-6 transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          {t.backToHome}
        </button>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-7 sm:p-8 animate-scale-in">
          <div className="text-center mb-7">
            <div className="inline-flex w-14 h-14 rounded-2xl items-center justify-center shadow-lg mb-4 bg-gradient-to-br from-teal-600 to-emerald-500 shadow-teal-600/30">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t.welcomeBack}</h1>
            <p className="mt-2 text-sm text-slate-500">{t.signInDesc}</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.usernameOrPhone}</label>
              <div className="relative">
                <AtSign className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.usernameOrPhonePlaceholder}
                  className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4 font-ur' : 'pl-11 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.password}</label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4' : 'pl-11 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-semibold shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-teal-600/30"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {t.loading}</>
              ) : (
                t.signInButton
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t.dontHaveAccount}{' '}
            <button onClick={() => navigate('signup')} className="text-teal-600 font-semibold hover:text-teal-700">
              {t.signUp}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
