import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerAccountingHandlers() {
  // 1. General Ledger Entries
  ipcMain.handle('accounting:ledger', async (_event, accountId, filters) => {
    try {
      const whereClause: any = {};
      if (accountId) {
        whereClause.accountId = accountId;
      }
      if (filters && filters.startDate && filters.endDate) {
        whereClause.journalEntry = {
          date: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate),
          },
        };
      }
      
      const items = await prisma.journalItem.findMany({
        where: whereClause,
        include: {
          account: true,
          journalEntry: true,
        },
        orderBy: {
          journalEntry: {
            date: 'desc',
          },
        },
      });
      return items;
    } catch (error) {
      console.error('Error fetching ledger items:', error);
      return [];
    }
  });

  // 2. Profit & Loss Statement
  ipcMain.handle('accounting:profit-loss', async (_event, filters) => {
    try {
      const accounts = await prisma.account.findMany();
      
      // Filter by time if dates are specified (dynamic summation from journal items)
      if (filters && filters.startDate && filters.endDate) {
        const start = new Date(filters.startDate);
        const end = new Date(filters.endDate);
        
        const items = await prisma.journalItem.findMany({
          where: {
            journalEntry: {
              date: { gte: start, lte: end }
            }
          },
          include: { account: true }
        });
        
        const revMap = new Map<string, {name: string, code: string, balance: number}>();
        const expMap = new Map<string, {name: string, code: string, balance: number}>();
        
        let revenue = 0;
        let cogs = 0;
        let expTotal = 0;
        
        for (const item of items) {
          const acc = item.account;
          if (acc.type === 'REVENUE') {
            const val = item.credit - item.debit;
            revenue += val;
            const existing = revMap.get(acc.id) || { name: acc.name, code: acc.code, balance: 0 };
            existing.balance += val;
            revMap.set(acc.id, existing);
          } else if (acc.type === 'EXPENSE') {
            const val = item.debit - item.credit;
            if (acc.name.toLowerCase().includes('cost of goods sold') || acc.code === '5000') {
              cogs += val;
            } else {
              expTotal += val;
            }
            const existing = expMap.get(acc.id) || { name: acc.name, code: acc.code, balance: 0 };
            existing.balance += val;
            expMap.set(acc.id, existing);
          }
        }
        
        return {
          revenue,
          costOfGoodsSold: cogs,
          expenses: expTotal,
          netProfit: revenue - (cogs + expTotal),
          revenueAccounts: Array.from(revMap.values()),
          expenseAccounts: Array.from(expMap.values()),
        };
      }

      // Default static balance aggregates
      const revenueAccounts = accounts.filter(a => a.type === 'REVENUE');
      const expenseAccounts = accounts.filter(a => a.type === 'EXPENSE');

      const totalRevenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);
      const cogsAccount = expenseAccounts.find(a => a.name.toLowerCase().includes('cost of goods sold') || a.code === '5000');
      const totalCOGS = cogsAccount ? cogsAccount.balance : 0;
      const totalExpenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);
      const otherExpensesVal = totalExpenses - totalCOGS;

      return {
        revenue: totalRevenue,
        costOfGoodsSold: totalCOGS,
        expenses: otherExpensesVal,
        netProfit: totalRevenue - totalExpenses,
        revenueAccounts: revenueAccounts.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        expenseAccounts: expenseAccounts.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
      };
    } catch (error) {
      console.error(error);
      return { revenue: 0, costOfGoodsSold: 0, expenses: 0, netProfit: 0, revenueAccounts: [], expenseAccounts: [] };
    }
  });

  // 3. Balance Sheet
  ipcMain.handle('accounting:balance-sheet', async (_event, _date) => {
    try {
      const accounts = await prisma.account.findMany({
        orderBy: { code: 'asc' },
      });

      const assets = accounts.filter(a => a.type === 'ASSET');
      const liabilities = accounts.filter(a => a.type === 'LIABILITY');
      const equity = accounts.filter(a => a.type === 'EQUITY');

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
      const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);

      return {
        assets: assets.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        liabilities: liabilities.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        equity: equity.map(a => ({ name: a.name, code: a.code, balance: a.balance })),
        totalAssets,
        totalLiabilities,
        totalEquity,
      };
    } catch (error) {
      console.error(error);
      return { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 };
    }
  });

  // 4. Trial Balance
  ipcMain.handle('accounting:trial-balance', async (_event, _date) => {
    try {
      const accounts = await prisma.account.findMany({
        orderBy: { code: 'asc' },
      });
      return accounts;
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  // 5. Banking: Accounts List
  ipcMain.handle('banking:accounts-list', async () => {
    try {
      const bankAccounts = await prisma.bankAccount.findMany({
        include: {
          account: true,
        },
      });
      return bankAccounts;
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  });

  // 6. Banking: Account Create
  ipcMain.handle('banking:accounts-create', async (_event, data) => {
    try {
      const { accountName, accountNumber, bankName, branch, openingBalance } = data;
      const initialBalance = parseFloat(openingBalance) || 0;
      
      // Generate a unique account code under 1030 range (Assets)
      const count = await prisma.bankAccount.count();
      const code = `1030-${(count + 1).toString().padStart(3, '0')}`;

      const res = await prisma.$transaction(async (tx) => {
        // Create double-entry Account
        const account = await tx.account.create({
          data: {
            code,
            name: `${bankName} - ${accountName}`,
            type: 'ASSET',
            balance: initialBalance,
          },
        });

        // Create BankAccount
        const bankAccount = await tx.bankAccount.create({
          data: {
            accountName,
            accountNumber,
            bankName,
            branch,
            balance: initialBalance,
            accountId: account.id,
          },
        });

        // Log initial balance ledger transaction if balance > 0
        if (initialBalance > 0) {
          const entry = await tx.journalEntry.create({
            data: {
              date: new Date(),
              reference: 'INITIAL_DEPOSIT',
              description: `Initial ledger deposit for bank account: ${accountName}`,
            },
          });

          await tx.journalItem.create({
            data: {
              journalEntryId: entry.id,
              accountId: account.id,
              debit: initialBalance,
              credit: 0,
              description: 'Initial balance debit',
            },
          });
        }

        return bankAccount;
      });

      return { success: true, account: res };
    } catch (error: any) {
      console.error('Error creating bank account:', error);
      return { success: false, error: error.message };
    }
  });

  // 7. Banking: Cash List
  ipcMain.handle('banking:cash-list', async () => {
    try {
      const cashAccounts = await prisma.cashAccount.findMany({
        include: {
          account: true,
        },
      });
      return cashAccounts;
    } catch (error) {
      console.error('Error fetching cash accounts:', error);
      return [];
    }
  });

  // 8. Banking: Cash Create
  ipcMain.handle('banking:cash-create', async (_event, data) => {
    try {
      const { name, openingBalance } = data;
      const initialBalance = parseFloat(openingBalance) || 0;
      
      const count = await prisma.cashAccount.count();
      const code = `1010-${(count + 1).toString().padStart(3, '0')}`;

      const res = await prisma.$transaction(async (tx) => {
        // Create double-entry Account
        const account = await tx.account.create({
          data: {
            code,
            name: `Cash - ${name}`,
            type: 'ASSET',
            balance: initialBalance,
          },
        });

        // Create CashAccount
        const cashAccount = await tx.cashAccount.create({
          data: {
            name,
            balance: initialBalance,
            accountId: account.id,
          },
        });

        // Log initial balance
        if (initialBalance > 0) {
          const entry = await tx.journalEntry.create({
            data: {
              date: new Date(),
              reference: 'INITIAL_DEPOSIT',
              description: `Initial ledger deposit for cash register: ${name}`,
            },
          });

          await tx.journalItem.create({
            data: {
              journalEntryId: entry.id,
              accountId: account.id,
              debit: initialBalance,
              credit: 0,
              description: 'Initial balance debit',
            },
          });
        }

        return cashAccount;
      });

      return { success: true, account: res };
    } catch (error: any) {
      console.error('Error creating cash account:', error);
      return { success: false, error: error.message };
    }
  });

  // 9. Inventory: Stock Movements List
  ipcMain.handle('inventory:movements-list', async () => {
    try {
      const movements = await prisma.stockMovement.findMany({
        include: {
          product: {
            include: { unit: true },
          },
          warehouse: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return movements;
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return [];
    }
  });
}
