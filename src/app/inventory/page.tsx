'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Warehouse,
  Search,
  AlertTriangle,
  CheckCircle,
  Database
} from 'lucide-react';

interface ProductStock {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  currentStock: number;
  minimumStock: number;
  purchasePrice: number;
  unit: { name: string };
  category: { name: string };
}

export default function InventoryStockPage() {
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [filtered, setFiltered] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadStockData = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const list = await window.electron.invoke('products:list');
        setProducts(list || []);
        setFiltered(list || []);
      }
    } catch (err) {
      console.error('Failed to load products list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (q) {
      setFiltered(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            p.category.name.toLowerCase().includes(q)
        )
      );
    } else {
      setFiltered(products);
    }
  }, [search, products]);

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
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
          Inventory Stock Levels
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">Monitor real-time warehouse quantities and inventory values</p>
      </div>

      {/* Filter */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search stock by product name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-200">Stock Valuation & Status</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/20 text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Wholesale Product</th>
                <th className="px-6 py-4 text-center">SKU / Code</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Average Cost</th>
                <th className="px-6 py-4 text-center w-36">In-Stock Quantity</th>
                <th className="px-6 py-4 text-right">Inventory Valuation</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.length > 0 ? (
                filtered.map((p) => {
                  const isLow = p.currentStock <= p.minimumStock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/10 transition">
                      <td className="px-6 py-3.5 font-bold text-slate-200">{p.name}</td>
                      <td className="px-6 py-3.5 text-center font-mono uppercase text-slate-500 text-[10px]">
                        {p.sku}
                      </td>
                      <td className="px-6 py-3.5 text-slate-400">{p.category.name}</td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-400">${p.purchasePrice.toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-center">
                        <span className={`inline-block px-3 py-0.5 rounded font-black font-mono text-xs ${
                          isLow ? 'text-rose-400 bg-rose-950/20' : 'text-slate-200 bg-slate-950/40'
                        }`}>
                          {p.currentStock} {p.unit.name}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-black text-slate-200 font-mono">
                        ${(p.currentStock * p.purchasePrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-rose-900/30">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            <span>Low Stock</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-900/30">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span>Normal</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No inventory records matched your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
