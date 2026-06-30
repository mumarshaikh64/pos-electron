import { registerAuthHandlers } from './auth';
import { registerProductHandlers } from './products';
import { registerPurchaseHandlers } from './purchases';
import { registerSalesHandlers } from './sales';
import { registerAccountingHandlers } from './accounting';
import { registerReportHandlers } from './reports';
import { registerSettingHandlers } from './settings';
import { registerPartiesHandlers } from './parties';

export function registerIpcHandlers() {
  console.log('[IPC] Registering Inter-Process Communication handlers...');
  
  registerAuthHandlers();
  registerProductHandlers();
  registerPurchaseHandlers();
  registerSalesHandlers();
  registerAccountingHandlers();
  registerReportHandlers();
  registerSettingHandlers();
  registerPartiesHandlers();
}
