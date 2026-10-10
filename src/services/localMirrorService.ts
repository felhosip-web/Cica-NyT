import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { APP_VERSION } from '../version';
import { redactSensitiveData, logEvent } from '../utils/eventLog';

export type PlatformOS = 'win' | 'mac' | 'linux' | 'other';

export interface LocalMirrorStatus {
  isSupported: boolean;
  platformOS: PlatformOS;
  hasHandle: boolean;
  folderName: string | null;
  permissionState: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'expired';
  lastMirrorAt: string | null;
  lastError: string | null;
  autoMirrorEnabled: boolean;
}

const SETTINGS_KEY = 'local_mirror_config';
const IDB_HANDLE_KEY = 'local_mirror_dir_handle';

/**
 * Checks if File System Access API (showDirectoryPicker) is supported in current browser
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Detects OS platform hint for user guidance text
 */
export function getPlatformOS(): PlatformOS {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent.toLowerCase();
  const platform = (navigator.platform || '').toLowerCase();

  if (platform.includes('win') || ua.includes('windows')) return 'win';
  if (platform.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) return 'mac';
  if (platform.includes('linux') || ua.includes('linux')) return 'linux';
  return 'other';
}

/**
 * Store directory handle in Dexie settings table
 */
export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    await db.settings.put({ id: IDB_HANDLE_KEY, handle });
  } catch (err) {
    console.warn('Failed to store directory handle in Dexie settings:', err);
  }
}

/**
 * Get stored directory handle from Dexie settings
 */
export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const record = await db.settings.get(IDB_HANDLE_KEY);
    if (record && record.handle) {
      return record.handle as FileSystemDirectoryHandle;
    }
  } catch (err) {
    console.warn('Failed to retrieve stored directory handle:', err);
  }
  return null;
}

/**
 * Remove stored directory handle from Dexie settings
 */
export async function removeStoredDirectoryHandle(): Promise<void> {
  try {
    await db.settings.delete(IDB_HANDLE_KEY);
    const config = await getLocalMirrorConfig();
    await saveLocalMirrorConfig({
      ...config,
      folderName: null,
      lastError: null,
    });
  } catch (err) {
    console.warn('Failed to remove stored directory handle:', err);
  }
}

/**
 * Get local mirror configuration
 */
export async function getLocalMirrorConfig(): Promise<{
  autoMirrorEnabled: boolean;
  folderName: string | null;
  lastMirrorAt: string | null;
  lastError: string | null;
}> {
  const defaultConfig = {
    autoMirrorEnabled: false,
    folderName: null,
    lastMirrorAt: null,
    lastError: null,
  };

  try {
    const record = await db.settings.get(SETTINGS_KEY);
    if (record && record.data) {
      return { ...defaultConfig, ...record.data };
    }
  } catch (e) {
    console.warn('Failed to load local mirror config:', e);
  }
  return defaultConfig;
}

/**
 * Save local mirror configuration
 */
export async function saveLocalMirrorConfig(config: {
  autoMirrorEnabled: boolean;
  folderName: string | null;
  lastMirrorAt: string | null;
  lastError: string | null;
}): Promise<void> {
  try {
    await db.settings.put({ id: SETTINGS_KEY, data: config });
  } catch (e) {
    console.warn('Failed to save local mirror config:', e);
  }
}

/**
 * Verify / Request permission for DirectoryHandle
 */
export async function verifyPermission(
  fileHandle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  const options = { mode: readWrite ? 'readwrite' : 'read' };
  try {
    // Check if permission was already granted
    if ((await (fileHandle as any).queryPermission(options)) === 'granted') {
      return true;
    }
    // Request permission from user
    if ((await (fileHandle as any).requestPermission(options)) === 'granted') {
      return true;
    }
  } catch (err) {
    console.warn('Permission query/request failed:', err);
  }
  return false;
}

/**
 * Gets overall status of the local mirror system
 */
export async function getMirrorStatus(): Promise<LocalMirrorStatus> {
  const supported = isFileSystemAccessSupported();
  const os = getPlatformOS();
  const config = await getLocalMirrorConfig();
  const handle = supported ? await getStoredDirectoryHandle() : null;

  let permState: 'granted' | 'prompt' | 'denied' | 'unsupported' | 'expired' = supported ? 'prompt' : 'unsupported';

  if (!supported) {
    permState = 'unsupported';
  } else if (handle) {
    try {
      const q = await (handle as any).queryPermission({ mode: 'readwrite' });
      if (q === 'granted') {
        permState = 'granted';
      } else if (q === 'prompt') {
        permState = 'expired';
      } else {
        permState = 'denied';
      }
    } catch {
      permState = 'expired';
    }
  }

  return {
    isSupported: supported,
    platformOS: os,
    hasHandle: !!handle,
    folderName: config.folderName || (handle ? handle.name : null),
    permissionState: permState,
    lastMirrorAt: config.lastMirrorAt,
    lastError: config.lastError,
    autoMirrorEnabled: config.autoMirrorEnabled,
  };
}

