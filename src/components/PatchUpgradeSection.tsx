import React, { useState, useEffect } from 'react';
import {
  getAllPatchPlugins,
  validatePatchPlugin,
  runPatchPlugin,
  runAllPatchPlugins,
} from '../services/patchPluginRegistry';
import { getAppliedPatches, PatchResult } from '../services/patchUpgradeService';
import { PatchPlugin, GenericPatchValidationReport } from '../types/patchPlugin';
import { APP_VERSION } from '../version';
import { useAppStore } from '../store/useAppStore';

export const PatchUpgradeSection: React.FC = () => {
  const { addDebugLog } = useAppStore();
  const [plugins, setPlugins] = useState<PatchPlugin[]>([]);
  const [appliedPatches, setAppliedPatches] = useState<Record<string, PatchResult>>({});
  const [runningPatchId, setRunningPatchId] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [lastActionResult, setLastActionResult] = useState<{
    success: boolean;
    message: string;
    affected: number;
  } | null>(null);

  // Modal dialog states
  const [modalTarget, setModalTarget] = useState<PatchPlugin | 'all' | null>(null);
  const [activeReport, setActiveReport] = useState<GenericPatchValidationReport | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    refreshPatches();
  }, []);

  const refreshPatches = () => {
    const loadedPlugins = getAllPatchPlugins();
    setPlugins(loadedPlugins);
    setAppliedPatches(getAppliedPatches());
  };

  const handleOpenModal = async (target: PatchPlugin | 'all') => {
    setModalTarget(target);
    setActiveReport(null);

    if (target !== 'all') {
      setIsValidating(true);
      try {
        const report = await validatePatchPlugin(target.id);
        setActiveReport(report);
      } catch (e: any) {
        console.error(`Failed to validate patch ${target.id}:`, e);
      } finally {
        setIsValidating(false);
      }
    }
  };

  const handleCloseModal = () => {
    setModalTarget(null);
    setActiveReport(null);
  };

  const handleConfirmAndRun = async () => {
    const target = modalTarget;
    handleCloseModal();
    if (!target) return;

    if (target === 'all') {
      await executeRunAll();
    } else {
      await executeRunSinglePatch(target.id);
    }
  };

  const executeRunSinglePatch = async (patchId: string) => {
    setRunningPatchId(patchId);
    setConsoleLogs((prev) => [`⏳ [${new Date().toLocaleTimeString()}] Patch (${patchId}) indítása...`, ...prev]);
    addDebugLog(`[Patch] Patch futtatása kezdeményezve: ${patchId}`);

    try {
      const result = await runPatchPlugin(patchId);

      refreshPatches();
      setConsoleLogs((prev) => [
        `🏁 [${new Date().toLocaleTimeString()}] ${result.name} befejeződött: ${result.success ? '✅ SIKERES' : '❌ HIBA'} (${result.recordsAffected} rekord, ${result.durationMs}ms)`,
        ...result.details,
        ...prev,
      ]);

      setLastActionResult({
        success: result.success,
        message: `${result.name} sikeresen lefutott!`,
        affected: result.recordsAffected,
      });
      addDebugLog(`[Patch Kész] ${result.name} - Érintett rekordok: ${result.recordsAffected}`);
    } catch (err: any) {
      setConsoleLogs((prev) => [`❌ [${new Date().toLocaleTimeString()}] Váratlan hiba: ${err.message}`, ...prev]);
      setLastActionResult({
        success: false,
        message: `Hiba: ${err.message}`,
        affected: 0,
      });
    } finally {
      setRunningPatchId(null);
    }
  };

  const executeRunAll = async () => {
    setRunningPatchId('all');
    setConsoleLogs((prev) => [
      `🚀 [${new Date().toLocaleTimeString()}] Teljes átfogó patch upgrade indítása (${plugins.length} db aktív modul)...`,
      ...prev,
    ]);
    addDebugLog('[Patch All] Teljes átfogó dinamikus patch upgrade elindítva');

    try {
      const { results, allSuccess, totalRecordsAffected, totalDurationMs } = await runAllPatchPlugins(
        (progress, log) => {
          setConsoleLogs((prev) => [`[${progress}%] ${log}`, ...prev]);
        }
      );

      refreshPatches();

      const allDetails: string[] = [];
      results.forEach((r) => {
        allDetails.push(`🔹 ${r.name}: ${r.success ? '✅ Siker' : '❌ Hiba'} (${r.recordsAffected} rekord)`);
        allDetails.push(...r.details);
      });

      setConsoleLogs((prev) => [
        `🎉 [${new Date().toLocaleTimeString()}] Összes patch lefutott (${totalDurationMs}ms)! Eredmény: ${allSuccess ? '✅ MIND SIKERES' : '⚠️ VOLT HIBA'} (Összesen ${totalRecordsAffected} rekord módosult/javult)`,
        ...allDetails,
        ...prev,
      ]);

      setLastActionResult({
        success: allSuccess,
        message: allSuccess
          ? `Minden patch sikeresen lefutott! Összesen ${totalRecordsAffected} adatbázis rekord frissült és lett verifikálva.`
          : 'A patchek egy része hibával tért vissza, kérjük ellenőrizd a naplót!',
        affected: totalRecordsAffected,
      });
      addDebugLog(`[Patch All Kész] Összes patch lefutott. Módosult: ${totalRecordsAffected}`);
    } catch (err: any) {
      setConsoleLogs((prev) => [`❌ [${new Date().toLocaleTimeString()}] Globális hiba: ${err.message}`, ...prev]);
      setLastActionResult({
        success: false,
        message: `Hiba a teljes futtatás során: ${err.message}`,
        affected: 0,
      });
    } finally {
      setRunningPatchId(null);
    }
  };

  const appliedCount = Object.keys(appliedPatches).length;
  const isFullyPatched = plugins.length > 0 && appliedCount >= plugins.length;

  const getMetricColorClasses = (color?: string) => {
    switch (color) {
      case 'purple':
        return 'bg-purple-50 border-purple-200 text-purple-950';
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-950';
      case 'rose':
        return 'bg-rose-50 border-rose-200 text-rose-950';
      case 'amber':
        return 'bg-amber-50 border-amber-200 text-amber-950';
      case 'emerald':
        return 'bg-emerald-50 border-emerald-300 text-emerald-950';
      case 'sky':
        return 'bg-sky-50 border-sky-200 text-sky-950';
      case 'teal':
        return 'bg-teal-50 border-teal-200 text-teal-950';
      case 'indigo':
        return 'bg-indigo-50 border-indigo-200 text-indigo-950';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-950';
    }
  };

  const getCategoryIcon = (category: string, customIcon?: string) => {
    if (customIcon) return customIcon;
    switch (category) {
      case 'animal_core':
        return '🐈';
      case 'foster_finance':
        return '🏡';
      case 'cost_financial':
        return '💰';
      case 'user_rbac':
        return '🛡️';
      case 'tnr_field':
        return '✂️';
      case 'medical_protocols':
        return '📋';
      case 'inventory_warehouse':
        return '📦';
      case 'system_backup_security':
        return '💾';
      case 'adoption_contracts':
        return '📜';
      case 'connected_elements':
        return '🔗';
      default:
        return '🧩';
    }
  };

  return (
    <div className="space-y-4 text-gray-800">
      {/* Overview Banner */}
      <div className="p-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-purple-500/40 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-800/80 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-xl shrink-0">
              🧩
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Moduláris Plugin Patch & Upgrade Rendszer</span>
                <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                  v{APP_VERSION}
                </span>
              </h3>
              <p className="text-[11px] text-purple-200">
                Dinamikus plugin-alapú adatbázis sémakorrekciók, diagnosztikai előzetes vizsgálatok és adatintegritás.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold border ${
                isFullyPatched
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-amber-950 text-amber-300 border-amber-700'
              }`}
            >
              {isFullyPatched ? '✅ Minden Patch Telepítve' : `⚠️ Telepítve: ${appliedCount}/${plugins.length}`}
            </span>
          </div>
        </div>

        {/* System Version KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-900/60 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-purple-300 font-bold block">Applikáció Verzió</span>
            <span className="text-sm font-black text-purple-100">v{APP_VERSION}</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-900/60 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-sky-300 font-bold block">Plugin Architektúra</span>
            <span className="text-sm font-black text-sky-100">Vite Glob Native</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-900/60 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-amber-300 font-bold block">Felfedezett Modulok</span>
            <span className="text-sm font-black text-amber-100">{plugins.length} db aktív</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-purple-900/60 space-y-0.5">
            <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold block">Alkalmazott Patchek</span>
            <span className="text-sm font-black text-emerald-100">{appliedCount} db lefutott</span>
          </div>
        </div>

        {/* Master Action Button */}
        <div className="pt-1">
          <button
            type="button"
            disabled={runningPatchId !== null}
            onClick={() => handleOpenModal('all')}
            className="w-full py-2.5 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 border border-white/20"
          >
            {runningPatchId === 'all' ? (
              <>
                <span className="animate-spin text-sm">⏳</span>
                <span>Összes Patch Végrehajtása & Verifikálása...</span>
              </>
            ) : (
              <>
                <span>🚀</span>
                <span>Minden Patch Futtatása és Adatintegritás Verifikálása ({plugins.length} db Modul)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {lastActionResult && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
            lastActionResult.success
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{lastActionResult.success ? '🎉' : '❌'}</span>
            <span>{lastActionResult.message}</span>
            {lastActionResult.affected > 0 && (
              <span className="bg-white/80 px-2 py-0.5 rounded-md text-[10px] font-black">
                +{lastActionResult.affected} rekord módosult
              </span>
            )}
          </div>
          <button
            onClick={() => setLastActionResult(null)}
            className="text-gray-500 hover:text-gray-800 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dynamic Patch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {plugins.map((patch) => {
          const applied = appliedPatches[patch.id];
          const isRunning = runningPatchId === patch.id || runningPatchId === 'all';
          const icon = getCategoryIcon(patch.category, patch.icon);

          return (
            <div
              key={patch.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                applied
                  ? 'bg-white border-emerald-300 shadow-xs'
                  : 'bg-white border-gray-200 shadow-xs hover:border-purple-300'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">{icon}</span>
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-xs leading-snug">{patch.name}</h4>
                      <span className="text-[10px] font-mono text-purple-700 font-bold">{patch.targetVersion}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                      applied
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {applied ? '✅ Kész' : '⚠️ Várakozik'}
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 leading-relaxed">{patch.description}</p>

                {applied && (
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[10px] text-slate-700 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Lefutva:</span>
                      <span className="font-bold">
                        {new Date(applied.appliedAt).toLocaleDateString('hu-HU')}{' '}
                        {new Date(applied.appliedAt).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Módosult:</span>
                      <span className="font-bold text-emerald-700">{applied.recordsAffected} rekord</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Futásidő:</span>
                      <span>{applied.durationMs} ms</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => handleOpenModal(patch)}
                  className={`w-full py-2 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs ${
                    applied
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Futtatás...</span>
                    </>
                  ) : (
                    <>
                      <span>{applied ? '🔄 Újrafuttatás & Ellenőrzés' : '⚡ Patch Futtatása'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Patch Terminal / Console Output */}
      <div className="p-3.5 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h4 className="font-extrabold text-[11px] text-purple-300 uppercase tracking-wider">
              🖥️ Patch Upgrade Futási Konzol & Részletes Napló
            </h4>
          </div>
          {consoleLogs.length > 0 && (
            <button
              onClick={() => setConsoleLogs([])}
              className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer font-sans"
            >
              🧹 Napló törlése
            </button>
          )}
        </div>

        <div className="bg-black/90 p-3 rounded-xl max-h-48 overflow-y-auto space-y-1 text-[11px] border border-slate-900">
          {consoleLogs.length === 0 ? (
            <p className="text-slate-500 italic">
              A patch műveletek részletes lépései és visszaigazolásai itt fognak megjelenni valós időben. Kattints a "Minden Patch Futtatása" vagy bármelyik egyedi modulra az előzetes diagnosztika megnyitásához!
            </p>
          ) : (
            consoleLogs.map((log, i) => (
              <div
                key={i}
                className={`leading-relaxed ${
                  log.includes('❌')
                    ? 'text-rose-400 font-bold'
                    : log.includes('✅') || log.includes('🎉')
                    ? 'text-emerald-400 font-bold'
                    : log.includes('🚀') || log.includes('🏁')
                    ? 'text-purple-300 font-bold'
                    : 'text-slate-300'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* DYNAMIC CONFIRMATION & PRE-FLIGHT INSPECTION MODAL */}
      {modalTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-4 text-white flex items-center justify-between border-b border-purple-800/80">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">
                  {modalTarget === 'all' ? '🚀' : getCategoryIcon(modalTarget.category, modalTarget.icon)}
                </span>
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {modalTarget === 'all' ? 'Minden Patch Futtatása & Adatbázis Verifikáció' : modalTarget.name}
                  </h3>
                  <p className="text-[11px] text-purple-200">
                    {modalTarget === 'all'
                      ? `Teljes átfogó adatintegritás, séma és jogosultság-normalizálás (${plugins.length} db modul)`
                      : `Célverzió: ${modalTarget.targetVersion}`}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {modalTarget === 'all' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-950 space-y-1">
                    <div className="font-extrabold flex items-center gap-1.5 text-purple-900">
                      <span>✨</span>
                      <span>Mit tartalmaz az átfogó frissítés?</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-purple-800">
                      A rendszer szekvenciálisan egymás után lefuttatja mind a {plugins.length} regisztrált patch plugint, ellenőrzi és normalizálja az összes tábla rekordjait, és megerősíti a relációs kapcsolatokat.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-[11px] font-black text-gray-700 uppercase tracking-wider">
                      Végrehajtásra kerülő modulok listája ({plugins.length} db):
                    </h5>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {plugins.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-purple-600 font-bold">#{idx + 1}</span>
                            <span>{getCategoryIcon(p.category, p.icon)}</span>
                            <span className="font-extrabold text-gray-900">{p.name}</span>
                          </div>
                          <span className="font-mono text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                            {p.targetVersion}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start gap-2">
                    <span className="text-base">🛡️</span>
                    <div>
                      <span className="font-extrabold block">Adatbiztonsági Garancia</span>
                      <span>A folyamat biztonságos, meglévő rekordokat nem töröl, csak a hiányzó mezőket pótolja és a számszaki formátumokat egységesíti.</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1 text-slate-800">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>📌</span>
                      <span>Patch Leírás & Célkitűzés</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{modalTarget.description}</p>
                  </div>

                  {/* Universal Dynamic Pre-flight Inspection Section */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[11px] font-black text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🔍</span>
                        <span>Előzetes Modul Diagnosztika & Integritás Vizsgálat</span>
                      </h5>
                      {isValidating && (
                        <span className="text-[10px] font-mono text-purple-600 animate-pulse">Diagnosztika fut...</span>
                      )}
                    </div>

                    {activeReport && (
                      <div className="space-y-2">
                        {/* Dynamic Metrics Grid */}
                        {activeReport.metrics && activeReport.metrics.length > 0 && (
                          <div className={`grid grid-cols-${Math.min(activeReport.metrics.length, 4)} gap-2 text-center text-xs font-mono`}>
                            {activeReport.metrics.map((m, idx) => (
                              <div
                                key={idx}
                                className={`p-2 rounded-xl border ${getMetricColorClasses(m.color)}`}
                              >
                                <span className="text-[10px] font-bold block opacity-80">{m.label}</span>
                                <span className="font-black text-sm">{m.value}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dynamic Sub-metrics Breakdown Pills */}
                        {activeReport.subMetrics && activeReport.subMetrics.length > 0 && (
                          <div className="p-2 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-mono grid grid-cols-2 sm:grid-cols-3 gap-1 text-center">
                            {activeReport.subMetrics.map((sm, idx) => (
                              <div key={idx} className="p-1 bg-white rounded border border-slate-200 text-slate-700">
                                {sm.icon} {sm.label}: <span className="font-bold text-slate-900">{sm.count}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dynamic Anomalies / Consistency Warnings */}
                        <div className="p-3 bg-white border border-gray-200 rounded-2xl space-y-1.5 text-xs">
                          <span className="text-[11px] font-extrabold text-gray-800 block">
                            {activeReport.anomalies && activeReport.anomalies.length === 0
                              ? '✅ Nincsenek strukturális hibák vagy hiányzó mezők'
                              : `⚠️ Észlelt és javítandó pontok (${activeReport.anomalies.length} db):`}
                          </span>

                          {activeReport.anomalies && activeReport.anomalies.length === 0 ? (
                            <p className="text-[11px] text-emerald-700">{activeReport.summary}</p>
                          ) : (
                            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                              {activeReport.anomalies.map((anom, idx) => (
                                <div
                                  key={idx}
                                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-start gap-1.5"
                                >
                                  <span className="shrink-0">
                                    {anom.severity === 'high' ? '🚨' : anom.severity === 'medium' ? '⚠️' : 'ℹ️'}
                                  </span>
                                  <span className="text-gray-700">{anom.description}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* General safety banner */}
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-[11px] text-purple-900 flex items-start gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <span className="font-extrabold block">Mit tesz a végrehajtás gombra kattintva?</span>
                      <span>
                        Lefuttatja az adatbázis-rekordok sémanormalizálását és menti a verziókövetési naplót.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-extrabold text-xs rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleConfirmAndRun}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>⚡</span>
                <span>Frissítés Jóváhagyása és Futtatása</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
