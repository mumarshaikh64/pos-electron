'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown,
  PlusCircle,
  X,
  Save,
  DollarSign,
  Calendar,
  Layers,
  Info
} from 'lucide-react';

interface ExpenseItem {
  id: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
}

export default function ExpensePage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  const loadExpenses = async () => {
    setLoading(true);
    try {
      // Mock data/list or load from accounting logs
      setExpenses([
        { id: 'EXP-001', amount: 150.00, paymentMethod: 'CASH', notes: 'Office cleaning services', createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 'EXP-002', amount: 800.00, paymentMethod: 'BANK', notes: 'Monthly shop electricity bill', createdAt: new Date(Date.now() - 172800000).toISOString() },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) return;

    setSaving(true);
    setTimeout(() => {
      const newItem: ExpenseItem = {
        id: `EXP-00${expenses.length + 1}`,
        amount: parseFloat(amount) || 0,
        paymentMethod,
        notes: notes || 'General operational expenditure',
        createdAt: new Date().toISOString()
      };
      setExpenses([newItem, ...expenses]);
      setAmount('');
      setNotes('');
      setModalOpen(false);
      setSaving(false);
    }, 500);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
            Business Expenditures
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Track company overhead cost details and logs</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Expense ID</th>
                <th className="px-6 py-4">Date / Time</th>
                <th className="px-6 py-4">Account Category</th>
                <th className="px-6 py-4">Notes / Details</th>
                <th className="px-6 py-4 text-center">Payment Method</th>
                <th className="px-6 py-4 text-right">Amount (PKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-900/10 transition">
                  <td className="px-6 py-4 font-bold text-indigo-400 font-mono">{exp.id}</td>
                  <td className="px-6 py-4 font-mono text-slate-400">
                    {new Date(exp.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-slate-200">General Administrative [6000]</td>
                  <td className="px-6 py-4 text-slate-400 font-medium">{exp.notes || 'N/A'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-2.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 uppercase font-bold">
                      {exp.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-rose-400 font-mono">PKR {exp.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-200">Record operational expense</h3>
                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Expense Amount (PKR) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[9px] font-bold text-slate-500">
                      PKR
                    </span>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-xs font-bold text-slate-200 focus:outline-none focus:border-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Payment Account</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="CASH">Cash in Hand [1000]</option>
                    <option value="BANK">Bank Account [1100]</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Notes / Description *</label>
                  <textarea
                    placeholder="Enter complete expense breakdown details"
                    required
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 border border-slate-800 text-slate-400 rounded-xl py-2.5 font-bold text-xs hover:bg-slate-950 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Post Expense</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
