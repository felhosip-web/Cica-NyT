import React, { useState, useEffect } from 'react';
import { runSystemHealthAudit, SystemAuditReport, AuditCheckResult } from '../utils/systemHealthAudit';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';

export const SystemAuditPanel: React.FC = () => {
  const [report, setReport] = useState<SystemAuditReport | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);
  const [repairLogs, setRepairLogs] = useState<string[]>([]);
  const isRootMode = useAppStore((state) => state.isRootMode);

  const handleRunAudit = async () => {
    setIsRunning(true);
    setRepairLogs([]);
    try {
      const res = await runSystemHealthAudit();
      setReport(res);
    } catch (err: any) {
      console.error('Audit execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    handleRunAudit();
  }, []);

  const handleExportJson = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cica-nyt-system-audit-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyReportText = () => {
    if (!report) return;
    let text = `=========================================\n`;
    text += `CICA-NYT RENDSZER EGÉSZSÉGÜGYI AUDIT RIPORT\n`;
    text += `Dátum: ${new Date(report.timestamp).toLocaleString('hu-HU')}\n`;
    text += `Alkalmazás verzió: v${report.appVersion}\n`;
    text += `Összegzés: ${report.summary.ok} OK, ${report.summary.warn} Figyelmeztetés, ${report.summary.error} Hiba (Összesen ${report.summary.total} teszt)\n`;
    text += `=========================================\n\n`;

    report.results.forEach((r) => {
      const badge = r.status === 'ok' ? '[OK]' : r.status === 'warn' ? '[FIGYELMEZTETÉS]' : '[HIBA]';
      text += `${badge} ${r.categoryLabel} -> ${r.title}\n`;
      text += `   Üzenet: ${r.message}\n`;
      if (r.details) {
        text += `   Részletek: ${JSON.stringify(r.details)}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 3000);
  };

  const handleRunSafeRepair = async () => {
    const logs: string[] = [];
    logs.push('🔍 Biztonságos adatbázis javítás indítása...');

    try {
      const cats = await db.cats.toArray();
      let repairedCount = 0;
      for (const cat of cats) {
        let changed = false;
        const updates: any = {};

        if (cat.oltasok === undefined) { updates.oltasok = []; changed = true; }
        if (cat.kezelesek === undefined) { updates.kezelesek = []; changed = true; }
        if (cat.tesztek === undefined) { updates.tesztek = []; changed = true; }
        if (cat.chipNumber === undefined) { updates.chipNumber = null; changed = true; }
        if (cat.isSpayed === undefined) { updates.isSpayed = false; changed = true; }
        if (cat.hasKiskonyv === undefined) { updates.hasKiskonyv = false; changed = true; }
        if (!cat.status) { updates.status = 'befogott'; changed = true; }

        if (changed) {
          await db.cats.update(cat.id, updates);
          repairedCount++;
        }
      }

      logs.push(`✅ Javítás befejeződött: ${repairedCount} cica rekord bejegyzés korrigálva.`);
      setRepairLogs(logs);
      await handleRunAudit();
    } catch (err: any) {
      logs.push(`❌ Hiba a javítás során: ${err?.message || err}`);
      setRepairLogs(logs);
    }
  };

  const categories = report
    ? Array.from(new Set(report.results.map((r) => r.category)))
    : [];

  const filteredResults = report
    ? report.results.filter((r) => filterCategory === 'all' || r.category === filterCategory)
    : [];

  return (
    <div className="space-y-4 text-xs">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-800/60 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-sm sm:text-base text-indigo-200 flex items-center gap-2">
              <span>🩺</span>
              <span>Belső Rendszer Ellenőrzés & Diagnosztika</span>
            </h4>
            <p className="text-[11px] text-slate-300 font-medium">
              Egykattintásos átfogó egészségügyi teszt az adatbázis, Zustand állapot, Service Worker, licenc és felhő modulokhoz.
            </p>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isRunning}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer flex items-center gap-2 shrink-0 border border-purple-400/40 text-xs"
          >
            {isRunning ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Tesztelés...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Összes teszt futtatása</span>
              </>
            )}
          </button>
        </div>

        {/* Summary Counter Bar */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-indigo-900/80 font-mono text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-indigo-900/60 flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold">Összes Teszt:</span>
              <span className="text-white font-extrabold text-sm">{report.summary.total}</span>
            </div>

            <div className="bg-emerald-950/80 p-2.5 rounded-xl border border-emerald-800/60 flex items-center justify-between">
              <span className="text-emerald-300 text-[10px] uppercase font-bold">✅ Rendben (OK):</span>
              <span className="text-emerald-400 font-extrabold text-sm">{report.summary.ok}</span>
            </div>

            <div className="bg-amber-950/80 p-2.5 rounded-xl border border-amber-800/60 flex items-center justify-between">
              <span className="text-amber-300 text-[10px] uppercase font-bold">⚠️ Figyelem:</span>
              <span className="text-amber-400 font-extrabold text-sm">{report.summary.warn}</span>
            </div>

            <div className="bg-rose-950/80 p-2.5 rounded-xl border border-rose-800/60 flex items-center justify-between">
              <span className="text-rose-300 text-[10px] uppercase font-bold">❌ Hiba:</span>
              <span className="text-rose-400 font-extrabold text-sm">{report.summary.error}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Bar & Category Filter */}
      {report && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3 py-1 rounded-lg font-extrabold text-[11px] transition cursor-pointer ${
                filterCategory === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
              }`}
            >
              Mind ({report.results.length})
            </button>
            {categories.map((cat) => {
              const count = report.results.filter((r) => r.category === cat).length;
              const label = report.results.find((r) => r.category === cat)?.categoryLabel || cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer whitespace-nowrap ${
                    filterCategory === cat
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {/* Export & Repair Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isRootMode && (
              <button
                onClick={handleRunSafeRepair}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-[11px] transition shadow-2xs cursor-pointer flex items-center gap-1"
                title="Automatikusan pótolja az esetleges hiányzó cica mezőket"
              >
                <span>🛠️</span>
                <span>Biztonságos Javítás</span>
              </button>
            )}

            <button
              onClick={handleCopyReportText}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
            >
              {copiedStatus ? '✅ Másolva!' : '📋 Riport Másolása'}
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1"
            >
              <span>📥</span>
              <span>JSON Export</span>
            </button>
          </div>
        </div>
      )}

      {/* Safe Repair Feedback Logs */}
      {repairLogs.length > 0 && (
        <div className="p-3 bg-slate-900 text-green-400 font-mono text-[10px] rounded-xl space-y-1 max-h-28 overflow-y-auto border border-slate-800">
          {repairLogs.map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-2">
        {filteredResults.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border transition-all ${
              item.status === 'ok'
                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                : item.status === 'warn'
                ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                : 'bg-rose-50/90 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-xs text-gray-900">{item.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider bg-white/80 border border-gray-300 text-gray-700">
                    {item.categoryLabel}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed">{item.message}</p>
              </div>

              {/* Status Badge */}
              <span
                className={`px-2.5 py-1 rounded-full font-black text-[10px] tracking-wider uppercase shrink-0 shadow-2xs border ${
                  item.status === 'ok'
                    ? 'bg-emerald-600 text-white border-emerald-500'
                    : item.status === 'warn'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-rose-600 text-white border-rose-500'
                }`}
              >
                {item.status === 'ok' ? '✅ OK' : item.status === 'warn' ? '⚠️ FIGYELEM' : '❌ HIBA'}
              </span>
            </div>

            {/* Expandable Details */}
            {item.details && (
              <details className="mt-2 text-[10px] font-mono">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-bold select-none py-0.5">
                  🔍 Részletes adatok megtekintése...
                </summary>
                <pre className="p-2 mt-1 bg-black/90 text-emerald-400 rounded-lg overflow-x-auto border border-gray-800 leading-tight">
                  {JSON.stringify(item.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
