'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ReportData {
  revenue: number;
  costOfGoodsSold: number;
  expenses: number;
  netProfit: number;
  revenueAccounts: Array<{ name: string; code: string; balance: number }>;
  expenseAccounts: Array<{ name: string; code: string; balance: number }>;
}

export default function ProfitLossPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('accounting:profit-loss');
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
            Profit & Loss Statement
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Income statement summarizing revenues, costs, and expenses</p>
        </div>
        <button
          onClick={loadReport}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-slate-500 text-xs">Generating income statement...</div>
      ) : (
        <div className="space-y-6">
          {/* Aggregates row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Gross Revenues</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-slate-100 font-mono mt-2">PKR {data.revenue.toFixed(2)}</p>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl">
              <div className="flex justify-between items-center text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Operational Expenses</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-slate-100 font-mono mt-2">
                PKR {(data.costOfGoodsSold + data.expenses).toFixed(2)}
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl bg-gradient-to-br from-indigo-950/20 to-slate-900/40">
              <div className="flex justify-between items-center text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Net Profit / Margin</span>
                <DollarSign className="w-4 h-4 text-indigo-400" />
              </div>
              <p className={`text-2xl font-black font-mono mt-2 ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                PKR {data.netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Detailed breakdown */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-6">
            {/* Revenue breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2 flex justify-between">
                <span>Operating Revenue</span>
                <span className="font-mono text-slate-300">PKR {data.revenue.toFixed(2)}</span>
              </h3>
              <div className="space-y-2 text-xs">
                {data.revenueAccounts.map((a) => (
                  <div key={a.code} className="flex justify-between py-1 px-2 hover:bg-slate-950/20 rounded">
                    <span className="text-slate-400 font-medium">{a.name} ({a.code})</span>
                    <span className="font-mono font-bold text-slate-200">PKR {a.balance.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2 flex justify-between">
                <span>Cost of Goods Sold (COGS)</span>
                <span className="font-mono text-slate-300">PKR {data.costOfGoodsSold.toFixed(2)}</span>
              </h3>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-850 pb-2 flex justify-between">
                <span>General & Administrative Expenses</span>
                <span className="font-mono text-slate-300">PKR {data.expenses.toFixed(2)}</span>
              </h3>
              <div className="space-y-2 text-xs">
                {data.expenseAccounts
                  .filter((a) => !a.name.toLowerCase().includes('cost of goods sold') && a.code !== '5000')
                  .map((a) => (
                    <div key={a.code} className="flex justify-between py-1 px-2 hover:bg-slate-950/20 rounded">
                      <span className="text-slate-400 font-medium">{a.name} ({a.code})</span>
                      <span className="font-mono font-bold text-slate-200">PKR {a.balance.toFixed(2)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Final Totals bottom line */}
            <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-sm font-black uppercase text-slate-200">
              <span>Net Net Income (Earnings)</span>
              <span className={`font-mono text-lg ${data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                PKR {data.netProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
