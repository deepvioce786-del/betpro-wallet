import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import type { Language } from '@/lib/types';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);

  const options: { value: Language; label: string }[] = [
    { value: 'en', label: t.english },
    { value: 'ur', label: t.urdu },
  ];

  const current = options.find((o) => o.value === lang);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white/70 hover:bg-white border border-slate-200 hover:border-teal-300 transition-all"
        aria-label={t.language}
      >
        <Globe className="w-4 h-4" />
        {!compact && <span>{current?.label}</span>}
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-scale-in origin-top">
          {options.map((opt) => (
            <button
              key={opt.value}
              onMouseDown={() => {
                setLang(opt.value);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                lang === opt.value
                  ? 'bg-teal-50 text-teal-700 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className={opt.value === 'ur' ? 'font-ur' : ''}>{opt.label}</span>
              {lang === opt.value && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
