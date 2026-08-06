import { useEffect, useState } from 'react';
import {
  Loader2, AlertCircle, ArrowLeft, ArrowDownToLine, ArrowUpFromLine,
  History as HistoryIcon, Inbox, ExternalLink,
} from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { getTransactions } from '@/lib/api';
import type { HistoryItem } from '@/lib/types';

type Filter = 'all' | 'deposit' | 'withdraw' | 'pending' | 'approved' | 'rejected';

export function HistoryPage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { username } = useUserAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!username) { navigate('signin'); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getTransactions(username);
      if (cancelled) return;
      if (res.error) setError(res.error);
      else setItems(res.transactions || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [username, navigate]);

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const filtered = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'deposit' || filter === 'withdraw') return item.type === filter;
    return item.status === filter;
  });

  const totalDeposits = items.filter((i) => i.type === 'deposit' && i.status === 'approved').reduce((s, i) => s + Number(i.amount), 0);
  const totalWithdrawals = items.filter((i) => i.type === 'withdraw' && i.status === 'approved').reduce((s, i) => s + Number(i.amount), 0);
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-amber-50 text-amber-700 border-amber-200',
      approved: 'bg-green-50 text-green-700 border-green-200',
      rejected: 'bg-red-50 text-red-700 border-red-200',
    };
    return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };
  const statusLabel = (status: string) => {
    if (status === 'approved') return t.successful;
    if (status === 'pending') return t.pending;
    if (status === 'rejected') return t.rejected;
    return status;
  };
  const methodLabel = (m: string) => {
    if (m === 'easypaisa') return t.easypaisa;
    if (m === 'jazzcash') return t.jazzcash;
    if (m === 'bank') return t.bankAccount;
    return m;
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: dir === 'rtl' ? 'تمام' : 'All' },
    { key: 'deposit', label: t.deposits },
    { key: 'withdraw', label: t.withdrawals },
    { key: 'pending', label: t.pending },
    { key: 'approved', label: t.successful },
    { key: 'rejected', label: t.rejected },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 mb-6 transition-colors">
          <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          {t.dashboard}
        </button>

        <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <HistoryIcon className="w-5.5 h-5.5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t.historyTitle}</h1>
            <p className="text-sm text-slate-500">{t.historyDesc}</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 animate-fade-in-up delay-100">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                <ArrowDownToLine className="w-4 h-4 text-teal-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">{t.deposits}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-teal-700">
              Rs {totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                <ArrowUpFromLine className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">{t.withdrawals}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-slate-700">
              Rs {totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                <span className="text-amber-600 text-sm font-bold">!</span>
              </div>
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">{t.pending}</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-amber-700">{pendingCount}</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-5 animate-fade-in-up delay-150">
          {filters.map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f.key ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        ) : error ? (
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center animate-fade-in">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">{t.noTransactions}</p>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in-up delay-200">
            {filtered.map((item) => {
              const isDeposit = item.type === 'deposit';
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDeposit ? 'bg-teal-50' : 'bg-slate-100'}`}>
                        {isDeposit ? <ArrowDownToLine className="w-5 h-5 text-teal-600" /> : <ArrowUpFromLine className="w-5 h-5 text-slate-600" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{isDeposit ? t.deposit : t.withdraw}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(item.status)}`}>
                            {statusLabel(item.status)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {methodLabel(item.payment_method)} · {fmtDate(item.created_at)}
                        </p>
                        {item.admin_notes && <p className="text-xs text-slate-400 mt-0.5 truncate">📝 {item.admin_notes}</p>}
                      </div>
                    </div>
                    <div className="text-end shrink-0 flex items-center gap-3">
                      <span className={`font-bold text-sm ${isDeposit ? 'text-teal-700' : 'text-slate-700'}`}>
                        {isDeposit ? '+' : '-'} Rs {Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {item.screenshot_url && (
                        <a href={item.screenshot_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 py-1 rounded-lg hover:bg-teal-50 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t.viewScreenshot}</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
