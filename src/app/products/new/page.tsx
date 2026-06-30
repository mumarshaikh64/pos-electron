'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Plus,
  RefreshCw,
  Info,
  DollarSign,
  Barcode,
  Package,
  X,
  PlusCircle,
  Tag
} from 'lucide-react';

const productSchema = z.object({
  name: z.string().min(1, 'Product Name is required'),
  sku: z.string().min(1, 'SKU is required').toUpperCase(),
  barcode: z.string().min(1, 'Barcode is required'),
  categoryId: z.string().min(1, 'Category is required'),
  brandId: z.string().min(1, 'Brand is required'),
  unitId: z.string().min(1, 'Unit is required'),
  purchasePrice: z.string().min(1, 'Purchase Price is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a valid positive number'),
  wholesalePrice: z.string().min(1, 'Wholesale Price is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a valid positive number'),
  retailPrice: z.string().min(1, 'Retail Price is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a valid positive number'),
  minimumPrice: z.string().min(1, 'Minimum Price is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a valid positive number'),
  minimumStock: z.string().min(1, 'Minimum Stock is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a valid positive number'),
  openingStock: z.string().optional(),
  warehouseId: z.string().optional(),
  taxPercentage: z.string().min(1, 'Tax percentage is required').refine(v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0, 'Must be a valid positive number'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  description: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Metadata dropdown state
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [units, setUnits] = useState<{ id: string; name: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);

  // Metadata Dialog State
  const [metaModal, setMetaModal] = useState<{ open: boolean; type: 'category' | 'brand' | 'unit'; name: string; error: string | null }>({
    open: false,
    type: 'category',
    name: '',
    error: null,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      brandId: '',
      unitId: '',
      purchasePrice: '0',
      wholesalePrice: '0',
      retailPrice: '0',
      minimumPrice: '0',
      minimumStock: '5',
      openingStock: '0',
      warehouseId: '',
      taxPercentage: '0',
      status: 'ACTIVE',
      description: '',
    },
  });

  // Load Dropdowns metadata
  const loadMetadata = async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const metadata = await window.electron.invoke('products:get-metadata');
        setCategories(metadata?.categories || []);
        setBrands(metadata?.brands || []);
        setUnits(metadata?.units || []);
        setWarehouses(metadata?.warehouses || []);
        
        // Auto-select first warehouse as default
        if (metadata?.warehouses?.length > 0 && !editId) {
          setValue('warehouseId', metadata.warehouses[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  // Load Product for Edit
  const loadProductForEdit = async (id: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const list = await window.electron.invoke('products:list');
        const prod = list?.find((p: any) => p.id === id);
        if (prod) {
          reset({
            name: prod.name,
            sku: prod.sku,
            barcode: prod.barcode,
            categoryId: prod.categoryId,
            brandId: prod.brandId,
            unitId: prod.unitId,
            purchasePrice: prod.purchasePrice.toString(),
            wholesalePrice: prod.wholesalePrice.toString(),
            retailPrice: prod.retailPrice.toString(),
            minimumPrice: prod.minimumPrice.toString(),
            minimumStock: prod.minimumStock.toString(),
            taxPercentage: prod.taxPercentage.toString(),
            status: prod.status as 'ACTIVE' | 'INACTIVE',
            description: prod.description || '',
          });
        }
      }
    } catch (err) {
      console.error('Error loading product details:', err);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadMetadata();
      if (editId) {
        await loadProductForEdit(editId);
      }
      setLoading(false);
    }
    init();
  }, [editId]);

  // Generators for SKU/Barcode
  const generateSku = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    setValue('sku', `PRD-${rand}`);
  };

  const generateBarcode = () => {
    const rand = Math.floor(100000000000 + Math.random() * 900000000000);
    setValue('barcode', rand.toString());
  };

  // Submit Handler
  const onSubmit = async (values: ProductFormValues) => {
    setSaving(true);
    setSaveError(null);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        let res;
        if (editId) {
          res = await window.electron.invoke('products:update', editId, values);
        } else {
          // Pass unit name for accounting log references
          const selectedUnit = units.find(u => u.id === values.unitId);
          res = await window.electron.invoke('products:create', {
            ...values,
            unitName: selectedUnit?.name || 'Units',
          });
        }

        if (res.success) {
          router.push('/products');
        } else {
          setSaveError(res.error || 'Failed to save product settings.');
        }
      }
    } catch (err: any) {
      setSaveError(err.message || 'Communication error with saving pipeline.');
    } finally {
      setSaving(false);
    }
  };

  // Create Metadata (Category/Brand/Unit) Inline
  const handleSaveMetadata = async () => {
    const cleanName = metaModal.name.trim();
    if (!cleanName) return;
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('products:create-metadata', {
          type: metaModal.type,
          name: cleanName,
        });

        if (res.success) {
          // Refresh list and select item
          await loadMetadata();
          if (metaModal.type === 'category') {
            setValue('categoryId', res.item.id);
          } else if (metaModal.type === 'brand') {
            setValue('brandId', res.item.id);
          } else if (metaModal.type === 'unit') {
            setValue('unitId', res.item.id);
          }
          setMetaModal({ open: false, type: 'category', name: '', error: null });
        } else {
          setMetaModal((prev) => ({ ...prev, error: res.error }));
        }
      }
    } catch (err: any) {
      setMetaModal((prev) => ({ ...prev, error: err.message }));
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/products')}
          className="p-2 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
            {editId ? 'Modify Product' : 'Register Product'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {editId ? 'Update product specifications and values' : 'Define new product entry and catalog details'}
          </p>
        </div>
      </div>

      {/* Global Save Error Banner */}
      {saveError && (
        <div className="bg-red-950/40 border border-red-800/40 rounded-2xl p-4 text-xs text-red-200">
          <span className="font-semibold">{saveError}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Info className="w-4.5 h-4.5 text-indigo-400" />
            <span>Product Specifications</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Name */}
            <div className="space-y-2 col-span-1 md:col-span-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Product Name *</label>
              <input
                type="text"
                placeholder="Enter complete product title"
                {...register('name')}
                className={`w-full bg-slate-950/50 border ${
                  errors.name ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200`}
              />
              {errors.name && <p className="text-[10px] text-red-400 font-medium px-1">{errors.name.message}</p>}
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Stock Keeping Unit (SKU) *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="E.g., MED-82910"
                  {...register('sku')}
                  className={`flex-1 bg-slate-950/50 border ${
                    errors.sku ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200`}
                />
                <button
                  type="button"
                  onClick={generateSku}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl px-3 flex items-center justify-center transition cursor-pointer"
                  title="Generate Random SKU"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {errors.sku && <p className="text-[10px] text-red-400 font-medium px-1">{errors.sku.message}</p>}
            </div>

            {/* Barcode */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Barcode (UPC/EAN) *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan or enter barcode number"
                  {...register('barcode')}
                  className={`flex-1 bg-slate-950/50 border ${
                    errors.barcode ? 'border-red-500/80 focus:ring-red-500/20' : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
                  } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 transition duration-200`}
                />
                <button
                  type="button"
                  onClick={generateBarcode}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl px-3 flex items-center justify-center transition cursor-pointer"
                  title="Generate UPC Barcode"
                >
                  <Barcode className="w-4 h-4" />
                </button>
              </div>
              {errors.barcode && <p className="text-[10px] text-red-400 font-medium px-1">{errors.barcode.message}</p>}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Status *</label>
              <select
                {...register('status')}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Category *</label>
              <div className="flex gap-2">
                <select
                  {...register('categoryId')}
                  className={`flex-1 bg-slate-950/50 border ${
                    errors.categoryId ? 'border-red-500/80' : 'border-slate-800'
                  } rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500`}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMetaModal({ open: true, type: 'category', name: '', error: null })}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl px-3 flex items-center justify-center transition cursor-pointer"
                  title="Add Category Inline"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {errors.categoryId && <p className="text-[10px] text-red-400 font-medium px-1">{errors.categoryId.message}</p>}
            </div>

            {/* Brand */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Brand *</label>
              <div className="flex gap-2">
                <select
                  {...register('brandId')}
                  className={`flex-1 bg-slate-950/50 border ${
                    errors.brandId ? 'border-red-500/80' : 'border-slate-800'
                  } rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500`}
                >
                  <option value="">Select Brand</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMetaModal({ open: true, type: 'brand', name: '', error: null })}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl px-3 flex items-center justify-center transition cursor-pointer"
                  title="Add Brand Inline"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {errors.brandId && <p className="text-[10px] text-red-400 font-medium px-1">{errors.brandId.message}</p>}
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Unit of Measure *</label>
              <div className="flex gap-2">
                <select
                  {...register('unitId')}
                  className={`flex-1 bg-slate-950/50 border ${
                    errors.unitId ? 'border-red-500/80' : 'border-slate-800'
                  } rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500`}
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setMetaModal({ open: true, type: 'unit', name: '', error: null })}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl px-3 flex items-center justify-center transition cursor-pointer"
                  title="Add Unit Inline"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {errors.unitId && <p className="text-[10px] text-red-400 font-medium px-1">{errors.unitId.message}</p>}
            </div>
          </div>
        </div>

        {/* Pricing Metrics */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
            <span>Pricing Details & Valuation</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Cost Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Purchase Cost Price *</label>
              <input
                type="text"
                placeholder="0.00"
                {...register('purchasePrice')}
                className={`w-full bg-slate-950/50 border ${
                  errors.purchasePrice ? 'border-red-500/80' : 'border-slate-800'
                } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition`}
              />
              {errors.purchasePrice && <p className="text-[10px] text-red-400 font-medium px-1">{errors.purchasePrice.message}</p>}
            </div>

            {/* Wholesale Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Wholesale Trade Price *</label>
              <input
                type="text"
                placeholder="0.00"
                {...register('wholesalePrice')}
                className={`w-full bg-slate-950/50 border ${
                  errors.wholesalePrice ? 'border-red-500/80' : 'border-slate-800'
                } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition`}
              />
              {errors.wholesalePrice && <p className="text-[10px] text-red-400 font-medium px-1">{errors.wholesalePrice.message}</p>}
            </div>

            {/* Retail Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Retail Shelf Price *</label>
              <input
                type="text"
                placeholder="0.00"
                {...register('retailPrice')}
                className={`w-full bg-slate-950/50 border ${
                  errors.retailPrice ? 'border-red-500/80' : 'border-slate-800'
                } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition`}
              />
              {errors.retailPrice && <p className="text-[10px] text-red-400 font-medium px-1">{errors.retailPrice.message}</p>}
            </div>

            {/* Minimum Price */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Minimum Allowable Price *</label>
              <input
                type="text"
                placeholder="0.00"
                {...register('minimumPrice')}
                className={`w-full bg-slate-950/50 border ${
                  errors.minimumPrice ? 'border-red-500/80' : 'border-slate-800'
                } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition`}
              />
              {errors.minimumPrice && <p className="text-[10px] text-red-400 font-medium px-1">{errors.minimumPrice.message}</p>}
            </div>
          </div>
        </div>

        {/* Warehouse Stock Initialization (Hidden on Edit) */}
        {!editId && (
          <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <Package className="w-4.5 h-4.5 text-teal-400" />
              <span>Initial Stock Levels</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Opening Stock */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Opening Stock Quantity</label>
                <input
                  type="text"
                  placeholder="0"
                  {...register('openingStock')}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Warehouse Mapping */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Target Warehouse</label>
                <select
                  {...register('warehouseId')}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-3.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Minimum Stock Alert Level */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Minimum Alert Level *</label>
                <input
                  type="text"
                  placeholder="5"
                  {...register('minimumStock')}
                  className={`w-full bg-slate-950/50 border ${
                    errors.minimumStock ? 'border-red-500/80' : 'border-slate-800'
                  } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition`}
                />
                {errors.minimumStock && <p className="text-[10px] text-red-400 font-medium px-1">{errors.minimumStock.message}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Taxes & Miscellaneous */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Tag className="w-4.5 h-4.5 text-amber-400" />
            <span>Taxation & Notes</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tax */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Sales Tax Percentage *</label>
              <input
                type="text"
                placeholder="0"
                {...register('taxPercentage')}
                className={`w-full bg-slate-950/50 border ${
                  errors.taxPercentage ? 'border-red-500/80' : 'border-slate-800'
                } rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition`}
              />
              {errors.taxPercentage && <p className="text-[10px] text-red-400 font-medium px-1">{errors.taxPercentage.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Product Description</label>
              <textarea
                placeholder="Enter description, storage instructions, expiry patterns, etc."
                {...register('description')}
                rows={2}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
              />
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.push('/products')}
            className="border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 px-6 py-3.5 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={saving}
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl px-8 py-3.5 font-bold text-xs shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Product</span>
              </>
            )}
          </motion.button>
        </div>
      </form>

      {/* Inline Create Metadata Modal (Category/Brand/Unit) */}
      <AnimatePresence>
        {metaModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-sm text-slate-200 capitalize">Add New {metaModal.type}</h3>
                <button
                  onClick={() => setMetaModal({ open: false, type: 'category', name: '', error: null })}
                  className="text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {metaModal.error && (
                <div className="bg-red-950/40 border border-red-800/40 rounded-xl p-3 text-xs text-red-200">
                  <span className="font-semibold">{metaModal.error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Name</label>
                <input
                  type="text"
                  placeholder={`Enter ${metaModal.type} name`}
                  value={metaModal.name}
                  onChange={(e) => setMetaModal((prev) => ({ ...prev, name: e.target.value, error: null }))}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setMetaModal({ open: false, type: 'category', name: '', error: null })}
                  className="flex-1 border border-slate-800 hover:bg-slate-950 text-slate-400 rounded-xl py-2.5 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMetadata}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Item</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
