import { ipcMain } from 'electron';
import { prisma } from '../db';

export function registerSettingHandlers() {
  ipcMain.handle('settings:get', async () => {
    try {
      const dbSettings = await prisma.systemSetting.findMany();
      const settingsObj: { [key: string]: string } = {};
      dbSettings.forEach((s) => {
        settingsObj[s.key] = s.value;
      });
      return settingsObj;
    } catch (error) {
      console.error('Error fetching system settings:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:update', async (_event, settings: { [key: string]: string }) => {
    try {
      const updates = Object.entries(settings).map(([key, value]) => {
        return prisma.systemSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      });
      await prisma.$transaction(updates);
      return { success: true };
    } catch (error: any) {
      console.error('Error updating system settings:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:backup', async () => {
    return { success: false, error: 'Backup not implemented' };
  });

  ipcMain.handle('settings:restore', async (_event, _filePath) => {
    return { success: false, error: 'Restore not implemented' };
  });
}
