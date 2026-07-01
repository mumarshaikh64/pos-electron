'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Printer,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Percent,
  Search,
  RefreshCw
} from 'lucide-react';

interface SalesInvoice {
  id: string;
  invoiceDate: string;
  grandTotal: number;
  discount: number;
  taxAmount: number;
  shippingCharges: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  customer: { name: string; phone: string };
  items: Array<{
    quantity: number;
    wholesalePrice: number;
    product: { name: string; sku: string; purchasePrice: number };
  }>;
}

export default function SalesReportPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Default date filter to current month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];
    setStartDate(firstDay);
    setEndDate(today);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const list = await window.electron.invoke('sales:list');
        setInvoices(list || []);
      }
    } catch (error) {
      console.error('Failed to load sales list for report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter invoices based on date range & search query
  const filteredInvoices = invoices.filter((inv) => {
    const invDateStr = new Date(inv.invoiceDate).toISOString().split('T')[0];
    const isWithinDate =
      (!startDate || invDateStr >= startDate) && (!endDate || invDateStr <= endDate);
    const matchesSearch =
      !searchQuery.trim() ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      inv.customer.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return isWithinDate && matchesSearch;
  });

  // Calculate KPIs
  const totalSalesRevenue = filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + inv.discount, 0);
  const totalItemsSold = filteredInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  let totalCost = 0;
  filteredInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const cost = item.product?.purchasePrice || 0;
      totalCost += cost * item.quantity;
    });
  });
  // Profit = Revenue - Cost - Discounts (Discount is already subtracted in row total logic if needed, but we calculate profit directly based on wholesale price revenue minus cost)
  let totalProfit = 0;
  filteredInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const cost = item.product?.purchasePrice || 0;
      const price = item.wholesalePrice || 0;
      totalProfit += (price - cost) * item.quantity;
    });
  });
  // Subtract general discount from overall profit
  totalProfit = totalProfit - totalDiscounts;

  // Compile top products
  const productQuantities: { [key: string]: { name: string; sku: string; qty: number; revenue: number } } = {};
  filteredInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.product) {
        const sku = item.product.sku;
        if (!productQuantities[sku]) {
          productQuantities[sku] = {
            name: item.product.name,
            sku: item.product.sku,
            qty: 0,
            revenue: 0,
          };
        }
        productQuantities[sku].qty += item.quantity;
        productQuantities[sku].revenue += item.wholesalePrice * item.quantity;
      }
    });
  });

  const topProducts = Object.values(productQuantities)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const handlePrint = () => {
    const printContent = document.getElementById('report-print-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=800,width=1000');
    if (win) {
      win.document.write('<html><head><title>Sales Summary Report</title>');
      win.document.write('<style>body{padding:30px;font-family:sans-serif;background-color:#fff;color:#000;}.text-right{text-align:right;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:11px;}th{background-color:#f1f5f9;color:#334155;font-weight:bold;}.kpi-container{display:grid;grid-template-columns:repeat(4, 1fr);gap:15px;margin-bottom:20px;}.kpi-card{border:1px solid #e2e8f0;padding:15px;border-radius:10px;text-align:center;}.kpi-val{font-size:16px;font-weight:bold;margin-top:5px;}</style>');
      win.document.write('</head><body>');
      win.document.write('<h2 style="margin:0 0 5px 0;">SALES PERFORMANCE REPORT</h2>');
      win.document.write(`<p style="font-size:11px;color:#64748b;margin:0 0 25px 0;">Generated Period: ${startDate || 'All Time'} to ${endDate || 'Today'}</p>`);
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
              Sales Audit Report
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Analyze periods, revenues, discounts, and profit margins</p>
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

      {/* Date & Filter Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Start Date</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2 pl-10 pr-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">End Date</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4.5 w-4.5 text-indigo-400" />
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2 pl-10 pr-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex-2 space-y-1.5 w-full">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Search Invoice / Customer</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Search ID, customer name..."
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
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Sales Volume</span>
                <h3 className="text-2xl font-black text-slate-100 font-mono mt-1 kpi-val">PKR {totalSalesRevenue.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-xs">
                <DollarSign className="w-4.5 h-4.5" />
                <span>Gross Income</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Net Estimated Profit</span>
                <h3 className={`text-2xl font-black font-mono mt-1 kpi-val ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  PKR {totalProfit.toFixed(2)}
                </h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs">
                <TrendingUp className="w-4.5 h-4.5" />
                <span>ROI Margins</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Items Dispatched</span>
                <h3 className="text-2xl font-black text-slate-100 font-mono mt-1 kpi-val">{totalItemsSold}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-teal-400 text-xs">
                <ShoppingCart className="w-4.5 h-4.5" />
                <span>Product Units</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Discounts Given</span>
                <h3 className="text-2xl font-black text-rose-400 font-mono mt-1 kpi-val">PKR {totalDiscounts.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-rose-400 text-xs">
                <Percent className="w-4.5 h-4.5" />
                <span>Client Incentives</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Products Table */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl lg:col-span-1 flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-4 pb-2 border-b border-slate-800">
                Top 5 Selling Items
              </h3>
              <div className="flex-1 space-y-3">
                {topProducts.length > 0 ? (
                  topProducts.map((p, idx) => (
                    <div key={p.sku} className="flex justify-between items-center bg-slate-950/40 border border-slate-800/40 p-2.5 rounded-xl text-xs">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[9px] text-indigo-400 font-bold uppercase block font-mono">Top {idx + 1}</span>
                        <h4 className="font-extrabold text-slate-200 truncate mt-0.5">{p.name}</h4>
                        <span className="text-[9px] text-slate-500 font-mono block uppercase mt-0.5">{p.sku}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-slate-200 block">{p.qty} sold</span>
                        <span className="text-[10px] text-emerald-400 font-bold font-mono">PKR {p.revenue.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-12">No sales items registered in this period.</p>
                )}
              </div>
            </div>

            {/* Sales Transaction audit list */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-4 pb-2 border-b border-slate-800">
                Detailed Invoice Log
              </h3>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-3 pr-4">Invoice ID</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Customer</th>
                      <th className="pb-3 pr-4 text-center">Method</th>
                      <th className="pb-3 pr-4 text-right">Discount</th>
                      <th className="pb-3 text-right">Grand Total</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-800/40 text-slate-300">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-950/20 transition">
                          <td className="py-2.5 pr-4 font-bold text-indigo-400">{inv.id}</td>
                          <td className="py-2.5 pr-4 font-mono text-slate-500">
                            {new Date(inv.invoiceDate).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 pr-4 font-semibold text-slate-200">{inv.customer.name}</td>
                          <td className="py-2.5 pr-4 text-center">
                            <span className="px-1.5 py-0.5 rounded-full bg-slate-950 text-[9px] font-bold text-slate-400 border border-slate-800">
                              {inv.paymentMethod}
                            </span>
                          </td>
                          <td className="py-2.5 pr-4 text-right font-mono text-rose-400">PKR {inv.discount.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-bold text-slate-100 font-mono">PKR {inv.grandTotal.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-slate-500">
                          No transactions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
