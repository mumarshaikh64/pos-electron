import { contextBridge, ipcRenderer } from 'electron';

// Expose safe Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => {
    // Whitelist channels for security
    const validChannels = [
      'auth:login',
      'auth:logout',
      'auth:me',
      'products:list',
      'products:create',
      'products:update',
      'products:delete',
      'products:generate-barcode',
      'products:get-metadata',
      'products:create-metadata',
      'purchases:list',
      'purchases:create',
      'purchases:get',
      'sales:list',
      'sales:create',
      'sales:get',
      'sales:register-status',
      'sales:open-register',
      'sales:close-register',
      'parties:list-customers',
      'parties:list-suppliers',
      'parties:create-customer',
      'parties:create-supplier',
      'accounting:ledger',
      'accounting:profit-loss',
      'accounting:balance-sheet',
      'accounting:trial-balance',
      'reports:dashboard',
      'settings:get',
      'settings:update',
      'settings:backup',
      'settings:restore',
    ];
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Unauthorized IPC channel: ${channel}`));
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    const validChannels = ['barcode:scanned', 'backup:progress', 'notification'];
    if (validChannels.includes(channel)) {
      const subscription = (_event: any, ...args: any[]) => callback(...args);
      ipcRenderer.on(channel, subscription);
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  }
});
