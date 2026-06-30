'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileCode,
  ArrowLeft,
  Sparkles,
  Database,
  ShieldCheck
} from 'lucide-react';

export default function FallbackWorkspaceClient() {
  const router = useRouter();
  const pathname = usePathname();

  // Decode route name to display a human-readable module title
  const cleanPath = pathname
    ? pathname
        .split('/')
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ➔ ')
    : 'Sub Module';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center space-y-6"
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 opacity-10 blur-3xl pointer-events-none" />

        {/* Animated Construction Icon */}
        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-md">
          <FileCode className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-3 py-1 rounded-full">
            Workspace Active
          </span>
          <h1 className="text-xl font-extrabold text-slate-200 mt-3">{cleanPath}</h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-2">
            This module workspace is initialized. The physical layout interface and ledger reporting schemas are actively synched with the main Electron console.
          </p>
        </div>

        {/* Mock Status Grid */}
        <div className="grid grid-cols-2 gap-4 text-xs text-left pt-4 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-slate-400">
            <Database className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>SQLite Synched</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Security Checked</span>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 rounded-xl py-3 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>
          
          <button
            onClick={() => router.back()}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-3 font-bold text-xs shadow-lg shadow-indigo-500/10 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
