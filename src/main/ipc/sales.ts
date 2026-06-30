import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerSalesHandlers() {
  // 1. List Sales Invoices
  ipcMain.handle('sales:list', async () => {
    try {
      return await prisma.salesInvoice.findMany({
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: {
                include: { unit: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error listing sales:', error);
      throw error;
    }
  });

  // 2. Fetch specific Invoice details
  ipcMain.handle('sales:get', async (_event, id) => {
    try {
      return await prisma.salesInvoice.findUnique({
        where: { id },
        include: {
          customer: true,
          warehouse: true,
          items: {
            include: {
              product: {
                include: { unit: true }
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Error fetching sales details:', error);
      throw error;
    }
  });

  // 3. Check Cash Register session status for current user
  ipcMain.handle('sales:register-status', async (_event, userId) => {
    try {
      const activeRegister = await prisma.cashRegister.findFirst({
        where: {
          userId,
          status: 'OPEN',
        },
      });
      if (activeRegister) {
        return { status: 'OPEN', register: activeRegister };
      }
      return { status: 'CLOSED', register: null };
    } catch (error) {
      console.error('Error checking register status:', error);
      throw error;
    }
  });

  // 4. Open Cash Register session
  ipcMain.handle('sales:open-register', async (_event, { userId, openingBalance }) => {
    try {
      const balance = parseFloat(openingBalance) || 0;
      
      const register = await prisma.cashRegister.create({
        data: {
          userId,
          openingBalance: balance,
          currentBalance: balance,
          status: 'OPEN',
        },
      });

      // Log action
      await prisma.activityLog.create({
        data: {
          userId,
          action: 'OPEN_REGISTER',
          details: `Cash register opened with balance: $${balance}`,
        }
      });

      return { success: true, register };
    } catch (error: any) {
      console.error('Error opening register:', error);
      return { success: false, error: error.message };
    }
  });

  // 5. Close Cash Register session
  ipcMain.handle('sales:close-register', async (_event, id, { cashOut, notes }) => {
    try {
      const register = await prisma.cashRegister.findUnique({ where: { id } });
      if (!register) return { success: false, error: 'Register session not found.' };

      const finalCashOut = parseFloat(cashOut) || 0;

      // Calculate cash sales under this register
      const cashSales = await prisma.salesInvoice.aggregate({
        where: {
          cashRegisterId: id,
          paymentMethod: 'CASH',
        },
        _sum: {
          paidAmount: true,
        },
      });
      const salesAmount = cashSales._sum.paidAmount || 0;

      // Calculate expenses under this register session
      // For simplicity, search expenses created by register user during the open session period
      const registerExpenses = await prisma.expense.aggregate({
        where: {
          userId: register.userId,
          paymentMethod: 'CASH',
          createdAt: {
            gte: register.openedAt,
          },
        },
        _sum: {
          amount: true,
        },
      });
      const expenseAmount = registerExpenses._sum.amount || 0;

      const currentBalance = register.openingBalance + salesAmount - expenseAmount - finalCashOut;

      const closedRegister = await prisma.cashRegister.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          salesAmount,
          expenseAmount,
          cashOut: finalCashOut,
          currentBalance,
        },
      });

      // Log action
      await prisma.activityLog.create({
        data: {
          userId: register.userId,
          action: 'CLOSE_REGISTER',
          details: `Cash register closed. Expected Balance: $${currentBalance}. Cash Out: $${finalCashOut}`,
        }
      });

      return { success: true, register: closedRegister };
    } catch (error: any) {
      console.error('Error closing register:', error);
      return { success: false, error: error.message };
    }
  });

  // 6. Create Sales Transaction (POS Checkout)
  ipcMain.handle('sales:create', async (_event, data) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // A. Generate Unique Invoice Code
        const count = await tx.salesInvoice.count();
        const year = new Date(data.invoiceDate).getFullYear();
        const invoiceNumber = `SI-00${year}-${(count + 1).toString().padStart(5, '0')}`;

        const grandTotal = parseFloat(data.grandTotal) || 0;
        const paidAmount = parseFloat(data.paidAmount) || 0;
        const dueAmount = parseFloat(data.dueAmount) || 0;
        const discountTotal = parseFloat(data.discount) || 0;
        const taxTotal = parseFloat(data.taxAmount) || 0;

        // Verify register is open if paymentMethod is CASH
        let activeRegisterId: string | null = null;
        if (data.paymentMethod === 'CASH') {
          const register = await tx.cashRegister.findFirst({
            where: { userId: data.userId, status: 'OPEN' }
          });
          if (!register) {
            throw new Error('Payment method is Cash, but no cash register session is open on this terminal. Please open a Cash Register first.');
          }
          activeRegisterId = register.id;
        }

        // B. Resolve Accounts
        const arAcc = await tx.account.findUnique({ where: { code: '1200' } }); // Customer Accounts Receivable
        const salesRevenueAcc = await tx.account.findUnique({ where: { code: '4000' } }); // Sales Revenue
        const taxAcc = await tx.account.findUnique({ where: { code: '2100' } }); // Tax Payable
        const discountAcc = await tx.account.findUnique({ where: { code: '5100' } }); // Sales Discount
        const cogsAcc = await tx.account.findUnique({ where: { code: '5000' } }); // Cost of Goods Sold
        const inventoryAcc = await tx.account.findUnique({ where: { code: '1300' } }); // Inventory Asset
        
        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!arAcc || !salesRevenueAcc || !inventoryAcc || !cogsAcc || !customer) {
          throw new Error('Required configuration accounts (Inventory, COGS, AR, Revenue) or Customer record is missing.');
        }

        // C. Create Invoice Header
        const invoice = await tx.salesInvoice.create({
          data: {
            id: invoiceNumber,
            customerId: data.customerId,
            invoiceDate: new Date(data.invoiceDate),
            warehouseId: data.warehouseId,
            cashRegisterId: activeRegisterId,
            discount: discountTotal,
            taxAmount: taxTotal,
            grandTotal: grandTotal,
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            paymentMethod: data.paymentMethod,
            notes: data.notes,
          },
        });

        // D. Create Items, Verify Stock & Calculate COGS
        let itemsBaseRevenue = 0;
        let totalCOGS = 0;

        for (const item of data.items) {
          const qty = parseFloat(item.quantity) || 0;
          const wholesalePrice = parseFloat(item.wholesalePrice) || 0;
          const itemDiscount = parseFloat(item.discount) || 0;
          const itemTax = parseFloat(item.taxAmount) || 0;
          const itemTotal = parseFloat(item.total) || 0;

          itemsBaseRevenue += qty * wholesalePrice;

          // 1. Check stock in specific warehouse
          const wStock = await tx.warehouseStock.findUnique({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: data.warehouseId,
              }
            }
          });

          if (!wStock || wStock.stock < qty) {
            const product = await tx.product.findUnique({ where: { id: item.productId } });
            throw new Error(`Insufficient stock for product: ${product?.name || item.productId}. Available: ${wStock?.stock || 0}. Requested: ${qty}`);
          }

          // 2. Resolve cost of product to calculate COGS
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { purchasePrice: true }
          });
          const itemCOGS = qty * (product?.purchasePrice || 0);
          totalCOGS += itemCOGS;

          // 3. Create Invoice item record
          await tx.salesItem.create({
            data: {
              salesInvoiceId: invoice.id,
              productId: item.productId,
              quantity: qty,
              wholesalePrice: wholesalePrice,
              discount: itemDiscount,
              taxAmount: itemTax,
              total: itemTotal,
            },
          });

          // 4. Decrement warehouse stock
          await tx.warehouseStock.update({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: data.warehouseId,
              }
            },
            data: { stock: { decrement: qty } },
          });

          // 5. Decrement global Product cached stock
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: qty } },
          });

          // 6. Record stock movement audit log
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: data.warehouseId,
              quantity: -qty,
              type: 'SALE',
              referenceId: invoice.id,
              notes: `Wholesale Sale Outflow: ${invoiceNumber}`,
            },
          });
        }

        // E. Post Double-Entry Accounting
        const journal = await tx.journalEntry.create({
          data: {
            date: new Date(data.invoiceDate),
            reference: invoiceNumber,
            description: `Sales Invoice to Customer: ${customer.name}`,
          },
        });

        // 1. Debit Accounts Receivable (Customer balance) - Grand Total
        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: arAcc.id,
            debit: grandTotal,
            credit: 0,
            description: 'Debited Accounts Receivable control',
          },
        });
        await tx.account.update({
          where: { id: arAcc.id },
          data: { balance: { increment: grandTotal } },
        });

        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: customer.ledgerAccountId,
            debit: grandTotal,
            credit: 0,
            description: `Invoice debited to customer: ${customer.name}`,
          },
        });
        await tx.account.update({
          where: { id: customer.ledgerAccountId },
          data: { balance: { increment: grandTotal } },
        });

        // 2. Debit Sales Discount (if discount exists)
        if (discountTotal > 0 && discountAcc) {
          await tx.journalItem.create({
            data: {
              journalEntryId: journal.id,
              accountId: discountAcc.id,
              debit: discountTotal,
              credit: 0,
              description: 'Sales discount allowed expense',
            },
          });
          await tx.account.update({
            where: { id: discountAcc.id },
            data: { balance: { increment: discountTotal } },
          });
        }

        // 3. Credit Sales Revenue
        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: salesRevenueAcc.id,
            debit: 0,
            credit: itemsBaseRevenue,
            description: 'Sales revenue generated',
          },
        });
        await tx.account.update({
          where: { id: salesRevenueAcc.id },
          data: { balance: { increment: itemsBaseRevenue } },
        });

        // 4. Credit Tax Payable (if tax exists)
        if (taxTotal > 0 && taxAcc) {
          await tx.journalItem.create({
            data: {
              journalEntryId: journal.id,
              accountId: taxAcc.id,
              debit: 0,
              credit: taxTotal,
              description: 'Sales output tax liability collected',
            },
          });
          await tx.account.update({
            where: { id: taxAcc.id },
            data: { balance: { increment: taxTotal } },
          });
        }

        // 5. Debit COGS & Credit Inventory Asset
        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: cogsAcc.id,
            debit: totalCOGS,
            credit: 0,
            description: 'Cost of goods sold expense debit',
          },
        });
        await tx.account.update({
          where: { id: cogsAcc.id },
          data: { balance: { increment: totalCOGS } },
        });

        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: inventoryAcc.id,
            debit: 0,
            credit: totalCOGS,
            description: 'Inventory value asset decrease',
          },
        });
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { decrement: totalCOGS } },
        });

        // F. Handle Payments collected
        if (paidAmount > 0) {
          const paymentCode = data.paymentMethod === 'BANK' ? '1100' : '1000';
          const sourceAccount = await tx.account.findUnique({ where: { code: paymentCode } });

          if (sourceAccount) {
            // Debit cash/bank assets
            await tx.journalItem.create({
              data: {
                journalEntryId: journal.id,
                accountId: sourceAccount.id,
                debit: paidAmount,
                credit: 0,
                description: `Payment received in cash/bank - method: ${data.paymentMethod}`,
              },
            });
            await tx.account.update({
              where: { id: sourceAccount.id },
              data: { balance: { increment: paidAmount } },
            });

            // Credit Accounts Receivable (reduce customer debt)
            await tx.journalItem.create({
              data: {
                journalEntryId: journal.id,
                accountId: arAcc.id,
                debit: 0,
                credit: paidAmount,
                description: 'Reduce accounts receivable asset control',
              },
            });
            await tx.account.update({
              where: { id: arAcc.id },
              data: { balance: { decrement: paidAmount } },
            });

            await tx.journalItem.create({
              data: {
                journalEntryId: journal.id,
                accountId: customer.ledgerAccountId,
                debit: 0,
                credit: paidAmount,
                description: `Payment posted by customer: ${customer.name}`,
              },
            });
            await tx.account.update({
              where: { id: customer.ledgerAccountId },
              data: { balance: { decrement: paidAmount } },
            });

            // Update Cash Register session balance if CASH payment
            if (data.paymentMethod === 'CASH' && activeRegisterId) {
              await tx.cashRegister.update({
                where: { id: activeRegisterId },
                data: {
                  salesAmount: { increment: paidAmount },
                  currentBalance: { increment: paidAmount },
                },
              });
            }
          }
        }

        // Link journal back to invoice
        await tx.salesInvoice.update({
          where: { id: invoiceNumber },
          data: { journalEntryId: journal.id },
        });

        return invoice;
      });

      return { success: true, invoiceNumber: result.id };
    } catch (error: any) {
      console.error('Error creating sales invoice:', error);
      return { success: false, error: error.message };
    }
  });
}
export { prisma };
