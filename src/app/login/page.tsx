'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Lock, User, Eye, EyeOff, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// 1. Define schema validation using Zod
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').toLowerCase(),
  password: z.string().min(4, 'Password must be at least 4 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmittingState, setIsSubmittingState] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmittingState(true);
    setErrorMessage(null);
    try {
      const res = await login(data.username, data.password);
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection to authentication service failed.');
    } finally {
      setIsSubmittingState(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients and Orbs for Premium Design */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-emerald-500/10 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md p-1"
      >
        {/* Glassmorphic Login Container */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Logo and Brand Header */}
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-500 shadow-lg shadow-indigo-500/20 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-emerald-200">
              POS & Inventory
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Wholesale Management Console
            </p>
          </div>

          {/* Form Area */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            {/* Global Error Banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-3 bg-red-950/40 border border-red-800/60 rounded-2xl p-4 text-red-200 text-sm"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="font-medium">{errorMessage}</span>
              </motion.div>
            )}

            {/* Username Input Group */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block px-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </span>
                <input
                  type="text"
                  placeholder="Enter your username"
                  {...register('username')}
                  className={`w-full bg-slate-950/50 border ${
                    errors.username ? 'border-red-500/80 focus:ring-red-500/30' : 'border-slate-800 focus:border-indigo-500/80 focus:ring-indigo-500/20'
                  } rounded-2xl py-3.5 pl-11 pr-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200`}
                />
              </div>
              {errors.username && (
                <p className="text-xs text-red-400 font-medium px-1 mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Password Input Group */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                  Password
                </label>
                <span className="text-xs text-slate-500 hover:text-indigo-400 transition cursor-pointer">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  {...register('password')}
                  className={`w-full bg-slate-950/50 border ${
                    errors.password ? 'border-red-500/80 focus:ring-red-500/30' : 'border-slate-800 focus:border-indigo-500/80 focus:ring-indigo-500/20'
                  } rounded-2xl py-3.5 pl-11 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-4 transition duration-200`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400 font-medium px-1 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center px-1">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-indigo-500 focus:ring-indigo-500 focus:ring-opacity-25"
              />
              <label htmlFor="remember" className="ml-2.5 text-xs text-slate-400 cursor-pointer select-none">
                Keep me signed in on this workstation
              </label>
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isSubmittingState}
              className="w-full bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-2xl py-4 font-bold text-sm shadow-xl shadow-indigo-500/10 hover:shadow-indigo-500/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingState ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Authenticating Station...</span>
                </>
              ) : (
                <span>Access Console</span>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
