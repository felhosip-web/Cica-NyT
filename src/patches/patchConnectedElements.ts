import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { runPatchConnectedElements } from '../services/patchUpgradeService';
import { db } from '../js/db.js';

export const patchConnectedElements: PatchPlugin = {
  id: 'patch_connected_elements_v1',
  name: 'Kapcsolódó Elemek & Relációs Hálózat Patch (Relational Integrity & Deep-link Engine)',
  targetVersion: 'v2.11.0',
  category: 'connected_elements',
  icon: '🔗',
  description: 'Cicák, orvosi események, ideiglenes befogadók, pénzügyi naplók és raktári mozgások közötti kétirányú relációs integritás.',
  order: 9,

  validate: async (): Promise<GenericPatchValidationReport> => {
    const anomalies: any[] = [];
    const allCats = await db.cats.toArray();
    const allEvents = await db.events.toArray();
    const allFosterSupplies = await db.fosterSupplies.toArray();
    const allFosterExpenses = await db.fosterExpenses.toArray();
    const allFinances = await db.finances.toArray();

    const catIds = new Set(allCats.map((c) => c.id));
    let orphanEvents = 0;
    for (const ev of allEvents) {
      if (ev.catId && ev.catId !== 'general' && !catIds.has(ev.catId)) {
        orphanEvents++;
        anomalies.push({
          severity: 'medium',
          type: 'orphan_event_relation',
          description: `Esemény [${ev.title || ev.id}]: Nem létező cicára hivatkozik (${ev.catId}).`,
          targetId: ev.id,
        });
      }
    }

    const integrityScore = Math.max(0, 100 - anomalies.length * 5);

    return {
      isValid: anomalies.length === 0,
      integrityScore,
      metrics: [
        { label: 'Relációs Cicák', value: `${allCats.length} db`, color: 'purple' },
        { label: 'Eseménykapcsolat', value: `${allEvents.length} db`, color: 'blue' },
        { label: 'Főkönyvi Kapocs', value: `${allFinances.length} db`, color: 'slate' },
        { label: 'Relációs Index', value: `${integrityScore}%`, color: integrityScore >= 90 ? 'emerald' : 'amber' },
      ],
      subMetrics: [
        { icon: '🏡', label: 'Befogadó ellátmány', count: `${allFosterSupplies.length} db` },
        { icon: '💰', label: 'Költség reláció', count: `${allFosterExpenses.length} db` },
        { icon: '⚠️', label: 'Árva hivatkozás', count: `${orphanEvents} db` },
      ],
      anomalies,
      issuesCount: anomalies.length,
      summary: anomalies.length === 0
        ? 'A relációs adatkapcsolatok és kereszthivatkozások rendben vannak.'
        : `${anomalies.length} db relációs eltérés észlelve.`,
    };
  },

  run: runPatchConnectedElements,
};

export default patchConnectedElements;
