'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Landmark, ShieldCheck } from 'lucide-react';

interface ReportData {
  assets: Array<{ name: string; code: string; balance: number }>;
  liabilities: Array<{ name: string; code: string; balance: number }>;
  equity: Array<{ name: string; code: string; balance: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export default function BalanceSheetPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('accounting:balance-sheet');
        setData(res);
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Accounting Balance Sheet
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Financial statement listing assets, liabilities, and shareholder equity</p>
        </div>
        <button
          onClick={loadReport}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-slate-500 text-xs">Generating balance sheet statement...</div>
      ) : (
        <div className="space-y-6">
          {/* Top balancing check bar */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-slate-200 uppercase">Double-Entry Accounting Equation Check</p>
                <p className="text-[10px] text-slate-500 font-semibold">Assets = Liabilities + Equity</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Equation Balances</span>
              <span className="font-mono text-sm font-black text-emerald-400">
                PKR {data.totalAssets.toFixed(2)} = PKR {(data.totalLiabilities + data.totalEquity).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left side: Assets */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">
                ASSETS (Current & Fixed)
              </h3>
              <div className="space-y-2.5 text-xs min-h-64">
                {data.assets.map((a) => (
                  <div key={a.code} className="flex justify-between py-1 px-2 hover:bg-slate-950/20 rounded">
                    <span className="text-slate-400 font-medium">{a.name} ({a.code})</span>
                    <span className="font-mono font-bold text-slate-200">PKR {a.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-800 pt-3 flex justify-between text-xs font-black uppercase text-slate-200">
                <span>TOTAL ASSETS</span>
                <span className="font-mono text-emerald-400">PKR {data.totalAssets.toFixed(2)}</span>
              </div>
            </div>

            {/* Right side: Liabilities & Equity */}
            <div className="flex flex-col gap-6">
              {/* Liabilities */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">
                  LIABILITIES (Payables)
                </h3>
                <div className="space-y-2.5 text-xs min-h-24">
                  {data.liabilities.map((a) => (
                    <div key={a.code} className="flex justify-between py-1 px-2 hover:bg-slate-950/20 rounded">
                      <span className="text-slate-400 font-medium">{a.name} ({a.code})</span>
                      <span className="font-mono font-bold text-slate-200">PKR {a.balance.toFixed(2)}</span>
                    </div>
                  ))}
                  {data.liabilities.length === 0 && (
                    <p className="text-slate-600 text-[11px] py-4 text-center">No outstanding liability accounts.</p>
                  )}
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between text-xs font-black uppercase text-slate-200">
                  <span>TOTAL LIABILITIES</span>
                  <span className="font-mono text-emerald-400">PKR {data.totalLiabilities.toFixed(2)}</span>
                </div>
              </div>

              {/* Equity */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2">
                  EQUITY (Shareholder Value)
                </h3>
                <div className="space-y-2.5 text-xs min-h-24">
                  {data.equity.map((a) => (
                    <div key={a.code} className="flex justify-between py-1 px-2 hover:bg-slate-950/20 rounded">
                      <span className="text-slate-400 font-medium">{a.name} ({a.code})</span>
                      <span className="font-mono font-bold text-slate-200">PKR {a.balance.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-800 pt-3 flex justify-between text-xs font-black uppercase text-slate-200">
                  <span>TOTAL EQUITY</span>
                  <span className="font-mono text-emerald-400">PKR {data.totalEquity.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
