import { AuditInfo, UserAccount } from '../types';

/**
 * Creates audit metadata fields when a new record is saved
 */
export function createAuditStamp(currentUser?: UserAccount | null): AuditInfo {
  const now = new Date().toISOString();
  return {
    created_by: currentUser?.id || 'system',
    created_by_name: currentUser?.name || 'Rendszer',
    created_at: now,
    updated_by: currentUser?.id || 'system',
    updated_by_name: currentUser?.name || 'Rendszer',
    updated_at: now,
  };
}

/**
 * Updates audit metadata fields when an existing record is edited
 */
export function updateAuditStamp(existing?: AuditInfo | null, currentUser?: UserAccount | null): AuditInfo {
  const now = new Date().toISOString();
  return {
    created_by: existing?.created_by || currentUser?.id || 'system',
    created_by_name: existing?.created_by_name || currentUser?.name || 'Rendszer',
    created_at: existing?.created_at || now,
    updated_by: currentUser?.id || 'system',
    updated_by_name: currentUser?.name || 'Rendszer',
    updated_at: now,
  };
}

/**
 * Formats ISO timestamp to human-readable Hungarian date & time
 */
export function formatAuditDate(isoString?: string): string {
  if (!isoString) return 'Nincs megadva';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
