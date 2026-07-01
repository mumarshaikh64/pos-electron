'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        if (typeof window !== 'undefined' && window.electron) {
          const sessionUser = await window.electron.invoke('auth:me');
          if (sessionUser) {
            setUser(sessionUser);
          }
        }
      } catch (err) {
        console.error('Error fetching current session:', err);
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        const res = await window.electron.invoke('auth:login', { username, password });
        if (res.success) {
          setUser(res.user);
          router.push('/');
          return { success: true };
        } else {
          return { success: false, error: res.error };
        }
      }
      return { success: false, error: 'Desktop bridge not initialized.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'An error occurred' };
    }
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined' && window.electron) {
        await window.electron.invoke('auth:logout');
      }
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
