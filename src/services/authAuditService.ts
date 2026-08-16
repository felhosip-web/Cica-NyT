import { UserAccount, UserRole } from '../types';

export type AuthAuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'USER_SWITCH'
  | 'ROOT_MODE_ENTER'
  | 'ROOT_MODE_EXIT'
  | 'ROOT_AUTH_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  | 'PERMISSION_OVERRIDDEN';

export interface AuthAuditLogEntry {
  id: string;
  timestamp: string;
  eventType: AuthAuditEventType;
  userId: string;
  userName: string;
  userRole: string;
  targetUserId?: string;
  targetUserName?: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  details: string;
  metadata?: Record<string, any>;
  ipOrClient?: string;
}

const STORAGE_KEY = 'cica_auth_audit_logs';
const MAX_LOG_ENTRIES = 500;

/**
 * Lekéri az összes tárolt belépési/kilépési és felhasználói audit naplóbejegyzést
 */
export const getAuthAuditLogs = (): AuthAuditLogEntry[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialLogs = generateInitialAuthLogs();
      saveAuthAuditLogs(initialLogs);
      return initialLogs;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse auth audit logs:', err);
    return [];
  }
};

/**
 * Elmenti az audit naplóbejegyzéseket
 */
export const saveAuthAuditLogs = (logs: AuthAuditLogEntry[]) => {
  if (typeof localStorage === 'undefined') return;
  try {
    const trimmed = logs.slice(0, MAX_LOG_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Failed to save auth audit logs:', err);
  }
};

/**
 * Rögzít egy új belépési, kilépési vagy jogosultsági audit eseményt
 */
export const logAuthAuditEvent = (
  eventType: AuthAuditEventType,
  user: { id: string; name: string; roleId?: string },
  details: string,
  options?: {
    status?: 'SUCCESS' | 'WARNING' | 'FAILED';
    targetUserId?: string;
    targetUserName?: string;
    metadata?: Record<string, any>;
  }
): AuthAuditLogEntry => {
  const newEntry: AuthAuditLogEntry = {
    id: `auth_audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    eventType,
    userId: user.id,
    userName: user.name,
    userRole: user.roleId || 'unknown',
    targetUserId: options?.targetUserId,
    targetUserName: options?.targetUserName,
    status: options?.status || (eventType.includes('FAILED') ? 'FAILED' : 'SUCCESS'),
    details,
    metadata: options?.metadata,
    ipOrClient: typeof navigator !== 'undefined' ? `${navigator.platform || 'Web'} (${navigator.userAgent.slice(0, 40)}...)` : 'Local Client',
  };

  const currentLogs = getAuthAuditLogs();
  const updatedLogs = [newEntry, ...currentLogs];
  saveAuthAuditLogs(updatedLogs);

  // Felhasználói utolsó belépés / aktivitás időbélyeg frissítése ha létezik a tárolóban
  if (eventType === 'LOGIN_SUCCESS' || eventType === 'USER_SWITCH') {
    updateUserLastLoginTimestamp(user.id);
  }

  return newEntry;
};

/**
 * Frissíti a felhasználó utolsó bejelentkezési idejét és bejelentkezési számlálóját
 */
const updateUserLastLoginTimestamp = (userId: string) => {
  if (typeof localStorage === 'undefined') return;
  try {
    const rawUsers = localStorage.getItem('cica_users');
    if (!rawUsers) return;
    const users: any[] = JSON.parse(rawUsers);
    const updated = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          lastLoginAt: new Date().toISOString(),
          loginCount: (u.loginCount || 0) + 1,
        };
      }
      return u;
    });
    localStorage.setItem('cica_users', JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not update user last login:', e);
  }
};

/**
 * Kezdeti audit mintaadatok generálása ha a napló üres
 */
function generateInitialAuthLogs(): AuthAuditLogEntry[] {
  const now = Date.now();
  return [
    {
      id: `auth_audit_init_1`,
      timestamp: new Date(now - 3600 * 1000 * 2).toISOString(),
      eventType: 'LOGIN_SUCCESS',
      userId: 'user_root',
      userName: 'Főadminisztrátor (Root)',
      userRole: 'root',
      status: 'SUCCESS',
      details: 'Sikeres bejelentkezés ROOT jogosultsággal (PIN hitelesítés)',
      ipOrClient: 'Web Client (Rendszer Gazda)',
    },
    {
      id: `auth_audit_init_2`,
      timestamp: new Date(now - 3600 * 1000 * 5).toISOString(),
      eventType: 'USER_SWITCH',
      userId: 'user_staff',
      userName: 'Kovács Anna (Munkatárs)',
      userRole: 'staff',
      status: 'SUCCESS',
      details: 'Profilváltás: Szabó Éva ➔ Kovács Anna',
      ipOrClient: 'Web Client',
    },
    {
      id: `auth_audit_init_3`,
      timestamp: new Date(now - 3600 * 1000 * 24).toISOString(),
      eventType: 'ROLE_UPDATED',
      userId: 'user_root',
      userName: 'Főadminisztrátor (Root)',
      userRole: 'root',
      status: 'SUCCESS',
      details: 'STAFF szerepkör jogosultságainak felülvizsgálata és megerősítése',
      ipOrClient: 'Web Client',
    },
  ];
}
