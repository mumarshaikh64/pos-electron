'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  PlusCircle,
  Barcode,
  Edit2,
  Trash2,
  AlertTriangle,
  Package,
  DollarSign,
  TrendingUp,
  Download,
  Printer,
  X,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { BarcodeRenderer } from '@/components/BarcodeRenderer';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description?: string;
  categoryId: string;
  brandId: string;
  unitId: string;
  purchasePrice: number;
  wholesalePrice: number;
  retailPrice: number;
  minimumPrice: number;
  minimumStock: number;
  openingStock: number;
  currentStock: number;
  taxPercentage: number;
  status: string;
  category: { name: string };
  brand: { name: string };
  unit: { name: string };
}

export default function ProductListPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, LOW, OUT

  // Dialog States
  const [barcodeModal, setBarcodeModal] = useState<{ open: boolean; product: Product | null }>({
    open: false,
    product: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null; error: string | null }>({
    open: false,
    productId: null,
    error: null,
  });

  const loadProductsAndMetadata = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const [productList, metadata] = await Promise.all([
          window.electron.invoke('products:list'),
          window.electron.invoke('products:get-metadata'),
        ]);
        setProducts(productList || []);
        setFilteredProducts(productList || []);
        setCategories(metadata?.categories || []);
        setBrands(metadata?.brands || []);
      }
    } catch (error) {
      console.error('Failed to load products page data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductsAndMetadata();
  }, []);

  // Filter Logic
  useEffect(() => {
    let result = [...products];

    // Search Query (Name, SKU, Barcode)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      );
    }

    // Category Filter
    if (categoryFilter) {
      result = result.filter((p) => p.categoryId === categoryFilter);
    }

    // Brand Filter
    if (brandFilter) {
      result = result.filter((p) => p.brandId === brandFilter);
    }

    // Stock Level Filter
    if (stockFilter === 'LOW') {
      result = result.filter((p) => p.currentStock <= p.minimumStock && p.currentStock > 0);
    } else if (stockFilter === 'OUT') {
      result = result.filter((p) => p.currentStock <= 0);
    }

    setFilteredProducts(result);
  }, [searchQuery, categoryFilter, brandFilter, stockFilter, products]);

  // Product Valuation Aggregates
  const totalValuation = filteredProducts.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
  const lowStockCount = products.filter((p) => p.currentStock <= p.minimumStock && p.currentStock > 0).length;

  const handleDelete = async () => {
    if (!deleteDialog.productId) return;
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('products:delete', deleteDialog.productId);
        if (res.success) {
          setDeleteDialog({ open: false, productId: null, error: null });
          loadProductsAndMetadata(); // Reload
        } else {
          setDeleteDialog((prev) => ({ ...prev, error: res.error }));
        }
      }
    } catch (err: any) {
      setDeleteDialog((prev) => ({ ...prev, error: err.message }));
    }
  };

  const handlePrintBarcode = () => {
    const printContent = document.getElementById('printable-barcode-area');
    if (!printContent) return;
    
    const win = window.open('', 'PRINT', 'height=400,width=600');
    if (win) {
      win.document.write('<html><head><title>Print Barcode</title>');
      win.document.write('<style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;}</style>');
      win.document.write('</head><body>');
      win.document.write(printContent.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-slate-900/60 rounded-xl animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-900/40 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-900/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
            Wholesale Catalog
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage warehouse products and inventory entries</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/products/new"
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Product</span>
          </Link>
        </div>
      </div>

      {/* Aggregate Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Products</span>
            <span className="text-2xl font-extrabold text-slate-200">{products.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-indigo-400">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Stock Valuation</span>
            <span className="text-2xl font-extrabold text-slate-200">PKR {totalValuation.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Low Stock Alert</span>
            <span className="text-2xl font-extrabold text-amber-400">{lowStockCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Out of Stock</span>
            <span className="text-2xl font-extrabold text-rose-500">{outOfStockCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="flex-1 w-full relative">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4.5 w-4.5 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search by SKU, Name or Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Categories Select */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-48 bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Brands Select */}
        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="w-full md:w-48 bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Stock Level Selector */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
          className="w-full md:w-48 bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Stock Levels</option>
          <option value="LOW">Low Stock Alerts</option>
          <option value="OUT">Out of Stock</option>
        </select>
      </div>

      {/* Product List Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                <th className="px-6 py-4">Product Info</th>
                <th className="px-6 py-4">SKU / Barcode</th>
                <th className="px-6 py-4">Category / Brand</th>
                <th className="px-6 py-4 text-right">Cost Price</th>
                <th className="px-6 py-4 text-right">Wholesale Price</th>
                <th className="px-6 py-4 text-center">Warehouse Stock</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-800/60 text-slate-300">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const isLow = product.currentStock <= product.minimumStock && product.currentStock > 0;
                  const isOut = product.currentStock <= 0;

                  return (
                    <motion.tr
                      key={product.id}
                      className="hover:bg-slate-900/20 transition duration-100"
                    >
                      {/* Name */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-200">{product.name}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{product.description || 'No description'}</div>
                      </td>

                      {/* SKU / Barcode */}
                      <td className="px-6 py-4 font-mono">
                        <div className="text-slate-300">SKU: {product.sku}</div>
                        <div className="text-slate-500 text-[10px]">UPC: {product.barcode}</div>
                      </td>

                      {/* Category / Brand */}
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-900 font-medium block w-max">
                          {product.category?.name}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Brand: {product.brand?.name}
                        </span>
                      </td>

                      {/* Cost */}
                      <td className="px-6 py-4 text-right font-semibold text-slate-200">
                        PKR {product.purchasePrice.toFixed(2)}
                      </td>

                      {/* Wholesale */}
                      <td className="px-6 py-4 text-right font-bold text-emerald-400">
                        PKR {product.wholesalePrice.toFixed(2)}
                      </td>

                      {/* Stock Level */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-[10px] uppercase shadow-inner">
                          {isOut ? (
                            <span className="text-red-500 bg-red-950/20 px-2.5 py-0.5 rounded-full border border-red-900/30">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="text-amber-500 bg-amber-950/20 px-2.5 py-0.5 rounded-full border border-amber-900/30">
                              {product.currentStock} {product.unit?.name} (Low)
                            </span>
                          ) : (
                            <span className="text-emerald-500 bg-emerald-950/20 px-2.5 py-0.5 rounded-full border border-emerald-900/30">
                              {product.currentStock} {product.unit?.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold text-[10px] border ${
                          product.status === 'ACTIVE'
                            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400'
                            : 'bg-slate-900 border-slate-800 text-slate-500'
                        }`}>
                          {product.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setBarcodeModal({ open: true, product })}
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                            title="Generate/Print Barcode"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/products/new?id=${product.id}`)}
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                            title="Edit Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteDialog({ open: true, productId: product.id, error: null })}
                            className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 hover:bg-red-950/30 hover:border-red-900/30 text-slate-500 hover:text-red-400 transition cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No products found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Barcode Viewer Dialog */}
      <AnimatePresence>
        {barcodeModal.open && barcodeModal.product && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-200">Product Barcode Label</h3>
                <button
                  onClick={() => setBarcodeModal({ open: false, product: null })}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Barcode Canvas Card */}
              <div
                id="printable-barcode-area"
                className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-center justify-center shadow-inner"
              >
                <div className="text-xs font-bold text-slate-950 mb-1 max-w-[200px] text-center truncate">
                  {barcodeModal.product.name}
                </div>
                <BarcodeRenderer value={barcodeModal.product.barcode} darkTheme={false} displayValue={true} />
                <div className="text-[10px] text-slate-500 mt-2 font-mono">
                  Price: ${barcodeModal.product.wholesalePrice.toFixed(2)} (Wholesale)
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setBarcodeModal({ open: false, product: null })}
                  className="flex-1 border border-slate-800 hover:bg-slate-950 text-slate-400 rounded-xl py-2.5 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handlePrintBarcode}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Label</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Safety Confirmation Dialog */}
      <AnimatePresence>
        {deleteDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="font-extrabold text-base text-slate-200">Confirm Deletion</h3>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to delete this product? This action is permanent. The system will inspect historical records before proceeding.
              </p>

              {deleteDialog.error && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-4 text-xs text-red-200">
                  <span className="font-semibold">{deleteDialog.error}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setDeleteDialog({ open: false, productId: null, error: null })}
                  className="border border-slate-800 hover:bg-slate-950 text-slate-400 px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
