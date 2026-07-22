import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { autoSeed } from './seed';

let prisma: PrismaClient;

export function initDatabase(): PrismaClient {
  // Check if we are in development mode
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  let dbPath: string;
  if (isDev) {
    dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  } else {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'database.db');
    
    // Ensure user data folder exists
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    // If database.db doesn't exist in userData, copy pre-populated template from extraResources
    if (!fs.existsSync(dbPath)) {
      let templatePath = path.join(process.resourcesPath, 'prisma', 'dev.db');
      if (!fs.existsSync(templatePath)) {
        templatePath = path.join(process.resourcesPath, 'app', 'prisma', 'dev.db');
      }
      if (!fs.existsSync(templatePath)) {
        templatePath = path.join(process.cwd(), 'prisma', 'dev.db');
      }

      if (fs.existsSync(templatePath)) {
        console.log(`[Database] Copying pre-populated SQLite database from ${templatePath} to ${dbPath}`);
        fs.copyFileSync(templatePath, dbPath);
      } else {
        console.warn(`[Database] Pre-populated database template not found at ${templatePath}`);
      }
    }
  }

  // Set the environment variable before instantiating PrismaClient
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log(`[Database] SQLite database location: ${dbPath}`);

  prisma = new PrismaClient({
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });

  // Automatically run JS-based autoSeed in background to guarantee admin user & initial data
  autoSeed(prisma).catch((err) => {
    console.error('[Database] Auto-seed error:', err);
  });

  return prisma;
}

export { prisma };
