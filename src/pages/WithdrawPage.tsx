import { useEffect, useState, type FormEvent } from 'react';
import {
  Loader2, AlertCircle, CheckCircle2, ArrowLeft, ArrowUpFromLine,
  Building2, Smartphone, Wallet,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { getWalletInfo, createWithdraw } from '@/lib/api';

export function WithdrawPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { username } = useUserAuth();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'easypaisa' | 'jazzcash' | 'bank'>('easypaisa');
  const [accountDetail, setAccountDetail] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (username) {
      getWalletInfo(username).then((res) => {
        if (res.info) setBalance(Number(res.info.wallet.balance));
      });
    }
  }, [username]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(dir === 'rtl' ? 'درست رقم درج کریں' : 'Please enter a valid amount');
      return;
    }
    if (balance !== null && amt > balance) {
      setError(t.insufficientBalance);
      return;
    }
    if (!accountDetail.trim()) {
      setError(t.yourAccountDetail);
      return;
    }
    if (!username) { navigate('signin'); return; }

    setLoading(true);
    const res = await createWithdraw({
      username, amount: amt, paymentMethod: method,
      accountDetail: accountDetail.trim(),
      accountHolderName: accountHolderName.trim() || null,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error || 'Withdraw failed'); return; }
    setSuccess(true);
    setTimeout(() => navigate('history'), 2000);
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center animate-scale-in max-w-md">
          <div className="inline-flex w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 items-center justify-center shadow-lg shadow-teal-500/40 mb-4">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
          <p className="text-xl font-bold text-slate-900">{t.withdrawPendingMsg}</p>
          <p className="text-sm text-slate-500 mt-2">{t.withdrawDeductedMsg}</p>
          <p className="text-slate-400 mt-2">{t.history}...</p>
        </div>
      </div>
    );
  }

  const methodTabs: { key: typeof method; label: string; icon: typeof Smartphone }[] = [
    { key: 'easypaisa', label: t.easypaisa, icon: Smartphone },
    { key: 'jazzcash', label: t.jazzcash, icon: Wallet },
    { key: 'bank', label: t.bankAccount, icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/30 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          {t.dashboard}
        </button>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-6 sm:p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg">
              <ArrowUpFromLine className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">{t.withdrawTitle}</h1>
              <p className="text-sm text-slate-500">{t.withdrawDesc}</p>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.amount}</label>
              <div className="relative">
                <span className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} text-slate-500 font-semibold`}>Rs</span>
                <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder={t.amountPlaceholder} autoFocus
                  className={`w-full ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-lg font-semibold text-slate-900 placeholder:text-slate-300 placeholder:font-normal`} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">{t.withdrawMethod}</label>
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.accountHolderName}</label>
              <input type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder={t.accountHolderName}
                className={`w-full ${dir === 'rtl' ? 'font-ur' : ''} px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.yourAccountDetail}</label>
              <input type="text" value={accountDetail} onChange={(e) => setAccountDetail(e.target.value)}
                placeholder={t.yourAccountDetailPlaceholder}
                className={`w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 font-mono placeholder:text-slate-400`} />
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{t.withdrawDeductedMsg}</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => navigate('dashboard')}
                className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors">
                {t.cancel}
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
