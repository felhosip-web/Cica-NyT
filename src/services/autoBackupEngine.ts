import { db } from '../js/db.js';
import {
  BackupData,
  createFullDatabaseBackup,
  restoreBackupToLocalDB,
  uploadBackupToDrive,
} from './googleDriveService';
import { generateSqlDump } from './sqlExportService';
import { getAccessToken } from './firebaseAuth';

export interface AutoBackupConfig {
  enabled: boolean;
  intervalMinutes: number; // 0 = belépéskor/manuális, 60 = óránként, 360 = 6 óránként, 1440 = naponta, 10080 = hetente
  format: 'json' | 'sql' | 'both';
  destination: 'local' | 'drive' | 'both';
  maxRetention: number; // pl. 15 mentési pont megtartása
  onlyIfChanged: boolean; // Inkrementális védelem: csak akkor ment, ha változott az adat
  lastBackupTime: string | null;
  lastBackupHash: string | null;
}

export interface AutoBackupRecord {
  id?: number;
  timestamp: string;
  format: 'json' | 'sql' | 'both';
  recordCount: number;
  triggerReason: 'scheduled' | 'manual' | 'app_start' | 'data_change';
  jsonContent?: string;
  sqlContent?: string;
  driveUploaded?: boolean;
  driveFileName?: string;
  details?: {
    cats: number;
    events: number;
    tnr: number;
    fosterParents: number;
    inventory: number;
  };
}

const CONFIG_KEY = 'cica_nyt_auto_backup_config_v1';

export const DEFAULT_AUTO_BACKUP_CONFIG: AutoBackupConfig = {
  enabled: true,
  intervalMinutes: 1440, // Naponta alapértelmezetten
  format: 'both',
  destination: 'both',
  maxRetention: 20,
  onlyIfChanged: true,
  lastBackupTime: null,
  lastBackupHash: null,
};

/**
 * Reads Auto Backup Configuration from LocalStorage
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_AUTO_BACKUP_CONFIG;
    return { ...DEFAULT_AUTO_BACKUP_CONFIG, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Hiba az automatikus mentési beállítások beolvasásakor:', e);
    return DEFAULT_AUTO_BACKUP_CONFIG;
  }
}

/**
 * Saves Auto Backup Configuration to LocalStorage
 */
export function saveAutoBackupConfig(config: Partial<AutoBackupConfig>): AutoBackupConfig {
  const current = getAutoBackupConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('cica-autobackup-config-changed', { detail: updated }));
  return updated;
}

/**
 * Generates a signature hash & counts for incremental change detection
 */
export async function getDatabaseSignature(): Promise<{ hash: string; recordCount: number; details: any; backupData: BackupData }> {
  const backupData = await createFullDatabaseBackup();
  const cats = backupData.cats?.length || 0;
  const events = backupData.events?.length || 0;
  const tnr = backupData.tnr?.length || 0;
  const fosterParents = backupData.fosterParents?.length || 0;
  const inventory = backupData.inventory?.length || 0;
  const finances = backupData.finances?.length || 0;
  const totalRecords = cats + events + tnr + fosterParents + inventory + finances;

  // Simple quick signature hash combining record counts and stringified subset
  const catSample = backupData.cats?.slice(0, 3).map((c: any) => `${c.id}_${c.nev}_${c.status}`).join('|') || '';
  const eventSample = backupData.events?.slice(0, 3).map((e: any) => `${e.id}_${e.date}`).join('|') || '';
  const hash = `${cats}:${events}:${tnr}:${fosterParents}:${inventory}:${finances}#${catSample}#${eventSample}`;

  return {
    hash,
    recordCount: totalRecords,
    details: { cats, events, tnr, fosterParents, inventory, finances },
    backupData,
  };
}

/**
 * Core function to run an auto-backup snapshot
 */
