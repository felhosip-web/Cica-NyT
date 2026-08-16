import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchC, validatePatchC } from '../services/patchUpgradeService';

export const patchC: PatchPlugin = {
  id: 'patch_c_cost_financial_v1',
  name: 'Patch C: Pénzügyi & Költségelszámolási Modul (Cat Cost & Financial Ledger Audit)',
  targetVersion: 'v2.8.0',
  category: 'cost_financial',
  icon: '💰',
  description: 'Egyedi orvosi költségek és a pénzügyi főkönyv összevetése, devizakódok egységesítése és számszaki auditja.',
  order: 3,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchC();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Auditált Cicák', value: `${raw.auditedCatsCount} db`, color: 'indigo' },
        { label: 'Kiadások (Ft)', value: raw.totalCalculatedExpense.toLocaleString('hu-HU'), color: 'rose' },
        { label: 'Bevételek (Ft)', value: raw.totalCalculatedIncome.toLocaleString('hu-HU'), color: 'emerald' },
        { label: 'Pénzügyi Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '🩺', label: 'Orvosi költséges cica', count: `${raw.catsWithMedicalCostsCount} db` },
        { icon: '🔗', label: 'Cica főkönyv', count: `${raw.linkedFinancesCount} db` },
        { icon: '🏢', label: 'Általános főkönyv', count: `${raw.unlinkedFinancesCount} db` },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchC,
};

export default patchC;
