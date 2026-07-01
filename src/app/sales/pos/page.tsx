'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Printer,
  X,
  User,
  Coins,
  Barcode,
  Sparkles,
  Minus,
  Plus
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface Customer {
  id: string;
  name: string;
  phone: string;
  creditLimit: number;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  purchasePrice: number;
  wholesalePrice: number;
  retailPrice: number;
  taxPercentage: number;
  currentStock: number;
  unit: { name: string };
}

interface SalesLineItem {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  wholesalePrice: number;
  taxPercentage: number;
  discount: number; // Flat discount
  taxAmount: number;
  total: number;
  unitName: string;
  currentStock: number;
}

export default function POSPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Database options states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [register, setRegister] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [paidAmount, setPaidAmount] = useState(0);

  // Search & Barcode Scan
  const [productSearch, setProductSearch] = useState('');
  const [barcodeVal, setBarcodeVal] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Quick Register activation states
  const [openRegisterModal, setOpenRegisterModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('1000');
  const [registerOpeningLoading, setRegisterOpeningLoading] = useState(false);

  // POS Invoice Items
  const [items, setItems] = useState<SalesLineItem[]>([]);

  // Thermal print receipt state
  const [printModal, setPrintModal] = useState<{ open: boolean; invoiceId: string | null }>({
    open: false,
    invoiceId: null,
  });
  const [printTab, setPrintTab] = useState<'A4' | 'THERMAL'>('A4');

  const loadPOSMeta = async () => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const [customerList, meta, productList, regStatus] = await Promise.all([
          window.electron.invoke('parties:list-customers'),
          window.electron.invoke('products:get-metadata'),
          window.electron.invoke('products:list'),
          window.electron.invoke('sales:register-status', user.id),
        ]);

        setCustomers(customerList || []);
        setWarehouses(meta?.warehouses || []);
        setProducts(productList || []);
        
        if (regStatus.status === 'OPEN') {
          setIsRegisterOpen(true);
          setRegister(regStatus.register);
        } else {
          setIsRegisterOpen(false);
          setRegister(null);
        }

        if (meta?.warehouses?.length > 0) {
          setWarehouseId(meta.warehouses[0].id);
        }
      }
    } catch (err) {
      console.error('POS Loading Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPOSMeta();
  }, [user]);

  // Barcode Laser Scanner Emulation
  const handleBarcodeEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeVal.trim()) {
      e.preventDefault();
      const found = products.find(
        (p) => p.barcode === barcodeVal.trim() || p.sku === barcodeVal.trim().toUpperCase()
      );
      if (found) {
        addProductToPOS(found);
      } else {
        alert(`Product with code "${barcodeVal}" not found in catalog.`);
      }
      setBarcodeVal('');
    }
  };

  const addProductToPOS = (prod: Product) => {
    const existingIdx = items.findIndex((item) => item.productId === prod.id);

    if (existingIdx > -1) {
      const updated = [...items];
      const item = updated[existingIdx];
      
      // Stock availability check
      if (item.quantity + 1 > prod.currentStock) {
        alert(`Insufficient stock. Only ${prod.currentStock} units available for ${prod.name}`);
        return;
      }

      const qty = item.quantity + 1;
      const baseVal = qty * item.wholesalePrice;
      const tax = baseVal * (item.taxPercentage / 100);

      updated[existingIdx] = {
        ...item,
        quantity: qty,
        taxAmount: tax,
        total: baseVal - item.discount,
      };
      setItems(updated);
    } else {
      // Stock availability check
      if (prod.currentStock < 1) {
        alert(`Product "${prod.name}" is completely out of stock.`);
        return;
      }

      const qty = 1;
      const baseVal = qty * prod.wholesalePrice;
      const tax = baseVal * (prod.taxPercentage / 100);

      const newItem: SalesLineItem = {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        quantity: qty,
        wholesalePrice: prod.wholesalePrice,
        taxPercentage: prod.taxPercentage,
        discount: 0,
        taxAmount: tax,
        total: baseVal,
        unitName: prod.unit?.name || 'Pcs',
        currentStock: prod.currentStock,
      };
      setItems([...items, newItem]);
    }
    setProductSearch('');
    setShowResults(false);
  };

  const handleUpdateItemField = (index: number, field: keyof SalesLineItem, val: number) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };

    const qty = field === 'quantity' ? val : item.quantity;
    const price = field === 'wholesalePrice' ? val : item.wholesalePrice;
    const discount = field === 'discount' ? val : item.discount;
    
    // Safety check on quantity against stock
    if (field === 'quantity' && val > item.currentStock) {
      alert(`Cannot sell more than available stock (${item.currentStock} units).`);
      return;
    }

    const baseVal = qty * price;
    const tax = baseVal * (item.taxPercentage / 100);

    updated[index] = {
      ...item,
      quantity: qty,
      wholesalePrice: price,
      discount,
      taxAmount: tax,
      total: baseVal - discount,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Pricing calculations
  const totalSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.wholesalePrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = totalSubtotal - totalDiscount + totalTax;
  const dueAmount = grandTotal - paidAmount;

  const handleFullPayment = () => {
    setPaidAmount(grandTotal);
  };

  // Submit / POS Checkout
  const handleCheckout = async () => {
    if (!customerId) {
      setErrorMsg('Please select a customer for this wholesale sale.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Please add products to checkout.');
      return;
    }
    if (paymentMethod === 'CASH' && !isRegisterOpen) {
      setErrorMsg('Cash register is CLOSED. Open register session before taking cash payments.');
      return;
    }

    setCheckingOut(true);
    setErrorMsg(null);

    const payload = {
      userId: user?.id,
      customerId,
      invoiceDate,
      warehouseId,
      discount: totalDiscount,
      taxAmount: totalTax,
      grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      notes,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        wholesalePrice: item.wholesalePrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        total: item.total,
      })),
    };

    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('sales:create', payload);
        if (res.success) {
          setPrintModal({ open: true, invoiceId: res.invoiceNumber });
        } else {
          setErrorMsg(res.error || 'Failed to complete checkout.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing sales checkout.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('printable-receipt-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=600,width=400');
    if (win) {
      win.document.write('<html><head><title>Print Thermal Receipt</title>');
      win.document.write('<style>body{font-family:monospace;width:80mm;padding:5px;font-size:11px;color:#000;}.text-center{text-align:center;}.text-right{text-align:right;}hr{border:none;border-top:1px dashed #000;margin:8px 0;}</style>');
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

  const handlePrintA4Invoice = () => {
    const printContent = document.getElementById('printable-a4-invoice-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=850,width=1000');
    if (win) {
      win.document.write('<html><head><title>Print A4 Invoice</title>');
      win.document.write('<style>body{font-family:sans-serif;padding:30px;font-size:12px;color:#333;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{border-bottom:1px solid #eee;padding:10px 8px;text-align:left;}th{background-color:#fcfcfc;font-weight:bold;color:#111;border-bottom:2px solid #ddd;}hr{border:none;border-top:1px solid #eaeaea;margin:20px 0;}.text-center{text-align:center;}.text-right{text-align:right;}.font-bold{font-weight:bold;}.flex-between{display:flex;justify-content:space-between;}</style>');
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

  const handleClosePrintModal = () => {
    setPrintModal({ open: false, invoiceId: null });
    setItems([]); // Clear cart
    setPaidAmount(0);
    setNotes('');
    loadPOSMeta(); // Refresh stocks list
  };

  const displayedProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-900/60 rounded-xl animate-pulse w-48" />
        <div className="h-96 bg-slate-900/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-7rem)] flex flex-col overflow-hidden">
      {/* Title & Till Alert */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/sales')}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
              Wholesale POS Station
            </h1>
          </div>
        </div>

        {/* Cash Register State Warning */}
        {!isRegisterOpen && (
          <button
            onClick={() => setOpenRegisterModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-800/45 text-amber-300 text-xs font-bold hover:bg-amber-900/30 transition cursor-pointer"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>Register is Closed. Click to Open Shift.</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 text-xs text-red-200 flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* POS Core Canvas split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {/* Left Side: Product Grid Catalog & Search */}
        <div className="lg:col-span-2 flex flex-col space-y-4 overflow-hidden h-full">
          {/* Search Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-shrink-0">
            {/* Barcode scanner box */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Barcode className="h-4.5 w-4.5 text-indigo-400" />
              </span>
              <input
                type="text"
                placeholder="Laser Barcode Scan..."
                value={barcodeVal}
                onChange={(e) => setBarcodeVal(e.target.value)}
                onKeyDown={handleBarcodeEnter}
                className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* General Catalog Search */}
            <div className="relative md:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-slate-500" />
              </span>
              <input
                type="text"
                placeholder="Search products by Name/SKU..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                }}
                className="w-full bg-slate-900/40 border border-slate-800 rounded-xl py-2.5 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Large Scrollable Grid of Products */}
          <div className="flex-1 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex flex-col overflow-hidden shadow-xl min-h-0">
            <div className="flex justify-between items-center mb-3 flex-shrink-0 border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-200">Catalog Inventory List</span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">
                {displayedProducts.length} Items Matching
              </span>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pr-1">
              {displayedProducts.map((p) => {
                const isOutOfStock = p.currentStock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProductToPOS(p)}
                    disabled={isOutOfStock}
                    className="text-left p-3.5 rounded-2xl border border-slate-800 bg-slate-950/40 hover:bg-slate-950 transition flex flex-col justify-between h-28 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed group hover:border-indigo-500/50"
                  >
                    <div>
                      <h4 className="font-extrabold text-[12px] text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-400 transition">
                        {p.name}
                      </h4>
                      <span className="text-[9px] text-slate-500 uppercase mt-0.5 block font-mono">
                        {p.sku}
                      </span>
                    </div>

                    <div className="flex justify-between items-center w-full mt-2 pt-1.5 border-t border-slate-800/40">
                      <span className="text-[11px] font-black text-emerald-500 font-mono">
                        PKR {p.wholesalePrice.toFixed(2)}
                      </span>
                      <span
                        className={`text-[8px] font-extrabold px-2 py-0.5 rounded font-mono ${
                          isOutOfStock
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-900/20'
                            : 'bg-slate-900 text-slate-400 border border-slate-800/60'
                        }`}
                      >
                        Qty: {p.currentStock}
                      </span>
                    </div>
                  </button>
                );
              })}
              {displayedProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                  No products matched the search key.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Cart list + Order Dispatch Checkout Panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 shadow-xl flex flex-col overflow-hidden h-full">
          {/* Section 1: Cart Items List (flexible top part) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 border-b border-slate-800/60 pb-4 mb-4">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Wholesale Receipt
                </h3>
              </div>
              <span className="text-[10px] bg-slate-950 text-indigo-400 px-2 py-0.5 rounded font-bold">
                {items.length} Items
              </span>
            </div>

            {/* Scrollable Receipt stack */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-[11px] text-slate-200 line-clamp-1 leading-snug">
                          {item.name}
                        </h4>
                        <span className="text-[8px] text-slate-500 block uppercase font-mono">
                          {item.sku} | Stock: {item.currentStock}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-800/20">
                      {/* Qty edit */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Qty:</span>
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, item.quantity - 1);
                              handleUpdateItemField(idx, 'quantity', newQty);
                            }}
                            className="px-1.5 py-1 text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 transition cursor-pointer select-none"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={item.currentStock}
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                handleUpdateItemField(
                                  idx,
                                  'quantity',
                                  Math.min(item.currentStock, Math.max(1, val))
                                );
                              }
                            }}
                            className="w-8 bg-transparent text-center text-[10px] font-bold text-slate-200 focus:outline-none border-x border-slate-800/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.min(item.currentStock, item.quantity + 1);
                              handleUpdateItemField(idx, 'quantity', newQty);
                            }}
                            className="px-1.5 py-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-800/50 transition cursor-pointer select-none"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Price edit */}
                      <div className="flex items-center gap-1">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Price:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.wholesalePrice}
                          readOnly
                          disabled
                          className="w-16 bg-slate-900/50 border border-slate-800 rounded py-0.5 px-1 text-center text-[10px] font-bold text-emerald-400 opacity-80 cursor-not-allowed focus:outline-none"
                        />
                      </div>

                      {/* Total */}
                      <div className="text-right text-[10px] font-black text-slate-200 font-mono">
                        PKR {item.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-[11px] py-12">
                  <ShoppingCart className="w-8 h-8 text-slate-700 mb-2" />
                  <span>Click products on the left to build order receipt</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Order Dispatch details + calculations (fixed bottom part) */}
          <div className="space-y-4 flex-shrink-0 overflow-y-auto max-h-[50%] pr-1">
            {/* Customer Select */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Wholesale Customer *
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none"
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
              {selectedCustomer && (
                <div className="text-[9px] text-indigo-400 font-bold px-1 mt-0.5">
                  Credit Limit: PKR {selectedCustomer.creditLimit.toFixed(2)}
                </div>
              )}
            </div>

            {/* Warehouse Select */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Source Warehouse
              </label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none font-bold"
              >
                <option value="CASH">CASH TRANSACTION</option>
                <option value="CREDIT">CREDIT ACCOUNT (A/R)</option>
                <option value="PARTIAL">PARTIAL PAYMENT DEPOSIT</option>
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Receipt Notes
              </label>
              <textarea
                placeholder="Shipping details, challan numbers..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-[11px] text-slate-200 focus:outline-none resize-none"
              />
            </div>

            {/* Calculations Summary */}
            <div className="border-t border-slate-800 pt-3.5 space-y-2 text-[11px] font-medium text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono">PKR {totalSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Discount:</span>
                <span className="font-mono">-PKR {totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span className="font-mono">+PKR {totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-xs font-black text-slate-100">
                <span>Grand Total:</span>
                <span className="text-emerald-400 font-mono text-sm">PKR {grandTotal.toFixed(2)}</span>
              </div>

              {paymentMethod === 'PARTIAL' && (
                <div className="space-y-1.5 pt-1.5 border-t border-slate-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase text-slate-400">Amount Received (PKR):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={grandTotal}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-950 border border-slate-800 rounded py-0.5 px-1.5 text-right font-mono text-[10px] font-bold text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-rose-400 font-bold">
                    <span>Due Balance:</span>
                    <span className="font-mono">PKR {dueAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full mt-2 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-3 font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {checkingOut ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save & Print Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* POS Receipt & A4 Invoice Print Modal Overlay */}
      <AnimatePresence>
        {printModal.open && printModal.invoiceId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-3 gap-3 flex-shrink-0">
                <div className="text-left">
                  <h3 className="font-extrabold text-sm text-slate-200">Invoice Complete</h3>
                  <p className="text-[10px] text-slate-500 font-mono">Invoice Number: {printModal.invoiceId}</p>
                </div>

                {/* Tab select buttons */}
                <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 flex-shrink-0">
                  <button
                    onClick={() => setPrintTab('A4')}
                    className={`py-1.5 px-4 rounded-lg font-bold text-[10px] uppercase cursor-pointer transition ${
                      printTab === 'A4' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    A4 Paper Bill
                  </button>
                  <button
                    onClick={() => setPrintTab('THERMAL')}
                    className={`py-1.5 px-4 rounded-lg font-bold text-[10px] uppercase cursor-pointer transition ${
                      printTab === 'THERMAL' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    80mm Receipt
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-auto md:ml-0">
                  {printTab === 'A4' ? (
                    <button
                      onClick={handlePrintA4Invoice}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-1.5 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print A4 Invoice</span>
                    </button>
                  ) : (
                    <button
                      onClick={handlePrintReceipt}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-1.5 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print 80mm Receipt</span>
                    </button>
                  )}
                  <button
                    onClick={handleClosePrintModal}
                    className="text-slate-400 hover:text-slate-200 cursor-pointer p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal body based on tab */}
              <div className="flex-1 overflow-y-auto py-6 px-2 bg-slate-950/40 rounded-2xl mt-4 min-h-0">
                {printTab === 'A4' ? (
                  /* A4 Printable structure */
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
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>{new Date().toLocaleDateString()}</td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>INVOICE #</td>
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{printModal.invoiceId}</td>
                                </tr>
                                <tr>
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>DUE DATE:</td>
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>{new Date().toLocaleDateString()}</td>
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
                            <strong style={{ color: '#0f172a', fontSize: '11px' }}>{selectedCustomer?.name || 'Walk-In Customer'}</strong><br />
                            {selectedCustomer?.phone && <span>Phone: {selectedCustomer.phone}<br /></span>}
                            {selectedCustomer?.address && <span>Address: {selectedCustomer.address}<br /></span>}
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
                            {items.map((item, idx) => (
                              <tr key={item.productId} style={{ color: '#334155' }}>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px', fontWeight: '600', color: '#0f172a' }}>{item.name}</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'center' }}>{item.quantity} {item.unitName}</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'right' }}>PKR {item.wholesalePrice.toFixed(2)}</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>PKR {item.total.toFixed(2)}</td>
                              </tr>
                            ))}
                            {/* Fill extra empty rows to match template layout spacing if items are few */}
                            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
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
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a', fontStyle: 'normal' }}>PKR {totalSubtotal.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>TAX</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>+PKR {totalTax.toFixed(2)}</td>
                              </tr>
                              {totalDiscount > 0 && (
                                <tr>
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>DISCOUNT</td>
                                  <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#dc2626' }}>-PKR {totalDiscount.toFixed(2)}</td>
                                </tr>
                              )}
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>AMOUNT PAID</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>PKR {paidAmount.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>BALANCE DUE</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: dueAmount > 0 ? '#dc2626' : '#475569', fontWeight: 'bold' }}>PKR {dueAmount.toFixed(2)}</td>
                              </tr>
                              <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px 6px', fontWeight: 'bold', textAlign: 'left' }}>TOTAL</td>
                                <td style={{ border: '1px solid #1e3a8a', padding: '5px 6px', textAlign: 'right', fontWeight: 'black' }}>PKR {grandTotal.toFixed(2)}</td>
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
                ) : (
                  /* Thermal Receipt structure */
                  <div
                    id="printable-receipt-area"
                    className="bg-white text-slate-950 p-5 rounded border border-slate-200 max-w-[80mm] mx-auto text-[10px] font-mono leading-tight shadow-inner text-left"
                  >
                    <div className="text-center">
                      <h2 className="text-xs font-black uppercase tracking-wider">Alpha Distributors</h2>
                      <div className="text-[9px] mt-0.5">
                        128 Industrial Complex, Gate 4<br />
                        Phone: +1 (555) 019-2834
                      </div>
                    </div>
                    
                    <hr className="border-t border-dashed border-slate-300 my-2" />
                    
                    <table className="w-full text-[9px] border-none text-slate-800">
                      <tbody>
                        <tr>
                          <td>Cashier ID:</td>
                          <td className="text-right">{user?.name}</td>
                        </tr>
                        <tr>
                          <td>Register Session:</td>
                          <td className="text-right">{register?.id ? `Session #${register.id.slice(0,6)}` : 'N/A'}</td>
                        </tr>
                        <tr>
                          <td>Bill Num:</td>
                          <td className="text-right font-bold">{printModal.invoiceId}</td>
                        </tr>
                        <tr>
                          <td>Date / Time:</td>
                          <td className="text-right">{new Date().toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td>Client:</td>
                          <td className="text-right">{selectedCustomer?.name || 'Walk-In'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <hr className="border-t border-dashed border-slate-300 my-2" />

                    <table className="w-full text-[9px] border-none text-slate-900">
                      <thead>
                        <tr className="font-bold border-b border-dashed border-slate-300">
                          <td className="pb-1 text-left">Item</td>
                          <td className="pb-1 text-center w-8">Qty</td>
                          <td className="pb-1 text-right w-12">Price</td>
                          <td className="pb-1 text-right w-16">Total</td>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.productId}>
                            <td className="py-1">{item.name}</td>
                            <td className="py-1 text-center">{item.quantity}</td>
                            <td className="py-1 text-right">PKR {item.wholesalePrice.toFixed(2)}</td>
                            <td className="py-1 text-right font-bold">PKR {item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <hr className="border-t border-dashed border-slate-300 my-2" />

                    <table className="w-full text-[9px] border-none text-slate-950">
                      <tbody>
                        <tr>
                          <td>Subtotal:</td>
                          <td className="text-right">PKR {totalSubtotal.toFixed(2)}</td>
                        </tr>
                        {totalDiscount > 0 && (
                          <tr>
                            <td>Discounts:</td>
                            <td className="text-right">-PKR {totalDiscount.toFixed(2)}</td>
                          </tr>
                        )}
                        <tr>
                          <td>Sales Tax:</td>
                          <td className="text-right">+PKR {totalTax.toFixed(2)}</td>
                        </tr>
                        <tr className="font-black border-t border-dashed border-slate-300 text-[10px]">
                          <td className="pt-1">GRAND TOTAL:</td>
                          <td className="pt-1 text-right">PKR {grandTotal.toFixed(2)}</td>
                        </tr>
                        <tr className="text-slate-700">
                          <td>Cash Paid:</td>
                          <td className="text-right">PKR {paidAmount.toFixed(2)}</td>
                        </tr>
                        <tr className="text-slate-700 font-bold">
                          <td>Balance Due:</td>
                          <td className="text-right">PKR {dueAmount.toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>

                    <hr className="border-t border-dashed border-slate-300 my-2" />

                    <div className="text-center text-[8px] text-slate-600 space-y-0.5">
                      <div className="font-bold">*** Thank you for your business! ***</div>
                      <div>Exchange is valid within 7 business days with receipt.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-4 flex-shrink-0">
                <button
                  onClick={handleClosePrintModal}
                  className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-xl py-2.5 font-bold text-xs transition cursor-pointer text-center"
                >
                  Start New Session
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Register Activation Modal */}
      <AnimatePresence>
        {openRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-sm text-slate-200">Open Cash Register Shift</h3>
                <button
                  onClick={() => setOpenRegisterModal(false)}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!user) return;
                  setRegisterOpeningLoading(true);
                  try {
                    if (typeof window !== 'undefined' && window.electron) {
                      const res = await window.electron.invoke('sales:open-register', {
                        userId: user.id,
                        openingBalance: parseFloat(openingFloat) || 0,
                      });
                      if (res.success) {
                        setIsRegisterOpen(true);
                        setRegister(res.register);
                        setOpenRegisterModal(false);
                      } else {
                        alert(res.error || 'Failed to open register.');
                      }
                    }
                  } catch (err: any) {
                    alert(err.message || 'Error occurred.');
                  } finally {
                    setRegisterOpeningLoading(false);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
                    Opening Float / Cash in Drawer ($)
                  </label>
                  <input
                    type="number"
                    required
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-slate-200 focus:outline-none"
                    placeholder="0.00"
                  />
                  <p className="text-[9px] text-slate-500 px-1 pt-1 leading-normal">
                    Enter the starting cash count present in the drawer for this POS station till shift.
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenRegisterModal(false)}
                    className="flex-1 border border-slate-800 text-slate-400 rounded-xl py-2.5 font-bold text-xs hover:bg-slate-950 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={registerOpeningLoading}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {registerOpeningLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Coins className="w-4 h-4" />
                        <span>Open Shift</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
