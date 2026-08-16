import { BackupData, createFullDatabaseBackup } from './googleDriveService';

export interface CollectionDiff {
  key: string;
  label: string;
  icon: string;
  currentCount: number;
  backupCount: number;
  netDiff: number;
  newCount: number;
  modifiedCount: number;
  removedCount: number;
  unchangedCount: number;
}

export interface ItemChangeDetail {
  id: string | number;
  title: string;
  type: 'new' | 'modified' | 'removed';
  collectionLabel: string;
  details?: string;
}

export interface ComparisonResult {
  exportDate?: string;
  appVersion?: string;
  currentTotalRecords: number;
  backupTotalRecords: number;
  netTotalDiff: number;
  collections: CollectionDiff[];
  itemHighlights: ItemChangeDetail[];
  riskLevel: 'low' | 'medium' | 'high';
  riskTitle: string;
  riskDescription: string;
  hasRemovedRecords: boolean;
  hasModifiedRecords: boolean;
}

const COLLECTION_METADATA: Record<string, { label: string; icon: string; idKey: string; titleFn: (item: any) => string }> = {
  cats: {
    label: 'Macskák',
    icon: '🐱',
    idKey: 'id',
    titleFn: (c) => `${c.nev || 'Névtelen'} ${c.sorszam ? `(#${c.sorszam})` : ''}`,
  },
  events: {
    label: 'Események & Oltások',
    icon: '📅',
    idKey: 'id',
    titleFn: (e) => `${e.title || e.type || 'Esemény'} (${e.date || ''})`,
  },
  tnr: {
    label: 'TNR Ivartalanítások',
    icon: '🩺',
    idKey: 'id',
    titleFn: (t) => `TNR Befogás: ${t.locationTrapped || 'Helyszín n/a'} (${t.dateTrapped || ''})`,
  },
  fosterParents: {
    label: 'Ideiglenes Befogadók',
    icon: '🏡',
    idKey: 'id',
    titleFn: (f) => `${f.name || 'Névtelen befogadó'} (${f.city || 'Város n/a'})`,
  },
  fosterSupplies: {
    label: 'Befogadó Készlet',
    icon: '📦',
    idKey: 'id',
    titleFn: (s) => `${s.item || s.type || 'Felszerelés'}`,
  },
  fosterExpenses: {
    label: 'Befogadó Költségek',
    icon: '💰',
    idKey: 'id',
    titleFn: (ex) => `${ex.category || 'Költség'}: ${ex.amount || 0} Ft`,
  },
  inventory: {
    label: 'Raktár & Készlet',
    icon: '🛒',
    idKey: 'id',
    titleFn: (inv) => `${inv.itemType || 'Cikk'} (${inv.direction === 'in' ? 'Be' : 'Ki'})`,
  },
  finances: {
    label: 'Pénzügyi Tranzakciók',
    icon: '💳',
    idKey: 'id',
    titleFn: (f) => `${f.title || f.category || 'Pénzügyi tétel'} (${f.type === 'bevetel' ? '+' : '-'}${f.amount || 0} Ft)`,
  },
};

/**
 * Compares current IndexedDB state with a candidate BackupData object
 */
export async function compareCurrentStateWithBackup(
  backupData: BackupData
): Promise<ComparisonResult> {
  const currentDB = await createFullDatabaseBackup();

  const collections: CollectionDiff[] = [];
  const itemHighlights: ItemChangeDetail[] = [];

  let currentTotalRecords = 0;
  let backupTotalRecords = 0;
  let totalRemovedRecords = 0;
  let totalModifiedRecords = 0;

  const collectionKeys = ['cats', 'events', 'tnr', 'fosterParents', 'fosterSupplies', 'fosterExpenses', 'inventory', 'finances'];

  for (const key of collectionKeys) {
    const meta = COLLECTION_METADATA[key] || {
      label: key,
      icon: '📁',
      idKey: 'id',
      titleFn: (item: any) => String(item.id || 'Elem'),
    };

    const currentList: any[] = (currentDB as any)[key] || [];
    const backupList: any[] = (backupData as any)[key] || [];

    currentTotalRecords += currentList.length;
    backupTotalRecords += backupList.length;

    // Create maps for fast lookup
    const currentMap = new Map<string, any>();
    currentList.forEach((item) => {
      if (item && item.id !== undefined) {
        currentMap.set(String(item.id), item);
      }
    });

    const backupMap = new Map<string, any>();
    backupList.forEach((item) => {
      if (item && item.id !== undefined) {
        backupMap.set(String(item.id), item);
      }
    });

    let newCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;

    // Check backup items against current DB
    backupList.forEach((bItem) => {
      if (!bItem || bItem.id === undefined) return;
      const idStr = String(bItem.id);
      const cItem = currentMap.get(idStr);

      if (!cItem) {
        newCount++;
        if (itemHighlights.length < 30) {
          itemHighlights.push({
            id: idStr,
            title: meta.titleFn(bItem),
            type: 'new',
            collectionLabel: meta.label,
            details: 'Új rekord kerül hozzáadásra a mentésből',
          });
        }
      } else {
        // Compare serialization to check if modified
        const cStr = JSON.stringify(cItem);
        const bStr = JSON.stringify(bItem);
        if (cStr !== bStr) {
          modifiedCount++;
          if (itemHighlights.length < 30) {
            let detailMsg = 'Megváltozott tartalom a mentésben';
            if (key === 'cats' && cItem.status !== bItem.status) {
              detailMsg = `Státusz változik: [${cItem.status || 'n/a'}] ➔ [${bItem.status || 'n/a'}]`;
            }
            itemHighlights.push({
              id: idStr,
              title: meta.titleFn(bItem),
              type: 'modified',
              collectionLabel: meta.label,
              details: detailMsg,
            });
          }
        } else {
          unchangedCount++;
        }
      }
    });

    // Check current items missing in backup
    currentList.forEach((cItem) => {
      if (!cItem || cItem.id === undefined) return;
      const idStr = String(cItem.id);
      if (!backupMap.has(idStr)) {
        removedCount++;
        if (itemHighlights.length < 30) {
          itemHighlights.push({
            id: idStr,
            title: meta.titleFn(cItem),
            type: 'removed',
            collectionLabel: meta.label,
            details: '⚠️ Jelenlegi helyi rekord, amely nem szerepel a mentésben (felülíródik/kimarad)',
          });
        }
      }
    });

    totalRemovedRecords += removedCount;
    totalModifiedRecords += modifiedCount;

    collections.push({
      key,
      label: meta.label,
      icon: meta.icon,
      currentCount: currentList.length,
      backupCount: backupList.length,
      netDiff: backupList.length - currentList.length,
      newCount,
      modifiedCount,
      removedCount,
      unchangedCount,
    });
  }

  // Assess Risk
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let riskTitle = '🟢 Biztonságos Visszaállítás (Nincs adatvesztés)';
  let riskDescription = 'A mentési fájl frissítései biztonságosak. Új adatok kerülnek felvételre.';

  if (totalRemovedRecords > 0) {
    riskLevel = 'high';
    riskTitle = '⚠️ Magas Kockázat: Jelenlegi helyi adatok maradhatnak ki!';
    riskDescription = `${totalRemovedRecords} olyan rekord van a jelenlegi helyi adatbázisodban, amely nem szerepel a mentésben. A visszaállítás felülírja ezeket!`;
  } else if (totalModifiedRecords > 0) {
    riskLevel = 'medium';
    riskTitle = '🟡 Közepes Kockázat: Meglévő rekordok frissülnek';
    riskDescription = `${totalModifiedRecords} meglévő rekord tartalma megváltozik a mentésben tárolt értékekre.`;
  }

  return {
    exportDate: backupData.backupMetadata?.exportDate,
    appVersion: backupData.backupMetadata?.appVersion,
    currentTotalRecords,
    backupTotalRecords,
    netTotalDiff: backupTotalRecords - currentTotalRecords,
    collections,
    itemHighlights,
    riskLevel,
    riskTitle,
    riskDescription,
    hasRemovedRecords: totalRemovedRecords > 0,
    hasModifiedRecords: totalModifiedRecords > 0,
  };
}
