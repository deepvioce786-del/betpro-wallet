import { useEffect, useState, useRef, type FormEvent } from 'react';
import { ArrowLeft, Send, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { useUserAuth } from '@/lib/UserAuthContext';
import { getHelplineMessages, sendHelplineMessage } from '@/lib/api';

interface HelplineMessage {
  id: string;
  sender: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function HelplinePage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();
  const { username } = useUserAuth();
  const [messages, setMessages] = useState<HelplineMessage[]>([]);
  const [adminOnline, setAdminOnline] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!username) {
      navigate('signin');
      return;
    }
    let cancelled = false;
    const load = async () => {
      const res = await getHelplineMessages(username);
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
      } else {
        setMessages(res.messages || []);
        setAdminOnline(res.adminOnline ?? false);
      }
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [username, navigate]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || sending) return;
    setSending(true);
    setInput('');
    const res = await sendHelplineMessage(username!, msg);
    setSending(false);
    if (!res.ok) {
      setError(res.error || 'Failed to send');
      setInput(msg);
      return;
    }
    setError(null);
    const refresh = await getHelplineMessages(username!);
    if (refresh.messages) setMessages(refresh.messages);
    if (refresh.adminOnline !== undefined) setAdminOnline(refresh.adminOnline);
  };

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <button onClick={() => navigate('dashboard')} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
            <ArrowLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900 leading-tight">{t.helplineAdmin}</p>
              <div className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${adminOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className={`text-xs font-medium ${adminOnline ? 'text-green-600' : 'text-slate-400'}`}>
                  {adminOnline ? t.helplineOnline : t.helplineOffline}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="ml-2 text-slate-500 text-sm">{t.helplineLoading}</span>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
              <p className="text-sm text-red-600">{t.helplineError}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <MessageCircle className="w-10 h-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">{t.helplineNoMessages}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isUser
                        ? 'bg-gradient-to-br from-teal-600 to-emerald-600 text-white rounded-br-md'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                      <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'text-teal-100' : 'text-slate-400'}`}>
                        <p className="text-[10px]">{fmtTime(msg.created_at)}</p>
                        {isUser && (
                          <span className="text-[9px] font-semibold">
                            {msg.is_read ? `✓✓ ${t.msgStatusSeen}` : `✓ ${t.msgStatusSent}`}
                          </span>
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

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 sm:px-6 py-4">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.helplinePlaceholder}
            className={`flex-1 ${dir === 'rtl' ? 'pr-4 pl-4 font-ur' : 'px-4'} py-3 rounded-xl border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all text-sm text-slate-900 placeholder:text-slate-400`}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />}
            <span className="hidden sm:inline">{t.helplineSend}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
