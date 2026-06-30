import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerPurchaseHandlers() {
  // 1. List Invoices
  ipcMain.handle('purchases:list', async () => {
    try {
      return await prisma.purchaseInvoice.findMany({
        include: {
          supplier: true,
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
      console.error('Error listing purchases:', error);
      throw error;
    }
  });

  // 2. Fetch specific Invoice for Printing or Review
  ipcMain.handle('purchases:get', async (_event, id) => {
    try {
      return await prisma.purchaseInvoice.findUnique({
        where: { id },
        include: {
          supplier: true,
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
      console.error('Error fetching purchase details:', error);
      throw error;
    }
  });

  // 3. Create Purchase Inflow Transaction
  ipcMain.handle('purchases:create', async (_event, data) => {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // A. Generate Unique Purchase Invoice Number
        const count = await tx.purchaseInvoice.count();
        const year = new Date(data.invoiceDate).getFullYear();
        const invoiceNumber = `PI-${year}-${(count + 1).toString().padStart(5, '0')}`;

        const grandTotal = parseFloat(data.grandTotal) || 0;
        const paidAmount = parseFloat(data.paidAmount) || 0;
        const dueAmount = parseFloat(data.dueAmount) || 0;
        const discountTotal = parseFloat(data.discount) || 0;
        const taxTotal = parseFloat(data.taxAmount) || 0;
        const shippingCharges = parseFloat(data.shippingCharges) || 0;

        // B. Resolve Accounts
        const inventoryAcc = await tx.account.findUnique({ where: { code: '1300' } });
        const apAcc = await tx.account.findUnique({ where: { code: '2000' } }); // General Accounts Payable
        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        const taxAcc = await tx.account.findUnique({ where: { code: '2100' } }); // Tax Payable
        const shippingAcc = await tx.account.findUnique({ where: { code: '5200' } }); // Shipping/Freight Expense
        const discountAcc = await tx.account.findUnique({ where: { code: '4100' } }); // Purchase Discount

        if (!inventoryAcc || !apAcc || !supplier) {
          throw new Error('Required configuration accounts (Inventory Asset or Accounts Payable) or Supplier record is missing.');
        }

        // C. Create Purchase Invoice Header
        const invoice = await tx.purchaseInvoice.create({
          data: {
            id: invoiceNumber,
            supplierId: data.supplierId,
            invoiceDate: new Date(data.invoiceDate),
            warehouseId: data.warehouseId,
            referenceNumber: data.referenceNumber,
            discount: discountTotal,
            taxAmount: taxTotal,
            shippingCharges: shippingCharges,
            grandTotal: grandTotal,
            paidAmount: paidAmount,
            dueAmount: dueAmount,
            paymentMethod: data.paymentMethod,
            notes: data.notes,
            attachmentUrl: data.attachmentUrl,
          },
        });

        // D. Create Purchase Items & Update Inventory Stock levels
        let itemsBaseCost = 0; // Sum of cost of physical items before tax/discount/shipping
        
        for (const item of data.items) {
          const qty = parseFloat(item.quantity) || 0;
          const costPrice = parseFloat(item.purchasePrice) || 0;
          const wholesalePrice = parseFloat(item.wholesalePrice) || 0;
          const retailPrice = parseFloat(item.retailPrice) || 0;
          const itemDiscount = parseFloat(item.discount) || 0;
          const itemTax = parseFloat(item.taxAmount) || 0;
          const itemTotal = parseFloat(item.total) || 0;

          itemsBaseCost += qty * costPrice;

          // 1. Create Invoice item record
          await tx.purchaseItem.create({
            data: {
              purchaseInvoiceId: invoice.id,
              productId: item.productId,
              quantity: qty,
              purchasePrice: costPrice,
              wholesalePrice: wholesalePrice,
              retailPrice: retailPrice,
              discount: itemDiscount,
              taxAmount: itemTax,
              total: itemTotal,
            },
          });

          // 2. Increment warehouse-specific stock levels
          await tx.warehouseStock.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: data.warehouseId,
              },
            },
            update: { stock: { increment: qty } },
            create: {
              productId: item.productId,
              warehouseId: data.warehouseId,
              stock: qty,
            },
          });

          // 3. Increment global Product cached currentStock & update cost/sell prices
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentStock: { increment: qty },
              purchasePrice: costPrice, // Sync latest purchase price to catalog
              wholesalePrice: wholesalePrice,
              retailPrice: retailPrice,
            },
          });

          // 4. Record stock movement audit logs
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              warehouseId: data.warehouseId,
              quantity: qty,
              type: 'PURCHASE',
              referenceId: invoice.id,
              notes: `Purchase Inflow: ${invoiceNumber}`,
            },
          });
        }

        // E. Post Accounting Journal Entry (Double-Entry Bookkeeping)
        const journal = await tx.journalEntry.create({
          data: {
            date: new Date(data.invoiceDate),
            reference: invoiceNumber,
            description: `Purchase Inflow Invoice from Supplier: ${supplier.name}`,
          },
        });

        // 1. Debit Inventory Asset
        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: inventoryAcc.id,
            debit: itemsBaseCost,
            credit: 0,
            description: 'Inventory stock value increase',
          },
        });
        await tx.account.update({
          where: { id: inventoryAcc.id },
          data: { balance: { increment: itemsBaseCost } },
        });

        // 2. Debit Tax Account (if tax exists)
        if (taxTotal > 0 && taxAcc) {
          await tx.journalItem.create({
            data: {
              journalEntryId: journal.id,
              accountId: taxAcc.id,
              debit: taxTotal,
              credit: 0,
              description: 'Paid input tax asset/charge',
            },
          });
          await tx.account.update({
            where: { id: taxAcc.id },
            data: { balance: { increment: taxTotal } },
          });
        }

        // 3. Debit Shipping/Freight Expense (if charges exist)
        if (shippingCharges > 0 && shippingAcc) {
          await tx.journalItem.create({
            data: {
              journalEntryId: journal.id,
              accountId: shippingAcc.id,
              debit: shippingCharges,
              credit: 0,
              description: 'Freight & carriage inward cost',
            },
          });
          await tx.account.update({
            where: { id: shippingAcc.id },
            data: { balance: { increment: shippingCharges } },
          });
        }

        // 4. Credit Purchase Discounts (if discount exists)
        if (discountTotal > 0 && discountAcc) {
          await tx.journalItem.create({
            data: {
              journalEntryId: journal.id,
              accountId: discountAcc.id,
              debit: 0,
              credit: discountTotal,
              description: 'Trade discounts received',
            },
          });
          await tx.account.update({
            where: { id: discountAcc.id },
            data: { balance: { increment: discountTotal } },
          });
        }

        // 5. Credit General Accounts Payable (AP) & Supplier ledger
        // Incur the liability (Grand Total)
        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: apAcc.id,
            debit: 0,
            credit: grandTotal,
            description: `Liabilities to supplier: ${supplier.name}`,
          },
        });
        await tx.account.update({
          where: { id: apAcc.id },
          data: { balance: { increment: grandTotal } },
        });

        await tx.journalItem.create({
          data: {
            journalEntryId: journal.id,
            accountId: supplier.ledgerAccountId,
            debit: 0,
            credit: grandTotal,
            description: `Credit supplier balance: ${supplier.name}`,
          },
        });
        await tx.account.update({
          where: { id: supplier.ledgerAccountId },
          data: { balance: { increment: grandTotal } },
        });

        // F. Handle immediate Payment (Cash Paid)
        if (paidAmount > 0) {
          // Resolve standard cash/bank accounts
          const paymentSourceCode = data.paymentMethod === 'BANK' ? '1100' : '1000';
          const sourceAccount = await tx.account.findUnique({ where: { code: paymentSourceCode } });

          if (sourceAccount) {
            // Debit Liability (reduce AP)
            await tx.journalItem.create({
              data: {
                journalEntryId: journal.id,
                accountId: apAcc.id,
                debit: paidAmount,
                credit: 0,
                description: 'Reduce accounts payable liability via payment',
              },
            });
            await tx.account.update({
              where: { id: apAcc.id },
              data: { balance: { decrement: paidAmount } },
            });

            await tx.journalItem.create({
              data: {
                journalEntryId: journal.id,
                accountId: supplier.ledgerAccountId,
                debit: paidAmount,
                credit: 0,
                description: `Payment posted to supplier: ${supplier.name}`,
              },
            });
            await tx.account.update({
              where: { id: supplier.ledgerAccountId },
              data: { balance: { decrement: paidAmount } },
            });

            // Credit Asset (Cash or Bank decreases)
            await tx.journalItem.create({
              data: {
                journalEntryId: journal.id,
                accountId: sourceAccount.id,
                debit: 0,
                credit: paidAmount,
                description: `Cash outflow via payment - method: ${data.paymentMethod}`,
              },
            });
            await tx.account.update({
              where: { id: sourceAccount.id },
              data: { balance: { decrement: paidAmount } }, // Assets decrease on credit
            });
          }
        }

        // Link journal entry back to invoice
        await tx.purchaseInvoice.update({
          where: { id: invoiceNumber },
          data: { journalEntryId: journal.id },
        });

        return invoice;
      });

      return { success: true, invoiceNumber: result.id };
    } catch (error: any) {
      console.error('Error creating purchase invoice:', error);
      return { success: false, error: error.message };
    }
  });
}
