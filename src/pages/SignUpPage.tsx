import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { User, AtSign, Lock, Phone, Loader2, AlertCircle, Wallet, ArrowLeft, Check, RefreshCw, Sparkles } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { registerUser, checkAndSuggestUsernames } from '@/lib/api';
import { useUserAuth } from '@/lib/UserAuthContext';

export function SignUpPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoSigningIn, setAutoSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signInWithCredentials } = useUserAuth();

  // Capture referral code from URL (?ref=CODE or #/signup?ref=CODE)
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState<string>('');
  useEffect(() => {
    try {
      const search = window.location.search || window.location.hash.replace(/^#\/signup/, '');
      const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
      const ref = params.get('ref') || '';
      setReferralCodeFromUrl(ref.trim().toUpperCase());
    } catch { /* ignore */ }
  }, []);

  // Username suggestions + availability state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  const runCheckAndSuggest = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setAvailability('idle');
      setSuggestions([]);
      setShowSuggestions(false);
      setLoadingSuggestions(false);
      return;
    }

    const reqId = ++requestIdRef.current;
    setAvailability('checking');
    setLoadingSuggestions(true);

    const result = await checkAndSuggestUsernames(trimmed);

    // Ignore stale responses
    if (reqId !== requestIdRef.current) return;

    setLoadingSuggestions(false);

    if (!result.ok) {
      setAvailability('idle');
      return;
    }

    if (result.available) {
      setAvailability('available');
      // Still show suggestions so the user has alternatives
      if (result.suggestions && result.suggestions.length > 0) {
        setSuggestions(result.suggestions);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setAvailability('taken');
      setSuggestions(result.suggestions || []);
      setShowSuggestions(true);
    }
  }, []);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setAvailability('idle');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runCheckAndSuggest(value);
    }, 400);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const refreshSuggestions = () => {
    if (username.trim().length >= 2) {
      runCheckAndSuggest(username);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Cancel any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Bump request ID to ignore in-flight responses
    ++requestIdRef.current;

    setUsername(suggestion);
    setAvailability('available');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) return setError(dir === 'rtl' ? 'پورا نام درج کریں' : 'Please enter your full name');
    if (username.trim().length < 3) return setError(t.username + ' ≥ 3');
    // Accept either bp@<name><digits> or legacy <letters><digits>
    if (!/^bp@[a-z0-9]+\d{4,5}$/i.test(username.trim()) && !/^[a-zA-Z]+[0-9]{4,5}$/.test(username.trim()))
      return setError(dir === 'rtl' ? t.usernameValidationUr : t.usernameValidation);
    if (password.length !== 8) return setError(dir === 'rtl' ? 'پاس ورڈ بالکل 8 حروف کا ہونا چاہیے' : 'Password must be exactly 8 characters long');
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
      return setError(dir === 'rtl' ? 'پاس ورڈ میں حروف اور نمبرز دونوں ہونے چاہئیں' : 'Password must contain both letters and numbers');
    if (!phoneNumber.trim()) return setError(t.phoneNumber);

    // Block submission if username is taken
    if (availability === 'taken') {
      return setError(dir === 'rtl' ? t.usernameTakenChooseSuggestion : t.usernameTakenChooseSuggestion);
    }

    setLoading(true);
    const result = await registerUser({
      fullName: fullName.trim(),
      username: username.trim(),
      password,
      phoneNumber: phoneNumber.trim(),
      referralCode: referralCodeFromUrl || undefined,
    });
    setLoading(false);

    if (!result.ok || !result.registrationId) {
      setError(result.error || 'Registration failed');
      return;
    }

    // Auto-login the user immediately after registration so they can browse
    // the site while waiting for admin approval. Username and password are
    // NOT shown until the account is approved.
    setAutoSigningIn(true);
    const signInRes = await signInWithCredentials(username.trim(), password);
    setAutoSigningIn(false);

    if (signInRes.ok) {
      navigate('dashboard');
      return;
    }
    // If auto-login fails, fall back to the pending page
    navigate('pending', { id: result.registrationId });
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
            <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 items-center justify-center shadow-lg shadow-teal-600/30 mb-4">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t.createAccount}</h1>
            <p className="mt-2 text-sm text-slate-500">{t.createAccountDesc}</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.fullName}</label>
              <div className="relative">
                <User className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.fullNamePlaceholder}
                  className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4 font-ur' : 'pl-11 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`}
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Username with real-time suggestions */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.username}</label>
              <div className="relative">
                <AtSign className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder={t.usernamePlaceholder}
                  className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4 font-ur' : 'pl-11 pr-4'} py-3 rounded-xl border transition-all text-sm text-slate-900 placeholder:text-slate-400 outline-none ${
                    availability === 'taken'
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : availability === 'available'
                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                        : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20'
                  }`}
                  autoComplete="off"
                />
                {availability === 'available' && (
                  <Check className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-3.5' : 'right-3.5'} w-4 h-4 text-emerald-500`} />
                )}
                {availability === 'taken' && (
                  <AlertCircle className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-3.5' : 'right-3.5'} w-4 h-4 text-red-500`} />
                )}
                {availability === 'checking' && (
                  <Loader2 className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-3.5' : 'right-3.5'} w-4 h-4 text-slate-400 animate-spin`} />
                )}
              </div>

              {/* Availability / error messages */}
              {availability === 'available' && username.trim().length >= 2 && (
                <p className="mt-1.5 text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {t.usernameAvailableMsg}
                </p>
              )}
              {availability === 'taken' && (
                <p className="mt-1.5 text-xs text-red-500 font-medium flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{t.usernameTakenChooseSuggestion}</span>
                </p>
              )}
              {availability === 'idle' && (
                <p className="mt-1.5 text-xs text-slate-400">{dir === 'rtl' ? t.usernameValidationUr : t.usernameValidation}</p>
              )}

              {/* Suggestions panel — shows when taken or when suggestions are available */}
              {showSuggestions && (
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">{t.usernameSuggestions}</span>
                    </div>
                    <button
                      type="button"
                      onClick={refreshSuggestions}
                      disabled={loadingSuggestions}
                      className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${loadingSuggestions ? 'animate-spin' : ''}`} />
                      {t.loading}
                    </button>
                  </div>
                  {loadingSuggestions ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                      <span className="text-xs text-slate-500">{t.checkingAvailability}</span>
                    </div>
                  ) : suggestions.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSuggestionClick(s)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 transition-all text-xs font-medium text-slate-700 group"
                        >
                          <span className="truncate">{s}</span>
                          <span className="text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold shrink-0 ml-1">{t.useThisUsername}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-2">{t.usernameSuggestionsDesc}</p>
                  )}
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.password}</label>
              <div className="relative">
                <Lock className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4 font-ur' : 'pl-11 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`}
                  autoComplete="off"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{t.passwordHint}</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.phoneNumber}</label>
              <div className="relative">
                <Phone className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} w-4.5 h-4.5 text-slate-400`} />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder={t.phoneNumberPlaceholder}
                  className={`w-full ${dir === 'rtl' ? 'pr-11 pl-4 font-ur' : 'pl-11 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`}
                  autoComplete="off"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || autoSigningIn}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading || autoSigningIn ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {autoSigningIn ? (dir === 'rtl' ? 'لاگ اِن کیا جا رہا ہے...' : 'Signing you in...') : t.loading}</>
              ) : (
                t.submitRegistration
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {t.alreadyHaveAccount}{' '}
            <button onClick={() => navigate('signin')} className="text-teal-600 font-semibold hover:text-teal-700">
              {t.signIn}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
