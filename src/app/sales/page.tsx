'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  PlusCircle,
  Eye,
  Printer,
  X,
  Coins,
  Receipt,
  Calendar,
  User,
  MapPin,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface SalesInvoice {
  id: string;
  invoiceDate: string;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod: string;
  notes?: string;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  warehouse: { name: string };
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    wholesalePrice: number;
    total: number;
    product: {
      name: string;
      sku: string;
      unit: { name: string };
    }
  }>;
}

export default function SalesHistoryPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<SalesInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeInvoice, setActiveInvoice] = useState<SalesInvoice | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const list = await window.electron.invoke('sales:list');
        setInvoices(list || []);
        setFilteredInvoices(list || []);
      }
    } catch (error) {
      console.error('Failed to load sales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    let result = [...invoices];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          inv.customer.name.toLowerCase().includes(q)
      );
    }
    setFilteredInvoices(result);
  }, [searchQuery, invoices]);

  const handlePrintA4Invoice = () => {
    const printContent = document.getElementById('printable-a4-invoice-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=800,width=1000');
    if (win) {
      win.document.write('<html><head><title>A4 Sales Invoice</title>');
      win.document.write('<style>body{font-family:Arial,sans-serif;padding:10px;background-color:#fff;color:#0f172a;}@media print{-webkit-print-color-adjust:exact;print-color-adjust:exact;}</style>');
      win.document.write('</head><body>');
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
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
            Sales History
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Audit previous client sales checkouts invoices</p>
        </div>
        <Link
          href="/sales/pos"
          className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch POS Station</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl shadow-xl flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search by Sales Invoice ID or customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Warehouse</th>
                <th className="px-6 py-4 text-center">Payment</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right">Due</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/60 text-slate-300">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-900/20 transition">
                    <td className="px-6 py-4 font-bold text-indigo-400">{inv.id}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-200">{inv.customer.name}</div>
                      <div className="text-[10px] text-slate-500">{inv.customer.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{inv.warehouse.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-900 text-[10px] font-semibold text-slate-400">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-200">PKR {inv.grandTotal.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-emerald-400">PKR {inv.paidAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-400">
                      {inv.dueAmount > 0 ? `PKR ${inv.dueAmount.toFixed(2)}` : 'PKR 0.00'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setActiveInvoice(inv)}
                        className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        title="View details & print"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No sales invoices recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Overlay Modal (A4 Print Preview) */}
      <AnimatePresence>
        {activeInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col my-8 max-h-[90vh]"
            >
              {/* Modal controls */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-shrink-0">
                <h3 className="font-extrabold text-sm text-slate-200">Invoice Print Preview</h3>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handlePrintA4Invoice}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-1.5 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>
                  <button
                    onClick={() => setActiveInvoice(null)}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* A4 Sheet Body */}
              <div className="flex-1 overflow-y-auto py-6 px-2 bg-slate-950/40 rounded-2xl mt-4">
                <div
                  id="printable-a4-invoice-area"
                  className="bg-white text-slate-950 p-8 rounded-xl shadow-inner max-w-2xl mx-auto border border-slate-200 text-xs font-sans leading-relaxed text-left"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  {/* Rounded Outer Border */}
                  <div style={{ border: '2px solid #1e3a8a', borderRadius: '12px', padding: '24px', minHeight: '750px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                    
                    <div>
                      {/* Top Header Section */}
                      <div className="flex justify-between items-start" style={{ marginBottom: '20px' }}>
                      {/* Left: Company Details & Logo */}
                      <div style={{ display: 'flex', flexDirection: 'column', color: '#0f172a' }}>
                        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', flexShrink: 0 }}>
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#1e3a8a" stroke="#1e3a8a" />
                          <path d="M12 8v8" stroke="#ffffff" strokeWidth="2.5" />
                          <path d="M8 12h8" stroke="#ffffff" strokeWidth="2.5" />
                        </svg>
                        <div style={{ fontSize: '10px', color: '#475569', lineHeight: '1.4' }}>
                          128 Industrial Estate, Gate 4, Sector B<br />
                          Phone: +1 (555) 019-2834 | Email: sales@alphadistributors.com
                        </div>
                      </div>

                        {/* Right: Large INVOICE Text + 3-Row Grid Table */}
                        <div style={{ textAlign: 'right' }}>
                          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 10px 0', letterSpacing: '1px' }}>INVOICE</h1>
                          
                          <table style={{ borderCollapse: 'collapse', fontSize: '9px', width: '200px', marginLeft: 'auto', border: '1px solid #1e3a8a' }}>
                            <tbody>
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>DATE:</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>{new Date(activeInvoice.invoiceDate).toLocaleDateString()}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>INVOICE #</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{activeInvoice.id}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>DUE DATE:</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>{new Date(activeInvoice.invoiceDate).toLocaleDateString()}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* BILL TO Banner */}
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          BILL TO
                        </div>
                        <div style={{ padding: '8px 4px', fontSize: '10px', color: '#334155', lineHeight: '1.4' }}>
                          <strong style={{ color: '#0f172a', fontSize: '11px' }}>{activeInvoice.customer.name}</strong><br />
                          {activeInvoice.customer.phone && <span>Phone: {activeInvoice.customer.phone}<br /></span>}
                          {activeInvoice.customer.address && <span>Address: {activeInvoice.customer.address}<br /></span>}
                        </div>
                      </div>

                      {/* Items Table */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #1e3a8a', marginBottom: '20px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                            <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'center', width: '30px' }}>NO.</th>
                            <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'left' }}>DESCRIPTION</th>
                            <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'center', width: '50px' }}>QTY</th>
                            <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'right', width: '80px' }}>UNIT PRICE</th>
                            <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'right', width: '90px' }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeInvoice.items.map((item, idx) => (
                            <tr key={item.id} style={{ color: '#334155' }}>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px', fontWeight: '600', color: '#0f172a' }}>{item.product.name}</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'center' }}>{item.quantity} {item.product.unit.name}</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'right' }}>PKR {item.wholesalePrice.toFixed(2)}</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>PKR {item.total.toFixed(2)}</td>
                            </tr>
                          ))}
                          {/* Fill extra empty rows to match template layout spacing if items are few */}
                          {Array.from({ length: Math.max(0, 6 - activeInvoice.items.length) }).map((_, i) => (
                            <tr key={`empty-${i}`} style={{ height: '24px' }}>
                              <td style={{ border: '1px solid #1e3a8a' }}></td>
                              <td style={{ border: '1px solid #1e3a8a' }}></td>
                              <td style={{ border: '1px solid #1e3a8a' }}></td>
                              <td style={{ border: '1px solid #1e3a8a' }}></td>
                              <td style={{ border: '1px solid #1e3a8a' }}></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Bottom Subtotals Grid */}
                      <div className="flex justify-end" style={{ marginBottom: '20px' }}>
                        <table style={{ borderCollapse: 'collapse', fontSize: '10px', width: '220px', border: '1px solid #1e3a8a' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>SUB-TOTAL</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>PKR {(activeInvoice.grandTotal - activeInvoice.taxAmount + activeInvoice.discount).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>TAX</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>+PKR {activeInvoice.taxAmount.toFixed(2)}</td>
                            </tr>
                            {activeInvoice.discount > 0 && (
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>DISCOUNT</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#dc2626' }}>-PKR {activeInvoice.discount.toFixed(2)}</td>
                              </tr>
                            )}
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>AMOUNT PAID</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>PKR {activeInvoice.paidAmount.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>BALANCE DUE</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: activeInvoice.dueAmount > 0 ? '#dc2626' : '#475569', fontWeight: 'bold' }}>PKR {activeInvoice.dueAmount.toFixed(2)}</td>
                            </tr>
                            <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px 6px', fontWeight: 'bold', textAlign: 'left' }}>TOTAL</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '5px 6px', textAlign: 'right', fontWeight: 'black' }}>PKR {activeInvoice.grandTotal.toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer Center message */}
                    <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '15px' }}>
                      <p style={{ margin: '0 0 4px 0' }}>If you have any questions about this invoice, please contact <strong>Alpha Distributors</strong>, Phone: +1 (555) 019-2834</p>
                      <p style={{ fontStyle: 'italic', fontWeight: 'bold', color: '#1e3a8a', margin: '0' }}>Thank You For Your Business</p>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
