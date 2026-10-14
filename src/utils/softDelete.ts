import { db } from '../lib/db';
import { logEvent } from './eventLog';
import { syncService } from '../services/sync-service';
import { useAppStore } from '../store/useAppStore';

export interface UserInfo {
  id?: string;
  name?: string;
}

export interface TombstoneItem {
  tableName: string;
  tableLabel: string;
  id: any;
  title: string;
  deletedAt: string;
  deletedBy?: string;
  syncStatus?: string;
}

export interface PurgeOptions {
  maxAgeDays?: number; // 0 = purge all tombstones regardless of age
  tableNames?: string[];
  specificIds?: Record<string, any[]>;
}

export interface PurgeResult {
  totalPurged: number;
  purgedByTable: Record<string, number>;
  remotePurged: number;
  errors: string[];
}

const TABLE_CATEGORY_MAP: Record<string, { category: any; action: string; label: string; remoteTable: string }> = {
  cats: { category: 'animal', action: 'animal.soft_delete', label: 'Cica', remoteTable: 'cats' },
  finances: { category: 'finance', action: 'finance.soft_delete', label: 'Pénzügyi tétel', remoteTable: 'finances' },
  inventory: { category: 'inventory', action: 'inventory.soft_delete', label: 'Leltári tétel', remoteTable: 'inventory' },
  fosterParents: { category: 'foster', action: 'foster.soft_delete', label: 'Befogadó', remoteTable: 'foster_parents' },
  fosterSupplies: { category: 'foster', action: 'foster_supply.soft_delete', label: 'Befogadói ellátmány', remoteTable: 'foster_supplies' },
  fosterExpenses: { category: 'foster', action: 'foster_expense.soft_delete', label: 'Befogadói kiadás', remoteTable: 'foster_expenses' },
  donationCampaigns: { category: 'finance', action: 'donation_campaign.soft_delete', label: 'Adománygyűjtő akció', remoteTable: 'donation_campaigns' },
  donationCampaignItems: { category: 'finance', action: 'donation_item.soft_delete', label: 'Adomány tétel', remoteTable: 'donation_campaign_items' },
  events: { category: 'health', action: 'health_event.soft_delete', label: 'Egészségügyi esemény', remoteTable: 'events' },
  tnr: { category: 'tnr', action: 'tnr.soft_delete', label: 'TNR rekord', remoteTable: 'tnr_records' }
};

export const ALL_TOMBSTONE_TABLES = Object.keys(TABLE_CATEGORY_MAP);

/**
 * Perform a pragmatic tombstone soft-delete on a record in Dexie IndexedDB.
 * Sets `deletedAt` and `deletedBy`, marks `syncStatus = 'pending'`, and logs an audit event.
 */
export async function softDelete(
  tableName: string,
  id: any,
  user?: UserInfo
): Promise<boolean> {
  try {
    const table = db.table(tableName);
    if (!table) {
      console.warn(`[softDelete] Table '${tableName}' does not exist.`);
      return false;
    }

    const item = await table.get(id);
    if (!item) {
      console.warn(`[softDelete] Record with id '${id}' not found in table '${tableName}'.`);
      return false;
    }

    if (item.deletedAt) {
      console.log(`[softDelete] Record '${id}' in '${tableName}' is already tombstoned.`);
      return true;
    }

    const now = new Date().toISOString();
    const currentUser = useAppStore.getState().currentUser;
    const deletedByStr = user?.name || user?.id || currentUser?.name || currentUser?.id || 'rendszer';

    const updatedItem = {
      ...item,
      deletedAt: now,
      deletedBy: deletedByStr,
      syncStatus: 'pending',
      updatedAt: now,
      updated: now
    };

    await table.put(updatedItem);

    // Cascading soft deletes
    if (tableName === 'cats') {
      // Soft-delete associated events
      const relatedEvents = await db.events.where('catId').equals(id).toArray();
      for (const ev of relatedEvents) {
        if (!ev.deletedAt) {
          await db.events.put({
            ...ev,
            deletedAt: now,
            deletedBy: deletedByStr,
            syncStatus: 'pending',
            updatedAt: now
          });
        }
      }

      // Soft-delete associated weights if table supports it
      if (db.table('cat_weights')) {
        const weights = await db.table('cat_weights').where('catId').equals(String(id)).toArray().catch(() => []);
        for (const w of weights) {
          await db.table('cat_weights').put({
            ...w,
            deletedAt: now,
            deletedBy: deletedByStr,
            syncStatus: 'pending'
          }).catch(() => {});
        }
      }
    } else if (tableName === 'donationCampaigns') {
      const campaignItems = await db.table('donationCampaignItems').where('campaignId').equals(id).toArray().catch(() => []);
      for (const item of campaignItems) {
        if (!item.deletedAt) {
          await db.table('donationCampaignItems').put({
            ...item,
            deletedAt: now,
            deletedBy: deletedByStr,
            syncStatus: 'pending'
          });
        }
      }
    }

    // Log audit event
    const tableMeta = TABLE_CATEGORY_MAP[tableName] || {
      category: 'system',
      action: `${tableName}.soft_delete`,
      label: tableName
    };

    const itemTitle = item.nev || item.name || item.title || item.item || item.itemType || item.id;

    await logEvent({
      category: tableMeta.category,
      action: tableMeta.action,
      summary: `${tableMeta.label} törölve (tombstone): ${itemTitle}`,
      entityId: String(id),
      details: { tableName, id, deletedAt: now, deletedBy: deletedByStr }
    }).catch(() => {});

    // Trigger sync
    if (navigator.onLine) {
      syncService.syncPending().catch(() => {});
    }

    return true;
  } catch (err: any) {
    console.error(`[softDelete] Error soft deleting record ${id} in ${tableName}:`, err);
    return false;
  }
}