/**
 * Prompts user to pick a folder (under Documents or user choice)
 */
export async function pickMirrorDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('A fájlrendszer elérés API (showDirectoryPicker) nem támogatott ebben a böngészőben.');
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      id: 'cica_nyt_local_mirror',
      startIn: 'documents',
    });

    if (handle) {
      await storeDirectoryHandle(handle);
      const config = await getLocalMirrorConfig();
      await saveLocalMirrorConfig({
        ...config,
        folderName: handle.name,
        lastError: null,
      });

      await logEvent({
        category: 'system',
        action: 'local_mirror.folder_selected',
        summary: `Helyi tükör mentési mappa kiválasztva: ${handle.name}`,
        details: { folderName: handle.name },
      });

      return handle;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return null; // User cancelled dialog
    }
    console.error('Failed picking directory:', err);
    throw err;
  }
  return null;
}

/**
 * Builds structured JSON mirror payload from Dexie collections
 */
export async function buildMirrorPayload(): Promise<Record<string, any>> {
  const storeState = useAppStore.getState();

  const cats = await db.cats.toArray();
  const finances = db.finances ? await db.finances.toArray() : [];
  const inventory = db.inventory ? await db.inventory.toArray() : [];
  const fosterParents = db.fosterParents ? await db.fosterParents.toArray() : [];
  const fosterSupplies = db.fosterSupplies ? await db.fosterSupplies.toArray() : [];
  const fosterExpenses = db.fosterExpenses ? await db.fosterExpenses.toArray() : [];
  const donationCampaigns = db.donationCampaigns ? await db.donationCampaigns.toArray() : [];
  const donationCampaignItems = db.donationCampaignItems ? await db.donationCampaignItems.toArray() : [];
  const settings = db.settings ? await db.settings.toArray() : [];

  const recordCounts = {
    cats: cats.length,
    finances: finances.length,
    inventory: inventory.length,
    fosterParents: fosterParents.length,
    donationCampaigns: donationCampaigns.length,
  };

  const payload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      orgName: storeState.orgName || 'Macskamenhely & Gondozó Nyilvántartó',
      recordCounts,
      systemInfo: 'Cica-NyT Offline-First PWA Local Disk Mirror',
    },
    collections: {
      cats: redactSensitiveData(cats),
      finances: redactSensitiveData(finances),
      inventory: redactSensitiveData(inventory),
      fosterParents: redactSensitiveData(fosterParents),
      fosterSupplies: redactSensitiveData(fosterSupplies),
      fosterExpenses: redactSensitiveData(fosterExpenses),
      donationCampaigns: redactSensitiveData(donationCampaigns),
      donationCampaignItems: redactSensitiveData(donationCampaignItems),
      settings: redactSensitiveData(settings),
    },
  };

  return payload;
}

/**
 * Creates Hungarian README.txt file content for local mirror directory
 */
function createReadmeContent(): string {
  return `========================================================================
CICA-NYT (Macska Nyilvántartó PWA) - HELYI LEMEZES TÜKÖR & MENTÉSI MAPPA
========================================================================

Ez a mappa a Cica-NyT PWA alkalmazás helyi lemezes tükör mentéseit tartalmazza.

MAPPA STRUKTÚRA:
- latest/mirror.json : A legfrissebb pillanatkép felülírt másolata.
- backups/           : Időbélyeggel ellátott korábbi mentések (pl. CicaNyT_mirror_YYYY-MM-DD_HHmm.json).
- README.txt         : Ez az útmutató fájl.

ADATVÉDELEM & TITKOSÍTÁS:
A mentés tartalmazza a nyilvántartott állatokat, kezeléseket, raktárt, pénzügyeket
és ideiglenes befogadókat. Jelszavak, belépési kódok és nagy méretű fotók
biztonsági és adatvédelmi okokból redaktálásra/kihagyásra kerülnek.

VISSZAÁLLÍTÁS (RESTORE):
1. Nyisd meg a Cica-NyT alkalmazást.
2. Lépj a Beállítások -> "Auto-Mentés & SQL Export" vagy "Google Drive & Supabase" fülre.
3. Válaszd a "Mentés Betöltése (JSON Restore)" gombot, és válaszd ki a legfrissebb
   'latest/mirror.json' vagy egy tetszőleges 'backups/...' JSON fájlt ebből a mappából.

HES Projects® by FePe - Minden jog fenntartva.
========================================================================
`;
}

