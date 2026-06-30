import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

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
  }

  // Set the environment variable before instantiating PrismaClient
  process.env.DATABASE_URL = `file:${dbPath}`;
  console.log(`[Database] SQLite database location: ${dbPath}`);

  // In production, apply migrations on startup
  if (!isDev) {
    runMigrations();
  }

  prisma = new PrismaClient({
    log: isDev ? ['query', 'info', 'warn', 'error'] : ['error'],
  });
  
  return prisma;
}

function runMigrations() {
  try {
    console.log('[Database] Applying database migrations...');
    
    // Resolve packed paths for production build
    const schemaPath = path.join(process.resourcesPath, 'app', 'prisma', 'schema.prisma');
    const prismaCliPath = path.join(process.resourcesPath, 'app', 'node_modules', 'prisma', 'build', 'index.js');
    
    if (fs.existsSync(schemaPath) && fs.existsSync(prismaCliPath)) {
      const cmd = `node "${prismaCliPath}" migrate deploy --schema="${schemaPath}"`;
      execSync(cmd, {
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      console.log('[Database] Database migrations deployed successfully.');
    } else {
      console.warn('[Database] Missing packed schema.prisma or prisma CLI binary. Skipping startup migrations.');
    }
  } catch (error) {
    console.error('[Database] Failed to deploy startup migrations:', error);
  }
}

export { prisma };
