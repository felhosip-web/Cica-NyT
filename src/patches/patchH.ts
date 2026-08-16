import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchH, validatePatchH } from '../services/patchUpgradeService';

export const patchH: PatchPlugin = {
  id: 'patch_h_system_integrity_v1',
  name: 'Patch H: Rendszerintegritás, Automatikus Adatmentési Szabályok & Rendszeraudit Modul (System Integrity, Backup & Security Maintenance Patch)',
  targetVersion: 'v2.12.0',
  category: 'system_backup_security',
  icon: '💾',
  description: 'Automatikus biztonsági mentési konfiguráció, audit naplók tömörítése, 9-táblás adatbázis-egészség ellenőrzés és rotációs szabályzat.',
  order: 8,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchH();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Összes DB Rekord', value: `${raw.databaseHealth.totalRecords} db`, color: 'indigo' },
        { label: 'Audit Napló', value: `${raw.totalAuditLogsCount} db`, color: 'purple' },
        { label: 'Mentési Ciklus', value: `${raw.backupFrequencyHours} óra`, color: 'sky' },
        { label: 'Rendszer Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '🐈', label: 'Cicák', count: raw.databaseHealth.tableCounts.cats },
        { icon: '📅', label: 'Események', count: raw.databaseHealth.tableCounts.events },
        { icon: '💰', label: 'Pénzügy', count: raw.databaseHealth.tableCounts.finances },
        { icon: '🏡', label: 'Befogadók', count: raw.databaseHealth.tableCounts.fosterParents },
        { icon: '📦', label: 'Készlet', count: raw.databaseHealth.tableCounts.inventory },
        { icon: '✂️', label: 'TNR', count: raw.databaseHealth.tableCounts.tnrRecords },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchH,
};

export default patchH;
