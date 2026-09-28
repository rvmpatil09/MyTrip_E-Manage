import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish, duration = 2200 }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Begin fade-out slightly before duration completes
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, duration - 400);

    const finishTimer = setTimeout(() => {
      onFinish();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [duration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#071324] text-white transition-opacity duration-400 ease-out select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center space-y-6 animate-pulse">
        {/* Yellow Rounded Car Badge */}
        <div className="w-20 h-20 rounded-3xl bg-[#f5a623] flex items-center justify-center text-slate-900 shadow-2xl shadow-[#f5a623]/30">
          <svg className="w-11 h-11 fill-current" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.77l.11.34V17z" />
            <circle cx="7.5" cy="14.5" r="1.5" />
            <circle cx="16.5" cy="14.5" r="1.5" />
          </svg>
        </div>

        {/* Brand Names & Subtitle */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-3xl tracking-tight text-[#f5a623]">
              MyTrip
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 tracking-wider">
              E-Manage
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-[0.22em] text-slate-400 uppercase mt-2">
            TOUR & SHARED EXPENSE ENGINE
          </span>
        </div>
      </div>

      {/* Animated Loading Bar */}
      <div className="w-48 h-1 bg-slate-800 rounded-full mt-10 overflow-hidden relative">
        <div className="h-full bg-[#f5a623] rounded-full animate-[shimmer_1.5s_infinite] w-2/3" />
      </div>
    </div>
  );
}