'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Zap,
  Users,
  Package,
  ShoppingBag,
  DollarSign,
  Warehouse,
  Landmark,
  TrendingDown,
  BookOpen,
  BarChart3,
  UserCheck,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  PlusCircle,
  Receipt,
  PiggyBank,
  Lock
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface MenuItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
}

interface MenuSection {
  title: string;
  icon: React.ReactNode;
  permission?: string;
  items: MenuItem[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasPermission } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<{ [key: string]: boolean }>({
    'Quick Modules': false,
    'Parties': true,
    'Products': true,
    'Purchases': true,
    'Sales': true,
    'Inventory': true,
    'Expenses': true,
    'Reports': true,
    'Users': true,
    'Settings': true,
  });

  const toggleGroup = (title: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const navSections: MenuSection[] = [
    {
      title: 'Quick Modules',
      icon: <Zap className="w-5 h-5 text-indigo-400" />,
      items: [
        { title: 'Sale Invoice (POS)', href: '/sales/pos', icon: <Receipt className="w-4 h-4" /> },
        { title: 'Add Product', href: '/products/new', icon: <PlusCircle className="w-4 h-4" /> },
        { title: 'Cash Register', href: '/sales/register', icon: <PiggyBank className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Products',
      icon: <Package className="w-5 h-5 text-teal-400" />,
      permission: 'products:view',
      items: [
        { title: 'Product List', href: '/products' },
        { title: 'Add Product', href: '/products/new' },
        { title: 'Stock Adjustment', href: '/products/adjustment' },
      ],
    },
    {
      title: 'Purchases',
      icon: <ShoppingBag className="w-5 h-5 text-blue-400" />,
      permission: 'purchases:view',
      items: [
        { title: 'New Purchase', href: '/purchases/new' },
        { title: 'Purchase History', href: '/purchases' },
      ],
    },
    {
      title: 'Sales',
      icon: <DollarSign className="w-5 h-5 text-orange-400" />,
      permission: 'sales:view',
      items: [
        { title: 'POS Screen', href: '/sales/pos' },
        { title: 'Sales History', href: '/sales' },
      ],
    },
    {
      title: 'Inventory',
      icon: <Warehouse className="w-5 h-5 text-purple-400" />,
      permission: 'reports:view',
      items: [
        { title: 'Current Stock', href: '/inventory' },
        { title: 'Stock Movement', href: '/inventory/movement' },
      ],
    },
    {
      title: 'Expenses',
      icon: <TrendingDown className="w-5 h-5 text-red-400" />,
      permission: 'accounting:view',
      items: [
        { title: 'Expense List', href: '/expenses' },
      ],
    },
    {
      title: 'Reports',
      icon: <BarChart3 className="w-5 h-5 text-cyan-400" />,
      permission: 'reports:view',
      items: [
        { title: 'Sales Report', href: '/reports/sales' },
        { title: 'Purchase Report', href: '/reports/purchases' },
        { title: 'Stock Report', href: '/reports/stock' },
      ],
    },
    {
      title: 'Users',
      icon: <UserCheck className="w-5 h-5 text-rose-400" />,
      permission: 'users:manage',
      items: [
        { title: 'User List', href: '/users' },
      ],
    },
    {
      title: 'Settings',
      icon: <Settings className="w-5 h-5 text-slate-400" />,
      permission: 'settings:manage',
      items: [
        { title: 'System Settings', href: '/settings' },
      ],
    },
  ];

  const isActive = (path: string) => {
    return pathname === path || pathname === `${path}/`;
  };

  return (
    <aside className="w-68 border-r border-slate-900 bg-slate-950 flex flex-col h-screen overflow-hidden flex-shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-900 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-indigo-500 to-emerald-500 shadow-md">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-100 to-slate-200">
            Alpha POS
          </span>
        </Link>
      </div>

      {/* Main Nav Items (Scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 select-none scrollbar-thin">
        {/* Core Dashboard Link */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition ${
            isActive('/')
              ? 'bg-gradient-to-r from-indigo-500/20 to-emerald-500/10 text-indigo-200 border-l-2 border-indigo-500'
              : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 text-indigo-400" />
          <span>Dashboard</span>
        </Link>

        {/* Section Groups */}
        {navSections.map((section) => {
          if (section.permission && !hasPermission(section.permission)) {
            return null; // Enforce role based authorization
          }

          const isCollapsed = collapsedGroups[section.title];
          const hasActiveItem = section.items.some((item) => isActive(item.href));

          return (
            <div key={section.title} className="space-y-1">
              {/* Group Title Action */}
              <button
                onClick={() => toggleGroup(section.title)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                  hasActiveItem
                    ? 'text-slate-200 bg-slate-900/20'
                    : 'text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {section.icon}
                  <span>{section.title}</span>
                </div>
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </button>

              {/* Collapsible Children Items */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden pl-7 space-y-1"
                  >
                    {section.items.map((item) => (
                      <Link
                        key={item.title}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg transition font-medium border-l border-transparent ${
                          isActive(item.href)
                            ? 'text-indigo-400 border-indigo-500 bg-slate-900/40'
                            : 'text-slate-500 hover:text-slate-300 hover:border-slate-800'
                        }`}
                      >
                        {item.icon}
                        <span>{item.title}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* User Session Footer */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 border border-slate-700">
            <User className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-200 truncate">{user?.name}</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider truncate">
              {user?.role}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-900 hover:border-red-900/30 hover:bg-red-950/20 text-slate-400 hover:text-red-400 font-semibold text-xs transition duration-200 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Exit Session</span>
        </button>
      </div>
    </aside>
  );
}
