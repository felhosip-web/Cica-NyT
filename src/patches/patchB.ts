import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchB, validatePatchB } from '../services/patchUpgradeService';

export const patchB: PatchPlugin = {
  id: 'patch_b_foster_inventory_finance_v1',
  name: 'Patch B: Befogadó Hálózat, Raktárkészlet & Pénzügy (Foster & Inventory)',
  targetVersion: 'v2.7.0',
  category: 'foster_finance',
  icon: '🏡',
  description: 'Befogadó szülők adatkapcsolatai, ellátmánykészletek és támogatási pénzügyi tételek sémakorrekciója és kapacitás-auditja.',
  order: 2,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchB();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Befogadók', value: `${raw.totalFosterParentsCount} db`, color: 'amber' },
        { label: 'Férőhely', value: `${raw.totalCapacity} hely`, color: 'emerald' },
        { label: 'Költségtételek', value: `${raw.totalExpensesAmount.toLocaleString('hu-HU')} Ft`, color: 'sky' },
        { label: 'Hálózati Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '🏡', label: 'Aktív befogadó', count: `${raw.activeFostersCount} db` },
        { icon: '📦', label: 'Ellátmány tétel', count: `${raw.totalSuppliesCount} db` },
        { icon: '🥫', label: 'Raktármozgás', count: `${raw.totalInventoryMovementsCount} db` },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchB,
};

export default patchB;
