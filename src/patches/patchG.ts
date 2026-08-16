import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchG, validatePatchG } from '../services/patchUpgradeService';

export const patchG: PatchPlugin = {
  id: 'patch_g_inventory_warehouse_v1',
  name: 'Patch G: Raktárkészlet, Szavatosság & Adománylogisztika (Inventory & Warehouse Tracking)',
  targetVersion: 'v2.11.0',
  category: 'inventory_warehouse',
  icon: '📦',
  description: 'Raktári tételek szavatossági és minimálkészlet ellenőrzése, adománycímkék, tárolási helyszínek és kiadási naplók auditja.',
  order: 7,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchG();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Raktári Mozgások', value: `${raw.totalInventoryCount} db`, color: 'amber' },
        { label: 'Kiadott Ellátmány', value: `${raw.totalSuppliesCount} db`, color: 'indigo' },
        { label: 'Alacsony Készlet', value: `${raw.lowStockCount} tétel`, color: raw.lowStockCount > 0 ? 'rose' : 'emerald' },
        { label: 'Raktár Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '🎁', label: 'Adomány tétel', count: `${raw.donatedItemsCount} db` },
        { icon: '⏳', label: 'Lejárt szavatosság', count: `${raw.expiredItemsCount} db` },
        { icon: '⚠️', label: 'Negatív mennyiség', count: `${raw.negativeQtyCount} db` },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchG,
};

export default patchG;