export async function runAutoBackupProcess(
  triggerReason: 'scheduled' | 'manual' | 'app_start' | 'data_change' = 'scheduled'
): Promise<{ success: boolean; skipped?: boolean; message: string; record?: AutoBackupRecord }> {
  const config = getAutoBackupConfig();

  if (!config.enabled && triggerReason !== 'manual') {
    return { success: false, skipped: true, message: 'Az automatikus mentés ki van kapcsolva.' };
  }

  // 1. Incremental change check
  const { hash, recordCount, details, backupData } = await getDatabaseSignature();

  if (triggerReason !== 'manual' && config.onlyIfChanged && config.lastBackupHash === hash) {
    return {
      success: true,
      skipped: true,
      message: 'Nincs új adatváltozás az utolsó mentési pont óta (Inkrementális kihagyás).',
    };
  }

  // 2. Generate backup contents based on format
  let jsonContent: string | undefined = undefined;
  let sqlContent: string | undefined = undefined;

  if (config.format === 'json' || config.format === 'both') {
    jsonContent = JSON.stringify(backupData, null, 2);
  }

  if (config.format === 'sql' || config.format === 'both') {
    sqlContent = generateSqlDump(backupData);
  }

  const nowIso = new Date().toISOString();
  let driveUploaded = false;
  let driveFileName: string | undefined = undefined;

  // 3. Optional Google Drive Upload
  if (config.destination === 'drive' || config.destination === 'both') {
    const accessToken = getAccessToken();
    if (accessToken) {
      try {
        const timeStampStr = new Date().toISOString().slice(0, 10) + '_' + new Date().toISOString().slice(11, 16).replace(':', '');
        const fileName = `cica_nyt_autobackup_${triggerReason}_${timeStampStr}.json`;
        const uploaded = await uploadBackupToDrive(accessToken, backupData, fileName);
        driveUploaded = true;
        driveFileName = uploaded.name;
      } catch (err) {
        console.warn('Automatikus Google Drive feltöltés hiba:', err);
      }
    }
  }

  // 4. Save to IndexedDB local autoBackups table
  const newRecord: AutoBackupRecord = {
    timestamp: nowIso,
    format: config.format,
    recordCount,
    triggerReason,
    jsonContent,
    sqlContent,
    driveUploaded,
    driveFileName,
    details,
  };

  let recordId: number | undefined = undefined;
  if (db.autoBackups) {
    try {
      recordId = await db.autoBackups.add(newRecord);
      newRecord.id = recordId;

      // 5. Prune old snapshots according to maxRetention
      const allRecords = await db.autoBackups.orderBy('timestamp').reverse().toArray();
      if (allRecords.length > config.maxRetention) {
        const toDelete = allRecords.slice(config.maxRetention);
        for (const item of toDelete) {
          if (item.id) await db.autoBackups.delete(item.id);
        }
      }
    } catch (err) {
      console.error('Hiba az automatikus mentési rekord mentésekor az IndexedDB-be:', err);
    }
  }

  // 6. Update last backup timestamp & hash in config
  saveAutoBackupConfig({
    lastBackupTime: nowIso,
    lastBackupHash: hash,
  });

  window.dispatchEvent(new CustomEvent('cica-autobackup-updated', { detail: newRecord }));

  return {
    success: true,
    message: `✅ Új mentési pont elkészült (${recordCount} rekord)! ${driveUploaded ? '+ Google Drive-ra is feltöltve' : ''}`,
    record: newRecord,
  };
}

/**
 * Get all stored local auto-backup records
 */
export async function getAutoBackupRecords(): Promise<AutoBackupRecord[]> {
  if (!db.autoBackups) return [];
  try {
    return await db.autoBackups.orderBy('timestamp').reverse().toArray();
  } catch (err) {
    console.error('Hiba a mentési pontok lekérésekor:', err);
    return [];
  }
}

/**
 * Delete a specific auto-backup record
 */
export async function deleteAutoBackupRecord(id: number): Promise<void> {
  if (!db.autoBackups) return;
  await db.autoBackups.delete(id);
  window.dispatchEvent(new CustomEvent('cica-autobackup-updated'));
}

/**
 * Clear all local auto-backup snapshots
 */
export async function clearAllAutoBackupRecords(): Promise<void> {
  if (!db.autoBackups) return;
  await db.autoBackups.clear();
  window.dispatchEvent(new CustomEvent('cica-autobackup-updated'));
}

/**
 * Restores a stored AutoBackupRecord into local database
 */
export async function restoreAutoBackupRecord(
  record: AutoBackupRecord,
  options?: { syncToSupabase?: boolean }
): Promise<{ restoredCounts: Record<string, number>; supabaseSynced: boolean; error?: string }> {
  if (!record.jsonContent) {
    throw new Error('Ez a mentési pont nem tartalmaz beolvasható JSON adatokat.');
  }

  const backupData: BackupData = JSON.parse(record.jsonContent);
  return await restoreBackupToLocalDB(backupData, options);
}

/**
 * Trigger file download for a backup record (JSON or SQL)
 */
export function downloadAutoBackupFile(record: AutoBackupRecord, fileType: 'json' | 'sql' = 'json') {
  let content = '';
  let filename = '';
  let mimeType = '';

  const dateStr = record.timestamp.slice(0, 10) + '_' + record.timestamp.slice(11, 16).replace(':', '');

  if (fileType === 'sql') {
    content = record.sqlContent || (record.jsonContent ? generateSqlDump(JSON.parse(record.jsonContent)) : '');
    filename = `cica_nyt_export_${dateStr}.sql`;
    mimeType = 'text/plain;charset=utf-8';
  } else {
    content = record.jsonContent || JSON.stringify(record, null, 2);
    filename = `cica_nyt_backup_${dateStr}.json`;
    mimeType = 'application/json;charset=utf-8';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Singleton scheduler initializer for background automated checks
 */
let schedulerTimer: any = null;

export function initAutoBackupScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);

  // Run initial check on app startup after 5 seconds
  setTimeout(() => {
    checkScheduledBackup('app_start');
  }, 5000);

  // Interval check every 60 seconds
  schedulerTimer = setInterval(() => {
    checkScheduledBackup('scheduled');
  }, 60000);
}

async function checkScheduledBackup(reason: 'scheduled' | 'app_start') {
  const config = getAutoBackupConfig();
  if (!config.enabled) return;

  if (reason === 'app_start' && config.intervalMinutes === 0) {
    // Mentés belépéskor
    await runAutoBackupProcess('app_start');
    return;
  }

  if (config.intervalMinutes > 0 && config.lastBackupTime) {
    const lastTime = new Date(config.lastBackupTime).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - lastTime) / (1000 * 60);

    if (elapsedMinutes >= config.intervalMinutes) {
      await runAutoBackupProcess('scheduled');
    }
  } else if (!config.lastBackupTime) {
    // Először fut
    await runAutoBackupProcess(reason);
  }
}
