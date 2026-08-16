import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchD, validatePatchD } from '../services/patchUpgradeService';

export const patchD: PatchPlugin = {
  id: 'patch_d_user_rbac_v1',
  name: 'Patch D: Supabase RBAC, Felhasználói Szerepkörök & Jogosultsági Rendszer (User & RBAC Security)',
  targetVersion: 'v2.8.0',
  category: 'user_rbac',
  icon: '🛡️',
  description: 'Supabase RBAC szerepkörök, jogosultsági mátrix normalizálása, alapértelmezett profilok és biztonsági auditálás.',
  order: 4,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchD();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Felhasználók', value: `${raw.totalUsersCount} db`, color: 'purple' },
        { label: 'Szerepkörök', value: `${raw.rolesCount} db`, color: 'blue' },
        { label: 'Audit Naplók', value: `${raw.auditLogsCount} db`, color: 'slate' },
        { label: 'Biztonsági Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '👑', label: 'Adminisztrátorok', count: `${raw.adminUsersCount} db` },
        { icon: '📊', label: 'Jogosultsági kulcsok', count: `${raw.permissionsCount} db` },
        { icon: '🌐', label: 'Supabase Kapcsolat', count: raw.supabaseConnected ? 'Aktív' : 'Helyi' },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchD,
};

export default patchD;
