'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShoppingBag,
  Coins,
  TrendingDown,
  Wallet,
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Receipt,
  Truck,
  RefreshCw,
  LucideIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface KPIProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor: string;
  gradient: string;
  subtext: string;
}

function KPICard({ title, value, icon: Icon, iconColor, gradient, subtext }: KPIProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between"
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-5 blur-2xl pointer-events-none`} />
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">{title}</span>
          <span className="text-2xl font-extrabold tracking-tight text-slate-100 mt-1">
            PKR {value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className={`p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 ${iconColor} shadow-md`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-[10px] text-slate-500 font-medium mt-4">{subtext}</div>
    </motion.div>
  );
}

export default function Home() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('reports:dashboard');
        setData(res);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="h-10 bg-slate-900/60 rounded-xl animate-pulse w-48" />
        {/* Grid Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-900/40 border border-slate-900 rounded-2xl animate-pulse" />
          ))}
        </div>
        {/* Chart Skeleton */}
        <div className="h-[400px] bg-slate-900/40 border border-slate-900 rounded-2xl animate-pulse" />
      </div>
    );
  }

  const kpis: KPIProps[] = [
    {
      title: "Today's Sales",
      value: data?.todaySales || 0,
      icon: TrendingUp,
      iconColor: "text-indigo-400",
      gradient: "from-indigo-500 to-blue-500",
      subtext: "Gross revenue generated today",
    },
    {
      title: "Today's Purchases",
      value: data?.todayPurchases || 0,
      icon: ShoppingBag,
      iconColor: "text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
      subtext: "Stock-in expenses today",
    },
    {
      title: "Today's Profit",
      value: data?.todayProfit || 0,
      icon: Coins,
      iconColor: "text-emerald-400",
      gradient: "from-emerald-500 to-teal-500",
      subtext: "Gross margin on today's sales",
    },
    {
      title: "Today's Expenses",
      value: data?.todayExpenses || 0,
      icon: TrendingDown,
      iconColor: "text-red-400",
      gradient: "from-red-500 to-rose-500",
      subtext: "Operational cash spent today",
    },
    {
      title: "Cash In Vault",
      value: data?.cashInHand || 0,
      icon: Wallet,
      iconColor: "text-amber-400",
      gradient: "from-amber-500 to-orange-500",
      subtext: "Liquid cash on premise",
    },
    {
      title: "Bank Balance",
      value: data?.bankBalance || 0,
      icon: Landmark,
      iconColor: "text-pink-400",
      gradient: "from-pink-500 to-rose-500",
      subtext: "Consolidated banking accounts",
    },
    {
      title: "Total Receivables",
      value: data?.receivables || 0,
      icon: ArrowDownLeft,
      iconColor: "text-teal-400",
      gradient: "from-teal-500 to-emerald-500",
      subtext: "Unpaid customer invoice accounts",
    },
    {
      title: "Total Payables",
      value: data?.payables || 0,
      icon: ArrowUpRight,
      iconColor: "text-orange-400",
      gradient: "from-orange-500 to-yellow-500",
      subtext: "Unpaid supplier invoice accounts",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Header with Refresh Action */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
            Wholesale Executive Suite
          </h1>
          <p className="text-xs text-slate-500 font-medium">Real-time status updates</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition duration-150 cursor-pointer flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 8-Grid KPI Dashboard Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <KPICard key={idx} {...kpi} />
        ))}
      </div>

      {/* Main Timeline Charts using Recharts */}
      <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-200 mb-4 px-1">7-Day Transaction History</h2>
        <div className="h-[350px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.charts || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="purchGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
              <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#f8fafc',
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
              <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
              <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#purchGrad)" />
              <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#profitGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Feeds Grid (Sales, Purchases, Stocks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales Invoices */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 flex-shrink-0">
            <Receipt className="w-4.5 h-4.5 text-indigo-400" />
            <span>Recent Sales Invoices</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-1">
            {data?.recentSales?.length > 0 ? (
              data.recentSales.map((sale: any) => (
                <div key={sale.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-slate-300 truncate">{sale.id}</div>
                    <div className="text-slate-500 truncate">{sale.customer?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-extrabold text-slate-200">PKR {sale.grandTotal.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(sale.invoiceDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs py-8">
                No recent wholesale sales invoices recorded.
              </div>
            )}
          </div>
        </div>

        {/* Recent Purchases Invoices */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 flex-shrink-0">
            <Truck className="w-4.5 h-4.5 text-blue-400" />
            <span>Recent Purchases Inflow</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-1">
            {data?.recentPurchases?.length > 0 ? (
              data.recentPurchases.map((pur: any) => (
                <div key={pur.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-slate-300 truncate">{pur.id}</div>
                    <div className="text-slate-500 truncate">{pur.supplier?.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <div className="font-extrabold text-slate-200">PKR {pur.grandTotal.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(pur.invoiceDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs py-8">
                No recent supply invoices recorded.
              </div>
            )}
          </div>
        </div>

        {/* Critical Low Stock Alert Feed */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2 flex-shrink-0">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-400" />
            <span>Critical Low Stock Alerts</span>
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-1">
            {data?.lowStockAlerts?.length > 0 ? (
              data.lowStockAlerts.map((prod: any) => (
                <div key={prod.id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900/80 rounded-xl p-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="font-bold text-slate-300 truncate">{prod.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">SKU: {prod.sku}</div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-red-950/60 border border-red-800/40 text-red-400 font-bold text-[10px]">
                      {prod.currentStock} / {prod.minimumStock} {prod.unit?.name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-8 gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
                <span>All product stock levels nominal.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline helper for low stock nominal state
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
