import { db } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

export interface DriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
}

export interface BackupData {
  backupMetadata: {
    exportDate: string;
    appVersion: string;
    recordCounts: Record<string, number>;
  };
  cats: any[];
  events: any[];
  tnr?: any[];
  eventTemplates?: any[];
  fosterParents?: any[];
  fosterSupplies?: any[];
  fosterExpenses?: any[];
  inventory?: any[];
  finances?: any[];
  settings?: any[];
}

/**
 * List all Cica-NYT backup files from Google Drive
 */
export async function listBackupFiles(accessToken: string): Promise<DriveBackupFile[]> {
  const query = encodeURIComponent("name contains 'cica_nyt_backup' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=modifiedTime desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive hiba (${response.status}): ${errText}`);
  }

  const result = await response.json();
  return result.files || [];
}

/**
 * Download and parse a backup file content from Google Drive
 */
export async function downloadBackupFile(accessToken: string, fileId: string): Promise<BackupData> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Nem sikerült letölteni a fájlt a Google Drive-ról (${response.status})`);
  }

  const json = await response.json();
  return json;
}

/**
 * Delete a backup file from Google Drive
 */
export async function deleteBackupFile(accessToken: string, fileId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Nem sikerült törölni a fájlt a Google Drive-ról (${response.status})`);
  }
}

/**
 * Upload a JSON backup to Google Drive
 */
export async function uploadBackupToDrive(
  accessToken: string,
  backupData: BackupData,
  customFileName?: string
): Promise<DriveBackupFile> {
  const fileName =
    customFileName || `cica_nyt_backup_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Cica-NYT Adatbázis Biztonsági Mentés',
  };

  const fileContent = JSON.stringify(backupData, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Drive feltöltési hiba (${response.status}): ${errText}`);
  }

  return await response.json();
}

/**
 * Gathers complete local database tables into a unified BackupData object
 */
export async function createFullDatabaseBackup(): Promise<BackupData> {
  const cats = await db.cats.toArray();
  const events = await db.events.toArray();
  const tnr = db.tnr ? await db.tnr.toArray() : [];
  const eventTemplates = db.eventTemplates ? await db.eventTemplates.toArray() : [];
  const fosterParents = db.fosterParents ? await db.fosterParents.toArray() : [];
  const fosterSupplies = db.fosterSupplies ? await db.fosterSupplies.toArray() : [];
  const fosterExpenses = db.fosterExpenses ? await db.fosterExpenses.toArray() : [];
  const inventory = db.inventory ? await db.inventory.toArray() : [];
  const finances = db.finances ? await db.finances.toArray() : [];
  const settings = await db.settings.toArray();

  return {
    backupMetadata: {
      exportDate: new Date().toISOString(),
      appVersion: '2.9.1',
      recordCounts: {
        cats: cats.length,
        events: events.length,
        tnr: tnr.length,
        fosterParents: fosterParents.length,
        fosterSupplies: fosterSupplies.length,
        fosterExpenses: fosterExpenses.length,
        inventory: inventory.length,
        finances: finances.length,
      },
    },
    cats,
    events,
    tnr,
    eventTemplates,
    fosterParents,
    fosterSupplies,
    fosterExpenses,
    inventory,
    finances,
    settings,
  };
}

/**
 * Restores a BackupData object into local IndexedDB and optionally pushes to Supabase cloud
 */
