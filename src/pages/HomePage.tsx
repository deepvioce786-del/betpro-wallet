import { ShieldCheck, Zap, History, Clock, ArrowRight, Wallet, Lock, CheckCircle2 } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useRouter } from '@/lib/Router';
import { WhatsAppHelpButton } from '@/components/WhatsAppHelpButton';

export function HomePage() {
  const { t, dir } = useLang();
  const { navigate } = useRouter();

  const features = [
    { icon: ShieldCheck, title: t.feature1Title, desc: t.feature1Desc },
    { icon: Zap, title: t.feature2Title, desc: t.feature2Desc },
    { icon: History, title: t.feature3Title, desc: t.feature3Desc },
    { icon: Clock, title: t.feature4Title, desc: t.feature4Desc },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -start-24 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -end-24 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className={`text-center lg:text-start animate-fade-in-up`}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold mb-6">
                <Lock className="w-3.5 h-3.5" />
                {t.secureWalletTitle}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight text-balance">
                {t.heroTagline}
              </h1>
              <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl mx-auto lg:mx-0">
                {t.heroDescription}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <button
                  onClick={() => navigate('signup')}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-teal-600/30 hover:shadow-xl hover:shadow-teal-600/40 transition-all"
                >
                  {t.getStarted}
                  <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${dir === 'rtl' ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </button>
                <button
                  onClick={() => navigate('signin')}
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-teal-400 text-slate-700 hover:text-teal-700 font-semibold transition-all"
                >
                  {t.signIn}
                </button>
              </div>

              <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>{t.feature1Title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>{t.feature4Title}</span>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative animate-fade-in-up delay-200">
              <div className="relative mx-auto max-w-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-3xl blur-2xl" />
                <div className="relative bg-white rounded-3xl shadow-2xl shadow-slate-300/50 border border-slate-200 p-6 animate-float">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.appName}</p>
                        <p className="text-xs text-slate-400">Premium</p>
                      </div>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                  </div>

                  <p className="text-xs text-slate-500 mb-1">{t.walletBalance}</p>
                  <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                    $12,580<span className="text-lg text-slate-400">.00</span>
                  </p>

                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                      <p className="text-xs text-teal-600 font-medium">{t.deposit}</p>
                      <p className="text-lg font-bold text-teal-700 mt-0.5">+ $5,000</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium">{t.withdraw}</p>
                      <p className="text-lg font-bold text-slate-700 mt-0.5">- $1,200</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    {[
                      { label: t.deposit, amt: '+ $2,500', color: 'text-teal-600' },
                      { label: t.withdraw, amt: '- $800', color: 'text-slate-600' },
                      { label: t.deposit, amt: '+ $1,000', color: 'text-teal-600' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5">
                        <span className="text-slate-600">{row.label}</span>
                        <span className={`font-semibold ${row.color}`}>{row.amt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t.featuresTitle}
            </h2>
            <p className="mt-4 text-slate-600">{t.secureWalletDesc}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className={`group bg-white rounded-2xl p-6 border border-slate-200 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-600/5 transition-all animate-fade-in-up delay-${(i + 1) * 100}`}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 flex items-center justify-center mb-4 group-hover:from-teal-600 group-hover:to-emerald-600 group-hover:border-transparent transition-all">
                  <f.icon className="w-6 h-6 text-teal-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 start-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 end-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
            {t.heroTagline}
          </h2>
          <p className="mt-4 text-teal-100 text-lg max-w-2xl mx-auto">{t.heroDescription}</p>
          <button
            onClick={() => navigate('signup')}
            className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white text-teal-700 font-semibold hover:bg-teal-50 transition-all shadow-lg"
          >
            {t.getStarted}
            <ArrowRight className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-600 to-emerald-500 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">{t.appName}</span>
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} {t.appName}. {t.secureWalletTitle}.</p>
        </div>
      </footer>
      <WhatsAppHelpButton />
    </div>
  );
}
