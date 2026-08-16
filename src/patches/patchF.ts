import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchF, validatePatchF } from '../services/patchUpgradeService';

export const patchF: PatchPlugin = {
  id: 'patch_f_medical_protocols_v1',
  name: 'Patch F: Orvosi Protokollok & Eseménysablonok Integráció (Medical Protocols & Templates)',
  targetVersion: 'v2.10.0',
  category: 'medical_protocols',
  icon: '📋',
  description: 'Protokoll-sablonok, standard orvosi kezelési típusok, kötelező oltási minták és cica eseménynaplók strukturális harmonizációja.',
  order: 6,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const raw = await validatePatchF();
    return {
      isValid: raw.isValid,
      integrityScore: raw.integrityScore,
      metrics: [
        { label: 'Esemény Rekordok', value: `${raw.totalEventsCount} db`, color: 'sky' },
        { label: 'Összesített Költség', value: `${raw.totalEventsCost.toLocaleString('hu-HU')} Ft`, color: 'rose' },
        { label: 'Kész Sablonok', value: `${raw.totalTemplatesCount} db`, color: 'purple' },
        { label: 'Protokoll Index', value: `${raw.integrityScore}%`, color: raw.integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '💉', label: 'Oltási esemény', count: `${raw.vaccinationEventsCount} db` },
        { icon: '🩺', label: 'Kezelési esemény', count: `${raw.treatmentEventsCount} db` },
        { icon: '⚡', label: 'Gyorssablon aktív', count: `${raw.quickTemplatesCount} db` },
      ],
      anomalies: raw.anomalies,
      issuesCount: raw.issuesCount,
      summary: raw.summary,
      details: raw.details,
    };
  },

  run: runPatchF,
};

export default patchF;