export async function restoreBackupToLocalDB(
  backupData: BackupData,
  options?: { syncToSupabase?: boolean }
): Promise<{ restoredCounts: Record<string, number>; supabaseSynced: boolean; error?: string }> {
  const restoredCounts: Record<string, number> = {};

  // 1. Restore to Local Dexie IndexedDB
  if (Array.isArray(backupData.cats)) {
    await db.cats.clear();
    await db.cats.bulkPut(backupData.cats);
    restoredCounts.cats = backupData.cats.length;
  }

  if (Array.isArray(backupData.events)) {
    await db.events.clear();
    await db.events.bulkPut(backupData.events);
    restoredCounts.events = backupData.events.length;
  }

  if (db.tnr && Array.isArray(backupData.tnr)) {
    await db.tnr.clear();
    if (backupData.tnr.length > 0) await db.tnr.bulkPut(backupData.tnr);
    restoredCounts.tnr = backupData.tnr.length;
  }

  if (db.eventTemplates && Array.isArray(backupData.eventTemplates)) {
    await db.eventTemplates.clear();
    if (backupData.eventTemplates.length > 0) await db.eventTemplates.bulkPut(backupData.eventTemplates);
  }

  if (db.fosterParents && Array.isArray(backupData.fosterParents)) {
    await db.fosterParents.clear();
    if (backupData.fosterParents.length > 0) await db.fosterParents.bulkPut(backupData.fosterParents);
    restoredCounts.fosterParents = backupData.fosterParents.length;
  }

  if (db.fosterSupplies && Array.isArray(backupData.fosterSupplies)) {
    await db.fosterSupplies.clear();
    if (backupData.fosterSupplies.length > 0) await db.fosterSupplies.bulkPut(backupData.fosterSupplies);
    restoredCounts.fosterSupplies = backupData.fosterSupplies.length;
  }

  if (db.fosterExpenses && Array.isArray(backupData.fosterExpenses)) {
    await db.fosterExpenses.clear();
    if (backupData.fosterExpenses.length > 0) await db.fosterExpenses.bulkPut(backupData.fosterExpenses);
    restoredCounts.fosterExpenses = backupData.fosterExpenses.length;
  }

  if (db.inventory && Array.isArray(backupData.inventory)) {
    await db.inventory.clear();
    if (backupData.inventory.length > 0) await db.inventory.bulkPut(backupData.inventory);
    restoredCounts.inventory = backupData.inventory.length;
  }

  if (db.finances && Array.isArray(backupData.finances)) {
    await db.finances.clear();
    if (backupData.finances.length > 0) await db.finances.bulkPut(backupData.finances);
    restoredCounts.finances = backupData.finances.length;
  }

  let supabaseSynced = false;
  let supabaseError = '';

  // 2. Drive ➔ Supabase: Push restored local data to Supabase if requested & configured
  if (options?.syncToSupabase) {
    const supabaseUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);

        // Helper to format cats for Supabase
        if (Array.isArray(backupData.cats) && backupData.cats.length > 0) {
          const mappedCats = backupData.cats.map((c) => ({
            id: c.id,
            sorszam: c.sorszam ? String(c.sorszam) : null,
            nev: c.nev || 'Névtelen',
            ivar: c.ivar || 'ismeretlen',
            szin: c.szin || null,
            szuletes: c.szuletes || null,
            status: c.status || 'gondozasban',
            gazdis_date: c.gazdisDate || null,
            gazdis_person: c.gazdisPerson || null,
            intake_type: c.intakeType || 'sajat',
            has_kiskonyv: !!c.hasKiskonyv,
            chip_number: c.chipNumber || null,
            is_spayed: !!c.isSpayed,
            foster_id: c.fosterId || null,
            tags: Array.isArray(c.tags) ? c.tags : [],
            updated_at: new Date().toISOString(),
          }));

          const { error } = await client.from('cats').upsert(mappedCats);
          if (error) console.warn('Supabase cat upsert warning:', error);
        }

        if (Array.isArray(backupData.fosterParents) && backupData.fosterParents.length > 0) {
          const mappedFosters = backupData.fosterParents.map((f) => ({
            id: f.id,
            name: f.name || '',
            phone: f.phone || null,
            city: f.city || null,
            status: f.status || 'aktiv',
            max_capacity: f.maxCapacity || 1,
            updated_at: new Date().toISOString(),
          }));
          await client.from('foster_parents').upsert(mappedFosters);
        }

        if (Array.isArray(backupData.inventory) && backupData.inventory.length > 0) {
          const mappedInv = backupData.inventory.map((inv) => ({
            id: inv.id,
            direction: inv.direction || 'in',
            item_type: inv.itemType || 'táp',
            source_type: inv.sourceType || 'vásárlás',
            date: inv.date || new Date().toISOString().slice(0, 10),
            source_or_recipient: inv.sourceOrRecipient || null,
            updated_at: new Date().toISOString(),
          }));
          await client.from('inventory').upsert(mappedInv);
        }

        supabaseSynced = true;
      } catch (err: any) {
        console.error('Failed pushing restored data to Supabase:', err);
        supabaseError = err.message || String(err);
      }
    }
  }

  return { restoredCounts, supabaseSynced, error: supabaseError };
}

/**
 * Supabase ➔ Drive: Pulls latest data from Supabase into local IndexedDB and creates a Drive backup
 */
export async function pullSupabaseAndBackupToDrive(
  accessToken: string
): Promise<{ backupFile: DriveBackupFile; pulledCounts: Record<string, number> }> {
  const supabaseUrl = localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase nincs konfigurálva. Először add meg a Supabase URL-t és kulcsot a Beállításokban!');
  }

  const client = createClient(supabaseUrl, supabaseKey);
  const pulledCounts: Record<string, number> = {};

  // 1. Pull cats from Supabase
  const { data: supaCats, error: catErr } = await client.from('cats').select('*');
  if (catErr) throw new Error(`Hiba a Supabase macska adatok letöltésekor: ${catErr.message}`);

  if (Array.isArray(supaCats) && supaCats.length > 0) {
    const localCats = supaCats.map((sc) => ({
      id: sc.id,
      sorszam: sc.sorszam,
      nev: sc.nev,
      ivar: sc.ivar,
      szin: sc.szin,
      szuletes: sc.szuletes,
      status: sc.status || 'gondozasban',
      gazdisDate: sc.gazdis_date,
      gazdisPerson: sc.gazdis_person,
      intakeType: sc.intake_type || 'sajat',
      hasKiskonyv: sc.has_kiskonyv,
      chipNumber: sc.chip_number,
      isSpayed: sc.is_spayed,
      fosterId: sc.foster_id,
      tags: Array.isArray(sc.tags) ? sc.tags : [],
      syncStatus: 'synced',
    }));

    await db.cats.bulkPut(localCats);
    pulledCounts.cats = localCats.length;
  }

  // 2. Pull foster parents from Supabase
  const { data: supaFosters } = await client.from('foster_parents').select('*');
  if (Array.isArray(supaFosters) && supaFosters.length > 0 && db.fosterParents) {
    const localFosters = supaFosters.map((sf) => ({
      id: sf.id,
      name: sf.name,
      phone: sf.phone,
      city: sf.city,
      status: sf.status,
      maxCapacity: sf.max_capacity,
      syncStatus: 'synced',
    }));
    await db.fosterParents.bulkPut(localFosters);
    pulledCounts.fosterParents = localFosters.length;
  }

  // 3. Create full database backup from updated local DB
  const fullBackup = await createFullDatabaseBackup();

  // 4. Upload to Google Drive
  const fileName = `cica_nyt_supabase_drive_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const backupFile = await uploadBackupToDrive(accessToken, fullBackup, fileName);

  return { backupFile, pulledCounts };
}
