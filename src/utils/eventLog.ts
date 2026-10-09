import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { APP_VERSION } from '../version';

export type AuditEventLevel = 'info' | 'warn' | 'error';
export type AuditEventCategory =
  | 'auth'
  | 'rbac'
  | 'license'
  | 'cat'
  | 'finance'
  | 'inventory'
  | 'donation'
  | 'export'
  | 'sync'
  | 'system'
  | 'ui';

export interface AuditEvent {
  id: string;
  ts: string;
  level: AuditEventLevel;
  category: AuditEventCategory;
  action: string;
  userId?: string;
  userName?: string;
  role?: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  details?: Record<string, any>;
  ok: boolean;
  errorMessage?: string;
  appVersion?: string;
}

const SENSITIVE_KEYS = [
  'password',
  'pass',
  'pin',
  'pincode',
  'token',
  'secret',
  'auth',
  'authorization',
  'licensekey',
  'photo',
  'photodata',
  'base64',
  'credential',
  'signature',
];

/**
 * Strips/redacts sensitive keys (passwords, tokens, raw binary/photo payloads)
 */
export function redactSensitiveData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    if (data.startsWith('data:image/') || data.length > 5000) {
      return '[TRUNCATED_BINARY_DATA]';
    }
    return data;
  }
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const result: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = redactSensitiveData(data[key]);
    }
  }
  return result;
}

/**
 * Creates a unique ID for events
 */
function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback
    }
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

let lastPruneTime = 0;

/**
 * Keep last N events (max 5000) or last 90 days.
 * Prunes old entries asynchronously.
 */
export async function pruneAuditEvents(maxCount = 5000, maxAgeDays = 90): Promise<void> {
  const now = Date.now();
  // Throttle prune calls to at most once per minute
  if (now - lastPruneTime < 60000) return;
  lastPruneTime = now;

  try {
    if (!db.audit_events) return;
    const total = await db.audit_events.count();
    const cutoffDate = new Date(now - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();

    // 1. Remove events older than cutoffDate
    const oldEvents = await db.audit_events.where('ts').below(cutoffDate).toArray();
    if (oldEvents.length > 0) {
      const oldIds = oldEvents.map((e) => e.id);
      await db.audit_events.bulkDelete(oldIds);
    }

    // 2. If still exceeding maxCount, trim oldest
    const currentCount = await db.audit_events.count();
    if (currentCount > maxCount) {
      const excess = currentCount - maxCount;
      const oldestToTrim = await db.audit_events.orderBy('ts').limit(excess).toArray();
      const trimIds = oldestToTrim.map((e) => e.id);
      await db.audit_events.bulkDelete(trimIds);
    }
  } catch (err) {
    console.warn('Prune audit events encountered non-fatal error:', err);
  }
}

/**
 * Central event logging API
 * Never throws to callers.
 */
export async function logEvent(
  partial: Partial<AuditEvent> & { category: AuditEventCategory; action: string; summary: string }
): Promise<void> {
  try {
    const storeState = useAppStore.getState();
    const currentUser = storeState.getCurrentUser ? storeState.getCurrentUser() : null;

    const event: AuditEvent = {
      id: partial.id || generateEventId(),
      ts: partial.ts || new Date().toISOString(),
      level: partial.level || 'info',
      category: partial.category,
      action: partial.action,
      userId: partial.userId || currentUser?.id || 'system',
      userName: partial.userName || currentUser?.name || 'Rendszer',
      role: partial.role || currentUser?.roleId || 'unknown',
      entityType: partial.entityType,
      entityId: partial.entityId ? String(partial.entityId) : undefined,
      summary: partial.summary,
      details: partial.details ? redactSensitiveData(partial.details) : undefined,
      ok: partial.ok ?? true,
      errorMessage: partial.errorMessage,
      appVersion: partial.appVersion || APP_VERSION,
    };

    if (db.audit_events) {
      await db.audit_events.put(event);
      // Fire-and-forget prune check
      pruneAuditEvents().catch(() => {});
    }

    if (process.env.NODE_ENV !== 'production' || event.level === 'error') {
      const logFn = event.level === 'error' ? console.error : event.level === 'warn' ? console.warn : console.log;
      logFn(`[Audit] [${event.category.toUpperCase()}] ${event.action}: ${event.summary}`, event);
    }
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

/**
 * Wraps error logs: level=error, ok=false
 */
export async function logError(
  action: string,
  error: any,
  extra?: Partial<AuditEvent>
): Promise<void> {
  const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
  const category: AuditEventCategory = extra?.category || 'system';
  const summary = extra?.summary || `Hiba történt művelet közben (${action}): ${errorMessage}`;

  await logEvent({
    level: 'error',
    category,
    action,
    summary,
    ok: false,
    errorMessage,
    details: {
      errorStack: error?.stack,
      ...(extra?.details || {}),
    },
    ...extra,
  });
}

/**
 * Utility wrapper for async critical actions with error logging & Hungarian user feedback
 */
export async function withErrorHandling<T>(
  action: string,
  fn: () => Promise<T> | T,
  userMessageHu: string,
  extra?: Partial<AuditEvent>
): Promise<T | null> {
  try {
    const result = await fn();
    return result;
  } catch (err: any) {
    await logError(action, err, {
      summary: `${userMessageHu} (${action})`,
      ...extra,
    });

    if (typeof window !== 'undefined') {
      alert(`⚠️ ${userMessageHu}\n(${err?.message || 'Ismeretlen hiba'})`);
    }

    return null;
  }
}

/**
 * Clear all audit events (Root function)
 */
export async function clearAuditEvents(): Promise<void> {
  try {
    if (db.audit_events) {
      await db.audit_events.clear();
      await logEvent({
        category: 'system',
        action: 'audit.clear',
        summary: 'Audit eseménynapló teljes kiürítése megtörtént (Root művelet)',
        level: 'warn',
      });
    }
  } catch (err) {
    console.error('Failed to clear audit events:', err);
  }
}

// Global unhandled error & rejection listeners throttling
let lastUnhandledErrorMsg = '';
let lastUnhandledErrorTime = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('error', (evt) => {
    const msg = evt.message || 'Ismeretlen ablak hiba';
    const now = Date.now();
    if (msg === lastUnhandledErrorMsg && now - lastUnhandledErrorTime < 3000) {
      return; // Throttle identical rapid unhandled errors
    }
    lastUnhandledErrorMsg = msg;
    lastUnhandledErrorTime = now;

    logEvent({
      level: 'error',
      category: 'system',
      action: 'system.unhandled_error',
      summary: `Nem kezelt ablak hiba: ${msg.slice(0, 100)}`,
      ok: false,
      errorMessage: msg,
      details: {
        filename: evt.filename,
        lineno: evt.lineno,
        colno: evt.colno,
      },
    }).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (evt) => {
    const reason = evt.reason?.message || String(evt.reason || 'Nem kezelt Promise elutasítás');
    const now = Date.now();
    if (reason === lastUnhandledErrorMsg && now - lastUnhandledErrorTime < 3000) {
      return;
    }
    lastUnhandledErrorMsg = reason;
    lastUnhandledErrorTime = now;

    logEvent({
      level: 'error',
      category: 'system',
      action: 'system.unhandled_rejection',
      summary: `Nem kezelt aszinkron elutasítás: ${reason.slice(0, 100)}`,
      ok: false,
      errorMessage: reason,
      details: {
        reason: typeof evt.reason === 'object' ? redactSensitiveData(evt.reason) : reason,
      },
    }).catch(() => {});
  });
}
