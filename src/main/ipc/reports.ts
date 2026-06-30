import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerReportHandlers() {
  ipcMain.handle('reports:dashboard', async () => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // 1. Calculate Today's Sales
      const salesInvoicesToday = await prisma.salesInvoice.findMany({
        where: {
          invoiceDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        select: {
          grandTotal: true,
          items: {
            select: {
              quantity: true,
              wholesalePrice: true,
              product: {
                select: {
                  purchasePrice: true,
                }
              }
            }
          }
        }
      });

      const todaySales = salesInvoicesToday.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

      // Calculate Today's Profit (Wholesale Price - Purchase Price) * Quantity
      let todayProfit = 0;
      salesInvoicesToday.forEach(inv => {
        inv.items.forEach(item => {
          const cost = item.product?.purchasePrice || 0;
          const revenue = item.wholesalePrice || 0;
          const qty = item.quantity || 0;
          todayProfit += (revenue - cost) * qty;
        });
      });

      // 2. Calculate Today's Purchases
      const purchasesToday = await prisma.purchaseInvoice.aggregate({
        where: {
          invoiceDate: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        _sum: {
          grandTotal: true,
        },
      });
      const todayPurchases = purchasesToday._sum.grandTotal || 0;

      // 3. Calculate Today's Expenses
      const expensesToday = await prisma.expense.aggregate({
        where: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const todayExpenses = expensesToday._sum.amount || 0;

      // 4. Fetch Ledger Balances (Cash, Bank, AR, AP)
      // Accounts seeded in seed.ts:
      // "1000" Cash, "1100" Bank, "1200" Customer Receivables, "2000" Supplier Payables
      const cashAccount = await prisma.account.findUnique({ where: { code: '1000' } });
      const bankAccount = await prisma.account.findUnique({ where: { code: '1100' } });
      const arAccount = await prisma.account.findUnique({ where: { code: '1200' } });
      const apAccount = await prisma.account.findUnique({ where: { code: '2000' } });

      const cashInHand = cashAccount?.balance || 0;
      const bankBalance = bankAccount?.balance || 0;
      const receivables = arAccount?.balance || 0;
      const payables = apAccount?.balance || 0;

      // 5. Fetch Low Stock Alerts
      const lowStockAlerts = await prisma.product.findMany({
        where: {
          currentStock: {
            lte: prisma.product.fields.minimumStock,
          },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
          sku: true,
          currentStock: true,
          minimumStock: true,
          unit: {
            select: { name: true }
          }
        },
        take: 5,
      });

      // 6. Recent Sales
      const recentSales = await prisma.salesInvoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { name: true }
          }
        }
      });

      // 7. Recent Purchases
      const recentPurchases = await prisma.purchaseInvoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { name: true }
          }
        }
      });

      // 8. Compile 7-Day Timeline for Recharts
      const charts: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

        // Sales for the day
        const daySalesInvoices = await prisma.salesInvoice.findMany({
          where: { invoiceDate: { gte: dayStart, lte: dayEnd } },
          select: {
            grandTotal: true,
            items: {
              select: {
                quantity: true,
                wholesalePrice: true,
                product: { select: { purchasePrice: true } }
              }
            }
          }
        });
        const dSales = daySalesInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

        let dProfit = 0;
        daySalesInvoices.forEach(inv => {
          inv.items.forEach(item => {
            const cost = item.product?.purchasePrice || 0;
            const rev = item.wholesalePrice || 0;
            const qty = item.quantity || 0;
            dProfit += (rev - cost) * qty;
          });
        });

        // Purchases for the day
        const dayPurchases = await prisma.purchaseInvoice.aggregate({
          where: { invoiceDate: { gte: dayStart, lte: dayEnd } },
          _sum: { grandTotal: true },
        });
        const dPurchases = dayPurchases._sum.grandTotal || 0;

        charts.push({
          date: dayLabel,
          sales: dSales,
          purchases: dPurchases,
          profit: dProfit,
        });
      }

      return {
        todaySales,
        todayPurchases,
        todayProfit,
        todayExpenses,
        cashInHand,
        bankBalance,
        receivables,
        payables,
        lowStockAlerts,
        recentSales,
        recentPurchases,
        charts,
      };
    } catch (error) {
      console.error('Error compiling dashboard report:', error);
      throw error;
    }
  });
}
