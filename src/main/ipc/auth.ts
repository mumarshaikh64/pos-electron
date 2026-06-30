import { ipcMain } from 'electron';
import { prisma } from '../db';
import * as crypto from 'crypto';

let loggedInUser: any = null;

function verifyPassword(password: string, passwordHash: string): boolean {
  const parts = passwordHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === checkHash;
}

export function registerAuthHandlers() {
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
    return { success: true };
  });

  ipcMain.handle('auth:me', async () => {
    console.log('[IPC Auth] auth:me requested. Returning session user:', loggedInUser?.username || 'GUEST/NULL');
    return loggedInUser;
  });
}
export { loggedInUser };
