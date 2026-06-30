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
  Truck
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
        total: baseVal - item.discount + tax,
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
        total: baseVal + tax,
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
      total: baseVal - discount + tax,
    };
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
          router.push('/purchases');
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

  const filteredSearchProducts = products.filter(
    (p) =>
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())) &&
      !items.some((item) => item.productId === p.id)
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title Header */}
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
          <p className="text-xs text-slate-500 font-medium mt-1">
            Record supplier invoice, increment warehouse stocks, and post double-entry ledgers
          </p>
        </div>
      </div>

      {saveError && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="font-semibold">{saveError}</span>
        </div>
      )}

      {/* Invoice Meta Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        {/* Supplier */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Supplier *</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select Supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.companyName || 'No Company'})</option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Invoice Date</label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Warehouse */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Target Warehouse</label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        {/* Ref / Suppler Invoice Num */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Supplier Bill Number</label>
          <input
            type="text"
            placeholder="Reference invoice code"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
          />
        </div>
      </div>

      {/* Product Scanners & Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Barcode scanner emulation */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block">Barcode Scanner Input</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Barcode className="h-4.5 w-4.5 text-indigo-400" />
            </span>
            <input
              type="text"
              placeholder="Scan Barcode / SKU and hit Enter..."
              value={barcodeScanVal}
              onChange={(e) => setBarcodeScanVal(e.target.value)}
              onKeyDown={handleBarcodeKeyPress}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {/* Catalog Search Dropdown */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-5 shadow-xl space-y-2 md:col-span-2 relative">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block">Search Catalog Product</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-4.5 w-4.5 text-slate-500" />
            </span>
            <input
              type="text"
              placeholder="Type product name or SKU..."
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowSearchResults(e.target.value.length > 0);
              }}
              onFocus={() => setShowSearchResults(productSearch.length > 0)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />

            {/* Results Popover */}
            <AnimatePresence>
              {showSearchResults && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 right-0 top-13 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-slate-800/60"
                >
                  {filteredSearchProducts.length > 0 ? (
                    filteredSearchProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addProductToInvoice(p)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-950/60 text-xs transition flex items-center justify-between cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{p.name}</div>
                          <div className="text-[10px] text-slate-500 uppercase">SKU: {p.sku} | Barcode: {p.barcode}</div>
                        </div>
                        <div className="text-right text-indigo-400 font-bold">
                          Cost: ${p.purchasePrice.toFixed(2)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-500 text-xs">No unselected products matched search.</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Spreadsheet Items Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold text-slate-200">Invoice Items Grid</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/20 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-5 py-3.5">Product Title</th>
                <th className="px-5 py-3.5 text-center w-24">Qty</th>
                <th className="px-5 py-3.5 text-center w-28">Cost Price (PKR)</th>
                <th className="px-5 py-3.5 text-center w-28">Wholesale (PKR)</th>
                <th className="px-5 py-3.5 text-center w-28">Retail (PKR)</th>
                <th className="px-5 py-3.5 text-center w-24">Discount (PKR)</th>
                <th className="px-5 py-3.5 text-center w-24">Tax Amount</th>
                <th className="px-5 py-3.5 text-right w-32">Total (PKR)</th>
                <th className="px-5 py-3.5 text-center w-16"></th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/60 text-slate-300">
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item.productId} className="hover:bg-slate-900/10">
                    {/* Name & SKU */}
                    <td className="px-5 py-3">
                      <div className="font-bold text-slate-200">{item.name}</div>
                      <div className="text-[9px] text-slate-500 uppercase font-mono mt-0.5">SKU: {item.sku}</div>
                    </td>

                    {/* Qty */}
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemField(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs focus:outline-none focus:border-indigo-500 font-bold"
                      />
                      <span className="text-[9px] text-slate-500 mt-0.5 block">{item.unitName}</span>
                    </td>

                    {/* Cost */}
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.purchasePrice}
                        onChange={(e) => handleUpdateItemField(idx, 'purchasePrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs focus:outline-none focus:border-indigo-500 font-semibold"
                      />
                    </td>

                    {/* Wholesale */}
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.wholesalePrice}
                        onChange={(e) => handleUpdateItemField(idx, 'wholesalePrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs focus:outline-none focus:border-indigo-500 text-emerald-400 font-semibold"
                      />
                    </td>

                    {/* Retail */}
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.retailPrice}
                        onChange={(e) => handleUpdateItemField(idx, 'retailPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs focus:outline-none focus:border-indigo-500 text-teal-400"
                      />
                    </td>

                    {/* Discount */}
                    <td className="px-5 py-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.discount}
                        onChange={(e) => handleUpdateItemField(idx, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-center text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </td>

                    {/* Tax */}
                    <td className="px-5 py-3 text-center text-slate-500">
                      <div>PKR {item.taxAmount.toFixed(2)}</div>
                      <div className="text-[9px]">{item.taxPercentage}%</div>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-3 text-right font-bold text-slate-200">
                      PKR {item.total.toFixed(2)}
                    </td>

                    {/* Remove Action */}
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    No products added to the invoice items list. Search above or scan barcode labels.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Calculations & Payment panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment & Notes */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Payment & Terms
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Method */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-3 text-xs text-slate-200 focus:outline-none"
              >
                <option value="CASH">CASH</option>
                <option value="BANK">BANK/CHECK</option>
                <option value="CREDIT">CREDIT (Pay Later)</option>
              </select>
            </div>

            {/* Carriage/Shipping Inward */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Freight / Shipping Charges (PKR)</label>
              <input
                type="number"
                min="0"
                value={shippingCharges}
                onChange={(e) => setShippingCharges(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Transaction Notes</label>
            <textarea
              placeholder="Record batch numbers, custom shipping arrangements, or terms..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Aggregate Financial Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Summary Balance</span>
          </h3>

          <div className="divide-y divide-slate-800/60 text-xs py-2 space-y-3">
            <div className="flex justify-between items-center text-slate-400">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-200">PKR {totalSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 pt-3">
              <span>Item Discounts:</span>
              <span className="font-semibold text-slate-200">-PKR {totalDiscount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 pt-3">
              <span>Sales Tax Total:</span>
              <span className="font-semibold text-slate-200">+PKR {totalTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 pt-3">
              <span>Freight Charges:</span>
              <span className="font-semibold text-slate-200">+PKR {shippingCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-3 border-t border-slate-800">
              <span className="font-bold text-slate-300">Grand Total:</span>
              <span className="font-extrabold text-indigo-400">PKR {grandTotal.toFixed(2)}</span>
            </div>

            {/* Paid Amount Input */}
            <div className="pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount Paid (PKR)</label>
                <button
                  type="button"
                  onClick={handleFullPayment}
                  className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold transition cursor-pointer"
                >
                  [Full Payment]
                </button>
              </div>
              <input
                type="number"
                min="0"
                max={grandTotal}
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-center font-bold text-sm text-emerald-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-800">
              <span className="font-bold text-slate-400">Balance Due:</span>
              <span className={`font-extrabold ${dueAmount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                PKR {dueAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSavePurchase}
            disabled={saving}
            className="w-full bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-3.5 font-bold text-xs mt-6 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 cursor-pointer disabled:opacity-50"
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
  );
}
