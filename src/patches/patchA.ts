import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchA, validatePatchA } from '../services/patchUpgradeService';

export const patchA: PatchPlugin = {
  id: 'patch_a_animal_core_v1',
  name: 'Patch A: Állatnyilvántartás & Egészségügyi Modul (Animal Core & Health)',
  targetVersion: 'v2.6.0',
  category: 'animal_core',
  icon: '🐈',
  description: 'Adatbázis sémakorrekció, chip- és útlevél adatok normalizálása, orvosi bejegyzések számszaki auditja és konzisztenciája.',
  order: 1,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchA();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Összes Cica', value: `${raw.totalCatsCount} db`, color: 'purple' },
        { label: 'Chippelt', value: `${raw.chippedCatsCount} db`, color: 'blue' },
        { label: 'Ivartalanított', value: `${raw.spayedCatsCount} db`, color: 'rose' },
        { label: 'Egészség Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '💉', label: 'Orvosi bejegyzések', count: `${raw.medicalRecordsCount} db` },
        { icon: '📅', label: 'Eseménynapló rekordok', count: `${raw.totalEventsCount} db` },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchA,
};

export default patchA;
