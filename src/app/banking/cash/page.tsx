'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, PlusCircle, Coins, X, Save, ShieldAlert } from 'lucide-react';

interface CashAccount {
  id: string;
  name: string;
  balance: number;
  account: {
    code: string;
  };
}

export default function CashAccountsPage() {
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form inputs
  const [name, setName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('banking:cash-list');
        setAccounts(res || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('banking:cash-create', {
          name,
          openingBalance: parseFloat(openingBalance) || 0,
        });
        if (res.success) {
          setShowModal(false);
          setName('');
          setOpeningBalance('0');
          loadAccounts();
        } else {
          alert(res.error || 'Failed to create cash account.');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Cash Accounts Register
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage physical cash registers, drawers, and tills</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl px-4 py-2.5 font-bold text-xs shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Cash Till</span>
          </button>
          <button
            onClick={loadAccounts}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Cash Accounts */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs">Loading cash tills...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => (
            <div key={acc.id} className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl shadow-xl flex flex-col justify-between h-44 hover:border-slate-700 transition">
              <div>
                <div className="flex justify-between items-start">
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-900/40 text-emerald-400">
                    <Coins className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-bold font-mono bg-slate-950 text-emerald-400 px-2 py-0.5 rounded uppercase">
                    Code: {acc.account.code}
                  </span>
                </div>
                
                <h3 className="font-extrabold text-sm text-slate-200 mt-4 truncate">{acc.name}</h3>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Physical Till Drawer</p>
              </div>

              <div className="flex justify-between items-end border-t border-slate-800/60 pt-3">
                <span className="text-[9px] font-bold text-slate-500 uppercase">Cash balance</span>
                <span className="text-xl font-black text-emerald-400 font-mono">PKR {acc.balance.toFixed(2)}</span>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 text-xs bg-slate-900/20 border border-slate-800/60 rounded-2xl">
              No registered cash registers found. Click "Add Cash Till" above to create one.
            </div>
          )}
        </div>
      )}

      {/* Add Cash Till Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-slate-200">Register New Cash Till</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Till / Register Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter 1 Till, Vault Box"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Starting Cash Float (PKR)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-200 focus:outline-none font-bold text-emerald-400"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex gap-2 items-start">
                <ShieldAlert className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-500 leading-normal">
                  Creating this cash register till automatically sets up a corresponding double-entry asset ledger under range code 1010.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-slate-800 text-slate-400 rounded-xl py-2.5 font-bold text-xs hover:bg-slate-950 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl py-2.5 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Cash Register</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
