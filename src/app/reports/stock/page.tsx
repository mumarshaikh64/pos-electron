'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Printer,
  Package,
  TrendingUp,
  AlertTriangle,
  Search,
  RefreshCw,
  Layers,
  ChevronDown
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  purchasePrice: number;
  wholesalePrice: number;
  retailPrice: number;
  currentStock: number;
  minimumStock: number;
  unit: { name: string };
  category: { name: string };
}

export default function StockReportPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const list = await window.electron.invoke('products:list');
        setProducts(list || []);

        // Extract unique categories
        const cats = Array.from(new Set((list || []).map((p: Product) => p.category?.name).filter(Boolean)));
        setCategories(cats as string[]);
      }
    } catch (error) {
      console.error('Failed to load products list for report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      p.barcode.includes(searchQuery);

    const matchesCategory =
      selectedCategory === 'ALL' || (p.category && p.category.name === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  // Calculations for KPIs
  const totalProducts = filteredProducts.length;
  const totalStockQty = filteredProducts.reduce((sum, p) => sum + p.currentStock, 0);
  const totalValuationCost = filteredProducts.reduce((sum, p) => sum + (p.currentStock * p.purchasePrice), 0);
  const totalValuationRetail = filteredProducts.reduce((sum, p) => sum + (p.currentStock * p.retailPrice), 0);
  const potentialProfit = totalValuationRetail - totalValuationCost;

  const lowStockItems = filteredProducts.filter((p) => p.currentStock <= p.minimumStock && p.currentStock > 0);
  const outOfStockItems = filteredProducts.filter((p) => p.currentStock === 0);

  const handlePrint = () => {
    const printContent = document.getElementById('report-print-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=800,width=1000');
    if (win) {
      win.document.write('<html><head><title>Inventory Valuation Report</title>');
      win.document.write('<style>body{padding:30px;font-family:sans-serif;background-color:#fff;color:#000;}.text-right{text-align:right;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:11px;}th{background-color:#f1f5f9;color:#334155;font-weight:bold;}.kpi-container{display:grid;grid-template-columns:repeat(4, 1fr);gap:15px;margin-bottom:20px;}.kpi-card{border:1px solid #e2e8f0;padding:15px;border-radius:10px;text-align:center;}.kpi-val{font-size:16px;font-weight:bold;margin-top:5px;}.text-rose{color:#dc2626;}</style>');
      win.document.write('</head><body>');
      win.document.write('<h2 style="margin:0 0 5px 0;">INVENTORY VALUATION & STOCK STATUS REPORT</h2>');
      win.document.write(`<p style="font-size:11px;color:#64748b;margin:0 0 25px 0;">Generated Date: ${new Date().toLocaleDateString()} | Category filter: ${selectedCategory}</p>`);
      win.document.write(printContent.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 250);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
              Stock Valuation Report
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Audit current stock levels, low-stock warnings, and inventory asset valuation</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            title="Reload report data"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2.5 font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Product Category</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Layers className="h-4.5 w-4.5 text-indigo-400" />
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-8 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>

        <div className="flex-2 space-y-1.5 w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Search Products</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Search Name, SKU, barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-slate-900/40 rounded-2xl animate-pulse flex items-center justify-center">
          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6" id="report-print-area">
          {/* Stock KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Inventory Assets (Cost)</span>
                <h3 className="text-2xl font-black text-slate-100 font-mono mt-1 kpi-val">PKR {totalValuationCost.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-xs">
                <Package className="w-4.5 h-4.5" />
                <span>Value at Cost</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Stock Value (Retail)</span>
                <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1 kpi-val">PKR {totalValuationRetail.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs">
                <TrendingUp className="w-4.5 h-4.5" />
                <span>Retail Yield</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Stock Quantity</span>
                <h3 className="text-2xl font-black text-slate-100 font-mono mt-1 kpi-val">{totalStockQty}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-teal-400 text-xs">
                <Layers className="w-4.5 h-4.5" />
                <span>On-Hand Units</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Potential Gross Profit</span>
                <h3 className="text-2xl font-black text-indigo-300 font-mono mt-1 kpi-val">PKR {potentialProfit.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-xs">
                <TrendingUp className="w-4.5 h-4.5" />
                <span>Unrealized Margin</span>
              </div>
            </div>
          </div>

          {/* Warnings Bar */}
          {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lowStockItems.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/40 rounded-2xl p-4 flex items-center gap-3 text-amber-200 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold uppercase block tracking-wider">Low Stock Warning</span>
                    <span>{lowStockItems.length} products have reached or dropped below their minimum stock threshold.</span>
                  </div>
                </div>
              )}
              {outOfStockItems.length > 0 && (
                <div className="bg-red-950/20 border border-red-800/40 rounded-2xl p-4 flex items-center gap-3 text-red-200 text-xs">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <span className="font-extrabold uppercase block tracking-wider">Out of Stock Warning</span>
                    <span className="text-rose">{outOfStockItems.length} products are completely out of stock. Replenish immediately.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full Stock Valuation list */}
          <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-4 pb-2 border-b border-slate-800">
              Inventory Ledger Valuation
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="pb-3 pr-4">SKU</th>
                    <th className="pb-3 pr-4">Product Name</th>
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4 text-center">Stock Level</th>
                    <th className="pb-3 pr-4 text-right">Cost Price</th>
                    <th className="pb-3 pr-4 text-right">Retail Price</th>
                    <th className="pb-3 text-right">Total Valuation (Cost)</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-800/40 text-slate-300">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const isLowStock = p.currentStock <= p.minimumStock;
                      const isOutOfStock = p.currentStock === 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-950/20 transition">
                          <td className="py-2.5 pr-4 font-mono text-slate-500">{p.sku}</td>
                          <td className="py-2.5 pr-4 font-semibold text-slate-200">
                            <div>{p.name}</div>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-400">{p.category?.name || 'N/A'}</td>
                          <td className="py-2.5 pr-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                isOutOfStock
                                  ? 'bg-red-950/40 text-red-400 border-red-800/60'
                                  : isLowStock
                                  ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
                                  : 'bg-slate-950 text-slate-400 border-slate-800'
                              }`}
                            >
                              {p.currentStock} {p.unit?.name || 'units'}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono">PKR {p.purchasePrice.toFixed(2)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono">PKR {p.retailPrice.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-bold text-slate-100 font-mono">
                            PKR {(p.currentStock * p.purchasePrice).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500">
                        No catalog items found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
