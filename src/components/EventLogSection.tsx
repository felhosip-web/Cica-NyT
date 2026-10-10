import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { AuditEvent, clearAuditEvents, pruneAuditEvents, logEvent } from '../utils/eventLog';
import { formatAuditDate } from '../utils/audit';
import { CustomSelect } from './CustomSelect';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  auth: { label: 'Hitelesítés & Munkamenet', icon: '🔑' },
  rbac: { label: 'Jogosultságok & Szerepkörök', icon: '🛡️' },
  license: { label: 'Licenckezelés', icon: '📜' },
  cat: { label: 'Állatnyilvántartás', icon: '🐾' },
  finance: { label: 'Pénzügyek & Adó 1%', icon: '💳' },
  inventory: { label: 'Raktár & Leltár', icon: '📦' },
  donation: { label: 'Adománygyűjtések', icon: '🎁' },
  export: { label: 'Adatexportok & Jelentések', icon: '📥' },
  sync: { label: 'Felhő Szinkronizáció', icon: '☁️' },
  system: { label: 'Rendszeresemények', icon: '⚙️' },
  ui: { label: 'Felületi Akciók', icon: '🎨' },
};

export const EventLogSection: React.FC = () => {
  const { getCurrentUser } = useAppStore();
  const currentUser = getCurrentUser();
  const isRoot = currentUser?.roleId === 'root';

  // Live query from Dexie audit_events
  const rawEvents = (useLiveQuery(() => (db.audit_events ? db.audit_events.toArray() : []), []) || []) as AuditEvent[];

  // Filter States
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Clear modal confirm state
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isPruning, setIsPruning] = useState<boolean>(false);

  // Log unauthorized access attempt in useEffect to avoid render side effects
  useEffect(() => {
    if (!isRoot) {
      logEvent({
        category: 'rbac',
        action: 'rbac.denied',
        level: 'warn',
        ok: false,
        summary: `Jogosulatlan hozzáférési kísérlet az Eseménynaplóhoz (${currentUser?.name || 'Ismeretlen'})`,
      }).catch(() => {});
    }
  }, [isRoot, currentUser]);

  // Non-root Access Denied Gate
  if (!isRoot) {
    return (
      <div className="p-6 bg-rose-950/80 text-rose-100 rounded-2xl border border-rose-800 space-y-3 text-center my-4 shadow-lg">
        <div className="w-12 h-12 bg-rose-900 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-rose-700">
          🚫
        </div>
        <h4 className="text-sm font-black text-white">Hozzáférés Megtagadva</h4>
        <p className="text-xs text-rose-200 max-w-md mx-auto leading-relaxed">
          Az audit Eseménynapló megtekintése kizárólag <strong className="underline text-white">ROOT (Főadminisztrátor)</strong> szerepkörrel rendelkező felhasználók számára engedélyezett.
        </p>
      </div>
    );
  }

  // Compute 5 Most Recent Errors for Quick Strip
  const recentErrors = useMemo(() => {
    return rawEvents
      .filter((ev) => ev.level === 'error')
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 5);
  }, [rawEvents]);

  // Filter Logic
  const filteredEvents = useMemo(() => {
    return rawEvents
      .filter((ev) => {
        if (levelFilter !== 'ALL' && ev.level !== levelFilter) return false;
        if (categoryFilter !== 'ALL' && ev.category !== categoryFilter) return false;
        if (startDate && ev.ts < startDate) return false;
        if (endDate && ev.ts > `${endDate}T23:59:59`) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const summaryMatch = ev.summary?.toLowerCase().includes(q);
          const actionMatch = ev.action?.toLowerCase().includes(q);
          const userMatch = ev.userName?.toLowerCase().includes(q);
          const errorMatch = ev.errorMessage?.toLowerCase().includes(q);
          const idMatch = ev.entityId?.toLowerCase().includes(q);
          if (!summaryMatch && !actionMatch && !userMatch && !errorMatch && !idMatch) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [rawEvents, levelFilter, categoryFilter, startDate, endDate, searchQuery]);

  // Export Filtered Audit Log to CSV
  const handleExportCSV = () => {
    if (filteredEvents.length === 0) {
      alert('Nincs exportálható esemény a szűrés alapján!');
      return;
    }

    const headers = [
      'Azonosító',
      'Időbélyeg (ISO)',
      'Szint',
      'Kategória',
      'Akció',
      'Felhasználó ID',
      'Felhasználó Név',
      'Szerepkör',
      'Összefoglaló',
      'Státusz',
      'Hibaüzenet',
      'App Verzió',
      'Részletek (JSON)',
    ];

    const rows = filteredEvents.map((ev) => [
      ev.id,
      ev.ts,
      ev.level,
      ev.category,
      ev.action,
      ev.userId || '',
      `"${(ev.userName || '').replace(/"/g, '""')}"`,
      ev.role || '',
      `"${(ev.summary || '').replace(/"/g, '""')}"`,
      ev.ok ? 'OK' : 'HIBA',
      `"${(ev.errorMessage || '').replace(/"/g, '""')}"`,
      ev.appVersion || '',
      `"${JSON.stringify(ev.details || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CicaNyT_Esemenynaplo_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    logEvent({
      category: 'export',
      action: 'export.event_log',
      summary: `Root felhasználó kiexportálta az audit eseménynaplót (${filteredEvents.length} tétel)`,
    }).catch(() => {});
  };

  // Manual Prune
  const handlePruneOld = async () => {
    setIsPruning(true);
    try {
      await pruneAuditEvents(5000, 90);
      alert('✅ Régi audit események (90 napnál régebbi vagy 5000 feletti) sikeresen eltávolítva!');
    } catch (err: any) {
      alert('❌ Hiba a karbantartás során: ' + err.message);
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* Root Audit Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl border border-purple-500/40 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-800/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-900/80 text-purple-200 border border-purple-700 flex items-center justify-center text-xl font-black shrink-0">
              📜
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Rendszer Eseménynapló (Audit Event Log)</span>
                <span className="text-[10px] bg-purple-900 text-purple-300 font-mono font-bold px-2 py-0.5 rounded-full border border-purple-700">
                  ROOT KIZÁRÓLAGOS
                </span>
              </h4>
              <p className="text-[11px] text-purple-200/80">
                Lényeges műveletek, változások, hibák és biztonsági események strukturált audit naplója
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setLevelFilter(levelFilter === 'error' ? 'ALL' : 'error')}
              className={`px-3 py-1.5 font-extrabold text-[11px] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1 ${
                levelFilter === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-950/80 text-rose-200 border border-rose-700 hover:bg-rose-900'
              }`}
            >
              <span>🔴</span>
              <span>Csak hibák ({rawEvents.filter((e) => e.level === 'error').length})</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-[11px] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>📥</span>
              <span>CSV Export</span>
            </button>
            <button
              onClick={handlePruneOld}
              disabled={isPruning}
              className="px-3 py-1.5 bg-purple-800 hover:bg-purple-700 disabled:opacity-50 text-purple-100 font-bold text-[11px] rounded-xl transition border border-purple-600 cursor-pointer flex items-center gap-1"
            >
              <span>🧹</span>
              <span>Karbantartás (90 nap)</span>
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 font-bold text-[11px] rounded-xl transition border border-rose-700 cursor-pointer flex items-center gap-1"
            >
              <span>🚨</span>
              <span>Összes Kiürítése</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[10px]">
          <div>
            <label className="block text-purple-300 font-bold mb-0.5">🔍 Keresés (Összefoglaló, Akció, Felhasználó):</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szabad szöveges keresés..."
              className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl font-mono focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-purple-300 font-bold mb-0.5">⚡ Szint (Level):</label>
            <CustomSelect
              value={levelFilter}
              onChange={(val) => setLevelFilter(val)}
              options={[
                { value: 'ALL', label: 'Összes szint (info, warn, error)', icon: '🌐' },
                { value: 'info', label: 'INFO (Információs események)', icon: 'ℹ️' },
                { value: 'warn', label: 'WARN (Figyelmeztetések)', icon: '⚠️' },
                { value: 'error', label: 'ERROR (Hibák & Kivételek)', icon: '🔴' },
              ]}
              title="Szint Kiválasztása"
              colorScheme="purple"
              buttonClassName="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs"
            />
          </div>

          <div>
            <label className="block text-purple-300 font-bold mb-0.5">🗄️ Kategória (Category):</label>
            <CustomSelect
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val)}
              options={[
                { value: 'ALL', label: 'Összes kategória', icon: '🌐' },
                ...Object.entries(CATEGORY_LABELS).map(([catKey, info]) => ({
                  value: catKey,
                  label: info.label,
                  icon: info.icon,
                })),
              ]}
              title="Kategória Kiválasztása"
              colorScheme="purple"
              buttonClassName="w-full p-2 bg-slate-950 border border-slate-800 text-slate-200 font-bold text-xs"
            />
          </div>

          <div>
            <label className="block text-purple-300 font-bold mb-0.5">📅 Időszak (Kezdő – Záró):</label>
            <div className="flex gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-1/2 p-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-[10px]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-1/2 p-1.5 bg-slate-950 border border-slate-800 text-slate-200 rounded-xl text-[10px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Errors Compact Strip (Root Quick View) */}
      {recentErrors.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-rose-950 via-slate-900 to-rose-950 text-rose-100 rounded-2xl border border-rose-800/80 shadow-md space-y-2">
          <div className="flex items-center justify-between border-b border-rose-800/60 pb-1.5">
            <span className="font-extrabold text-xs text-rose-200 flex items-center gap-1.5">
              <span>🚨 Utolsó Hibák (Quick View — Legutóbbi {recentErrors.length} hiba)</span>
            </span>
            <button
              onClick={() => setLevelFilter('error')}
              className="text-[10px] text-rose-300 hover:text-white font-bold underline cursor-pointer"
            >
              Összes hiba szűrése ➔
            </button>
          </div>

          <div className="space-y-1.5">
            {recentErrors.map((err) => (
              <div
                key={err.id}
                className="p-2 bg-black/40 rounded-xl border border-rose-900/60 flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-rose-400 font-bold shrink-0">{err.action}</span>
                  <span className="truncate text-rose-100">{err.summary}</span>
                </div>
                <span className="text-[10px] font-mono text-rose-300 shrink-0 font-medium">
                  {formatAuditDate(err.ts)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log Entries List */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 border-b pb-2">
          <span>Strukturált Audit Események ({filteredEvents.length} / {rawEvents.length} tétel)</span>
          {(searchQuery || levelFilter !== 'ALL' || categoryFilter !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setLevelFilter('ALL');
                setCategoryFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-purple-600 hover:underline cursor-pointer font-bold"
            >
              Szűrők alaphelyzetbe
            </button>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed font-medium">
            Nincs a megadott szűrőknek megfelelő audit esemény a naplóban.
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredEvents.map((ev) => {
              const isExpanded = expandedId === ev.id;
              const catInfo = CATEGORY_LABELS[ev.category] || { label: ev.category, icon: '⚡' };

              const levelBadgeClass =
                ev.level === 'error'
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : ev.level === 'warn'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300';

              return (
                <div
                  key={ev.id}
                  className={`p-3 rounded-xl border transition-all ${
                    ev.level === 'error'
                      ? 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50/80 border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border shrink-0 ${levelBadgeClass}`}>
                        {ev.level}
                      </span>

                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 flex items-center gap-2 flex-wrap">
                          <span>{catInfo.icon}</span>
                          <span className="font-black text-purple-900 font-mono text-[11px]">{ev.action}</span>
                          <span>—</span>
                          <span className="truncate">{ev.summary}</span>
                        </div>

                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                          <span>👤 {ev.userName} ({ev.role || 'user'})</span>
                          <span>• 📅 {formatAuditDate(ev.ts)}</span>
                          {ev.entityType && (
                            <span>• 🗄️ {ev.entityType} #{ev.entityId || ''}</span>
                          )}
                          {!ev.ok && <span className="text-rose-600 font-extrabold">• ⚠️ SIKERTELEN</span>}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                      <span className="text-[10px] font-mono text-gray-400">v{ev.appVersion || '2.31.0'}</span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                        className="px-2 py-1 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-mono text-[10px] rounded-lg transition cursor-pointer"
                      >
                        {isExpanded ? '▲ Rejt' : '▼ Részletek'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON Details & Error Message */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-gray-200 space-y-2 animate-in fade-in duration-100">
                      {ev.errorMessage && (
                        <div className="p-2.5 bg-rose-100/80 border border-rose-300 text-rose-900 font-mono text-[10px] rounded-lg">
                          <strong>Hibaüzenet:</strong> {ev.errorMessage}
                        </div>
                      )}

                      {ev.details && Object.keys(ev.details).length > 0 && (
                        <div className="p-2.5 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-lg border border-slate-800 space-y-1">
                          <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                            <span>// JSON Audit Payload (Redaktált):</span>
                            <button
                              onClick={() => navigator.clipboard.writeText(JSON.stringify(ev.details, null, 2))}
                              className="text-purple-300 hover:underline cursor-pointer"
                            >
                              📋 Másolás
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap break-all leading-tight">
                            {JSON.stringify(ev.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clearing All Logs */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 text-center border border-rose-200">
            <span className="text-4xl">🚨</span>
            <h4 className="font-black text-rose-600 text-sm">Audit Napló Teljes Kiürítése</h4>
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              Biztosan törölni szeretnéd az <span className="font-bold underline text-rose-600">ÖSSZES</span> audit eseményt a helyi adatbázisból?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer border border-gray-300"
              >
                Mégse
              </button>
              <button
                onClick={async () => {
                  await clearAuditEvents();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs cursor-pointer shadow-md"
              >
                Igen, Törlés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
