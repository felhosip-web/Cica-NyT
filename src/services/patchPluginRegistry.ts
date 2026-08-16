import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { PatchResult, saveAppliedPatch, getAppliedPatches } from './patchUpgradeService';
import { logAuthAuditEvent } from './authAuditService';

// Dinamikusan beolvasunk minden .ts fájlt a ../patches mappából a Vite import.meta.glob motorjával
const discoveredModules = import.meta.glob<{ default: PatchPlugin; [key: string]: any }>('../patches/*.ts', {
  eager: true,
});

// Dinamikus plugin tároló
const customPluginsMap = new Map<string, PatchPlugin>();

/**
 * Lekéri az összes automatikusan felfedezett és kézzel regisztrált Patch Plugint.
 * A listát az `order` prioritás szerint rendezi.
 */
export const getAllPatchPlugins = (): PatchPlugin[] => {
  const plugins: PatchPlugin[] = [];
  const registeredIds = new Set<string>();

  // 1. Vite által beolvasott modulok
  Object.values(discoveredModules).forEach((mod) => {
    const plugin = mod.default || Object.values(mod).find((val: any) => val && typeof val === 'object' && 'id' in val && 'run' in val);
    if (plugin && plugin.id && !registeredIds.has(plugin.id)) {
      plugins.push(plugin);
      registeredIds.add(plugin.id);
    }
  });

  // 2. Kézzel vagy futásidőben hozzáadott pluginok
  customPluginsMap.forEach((plugin, id) => {
    if (!registeredIds.has(id)) {
      plugins.push(plugin);
      registeredIds.add(id);
    }
  });

  // Rendezés a megadott prioritási sorrend (order) szerint
  return plugins.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
};

/**
 * Megkeres egy plugint az egyedi azonosítója (ID) alapján.
 */
export const getPatchPluginById = (id: string): PatchPlugin | undefined => {
  return getAllPatchPlugins().find((p) => p.id === id);
};

/**
 * Új Plugin futásidejű regisztrációja (pl. dinamikusan letöltött vagy scriptből jövő patch esetén).
 */
export const registerPatchPlugin = (plugin: PatchPlugin): void => {
  if (!plugin.id || typeof plugin.run !== 'function') {
    throw new Error(`Érvénytelen Patch Plugin definíció: ${plugin?.name || 'Névtelen'}`);
  }
  customPluginsMap.set(plugin.id, plugin);
};

/**
 * Lefuttatja az előzetes ellenőrzést egy adott pluginen.
 */
export const validatePatchPlugin = async (id: string): Promise<GenericPatchValidationReport> => {
  const plugin = getPatchPluginById(id);
  if (!plugin) {
    throw new Error(`A(z) '${id}' azonosítójú patch plugin nem található a rendszerben.`);
  }

  if (typeof plugin.validate !== 'function') {
    return {
      isValid: true,
      integrityScore: 100,
      metrics: [{ label: 'Státusz', value: 'Készen áll', color: 'emerald' }],
      anomalies: [],
      issuesCount: 0,
      summary: 'A modul nem definiált egyedi ellenőrzési logikát, futtatásra kész.',
    };
  }

  return await plugin.validate();
};

/**
 * Lefuttat egy konkrét patch plugint, elmenti az eredményt és audit naplózza.
 */
export const runPatchPlugin = async (id: string): Promise<PatchResult> => {
  const plugin = getPatchPluginById(id);
  if (!plugin) {
    throw new Error(`A(z) '${id}' azonosítójú patch plugin nem található a rendszerben.`);
  }

  const startTime = performance.now();
  try {
    const result = await plugin.run();
    saveAppliedPatch(result);
    return result;
  } catch (error: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const failedResult: PatchResult = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.targetVersion,
      appliedAt: new Date().toISOString(),
      success: false,
      recordsAffected: 0,
      details: [`Hiba a patch futtatása során: ${error?.message || 'Ismeretlen kivétel'}`],
      durationMs,
    };
    saveAppliedPatch(failedResult);
    return failedResult;
  }
};

/**
 * Szekvenciálisan lefuttatja az összes regisztrált patch plugint.
 */
export const runAllPatchPlugins = async (
  onProgress?: (progress: number, log: string, currentPluginName?: string) => void
): Promise<{
  results: PatchResult[];
  allSuccess: boolean;
  totalRecordsAffected: number;
  totalDurationMs: number;
}> => {
  const plugins = getAllPatchPlugins();
  const results: PatchResult[] = [];
  let allSuccess = true;
  let totalRecordsAffected = 0;
  const startTime = performance.now();

  for (let i = 0; i < plugins.length; i++) {
    const plugin = plugins[i];
    const progressPercent = Math.round(((i + 1) / plugins.length) * 100);

    if (onProgress) {
      onProgress(progressPercent, `[${i + 1}/${plugins.length}] ${plugin.name} futtatása...`, plugin.name);
    }

    try {
      const res = await runPatchPlugin(plugin.id);
      results.push(res);
      totalRecordsAffected += res.recordsAffected;
      if (!res.success) {
        allSuccess = false;
      }
    } catch (e: any) {
      allSuccess = false;
      results.push({
        id: plugin.id,
        name: plugin.name,
        version: plugin.targetVersion,
        appliedAt: new Date().toISOString(),
        success: false,
        recordsAffected: 0,
        details: [`Kritikus hiba: ${e?.message || 'Ismeretlen hiba'}`],
        durationMs: 0,
      });
    }
  }

  const totalDurationMs = Math.round(performance.now() - startTime);

  // Rendszeraudit bejegyzés a teljes futásról
  logAuthAuditEvent({
    action: 'ROLE_UPDATE',
    target: 'System Dynamic Patch Runner',
    details: `Dinamikus Patch Csomag lefutva (${plugins.length} db plugin): Siker=${allSuccess}, Módosított rekordok=${totalRecordsAffected}, Időtartam=${totalDurationMs}ms`,
  });

  return {
    results,
    allSuccess,
    totalRecordsAffected,
    totalDurationMs,
  };
};
