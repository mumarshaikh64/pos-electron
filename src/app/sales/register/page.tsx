'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Wallet,
  PiggyBank,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowRightLeft,
  Coins,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function CashRegisterPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active register state
  const [isOpen, setIsOpen] = useState(false);
  const [register, setRegister] = useState<any>(null);

  // Form states
  const [openingBalance, setOpeningBalance] = useState('0.00');
  const [cashOut, setCashOut] = useState('0.00');
  const [notes, setNotes] = useState('');

  const checkRegisterStatus = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('sales:register-status', user.id);
        if (res.status === 'OPEN') {
          setIsOpen(true);
          setRegister(res.register);
          setCashOut((res.register.currentBalance || 0).toString());
        } else {
          setIsOpen(false);
          setRegister(null);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with register channel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRegisterStatus();
  }, [user]);

  const handleOpenRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('sales:open-register', {
          userId: user.id,
          openingBalance,
        });

        if (res.success) {
          // Force reload layout state to update indicators
          window.location.reload();
        } else {
          setError(res.error || 'Failed to open register.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger register session.');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!register) return;

    setSaving(true);
    setError(null);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('sales:close-register', register.id, {
          cashOut,
          notes,
        });

        if (res.success) {
          // Force reload layout state
          window.location.reload();
        } else {
          setError(res.error || 'Failed to close register.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to close register session.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-900/60 rounded-xl animate-pulse w-48" />
        <div className="h-96 bg-slate-900/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
          Cash Register Session
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Activate till stations and audit cash drawers balances</p>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {isOpen && register ? (
        /* OPEN REGISTER PANEL */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-5 blur-3xl pointer-events-none" />

          {/* Active Banner */}
          <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 text-emerald-200 text-xs">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <span className="font-bold block">Cash Register Active</span>
              <span className="text-slate-400 text-[10px]">Opened at: {new Date(register.openedAt).toLocaleString()}</span>
            </div>
          </div>

          {/* Summary Fields */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="bg-slate-950/50 p-4 border border-slate-800/60 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Opening Balance</span>
              <span className="text-lg font-extrabold text-slate-200 mt-1 block">${register.openingBalance.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950/50 p-4 border border-slate-800/60 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Cash Collected</span>
              <span className="text-lg font-extrabold text-emerald-400 mt-1 block">${register.salesAmount.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950/50 p-4 border border-slate-800/60 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Cash Spent</span>
              <span className="text-lg font-extrabold text-rose-400 mt-1 block">${register.expenseAmount.toFixed(2)}</span>
            </div>

            <div className="bg-slate-950/50 p-4 border border-slate-800/60 rounded-2xl">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Expected Drawer Cash</span>
              <span className="text-lg font-extrabold text-indigo-400 mt-1 block">
                ${(register.openingBalance + register.salesAmount - register.expenseAmount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Close Register Form */}
          <form onSubmit={handleCloseRegister} className="space-y-4 pt-4 border-t border-slate-800">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Cash Out Amount *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Coins className="h-4.5 w-4.5 text-slate-500" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashOut}
                  onChange={(e) => setCashOut(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                />
              </div>
              <p className="text-[9px] text-slate-500 px-1">Specify actual cash amount to be withdrawn from the drawer drawer.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Closing remarks / discrepancies</label>
              <textarea
                placeholder="List cash discrepancy reasons or drawer status..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={saving}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-red-950/20"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Closing Till Session...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Close Register & Lock Station</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      ) : (
        /* CLOSED REGISTER PANEL */
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-3xl p-6 shadow-xl space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-5 blur-3xl pointer-events-none" />

          {/* Closed Warning Banner */}
          <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 text-slate-400 text-xs">
            <PiggyBank className="w-8 h-8 text-indigo-400 flex-shrink-0" />
            <div>
              <span className="font-bold text-slate-300 block">Register Locked</span>
              <span className="text-slate-500 text-[10px]">Open a cash register session to collect cash checkout checkout.</span>
            </div>
          </div>

          <form onSubmit={handleOpenRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Opening Cash Balance *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Wallet className="h-4.5 w-4.5 text-slate-500" />
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3.5 pl-10 pr-4 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                />
              </div>
              <p className="text-[9px] text-slate-500 px-1">Opening cash vault float count at the beginning of the shift.</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-3.5 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-indigo-500/10"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Activating Station...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Open Till Session</span>
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