/**
 * Retrieves all tombstoned items across specified or all critical tables.
 */
export async function getTombstonedItems(tablesToScan?: string[]): Promise<TombstoneItem[]> {
  const tables = tablesToScan || ALL_TOMBSTONE_TABLES;
  const tombstones: TombstoneItem[] = [];

  for (const tableName of tables) {
    try {
      if (!db.table(tableName)) continue;
      const rows = await db.table(tableName).toArray();
      const meta = TABLE_CATEGORY_MAP[tableName] || { label: tableName };

      for (const row of rows) {
        if (row.deletedAt) {
          const title = row.nev || row.name || row.title || row.item || row.brandOrName || row.itemType || String(row.id);
          tombstones.push({
            tableName,
            tableLabel: meta.label,
            id: row.id,
            title,
            deletedAt: row.deletedAt,
            deletedBy: row.deletedBy || 'ismeretlen',
            syncStatus: row.syncStatus || 'synced'
          });
        }
      }
    } catch (e) {
      console.error(`[getTombstonedItems] Error scanning table ${tableName}:`, e);
    }
  }

  return tombstones.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
}

/**
 * Root-only purge: hard-deletes tombstones older than `maxAgeDays` (default 90) or selected IDs.
 * Attempts physical delete on remote Supabase if online, then hard-deletes from Dexie.
 */
export async function purgeTombstones(options: PurgeOptions = {}): Promise<PurgeResult> {
  const maxAgeDays = options.maxAgeDays !== undefined ? options.maxAgeDays : 90;
  const tables = options.tableNames || ALL_TOMBSTONE_TABLES;
  const specificIds = options.specificIds;

  const result: PurgeResult = {
    totalPurged: 0,
    purgedByTable: {},
    remotePurged: 0,
    errors: []
  };

  const cutoffTime = maxAgeDays > 0 ? Date.now() - maxAgeDays * 24 * 60 * 60 * 1000 : Infinity;
  const supabase = syncService.supabase;

  for (const tableName of tables) {
    result.purgedByTable[tableName] = 0;
    try {
      if (!db.table(tableName)) continue;
      const rows = await db.table(tableName).toArray();
      const tableMeta = TABLE_CATEGORY_MAP[tableName];
      const itemsToPurge: any[] = [];

      for (const row of rows) {
        if (!row.deletedAt) continue;

        // Check if specific IDs requested or age cutoff met
        if (specificIds && specificIds[tableName]) {
          if (specificIds[tableName].includes(row.id)) {
            itemsToPurge.push(row);
          }
        } else {
          const deletedTime = new Date(row.deletedAt).getTime();
          if (deletedTime <= cutoffTime) {
            itemsToPurge.push(row);
          }
        }
      }

      for (const item of itemsToPurge) {
        // 1. Attempt remote hard delete if client initialized
        if (supabase && tableMeta?.remoteTable && navigator.onLine) {
          try {
            await supabase.from(tableMeta.remoteTable).delete().eq('id', item.id);
            result.remotePurged++;
          } catch (supErr: any) {
            console.warn(`[purgeTombstones] Remote purge warning for ${tableName} id ${item.id}:`, supErr);
          }
        }

        // 2. Local physical delete from Dexie
        await db.table(tableName).delete(item.id);
        result.purgedByTable[tableName]++;
        result.totalPurged++;
      }
    } catch (e: any) {
      console.error(`[purgeTombstones] Error purging table ${tableName}:`, e);
      result.errors.push(`${tableName}: ${e?.message || e}`);
    }
  }

  // Log audit event
  await logEvent({
    category: 'system',
    action: 'system.purge',
    summary: `Végleges törlés (purge) lefutott: ${result.totalPurged} db rekord eltávolítva`,
    details: { maxAgeDays, totalPurged: result.totalPurged, purgedByTable: result.purgedByTable, remotePurged: result.remotePurged }
  }).catch(() => {});

  return result;
}