/**
 * Writes mirror JSON files into selected DirectoryHandle
 */
export async function writeMirrorToDirectory(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  const hasPerm = await verifyPermission(dirHandle, true);
  if (!hasPerm) {
    throw new Error('A kiválasztott mappához tartozó írási jogosultság lejárt vagy megtagadva. Kérjük, erősítse meg a hozzáférést!');
  }

  const payload = await buildMirrorPayload();
  const jsonContent = JSON.stringify(payload, null, 2);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const timestampStr = `${year}-${month}-${day}_${hours}${mins}`;

  // 1. Write latest/mirror.json
  const latestDir = await dirHandle.getDirectoryHandle('latest', { create: true });
  const latestFile = await latestDir.getFileHandle('mirror.json', { create: true });
  const latestWritable = await (latestFile as any).createWritable();
  await latestWritable.write(jsonContent);
  await latestWritable.close();

  // 2. Write backups/CicaNyT_mirror_YYYY-MM-DD_HHmm.json
  const backupsDir = await dirHandle.getDirectoryHandle('backups', { create: true });
  const backupFileName = `CicaNyT_mirror_${timestampStr}.json`;
  const backupFile = await backupsDir.getFileHandle(backupFileName, { create: true });
  const backupWritable = await (backupFile as any).createWritable();
  await backupWritable.write(jsonContent);
  await backupWritable.close();

  // 3. Write README.txt
  const readmeFile = await dirHandle.getFileHandle('README.txt', { create: true });
  const readmeWritable = await (readmeFile as any).createWritable();
  await readmeWritable.write(createReadmeContent());
  await readmeWritable.close();

  // Update Config
  const config = await getLocalMirrorConfig();
  await saveLocalMirrorConfig({
    ...config,
    folderName: dirHandle.name,
    lastMirrorAt: now.toISOString(),
    lastError: null,
  });

  await logEvent({
    category: 'export',
    action: 'local_mirror.success',
    summary: `Helyi lemezes tükör sikeresen mentve ide: ${dirHandle.name}/${backupFileName}`,
    details: {
      folderName: dirHandle.name,
      fileName: backupFileName,
      recordCounts: payload.metadata.recordCounts,
    },
  });
}

/**
 * Test write file to verify handle is writable
 */
export async function testWriteMirrorDirectory(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  const hasPerm = await verifyPermission(dirHandle, true);
  if (!hasPerm) {
    throw new Error('Írási jogosultság megtagadva.');
  }

  const testFile = await dirHandle.getFileHandle('.cica_nyt_test.tmp', { create: true });
  const writable = await (testFile as any).createWritable();
  await writable.write(`Cica-NyT Test Write ${new Date().toISOString()}`);
  await writable.close();
  await dirHandle.removeEntry('.cica_nyt_test.tmp');
}

/**
 * Fallback: Trigger browser file download when showDirectoryPicker is missing
 */
export async function downloadMirrorFallback(): Promise<void> {
  const payload = await buildMirrorPayload();
  const jsonContent = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);

  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CicaNyT_local_mirror_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);

  await logEvent({
    category: 'export',
    action: 'local_mirror.download_fallback',
    summary: `Helyi tükör letöltve fájlként (Fallback módban)`,
    details: { recordCounts: payload.metadata.recordCounts },
  });
}

/**
 * Automatic Mirror Trigger: Runs once per day if auto-mirror is enabled
 */
export async function checkAndRunAutoMirror(): Promise<void> {
  try {
    const config = await getLocalMirrorConfig();
    if (!config.autoMirrorEnabled) return;

    // Check if last mirror was written today (within last 20 hours)
    if (config.lastMirrorAt) {
      const lastTime = new Date(config.lastMirrorAt).getTime();
      const diffHours = (Date.now() - lastTime) / (1000 * 60 * 60);
      if (diffHours < 20) return; // Already mirrored today
    }

    if (!isFileSystemAccessSupported()) return;

    const handle = await getStoredDirectoryHandle();
    if (!handle) return;

    // Check permission without prompting if possible
    const query = await (handle as any).queryPermission({ mode: 'readwrite' });
    if (query !== 'granted') return; // Do not interrupt user with popup prompt during background check

    await writeMirrorToDirectory(handle);
  } catch (err: any) {
    console.warn('Auto local mirror background process encountered error:', err);
    const config = await getLocalMirrorConfig();
    await saveLocalMirrorConfig({
      ...config,
      lastError: err?.message || String(err),
    });
    await logEvent({
      category: 'export',
      action: 'local_mirror.fail',
      level: 'warn',
      ok: false,
      summary: `Automata helyi tükör mentési hiba: ${err?.message || err}`,
      errorMessage: err?.message,
    });
  }
}
