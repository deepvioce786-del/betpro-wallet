import { useState, useEffect } from 'react';
import { Wallet, Menu, X, LogOut, Share2, Globe, Check } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter, type Route } from '@/lib/Router';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { Language } from '@/lib/types';

interface NavbarProps {
  isLoggedIn?: boolean;
  username?: string;
  onSignOut?: () => void;
}

export function Navbar({ isLoggedIn = false, username, onSignOut }: NavbarProps) {
  const { t } = useLang();
  const { route, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (r: Route) => {
    navigate(r);
    setMobileOpen(false);
  };

  const navLink = (r: Route, label: string) => (
    <button
      onClick={() => go(r)}
      className={`text-sm font-medium transition-colors px-3 py-2 rounded-lg ${
        route === r
          ? 'text-teal-700 bg-teal-50'
          : 'text-slate-600 hover:text-teal-700 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/70">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button onClick={() => go('home')} className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-sm shadow-teal-600/30">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900 tracking-tight">{t.appName}</span>
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLink('home', t.home)}
          {isLoggedIn && navLink('dashboard', t.dashboard)}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          {isLoggedIn && (
            <button
              onClick={() => go('referral')}
              className={`flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg transition-colors shrink-0 ${
                route === 'referral'
                  ? 'bg-green-100 text-green-700'
                  : 'text-slate-600 hover:text-green-700 hover:bg-green-50'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share &amp; Earn</span>
              <span className="sm:hidden">Share</span>
            </button>
          )}
          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <span className="text-sm text-slate-500 max-w-[120px] truncate">
                  {username}
                </span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.signOut}
                  </button>
                )}
              </>
            ) : (
              <>
                {navLink('signin', t.signIn)}
                <button
                  onClick={() => go('signup')}
                  className="text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 px-4 py-2 rounded-lg shadow-sm shadow-teal-600/30 transition-all hover:shadow-md hover:shadow-teal-600/40"
                >
                  {t.signUp}
                </button>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1 animate-fade-in"
          role="menu"
        >
          {navLink('home', t.home)}
          {isLoggedIn && navLink('dashboard', t.dashboard)}
          {!isLoggedIn && navLink('signin', t.signIn)}
          {!isLoggedIn && (
            <button
              onClick={() => go('signup')}
              className="block w-full text-start text-sm font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2.5 rounded-lg my-1"
            >
              {t.signUp}
            </button>
          )}
          {/* Language selector (mobile only) */}
          <MobileLanguageSelector />

          {isLoggedIn && onSignOut && (
            <button
              onClick={() => {
                onSignOut();
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 text-sm font-semibold text-red-600 px-3 py-2.5 w-full text-start"
              role="menuitem"
            >
              <LogOut className="w-4 h-4" /> {t.signOut}
            </button>
          )}
        </div>
      )}
    </header>
  );
}

function MobileLanguageSelector() {
  const { lang, setLang, t } = useLang();
  const options: { value: Language; label: string }[] = [
    { value: 'en', label: t.english },
    { value: 'ur', label: t.urdu },
  ];

  return (
    <div className="pt-2 pb-1">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 px-3 pb-2">
        <Globe className="w-4 h-4" />
        {t.language}
      </div>
      <div className="flex gap-2 px-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setLang(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              lang === opt.value
                ? 'bg-teal-50 text-teal-700 border border-teal-300'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className={opt.value === 'ur' ? 'font-ur' : ''}>{opt.label}</span>
            {lang === opt.value && <Check className="w-4 h-4" />}
          </button>
        ))}
      </div>
    </div>
  );
}

