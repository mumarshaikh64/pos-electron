import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerProductHandlers() {
  // Get all Products with relations
  ipcMain.handle('products:list', async () => {
    try {
      return await prisma.product.findMany({
        include: {
          unit: true,
          category: true,
          brand: true,
        },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error listing products:', error);
      throw error;
    }
  });

  // 1. Get all Metadata (Categories, Brands, Units, Warehouses) in a single optimized call
  ipcMain.handle('products:get-metadata', async () => {
    try {
      const [categories, brands, units, warehouses] = await prisma.$transaction([
        prisma.category.findMany({ orderBy: { name: 'asc' } }),
        prisma.brand.findMany({ orderBy: { name: 'asc' } }),
        prisma.unit.findMany({ orderBy: { name: 'asc' } }),
        prisma.warehouse.findMany({ orderBy: { name: 'asc' } }),
      ]);
      return { categories, brands, units, warehouses };
    } catch (error) {
      console.error('Error fetching products metadata:', error);
      throw error;
    }
  });

  // 2. Add Category, Brand or Unit dynamically
  ipcMain.handle('products:create-metadata', async (_event, { type, name }) => {
    try {
      const cleanName = name.trim();
      if (!cleanName) return { success: false, error: 'Name cannot be empty' };

      if (type === 'category') {
        const item = await prisma.category.create({ data: { name: cleanName } });
        return { success: true, item };
      } else if (type === 'brand') {
        const item = await prisma.brand.create({ data: { name: cleanName } });
        return { success: true, item };
      } else if (type === 'unit') {
        const item = await prisma.unit.create({ data: { name: cleanName } });
        return { success: true, item };
      }
      return { success: false, error: 'Invalid metadata type' };
    } catch (error: any) {
      if (error.code === 'P2002') {
        return { success: false, error: 'A record with this name already exists.' };
      }
      console.error('Error creating metadata:', error);
      return { success: false, error: error.message };
    }
  });

  // 3. Create Product with initial stock mapping and ledger posting
  ipcMain.handle('products:create', async (_event, data) => {
    try {
      // Check duplicate SKU
      const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existingSku) return { success: false, error: `SKU "${data.sku}" is already registered.` };

      // Check duplicate Barcode
      const existingBarcode = await prisma.product.findUnique({ where: { barcode: data.barcode } });
      if (existingBarcode) return { success: false, error: `Barcode "${data.barcode}" is already registered.` };

      // Transaction wrapper to ensure opening stocks and accounting balance
      const product = await prisma.$transaction(async (tx) => {
        const prod = await tx.product.create({
          data: {
            name: data.name,
            sku: data.sku,
            barcode: data.barcode,
            description: data.description,
            categoryId: data.categoryId,
            brandId: data.brandId,
            unitId: data.unitId,
            purchasePrice: parseFloat(data.purchasePrice) || 0,
            wholesalePrice: parseFloat(data.wholesalePrice) || 0,
            retailPrice: parseFloat(data.retailPrice) || 0,
            minimumPrice: parseFloat(data.minimumPrice) || 0,
            minimumStock: parseFloat(data.minimumStock) || 0,
            openingStock: parseFloat(data.openingStock) || 0,
            currentStock: parseFloat(data.openingStock) || 0,
            taxPercentage: parseFloat(data.taxPercentage) || 0,
            status: data.status || 'ACTIVE',
          },
        });

        // Map stock if openingStock > 0 and warehouse is provided
        const qty = parseFloat(data.openingStock) || 0;
        if (qty > 0 && data.warehouseId) {
          // Initialize warehouse stock record
          await tx.warehouseStock.create({
            data: {
              productId: prod.id,
              warehouseId: data.warehouseId,
              stock: qty,
            },
          });

          // Log stock movement
          await tx.stockMovement.create({
            data: {
              productId: prod.id,
              warehouseId: data.warehouseId,
              quantity: qty,
              type: 'ADJUSTMENT',
              notes: 'Opening Stock Initialization',
            },
          });

          // double-entry accounting posting
          // Debit: Inventory Asset ("1300")
          // Credit: Owner Equity ("3000")
          const value = qty * (parseFloat(data.purchasePrice) || 0);
          if (value > 0) {
            const inventoryAcc = await tx.account.findUnique({ where: { code: '1300' } });
            const equityAcc = await tx.account.findUnique({ where: { code: '3000' } });

            if (inventoryAcc && equityAcc) {
              // Create Journal Entry
              const journal = await tx.journalEntry.create({
                data: {
                  date: new Date(),
                  reference: `OP-${prod.sku}`,
                  description: `Opening Stock Value for product: ${prod.name} (${qty} ${data.unitName || 'Units'})`,
                },
              });

              // Debit Inventory Asset
              await tx.journalItem.create({
                data: {
                  journalEntryId: journal.id,
                  accountId: inventoryAcc.id,
                  debit: value,
                  credit: 0,
                  description: 'Stock valuation debit',
                },
              });
              await tx.account.update({
                where: { id: inventoryAcc.id },
                data: { balance: { increment: value } },
              });

              // Credit Equity
              await tx.journalItem.create({
                data: {
                  journalEntryId: journal.id,
                  accountId: equityAcc.id,
                  debit: 0,
                  credit: value,
                  description: 'Capital counter credit',
                },
              });
              await tx.account.update({
                where: { id: equityAcc.id },
                data: { balance: { increment: value } }, // Equity balance increases with credit (note: stored as positive increment)
              });
            }
          }
        }
        return prod;
      });

      return { success: true, product };
    } catch (error: any) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }
  });

  // 4. Update Product
  ipcMain.handle('products:update', async (_event, id, data) => {
    try {
      const updated = await prisma.product.update({
        where: { id },
        data: {
          name: data.name,
          sku: data.sku,
          barcode: data.barcode,
          description: data.description,
          categoryId: data.categoryId,
          brandId: data.brandId,
          unitId: data.unitId,
          purchasePrice: parseFloat(data.purchasePrice) || 0,
          wholesalePrice: parseFloat(data.wholesalePrice) || 0,
          retailPrice: parseFloat(data.retailPrice) || 0,
          minimumPrice: parseFloat(data.minimumPrice) || 0,
          minimumStock: parseFloat(data.minimumStock) || 0,
          taxPercentage: parseFloat(data.taxPercentage) || 0,
          status: data.status,
        },
      });
      return { success: true, product: updated };
    } catch (error: any) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
    }
  });

  // 5. Delete Product with safety constraints
  ipcMain.handle('products:delete', async (_event, id) => {
    try {
      // Check if product is in Sales Invoice Items
      const salesCount = await prisma.salesItem.count({ where: { productId: id } });
      if (salesCount > 0) {
        return {
          success: false,
          error: 'This product has historical sales invoice records. You cannot delete it. Deactivate its status instead to hide it.',
        };
      }

      // Check if product is in Purchase Invoice Items
      const purchaseCount = await prisma.purchaseItem.count({ where: { productId: id } });
      if (purchaseCount > 0) {
        return {
          success: false,
          error: 'This product has historical supply purchase invoice records. You cannot delete it. Deactivate its status instead.',
        };
      }

      // Safe to hard delete
      await prisma.product.delete({ where: { id } });
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }
  });
}
export { prisma };
