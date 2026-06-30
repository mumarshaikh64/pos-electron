import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerPartiesHandlers() {
  ipcMain.handle('parties:list-customers', async () => {
    try {
      return await prisma.customer.findMany({
        include: { ledgerAccount: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error listing customers:', error);
      throw error;
    }
  });

  ipcMain.handle('parties:list-suppliers', async () => {
    try {
      return await prisma.supplier.findMany({
        include: { ledgerAccount: true },
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      console.error('Error listing suppliers:', error);
      throw error;
    }
  });

  ipcMain.handle('parties:create-customer', async (_event, data) => {
    try {
      // 1. Create a ledger account in Chart of Accounts for this customer
      const lastCustomerAccount = await prisma.account.findFirst({
        where: { code: { startsWith: '1200' } },
        orderBy: { code: 'desc' },
      });
      
      let nextCode = '12000001';
      if (lastCustomerAccount && lastCustomerAccount.code !== '1200') {
        const numeric = parseInt(lastCustomerAccount.code.replace('1200', ''), 10) + 1;
        nextCode = `1200${numeric.toString().padStart(4, '0')}`;
      }

      const ledgerAccount = await prisma.account.create({
        data: {
          code: nextCode,
          name: `Customer: ${data.name} (AR)`,
          type: 'ASSET',
          balance: data.openingBalance || 0,
        },
      });

      const customer = await prisma.customer.create({
        data: {
          name: data.name,
          companyName: data.companyName,
          phone: data.phone,
          email: data.email,
          cnic: data.cnic,
          ntn: data.ntn,
          address: data.address,
          openingBalance: data.openingBalance || 0,
          creditLimit: data.creditLimit || 0,
          ledgerAccountId: ledgerAccount.id,
        },
      });

      return { success: true, customer };
    } catch (error: any) {
      console.error('Error creating customer:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('parties:create-supplier', async (_event, data) => {
    try {
      // 2. Create a ledger account in Chart of Accounts for this supplier
      const lastSupplierAccount = await prisma.account.findFirst({
        where: { code: { startsWith: '2000' } },
        orderBy: { code: 'desc' },
      });

      let nextCode = '20000001';
      if (lastSupplierAccount && lastSupplierAccount.code !== '2000') {
        const numeric = parseInt(lastSupplierAccount.code.replace('2000', ''), 10) + 1;
        nextCode = `2000${numeric.toString().padStart(4, '0')}`;
      }

      const ledgerAccount = await prisma.account.create({
        data: {
          code: nextCode,
          name: `Supplier: ${data.name} (AP)`,
          type: 'ASSET', // ASSET per our schema design mapping
          balance: data.openingBalance || 0,
        },
      });

      const supplier = await prisma.supplier.create({
        data: {
          name: data.name,
          companyName: data.companyName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          openingBalance: data.openingBalance || 0,
          ledgerAccountId: ledgerAccount.id,
        },
      });

      return { success: true, supplier };
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      return { success: false, error: error.message };
    }
  });
}
