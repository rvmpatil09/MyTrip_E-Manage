import React, { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded-full border border-csk-yellow/30 bg-white/10 text-csk-yellow hover:bg-csk-yellow hover:text-csk-blue transition-all"
    >
      {theme === 'dark' ? (
        // Sun Icon
        <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4.22 2.36a1 1 0 011.42 0l.7.7a1 1 0 01-1.42 1.42l-.7-.7a1 1 0 010-1.42zm3.36 5.64a1 1 0 010 2h-1a1 1 0 110-2h1zm-2.36 4.22a1 1 0 011.42 1.42l-.7.7a1 1 0 01-1.42-1.42l.7-.7zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-4.22-.36l-.7.7a1 1 0 01-1.42-1.42l.7-.7a1 1 0 011.42 1.42zM2 10a1 1 0 011-1h1a1 1 0 110 2H3a1 1 0 01-1-1zm2.36-4.22l-.7-.7a1 1 0 011.42-1.42l.7.7a1 1 0 01-1.42 1.42zM10 5a5 5 0 100 10 5 5 0 000-10z" />
        </svg>
      ) : (
        // Moon Icon
        <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );
}