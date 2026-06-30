'use client';

import React, { useState, useEffect } from 'react';
import { Sun, Moon, Bell, Search, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthProvider';

export function Header() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [registerInfo, setRegisterInfo] = useState<{ status: string; balance: number }>({
    status: 'CLOSED',
    balance: 0,
  });

  useEffect(() => {
    async function checkRegister() {
      if (typeof window !== 'undefined' && window.electron && user) {
        try {
          const res = await window.electron.invoke('sales:register-status', user.id);
          if (res && res.status === 'OPEN') {
            setRegisterInfo({
              status: 'OPEN',
              balance: res.register.currentBalance || 0,
            });
          }
        } catch (e) {
          console.error('Error fetching register status:', e);
        }
      }
    }
    checkRegister();
  }, [user]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const htmlElement = document.documentElement;
    if (nextTheme === 'dark') {
      htmlElement.classList.add('dark');
      htmlElement.classList.remove('light');
    } else {
      htmlElement.classList.add('light');
      htmlElement.classList.remove('dark');
    }
  };

  return (
    <header className="h-16 px-6 border-b border-slate-900 bg-slate-950 flex items-center justify-between z-10 flex-shrink-0">
      {/* Global Command Search Box */}
      <div className="w-80 relative hidden md:block">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-500" />
        </span>
        <input
          type="text"
          placeholder="Global Search (Ctrl + K)"
          className="w-full bg-slate-900/40 border border-slate-900 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition duration-150"
        />
      </div>

      {/* Action Tray */}
      <div className="flex items-center gap-4 ml-auto md:ml-0">
        {/* Cash Register Active Session Indicator */}
        {registerInfo.status === 'OPEN' ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs font-semibold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Till Open: ${registerInfo.balance.toFixed(2)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-slate-400 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
            <span>Till Closed</span>
          </div>
        )}

        {/* Theme Palette Switcher */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition duration-150 cursor-pointer"
          title="Toggle interface theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>

        {/* System Alert Bell */}
        <button
          className="p-2.5 rounded-xl bg-slate-900/40 hover:bg-slate-900/80 border border-slate-900 hover:border-slate-800 text-slate-400 hover:text-slate-200 transition duration-150 relative cursor-pointer"
          title="System notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-500 border-2 border-slate-950 rounded-full animate-pulse" />
        </button>
      </div>
    </header>
  );
}
