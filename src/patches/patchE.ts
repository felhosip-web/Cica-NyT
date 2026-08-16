import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchE, validatePatchE } from '../services/patchUpgradeService';

export const patchE: PatchPlugin = {
  id: 'patch_e_tnr_field_v1',
  name: 'Patch E: TNR Kolóniák, Befogási Helyszínek & Ivartalanítási Munkafolyamatok (TNR Field Operations)',
  targetVersion: 'v2.9.0',
  category: 'tnr_field',
  icon: '✂️',
  description: 'TNR nyilvántartások, kolónia-azonosítók, GPS-koordináták, fülcsípési adatok és ivartalanítási orvosi események integrációja.',
  order: 5,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchE();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'TNR Rekordok', value: `${raw.totalTnrRecordsCount} db`, color: 'emerald' },
        { label: 'Kolóniák', value: `${raw.coloniesCount} db`, color: 'teal' },
        { label: 'Ivartalanított', value: `${raw.spayedTnrCount} db`, color: 'blue' },
        { label: 'TNR Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '✂️', label: 'Fülcsípett cicák', count: `${raw.earTippedCount} db` },
        { icon: '📍', label: 'GPS koordinátás', count: `${raw.gpsLocationsCount} db` },
        { icon: '💉', label: 'Orvosi esemény csatolva', count: `${raw.linkedMedicalEventsCount} db` },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchE,
};

export default patchE;
