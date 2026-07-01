'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Search,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Barcode,
  Truck,
  Minus,
  Printer,
  X
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
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

interface LineItem {
  productId: string;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
  purchasePrice: number;
  wholesalePrice: number;
  retailPrice: number;
  taxPercentage: number;
  discount: number; // Flat discount
  taxAmount: number;
  total: number;
  unitName: string;
}

export default function NewPurchasePage() {
  const router = useRouter();

  // Options states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [warehouseId, setWarehouseId] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');
  const [shippingCharges, setShippingCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);

  // Search & Barcode Scan state
  const [productSearch, setProductSearch] = useState('');
  const [barcodeScanVal, setBarcodeScanVal] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Invoice Items
  const [items, setItems] = useState<LineItem[]>([]);

  // Print Modal state
  const [printModal, setPrintModal] = useState<{ open: boolean; invoiceId: string | null }>({
    open: false,
    invoiceId: null,
  });

  const loadPageMetadata = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const [supplierList, meta, productList] = await Promise.all([
          window.electron.invoke('parties:list-suppliers'),
          window.electron.invoke('products:get-metadata'),
          window.electron.invoke('products:list'),
        ]);

        setSuppliers(supplierList || []);
        setWarehouses(meta?.warehouses || []);
        setProducts(productList || []);

        if (meta?.warehouses?.length > 0) {
          setWarehouseId(meta.warehouses[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load purchase page meta:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageMetadata();
  }, []);

  // Barcode Scan simulation / Quick Enter
  const handleBarcodeKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && barcodeScanVal.trim()) {
      e.preventDefault();
      const found = products.find((p) => p.barcode === barcodeScanVal.trim() || p.sku === barcodeScanVal.trim().toUpperCase());
      if (found) {
        addProductToInvoice(found);
      } else {
        alert(`Product with Barcode/SKU "${barcodeScanVal}" not found in wholesale catalog.`);
      }
      setBarcodeScanVal('');
    }
  };

  const addProductToInvoice = (prod: Product) => {
    // Check if product already exists in item list
    const existingIndex = items.findIndex((item) => item.productId === prod.id);

    if (existingIndex > -1) {
      const updated = [...items];
      const item = updated[existingIndex];
      const qty = item.quantity + 1;
      const baseVal = qty * item.purchasePrice;
      const tax = baseVal * (item.taxPercentage / 100);
      
      updated[existingIndex] = {
        ...item,
        quantity: qty,
        taxAmount: tax,
        total: baseVal - item.discount,
      };
      setItems(updated);
    } else {
      const qty = 1;
      const baseVal = qty * prod.purchasePrice;
      const tax = baseVal * (prod.taxPercentage / 100);

      const newItem: LineItem = {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        quantity: qty,
        purchasePrice: prod.purchasePrice,
        wholesalePrice: prod.wholesalePrice,
        retailPrice: prod.retailPrice,
        taxPercentage: prod.taxPercentage,
        discount: 0,
        taxAmount: tax,
        total: baseVal,
        unitName: prod.unit?.name || 'Pcs',
      };
      setItems([...items, newItem]);
    }
    setShowSearchResults(false);
    setProductSearch('');
  };

  const handleUpdateItemField = (index: number, field: keyof LineItem, val: number) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };
    
    // Recalculate totals
    const qty = field === 'quantity' ? val : item.quantity;
    const price = field === 'purchasePrice' ? val : item.purchasePrice;
    const discount = field === 'discount' ? val : item.discount;
    const taxPct = item.taxPercentage;

    const baseVal = qty * price;
    const tax = baseVal * (taxPct / 100);

    updated[index] = {
      ...item,
      quantity: qty,
      purchasePrice: price,
      discount,
      taxAmount: tax,
      total: baseVal - discount,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handlePrintInvoice = () => {
    const printContent = document.getElementById('printable-a4-area');
    if (!printContent) return;

    const win = window.open('', 'PRINT', 'height=800,width=1000');
    if (win) {
      win.document.write('<html><head><title>A4 Purchase Invoice</title>');
      win.document.write('<style>body{padding:20px;font-family:sans-serif;background-color:#fff;color:#000;}.text-right{text-align:right;}table{width:100%;border-collapse:collapse;margin:20px 0;}th,td{padding:8px;border:1px solid #ddd;text-align:left;}th{background-color:#f2f2f2;}</style>');
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
    router.push('/purchases');
  };

  // Calculations for summary card
  const totalSubtotal = items.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
  const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
  const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = totalSubtotal - totalDiscount + totalTax + (shippingCharges || 0);
  const dueAmount = grandTotal - (paidAmount || 0);

  // Sync paidAmount when user clicks "Full Payment"
  const handleFullPayment = () => {
    setPaidAmount(grandTotal);
  };

  const handleSavePurchase = async () => {
    if (!supplierId) {
      setSaveError('Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      setSaveError('Please add at least one product item to the invoice.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      supplierId,
      invoiceDate,
      warehouseId,
      referenceNumber,
      discount: totalDiscount,
      taxAmount: totalTax,
      shippingCharges,
      grandTotal,
      paidAmount,
      dueAmount,
      paymentMethod,
      notes,
      items: items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        wholesalePrice: item.wholesalePrice,
        retailPrice: item.retailPrice,
        discount: item.discount,
        taxAmount: item.taxAmount,
        total: item.total
      })),
    };

    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('purchases:create', payload);
        if (res.success) {
          setPrintModal({ open: true, invoiceId: res.invoiceNumber });
        } else {
          setSaveError(res.error || 'Failed to save purchase invoice.');
        }
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error executing IPC save action.');
    } finally {
      setSaving(false);
    }
  };

  const displayedProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  );

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
      {/* Title Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/purchases')}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
              Wholesale Inflow Entry
            </h1>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 text-xs text-red-200 flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-semibold">{saveError}</span>
        </div>
      )}

      {/* POS Core Canvas split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden min-h-0">
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
                placeholder="Scan Barcode / SKU..."
                value={barcodeScanVal}
                onChange={(e) => setBarcodeScanVal(e.target.value)}
                onKeyDown={handleBarcodeKeyPress}
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
              {displayedProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProductToInvoice(p)}
                  className="flex flex-col items-start p-3 bg-slate-900 border border-slate-800/50 hover:border-indigo-500/50 hover:bg-slate-950/60 rounded-xl text-left transition group cursor-pointer"
                >
                  <div className="flex-1 min-w-0 w-full">
                    <h4 className="font-extrabold text-[12px] text-slate-200 line-clamp-2 leading-snug group-hover:text-indigo-400 transition">
                      {p.name}
                    </h4>
                    <span className="text-[9px] text-slate-500 uppercase mt-0.5 block font-mono">
                      {p.sku}
                    </span>
                  </div>

                  <div className="flex justify-between items-center w-full mt-2 pt-1.5 border-t border-slate-800/40">
                    <span className="text-[11px] font-black text-emerald-500 font-mono">
                      PKR {p.purchasePrice.toFixed(2)}
                    </span>
                    <span className="text-[8px] font-extrabold px-2 py-0.5 rounded font-mono bg-slate-900 text-slate-400 border border-slate-800/60">
                      Stock: {p.currentStock}
                    </span>
                  </div>
                </button>
              ))}
              {displayedProducts.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                  No products matched the search key.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Cart list + Inflow Bill Details Panel */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-4 shadow-xl flex flex-col overflow-hidden h-full">
          {/* Section 1: Cart Items List (flexible top part) */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 border-b border-slate-800/60 pb-4 mb-4">
            <div className="flex justify-between items-center mb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                  Inflow Bill Items
                </h3>
              </div>
              <span className="text-[10px] bg-slate-950 text-indigo-400 px-2 py-0.5 rounded font-bold">
                {items.length} Items
              </span>
            </div>

            {/* Scrollable stack of invoice items */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <div
                    key={item.productId}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition"
                  >
                    {/* Item Title & Delete */}
                    <div className="flex justify-between items-start gap-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-[11px] text-slate-200 line-clamp-1 leading-snug">
                          {item.name}
                        </h4>
                        <span className="text-[8px] text-slate-500 block uppercase font-mono">
                          {item.sku}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Grid of Inputs */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-slate-800/20 text-[10px]">
                      {/* Qty edit */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Qty:</span>
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded overflow-hidden h-6">
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, item.quantity - 1);
                              handleUpdateItemField(idx, 'quantity', newQty);
                            }}
                            className="px-1.5 py-1 text-slate-400 hover:text-rose-500 hover:bg-slate-800/50 transition cursor-pointer select-none"
                          >
                            <Minus className="w-2 h-2" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val)) {
                                handleUpdateItemField(idx, 'quantity', Math.max(1, val));
                              }
                            }}
                            className="w-full bg-transparent text-center text-[10px] font-bold text-slate-200 focus:outline-none border-x border-slate-800/40 h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = item.quantity + 1;
                              handleUpdateItemField(idx, 'quantity', newQty);
                            }}
                            className="px-1.5 py-1 text-slate-400 hover:text-emerald-500 hover:bg-slate-800/50 transition cursor-pointer select-none"
                          >
                            <Plus className="w-2 h-2" />
                          </button>
                        </div>
                      </div>

                      {/* Cost Price edit */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Cost Price:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.purchasePrice}
                          onChange={(e) => handleUpdateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded py-0.5 px-1.5 text-center font-bold text-slate-200 focus:outline-none h-6"
                        />
                      </div>

                      {/* Wholesale Price edit */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Wholesale Price:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.wholesalePrice}
                          onChange={(e) => handleUpdateItemField(idx, 'wholesalePrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded py-0.5 px-1.5 text-center font-bold text-emerald-400 focus:outline-none h-6"
                        />
                      </div>

                      {/* Retail Price edit */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Retail Price:</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.retailPrice}
                          onChange={(e) => handleUpdateItemField(idx, 'retailPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded py-0.5 px-1.5 text-center font-bold text-teal-400 focus:outline-none h-6"
                        />
                      </div>

                      {/* Discount edit */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Discount (PKR):</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.discount}
                          onChange={(e) => handleUpdateItemField(idx, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-800 rounded py-0.5 px-1.5 text-center font-bold text-slate-200 focus:outline-none h-6"
                        />
                      </div>

                      {/* Tax display */}
                      <div className="flex flex-col justify-center gap-0.5">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">Tax ({item.taxPercentage}%):</span>
                        <span className="text-slate-400 font-mono font-bold text-[10px] pl-1.5">
                          +PKR {item.taxAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Row Total */}
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/20 text-[10px]">
                      <span className="text-[8px] text-slate-500 font-bold uppercase">Total (PKR):</span>
                      <span className="font-black text-slate-200 font-mono">
                        PKR {item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-[11px] py-12">
                  <ShoppingCart className="w-8 h-8 text-slate-700 mb-2" />
                  <span>Click products on the left to add items to your bill.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Order Dispatch details + calculations (fixed bottom part) */}
          <div className="space-y-4 flex-shrink-0 overflow-y-auto max-h-[50%] pr-1">
            {/* Supplier select */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Supplier *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none font-bold"
              >
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.companyName || 'No Company'})
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Warehouse Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Warehouse
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none font-bold"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ref bill number and payment method grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Supplier Bill #
                </label>
                <input
                  type="text"
                  placeholder="Bill Ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none font-bold placeholder-slate-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none font-bold"
                >
                  <option value="CASH">CASH</option>
                  <option value="BANK">BANK/CHECK</option>
                  <option value="CREDIT">CREDIT (Pay Later)</option>
                </select>
              </div>
            </div>

            {/* Shipping charges */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Freight / Shipping Charges (PKR)
              </label>
              <input
                type="number"
                min="0"
                value={shippingCharges}
                onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-[11px] text-slate-200 focus:outline-none font-bold"
              />
            </div>

            {/* Receipt Notes */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Transaction Notes
              </label>
              <textarea
                placeholder="Batch numbers, terms..."
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
                <span>Item Discounts:</span>
                <span className="font-mono">-PKR {totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sales Tax Total:</span>
                <span className="font-mono">+PKR {totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Freight Charges:</span>
                <span className="font-mono">+PKR {shippingCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-xs font-black text-slate-100">
                <span>Grand Total:</span>
                <span className="text-emerald-400 font-mono text-sm">PKR {grandTotal.toFixed(2)}</span>
              </div>

              {/* Paid Amount */}
              <div className="space-y-1.5 pt-1.5 border-t border-slate-800/40">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase text-slate-400">Amount Paid (PKR):</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleFullPayment}
                      className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                    >
                      [Full]
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={grandTotal}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-20 bg-slate-950 border border-slate-800 rounded py-0.5 px-1.5 text-right font-mono text-[10px] font-bold text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-rose-400 font-bold">
                  <span>Balance Due:</span>
                  <span className="font-mono">PKR {dueAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleSavePurchase}
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-3.5 font-bold text-xs mt-6 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50 font-bold"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                  <span>Posting Ledger & Stock...</span>
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" />
                  <span>Post Purchase Invoice</span>
                </>
              )}
            </motion.button>
          </div>
      </div>
    </div>

    {/* Purchase Invoice A4 Print Modal Overlay */}
    <AnimatePresence>
      {printModal.open && printModal.invoiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal controls */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-shrink-0">
              <div className="text-left">
                <h3 className="font-extrabold text-sm text-slate-200">Purchase Bill Created</h3>
                <p className="text-[10px] text-slate-500 font-mono">Bill ID: {printModal.invoiceId}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintInvoice}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-1.5 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Invoice</span>
                </button>
                <button
                  onClick={handleClosePrintModal}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* A4 Sheet Body */}
            <div className="flex-1 overflow-y-auto py-6 px-2 bg-slate-950/40 rounded-2xl mt-4">
              <div
                id="printable-a4-area"
                className="bg-white text-slate-950 p-8 rounded-xl shadow-inner max-w-2xl mx-auto border border-slate-200 text-xs font-sans leading-relaxed text-left"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {/* Rounded Outer Border */}
                <div style={{ border: '2px solid #1e3a8a', borderRadius: '12px', padding: '24px', minHeight: '750px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                  
                  <div>
                    {/* Top Header Section */}
                    <div className="flex justify-between items-start" style={{ marginBottom: '20px' }}>
                      {/* Left: Company Details */}
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

                      {/* Right: Title & Details */}
                      <div style={{ textAlign: 'right' }}>
                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: '0 0 10px 0', letterSpacing: '1px' }}>PURCHASE BILL</h1>
                        
                        <table style={{ borderCollapse: 'collapse', fontSize: '9px', width: '200px', marginLeft: 'auto', border: '1px solid #1e3a8a' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>DATE:</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>{new Date(invoiceDate).toLocaleDateString()}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>BILL ID:</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>{printModal.invoiceId}</td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>REF BILL #:</td>
                              <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>{referenceNumber || 'N/A'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SUPPLIER DETAILS Banner */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ backgroundColor: '#1e3a8a', color: '#ffffff', fontWeight: 'bold', padding: '4px 8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        SUPPLIER DETAILS
                      </div>
                      <div style={{ padding: '8px 4px', fontSize: '10px', color: '#334155', lineHeight: '1.4' }}>
                        <strong style={{ color: '#0f172a', fontSize: '11px' }}>{suppliers.find(s => s.id === supplierId)?.name || 'N/A'}</strong><br />
                        {suppliers.find(s => s.id === supplierId)?.companyName && <span>Company: {suppliers.find(s => s.id === supplierId)?.companyName}<br /></span>}
                        {suppliers.find(s => s.id === supplierId)?.phone && <span>Phone: {suppliers.find(s => s.id === supplierId)?.phone}<br /></span>}
                      </div>
                    </div>

                    {/* Items Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', border: '1px solid #1e3a8a', marginBottom: '20px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                          <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'center', width: '30px' }}>NO.</th>
                          <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'left' }}>DESCRIPTION</th>
                          <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'center', width: '50px' }}>QTY</th>
                          <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'right', width: '80px' }}>UNIT COST</th>
                          <th style={{ border: '1px solid #1e3a8a', padding: '6px', textAlign: 'right', width: '90px' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={item.productId} style={{ color: '#334155' }}>
                            <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '5px', fontWeight: '600', color: '#0f172a' }}>{item.name}</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'center' }}>{item.quantity} {item.unitName}</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '5px', textAlign: 'right' }}>PKR {item.purchasePrice.toFixed(2)}</td>
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
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>PKR {totalSubtotal.toFixed(2)}</td>
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
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>FREIGHT CHARGES</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#0f172a' }}>+PKR {shippingCharges.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>AMOUNT PAID</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>PKR {paidAmount.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', fontWeight: 'bold', color: '#1e3a8a', textAlign: 'left', backgroundColor: '#f8fafc' }}>BALANCE DUE</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '4px 6px', textAlign: 'right', color: dueAmount > 0 ? '#dc2626' : '#475569', fontWeight: 'bold' }}>PKR {dueAmount.toFixed(2)}</td>
                          </tr>
                          <tr style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}>
                            <td style={{ border: '1px solid #1e3a8a', padding: '5px 6px', fontWeight: 'bold', textAlign: 'left' }}>TOTAL COST</td>
                            <td style={{ border: '1px solid #1e3a8a', padding: '5px 6px', textAlign: 'right', fontWeight: 'black' }}>PKR {grandTotal.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer Center message */}
                  <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', borderTop: '1px solid #e2e8f0', paddingTop: '15px', marginTop: '15px' }}>
                    <p style={{ margin: '0 0 4px 0' }}>If you have any questions about this purchase, please contact <strong>Alpha Distributors</strong>, Phone: +1 (555) 019-2834</p>
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
