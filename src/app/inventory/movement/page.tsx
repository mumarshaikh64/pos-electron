'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';

interface Movement {
  id: string;
  productId: string;
  product: {
    name: string;
    sku: string;
    unit: { name: string };
  };
  warehouse: {
    name: string;
  };
  quantity: number;
  type: string;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

export default function StockMovementPage() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadMovements = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('inventory:movements-list');
        setMovements(res || []);
      }
    } catch (error) {
      console.error('Failed to load movements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMovements();
  }, []);

  const filtered = movements.filter(
    (m) =>
      m.product.name.toLowerCase().includes(search.toLowerCase()) ||
      m.product.sku.toLowerCase().includes(search.toLowerCase()) ||
      m.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Stock Movement Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Audit log of all stock ins, outs, sales, and purchases</p>
        </div>
        <button
          onClick={loadMovements}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading stock ledger logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Wholesale Product</th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Warehouse</th>
                  <th className="px-6 py-4 text-center">Tx Type</th>
                  <th className="px-6 py-4 text-right">Adjustment Qty</th>
                  <th className="px-6 py-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.length > 0 ? (
                  filtered.map((m) => {
                    const isAddition = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-slate-900/20 transition">
                        <td className="px-6 py-4 font-mono text-slate-400">
                          {new Date(m.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-200">{m.product.name}</td>
                        <td className="px-6 py-4 font-mono text-slate-400 uppercase">{m.product.sku}</td>
                        <td className="px-6 py-4 text-slate-400">{m.warehouse.name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            m.type === 'SALE' ? 'bg-red-950/40 text-red-400 border border-red-900/20' :
                            m.type === 'PURCHASE' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' :
                            'bg-indigo-950/40 text-indigo-400 border border-indigo-900/20'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-right font-black font-mono text-sm ${isAddition ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isAddition ? `+${m.quantity}` : m.quantity} <span className="text-[10px] font-medium text-slate-500">{m.product.unit.name}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 max-w-xs truncate" title={m.notes || ''}>
                          {m.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No stock movement audit records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
