import { ipcMain, app } from 'electron';
import { prisma } from '../db';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

let loggedInUser: any = null;

const getSessionPath = () => {
  return path.join(app.getPath('userData'), 'session.json');
};

function verifyPassword(password: string, passwordHash: string): boolean {
  const parts = passwordHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

export function registerAuthHandlers() {
  // Load session from file on startup
  try {
    const sessionPath = getSessionPath();
    if (fs.existsSync(sessionPath)) {
      const data = fs.readFileSync(sessionPath, 'utf-8');
      loggedInUser = JSON.parse(data);
      console.log('[IPC Auth] Restored session from file:', loggedInUser?.username);
    }
  } catch (err) {
    console.error('[IPC Auth] Error reading session file on startup:', err);
  }

  ipcMain.handle('auth:login', async (_event, { username, password }) => {
    try {
      console.log(`[IPC Auth] Login attempt for username: "${username}"`);
      const user = await prisma.user.findUnique({
        where: { username },
        include: { 
          role: { 
            include: { permissions: true } 
          } 
        },
      });

      if (!user) {
        console.log(`[IPC Auth] User not found: "${username}"`);
        return { success: false, error: 'Invalid username or password' };
      }

      if (user.status !== 'ACTIVE') {
        console.log(`[IPC Auth] User account deactivated: "${username}"`);
        return { success: false, error: 'User account is deactivated' };
      }

      const isValid = verifyPassword(password, user.passwordHash);
      if (!isValid) {
        console.log(`[IPC Auth] Invalid password for user: "${username}"`);
        return { success: false, error: 'Invalid username or password' };
      }

      // Save user session in memory
      loggedInUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role.name,
        permissions: user.role.permissions.map((p) => p.name),
      };

      // Persist session to file
      try {
        const sessionPath = getSessionPath();
        fs.writeFileSync(sessionPath, JSON.stringify(loggedInUser, null, 2), 'utf-8');
        console.log('[IPC Auth] Saved session to file.');
      } catch (err) {
        console.error('[IPC Auth] Error saving session to file:', err);
      }

      console.log(`[IPC Auth] Successful login for: "${username}". Session user set.`, loggedInUser);

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: `User ${user.username} logged in successfully`,
        }
      });

      return { success: true, user: loggedInUser };
    } catch (error: any) {
      console.error('[IPC Auth] Login IPC error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:logout', async () => {
    console.log('[IPC Auth] Logout requested. Clearing session user:', loggedInUser?.username);
    if (loggedInUser) {
      try {
        await prisma.activityLog.create({
          data: {
            userId: loggedInUser.id,
            action: 'LOGOUT',
            details: `User ${loggedInUser.username} logged out`,
          }
        });
      } catch (e) {
        console.error('[IPC Auth] Error logging logout action:', e);
      }
    }
    loggedInUser = null;
    try {
      const sessionPath = getSessionPath();
      if (fs.existsSync(sessionPath)) {
        fs.unlinkSync(sessionPath);
        console.log('[IPC Auth] Deleted session file.');
      }
    } catch (err) {
      console.error('[IPC Auth] Error deleting session file:', err);
    }
    return { success: true };
  });

  ipcMain.handle('auth:me', async () => {
    console.log('[IPC Auth] auth:me requested. Returning session user:', loggedInUser?.username || 'GUEST/NULL');
    return loggedInUser;
  });
}
export { loggedInUser };
