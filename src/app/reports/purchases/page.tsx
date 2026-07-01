'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Printer,
  ShoppingBag,
  ShoppingCart,
  DollarSign,
  Percent,
  Search,
  RefreshCw,
  Truck
} from 'lucide-react';

interface PurchaseInvoice {
  id: string;
  invoiceDate: string;
  grandTotal: number;
  discount: number;
  taxAmount: number;
  shippingCharges: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  supplier: { name: string; companyName?: string };
  warehouse: { name: string };
  items: Array<{
    quantity: number;
    purchasePrice: number;
    product: { name: string; sku: string };
  }>;
}

export default function PurchaseReportPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
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
        const list = await window.electron.invoke('purchases:list');
        setInvoices(list || []);
      }
    } catch (error) {
      console.error('Failed to load purchases list for report:', error);
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
      inv.supplier.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (inv.supplier.companyName && inv.supplier.companyName.toLowerCase().includes(searchQuery.toLowerCase().trim()));
    return isWithinDate && matchesSearch;
  });

  // Calculate KPIs
  const totalPurchasesCost = filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  const totalDiscounts = filteredInvoices.reduce((sum, inv) => sum + inv.discount, 0);
  const totalFreight = filteredInvoices.reduce((sum, inv) => sum + inv.shippingCharges, 0);
  const totalItemsPurchased = filteredInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  // Compile supplier stats
  const supplierCosts: { [key: string]: { name: string; company: string; count: number; cost: number } } = {};
  filteredInvoices.forEach((inv) => {
    const sName = inv.supplier.name;
    if (!supplierCosts[sName]) {
      supplierCosts[sName] = {
        name: sName,
        company: inv.supplier.companyName || 'No Company',
        count: 0,
        cost: 0,
      };
    }
    supplierCosts[sName].count += 1;
    supplierCosts[sName].cost += inv.grandTotal;
  });

  const supplierSummary = Object.values(supplierCosts)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const handlePrint = () => {
    const printContent = document.getElementById('report-print-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=800,width=1000');
    if (win) {
      win.document.write('<html><head><title>Purchase Audit Report</title>');
      win.document.write('<style>body{padding:30px;font-family:sans-serif;background-color:#fff;color:#000;}.text-right{text-align:right;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:8px;border:1px solid #ddd;text-align:left;font-size:11px;}th{background-color:#f1f5f9;color:#334155;font-weight:bold;}.kpi-container{display:grid;grid-template-columns:repeat(4, 1fr);gap:15px;margin-bottom:20px;}.kpi-card{border:1px solid #e2e8f0;padding:15px;border-radius:10px;text-align:center;}.kpi-val{font-size:16px;font-weight:bold;margin-top:5px;}</style>');
      win.document.write('</head><body>');
      win.document.write('<h2 style="margin:0 0 5px 0;">PURCHASE ANALYSIS REPORT</h2>');
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
              Purchase Audit Report
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">Audit inbound inventory costs, freight expenditures, and supplier metrics</p>
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
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Search Invoice / Supplier</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Search ID, supplier company..."
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
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Purchase Outflow</span>
                <h3 className="text-2xl font-black text-slate-100 font-mono mt-1 kpi-val">PKR {totalPurchasesCost.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-xs">
                <DollarSign className="w-4.5 h-4.5" />
                <span>Gross Expenditures</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Freight & Shipping Costs</span>
                <h3 className="text-2xl font-black text-indigo-300 font-mono mt-1 kpi-val">PKR {totalFreight.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-indigo-400 text-xs">
                <Truck className="w-4.5 h-4.5" />
                <span>Logistics Cost</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Units Restocked</span>
                <h3 className="text-2xl font-black text-slate-100 font-mono mt-1 kpi-val">{totalItemsPurchased}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-teal-400 text-xs">
                <ShoppingCart className="w-4.5 h-4.5" />
                <span>Inventory Units</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between kpi-card">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Supplier Discounts Received</span>
                <h3 className="text-2xl font-black text-emerald-400 font-mono mt-1 kpi-val">PKR {totalDiscounts.toFixed(2)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-emerald-400 text-xs">
                <Percent className="w-4.5 h-4.5" />
                <span>Inbound Deductions</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Suppliers Table */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl lg:col-span-1 flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-4 pb-2 border-b border-slate-800">
                Top 5 Supplier Accounts
              </h3>
              <div className="flex-1 space-y-3">
                {supplierSummary.length > 0 ? (
                  supplierSummary.map((s, idx) => (
                    <div key={s.name} className="flex justify-between items-center bg-slate-950/40 border border-slate-800/40 p-2.5 rounded-xl text-xs">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-[9px] text-indigo-400 font-bold uppercase block font-mono">Rank {idx + 1}</span>
                        <h4 className="font-extrabold text-slate-200 truncate mt-0.5">{s.name}</h4>
                        <span className="text-[9px] text-slate-500 font-mono block uppercase mt-0.5 truncate">{s.company}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-bold text-slate-200 block">{s.count} Bills</span>
                        <span className="text-[10px] text-indigo-400 font-bold font-mono">PKR {s.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 text-center py-12">No purchases registered in this period.</p>
                )}
              </div>
            </div>

            {/* Purchases Transaction list */}
            <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl lg:col-span-2 overflow-hidden flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 mb-4 pb-2 border-b border-slate-800">
                Inflow Bill Log
              </h3>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      <th className="pb-3 pr-4">Bill ID</th>
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Supplier</th>
                      <th className="pb-3 pr-4">Warehouse</th>
                      <th className="pb-3 pr-4 text-right">Freight</th>
                      <th className="pb-3 text-right">Total Cost</th>
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
                          <td className="py-2.5 pr-4 font-semibold text-slate-200">
                            <div>{inv.supplier.name}</div>
                            {inv.supplier.companyName && <div className="text-[9px] text-slate-500 uppercase">{inv.supplier.companyName}</div>}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-400">{inv.warehouse.name}</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-slate-400">PKR {inv.shippingCharges.toFixed(2)}</td>
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
