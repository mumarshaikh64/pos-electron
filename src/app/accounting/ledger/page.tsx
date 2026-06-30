'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  DollarSign,
  TrendingUp,
  FileText,
  Bookmark,
  Calendar
} from 'lucide-react';

interface AccountRecord {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export default function AccountingLedgerPage() {
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLedgerData() {
      setLoading(true);
      try {
        if (typeof window !== 'undefined' && window.electron) {
          const res = await window.electron.invoke('accounting:ledger');
          setAccounts(res || []);
        } else {
          // Fallback mock accounts for sandbox preview
          setAccounts([
            { id: '1', code: '1000', name: 'Cash in Hand', type: 'ASSET', balance: 4500.00 },
            { id: '2', code: '1100', name: 'Bank Accounts', type: 'ASSET', balance: 12500.00 },
            { id: '3', code: '1200', name: 'Accounts Receivable (Customers)', type: 'ASSET', balance: 8400.00 },
            { id: '4', code: '1300', name: 'Inventory Asset', type: 'ASSET', balance: 35000.00 },
            { id: '5', code: '2000', name: 'Accounts Payable (Suppliers)', type: 'LIABILITY', balance: 6200.00 },
            { id: '6', code: '4000', name: 'Sales Revenue', type: 'REVENUE', balance: 18200.00 },
            { id: '7', code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE', balance: 11200.00 },
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadLedgerData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-900/60 rounded-xl animate-pulse w-48" />
        <div className="h-96 bg-slate-900/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // Summary tallies
  const totalAssets = accounts.filter(a => a.type === 'ASSET').reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = accounts.filter(a => a.type === 'LIABILITY').reduce((sum, a) => sum + a.balance, 0);
  const totalRevenue = accounts.filter(a => a.type === 'REVENUE').reduce((sum, a) => sum + a.balance, 0);
  const totalExpenses = accounts.filter(a => a.type === 'EXPENSE').reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
          General Ledger Accounts
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Audit chart of accounts balances and double-entry registers</p>
      </div>

      {/* Aggregate Balance Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Asset Valuation</span>
          <span className="text-xl font-extrabold text-indigo-400 mt-1 block">${totalAssets.toFixed(2)}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Outstanding Payables</span>
          <span className="text-xl font-extrabold text-rose-400 mt-1 block">${totalLiabilities.toFixed(2)}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Gross Sales Revenue</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-1 block">${totalRevenue.toFixed(2)}</span>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-md">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Operating Expenses</span>
          <span className="text-xl font-extrabold text-amber-400 mt-1 block">${totalExpenses.toFixed(2)}</span>
        </div>
      </div>

      {/* Accounts List Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-200">Chart of Accounts Status</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/20 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Account Code</th>
                <th className="px-6 py-4">Account Title</th>
                <th className="px-6 py-4">Account Type</th>
                <th className="px-6 py-4 text-right">Debit / Credit Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-900/10 transition">
                  <td className="px-6 py-4 font-mono font-bold text-indigo-400 text-[10px]">{acc.code}</td>
                  <td className="px-6 py-4 font-semibold text-slate-200">{acc.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-950 border border-slate-900 text-[9px] text-slate-500 font-bold uppercase">
                      {acc.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-black text-slate-200 font-mono">${acc.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
