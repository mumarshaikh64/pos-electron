'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Normalize path to handle optional trailing slashes
  const normalizedPath = pathname ? pathname.replace(/\/$/, '') : '';
  const isAuthPage = normalizedPath === '/login';

  useEffect(() => {
    if (!loading) {
      if (!user && !isAuthPage) {
        router.push('/login');
      } else if (user && isAuthPage) {
        router.push('/');
      }
    }
  }, [user, loading, isAuthPage, router]);

  // Enforce premium loading state on startup
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
            Loading System Console...
          </p>
        </div>
      </div>
    );
  }

  // Prevent flash of content if unauthorized
  if (!user && !isAuthPage) {
    return null;
  }

  // Return standalone login page layout
  if (isAuthPage) {
    return <div className="bg-slate-950 min-h-screen">{children}</div>;
  }

  // Standard platform layout with Sidebar and Header
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
