import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../components/LanguageToggle';
import ThemeToggle from '../components/ThemeToggle';

export default function WelcomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    // Mark welcome screen as viewed so returning users can go straight to home
    localStorage.setItem('has_seen_welcome', 'true');
    navigate('/');
  };

  return (
    <div className="relative min-h-screen bg-slate-900 text-white flex flex-col justify-between overflow-hidden selection:bg-csk-yellow selection:text-csk-blue">
      {/* Background Glow Accents */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-csk-yellow/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-csk-blue/40 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar Controls */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-csk-yellow flex items-center justify-center font-black text-csk-blue shadow-lg">
            MT
          </div>
          <span className="font-extrabold text-lg tracking-wider text-csk-yellow">
            {t('appName', 'MyTrip')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Center Welcome Hero Card */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-12 text-center flex flex-col items-center">
        <span className="px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-csk-yellow/10 border border-csk-yellow/30 text-csk-yellow mb-6">
          ✨ Welcome to Effortless Tour Management
        </span>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
          Explore Together, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-csk-yellow via-yellow-200 to-amber-400">
            Split Without Friction.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-10 leading-relaxed">
          Plan group adventures, track shared pooled budgets, log multi-member receipts, and settle optimal debts with automated calculations.
        </p>

        {/* Action Button */}
        <button
          onClick={handleGetStarted}
          className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-csk-yellow hover:bg-csk-yellowDark text-csk-blue font-black text-base tracking-wide shadow-xl shadow-csk-yellow/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>Explore App</span>
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </main>

      {/* Bottom Highlights Footer */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full px-6 pb-8 grid grid-cols-3 gap-4 text-center text-xs text-slate-400">
        <div>
          <p className="font-black text-white text-sm sm:text-base">100% Transparent</p>
          <p className="text-[11px] text-slate-400">Real-time pooled balances</p>
        </div>
        <div>
          <p className="font-black text-white text-sm sm:text-base">Zero Disagreements</p>
          <p className="text-[11px] text-slate-400">Smart greedy debt settlements</p>
        </div>
        <div>
          <p className="font-black text-white text-sm sm:text-base">Bilingual</p>
          <p className="text-[11px] text-slate-400">English & मराठी ready</p>
        </div>
      </footer>
    </div>
  );
}