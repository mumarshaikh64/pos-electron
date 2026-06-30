'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Calculator } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export default function TrialBalancePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('accounting:trial-balance');
        setAccounts(res || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  // Calculate Debit and Credit totals
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = accounts.map((acc) => {
    const isDebitType = acc.type === 'ASSET' || acc.type === 'EXPENSE';
    const debitVal = isDebitType ? acc.balance : 0;
    const creditVal = !isDebitType ? acc.balance : 0;
    
    totalDebit += debitVal;
    totalCredit += creditVal;

    return {
      ...acc,
      debit: debitVal,
      credit: creditVal,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Accounting Trial Balance
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Audit log of all double-entry accounts with balancing debits and credits</p>
        </div>
        <button
          onClick={loadReport}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Generating trial balance report...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Account Code</th>
                  <th className="px-6 py-4">Account Title / Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4 text-right w-36">Debit (PKR)</th>
                  <th className="px-6 py-4 text-right w-36">Credit (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {rows.length > 0 ? (
                  rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/20 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-indigo-400">{r.code}</td>
                      <td className="px-6 py-3.5 font-semibold text-slate-200">{r.name}</td>
                      <td className="px-6 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950 border border-slate-900 text-slate-400 uppercase">
                          {r.type}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-200">
                        {r.debit > 0 ? `PKR ${r.debit.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-semibold text-slate-200">
                        {r.credit > 0 ? `PKR ${r.credit.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No accounts found to construct trial balance.
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-950/80 border-t border-slate-800 font-extrabold text-slate-100 text-xs">
                    <td colSpan={3} className="px-6 py-4 uppercase tracking-wider flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-indigo-400" />
                      <span>Report Summary Balances</span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400 text-sm border-l border-slate-800/60">
                      PKR {totalDebit.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-400 text-sm border-l border-slate-800/60">
                      PKR {totalCredit.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
