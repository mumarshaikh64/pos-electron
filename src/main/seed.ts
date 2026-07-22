import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function autoSeed(prisma: PrismaClient): Promise<void> {
  try {
    // 1. Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    if (existingAdmin) {
      console.log('[Database] Admin user already exists.');
      return;
    }

    console.log('[Database] Auto-seeding initial database data...');

    // 2. Seed Permissions
    const permissionsData = [
      { name: 'products:view', description: 'View products list' },
      { name: 'products:create', description: 'Add new products' },
      { name: 'products:edit', description: 'Edit existing products' },
      { name: 'products:delete', description: 'Delete products' },
      { name: 'products:import-export', description: 'Import/Export products' },
      { name: 'purchases:view', description: 'View purchase invoices' },
      { name: 'purchases:create', description: 'Create new purchase invoices' },
      { name: 'sales:view', description: 'View sales invoices' },
      { name: 'sales:create', description: 'Create new sales invoices (POS)' },
      { name: 'parties:view', description: 'View customers and suppliers' },
      { name: 'parties:create', description: 'Create new customers and suppliers' },
      { name: 'parties:edit', description: 'Edit customers and suppliers' },
      { name: 'accounting:view', description: 'View accounting registers and general ledgers' },
      { name: 'accounting:journal', description: 'Post manual journal entries' },
      { name: 'reports:view', description: 'View financial and stock reports' },
      { name: 'settings:manage', description: 'Manage company settings and backups' },
      { name: 'users:manage', description: 'Manage system users and roles' },
    ];

    const permissions: any[] = [];
    for (const p of permissionsData) {
      const perm = await prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      });
      permissions.push(perm);
    }

    // 3. Seed Roles and Associate Permissions
    const rolesData = [
      {
        name: 'ADMIN',
        description: 'System Administrator with full access',
        allowedPermissionNames: permissionsData.map((p) => p.name),
      },
      {
        name: 'MANAGER',
        description: 'Branch Manager with general operation permissions',
        allowedPermissionNames: [
          'products:view', 'products:create', 'products:edit', 'products:import-export',
          'purchases:view', 'purchases:create',
          'sales:view', 'sales:create',
          'parties:view', 'parties:create', 'parties:edit',
          'accounting:view',
          'reports:view',
        ],
      },
      {
        name: 'CASHIER',
        description: 'Cashier with sales invoicing permissions',
        allowedPermissionNames: [
          'products:view',
          'sales:create', 'sales:view',
          'parties:view', 'parties:create',
        ],
      },
      {
        name: 'SALESMAN',
        description: 'Sales Agent with sales invoicing and view permissions',
        allowedPermissionNames: [
          'products:view',
          'sales:create', 'sales:view',
          'parties:view', 'parties:create',
        ],
      },
      {
        name: 'WAREHOUSE_MANAGER',
        description: 'Warehouse Operator with inventory permissions',
        allowedPermissionNames: [
          'products:view', 'products:create', 'products:edit',
          'purchases:view', 'purchases:create',
          'reports:view',
        ],
      },
    ];

    const rolesMap: { [key: string]: string } = {};
    for (const r of rolesData) {
      const role = await prisma.role.upsert({
        where: { name: r.name },
        update: {
          description: r.description,
          permissions: {
            set: permissions.filter((p) => r.allowedPermissionNames.includes(p.name)).map((p) => ({ id: p.id })),
          },
        },
        create: {
          name: r.name,
          description: r.description,
          permissions: {
            connect: permissions.filter((p) => r.allowedPermissionNames.includes(p.name)).map((p) => ({ id: p.id })),
          },
        },
      });
      rolesMap[r.name] = role.id;
    }

    // 4. Seed Default Admin User
    const adminPasswordHash = hashPassword('admin123');
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        name: 'System Administrator',
        passwordHash: adminPasswordHash,
        roleId: rolesMap['ADMIN'],
        status: 'ACTIVE',
      },
    });
    console.log('[Database] Auto-seeded admin user (username: admin, password: admin123).');

    // 5. Seed Chart of Accounts (COA)
    const coaData = [
      { code: '1000', name: 'Cash in Hand', type: 'ASSET' },
      { code: '1100', name: 'Bank Accounts', type: 'ASSET' },
      { code: '1200', name: 'Accounts Receivable (Customers)', type: 'ASSET' },
      { code: '1300', name: 'Inventory Asset', type: 'ASSET' },
      { code: '2000', name: 'Accounts Payable (Suppliers)', type: 'ASSET' },
      { code: '2100', name: 'Tax Payable', type: 'LIABILITY' },
      { code: '3000', name: 'Owner Equity', type: 'EQUITY' },
      { code: '3100', name: 'Retained Earnings', type: 'EQUITY' },
      { code: '4000', name: 'Sales Revenue', type: 'REVENUE' },
      { code: '4100', name: 'Purchase Discounts Received', type: 'REVENUE' },
      { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'EXPENSE' },
      { code: '5100', name: 'Sales Discounts Allowed', type: 'EXPENSE' },
      { code: '5200', name: 'Shipping & Freight Expenses', type: 'EXPENSE' },
      { code: '6000', name: 'General Administrative Expenses', type: 'EXPENSE' },
    ];

    const accountsMap: { [key: string]: string } = {};
    for (const acc of coaData) {
      const createdAcc = await prisma.account.upsert({
        where: { code: acc.code },
        update: { name: acc.name, type: acc.type },
        create: acc,
      });
      accountsMap[acc.code] = createdAcc.id;
    }

    // 6. Seed Default Warehouse
    await prisma.warehouse.upsert({
      where: { name: 'Main Warehouse' },
      update: {},
      create: {
        name: 'Main Warehouse',
        address: 'Central Distribution Complex, City Center',
      },
    });

    // 7. Seed Default Cash Vault Account
    if (accountsMap['1000']) {
      await prisma.cashAccount.upsert({
        where: { name: 'Main Vault' },
        update: {},
        create: {
          name: 'Main Vault',
          accountId: accountsMap['1000'],
          balance: 0,
        },
      });
    }

    // 8. Seed Default System Settings
    const settings = [
      { key: 'company:name', value: 'Alpha Wholesale Distributors' },
      { key: 'company:phone', value: '+1 (555) 019-2834' },
      { key: 'company:email', value: 'billing@alphawholesale.com' },
      { key: 'company:address', value: '128 Industrial Estate, Gate 4, Sector B' },
      { key: 'company:tax_id', value: 'NTN-8274619-3' },
      { key: 'currency:symbol', value: '$' },
      { key: 'currency:code', value: 'USD' },
      { key: 'invoice:terms', value: 'Net 30 days.' },
    ];

    for (const s of settings) {
      await prisma.systemSetting.upsert({
        where: { key: s.key },
        update: {},
        create: s,
      });
    }

    console.log('[Database] Auto-seeding completed successfully.');
  } catch (error) {
    console.error('[Database] Failed to auto-seed database:', error);
  }
}
