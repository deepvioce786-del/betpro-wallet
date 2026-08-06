import { useEffect, useState, type FormEvent } from 'react';
import {
  Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowDownToLine,
  Upload, Check, Copy, Building2, Smartphone, Wallet,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { getPaymentMethods, createDeposit, uploadScreenshot, getWalletInfo } from '@/lib/api';
import type { PaymentMethods } from '@/lib/types';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

export function DepositPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { username } = useUserAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'easypaisa' | 'jazzcash' | 'bank'>('easypaisa');
  const [methods, setMethods] = useState<PaymentMethods | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    getPaymentMethods().then((res) => {
      if (res.data) setMethods(res.data);
      else if (res.error) setError(res.error);
    });
    if (username) {
      getWalletInfo(username).then((res) => {
        if (res.info) setBalance(Number(res.info.wallet.balance));
      });
    }
  }, [username]);

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      setError(dir === 'rtl' ? 'فائل سائز 500 MB سے زیادہ نہیں ہو سکتی' : 'File size must not exceed 500 MB');
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError(dir === 'rtl' ? 'صرف JPG، JPEG اور PNG فارمیٹس کی اجازت ہے' : 'Only JPG, JPEG and PNG formats are supported');
      return;
    }
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setError(null);
  };

  const copyValue = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt < 500) {
      setError(dir === 'rtl' ? 'کم از کم رقم 500 روپے ہے' : 'Minimum deposit amount is Rs 500');
      return;
    }
    if (amt > 1000000) {
      setError(dir === 'rtl' ? 'زیادہ سے زیادہ رقم 10 لاکھ روپے ہے' : 'Maximum deposit amount is Rs 10,00,000');
      return;
    }
    if (!file) {
      setError(dir === 'rtl' ? 'ڈپازٹ درخواست جمع کرانے سے پہلے براہ کرم اپنا پیمنٹ اسکرین شاٹ اپ لوڈ کریں۔' : 'Please upload your payment screenshot before submitting your deposit request.');
      return;
    }
    if (!username) { navigate('signin'); return; }

    setLoading(true);
    let screenshotUrl: string | null = null;
    let screenshotPath: string | null = null;
    if (file) {
      const upRes = await uploadScreenshot(username, file);
      if (upRes.error) {
        setLoading(false);
        setError(upRes.error);
        return;
      }
      screenshotUrl = upRes.url || null;
      screenshotPath = upRes.path || null;
    }

    const res = await createDeposit({ username, amount: amt, paymentMethod: method, screenshotUrl, screenshotPath });
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Deposit failed'); return; }
    setSuccess(true);
    setTimeout(() => navigate('history'), 2000);
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center animate-scale-in">
          <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 items-center justify-center shadow-lg shadow-teal-500/40 mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl font-bold text-slate-900">{t.depositPendingMsg}</p>
          <p className="text-slate-500 mt-1">{t.history}...</p>
        </div>
      </div>
    );
  }

  const methodTabs: { key: typeof method; label: string; icon: typeof Smartphone }[] = [
    { key: 'easypaisa', label: t.easypaisa, icon: Smartphone },
    { key: 'jazzcash', label: t.jazzcash, icon: Wallet },
    { key: 'bank', label: t.bankAccount, icon: Building2 },
  ];

  const renderMethodInfo = () => {
    if (!methods) return null;
    if (method === 'easypaisa') {
      return (
        <div className="space-y-3">
          <InfoRow label={t.accountHolder} value={methods.easypaisa.name} field="ep-name" copied={copiedField} onCopy={copyValue} />
          <InfoRow label={t.accountNumber} value={methods.easypaisa.number} field="ep-num" copied={copiedField} onCopy={copyValue} mono />
        </div>
      );
    }
    if (method === 'jazzcash') {
      return (
        <div className="space-y-3">
          <InfoRow label={t.accountHolder} value={methods.jazzcash.name} field="jc-name" copied={copiedField} onCopy={copyValue} />
          <InfoRow label={t.accountNumber} value={methods.jazzcash.number} field="jc-num" copied={copiedField} onCopy={copyValue} mono />
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <InfoRow label={t.bankName} value={methods.bank.name} field="bk-name" copied={copiedField} onCopy={copyValue} />
        <InfoRow label={t.accountHolder} value={methods.bank.holder} field="bk-holder" copied={copiedField} onCopy={copyValue} />
        <InfoRow label={t.accountNumber} value={methods.bank.account} field="bk-acct" copied={copiedField} onCopy={copyValue} mono />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          {t.dashboard}
        </button>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 sm:p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-600/30">
              <ArrowDownToLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{t.depositTitle}</h1>
              <p className="text-sm text-slate-500">{t.depositDesc}</p>
            </div>
          </div>

          {balance !== null && (
            <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-sm text-slate-500">{t.availableBalance}</span>
              <span className="text-lg font-bold text-slate-900">
                Rs {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.amount}</label>
              <div className="relative">
                <span className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} text-slate-500 font-semibold`}>Rs</span>
                <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.amountPlaceholder} autoFocus
                  className={`w-full ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-lg font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal`} />
              </div>
            </div>

            {/* Payment method tabs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.paymentMethod}</label>
              <div className="grid grid-cols-3 gap-2">
                {methodTabs.map((mt) => (
                  <button key={mt.key} type="button" onClick={() => setMethod(mt.key)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      method === mt.key ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    <mt.icon className="w-5 h-5" />
                    <span className="text-xs font-semibold">{mt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment account details with copy buttons */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{t.paymentAccounts}</p>
              {renderMethodInfo()}
            </div>

            {/* Warning notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 animate-fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
              <p className="text-sm text-amber-800 leading-relaxed font-medium">
                {dir === 'rtl'
                  ? '⚠️ تنبیہ: جعلی یا ترمیم شدہ پیمنٹ اسکرین شاٹ اپ لوڈ کرنے پر آپ کا اکاؤنٹ مستقل طور پر معطل ہو سکتا ہے۔ براہ کرم صرف اپنا اصلی پیمنٹ ثبوت اپ لوڈ کریں۔'
                  : '⚠️ Warning: Uploading a fake or edited payment screenshot may result in the permanent suspension of your account. Please upload only your original payment proof.'}
              </p>
            </div>

            {/* Screenshot upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.uploadScreenshot}</label>
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-400 cursor-pointer transition-colors bg-slate-50/50">
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="max-h-40 rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload className="w-7 h-7 text-slate-400" />
                    <span className="text-sm text-slate-500">{t.screenshotHint}</span>
                  </>
                )}
                <input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
              </label>
              {file && <p className="mt-2 text-xs text-slate-500 truncate">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => navigate('dashboard')}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors">
                {t.cancel}
              </button>
              <button type="submit" disabled={loading || !file}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-600/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, field, copied, onCopy, mono }: {
  label: string; value: string; field: string;
  copied: string | null; onCopy: (v: string, f: string) => void; mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-lg px-3.5 py-2.5 border border-slate-200">
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm text-slate-800 truncate ${mono ? 'font-mono' : 'font-medium'}`}>{value}</p>
      </div>
      <button onClick={() => onCopy(value, field)}
        className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
          copied === field ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600 hover:bg-teal-600 hover:text-white'
        }`}>
        {copied === field ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        <span className="hidden sm:inline">{copied === field ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  );
}
