import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyFieldProps {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
  mono?: boolean;
}

export function CopyField({ label, value, copyLabel, copiedLabel, mono = true }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="group">
      <p className="text-xs font-medium text-slate-500 mb-1.5">{label}</p>
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-all group-hover:border-teal-300 group-hover:bg-teal-50/40">
        <span className={`flex-1 truncate text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-200 text-slate-600 hover:bg-teal-600 hover:text-white'
          }`}
          aria-label={copyLabel}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
    </div>
  );
}
