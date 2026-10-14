import React, { useState, useEffect } from 'react';
import { getTombstonedItems, purgeTombstones, TombstoneItem, PurgeResult } from '../utils/softDelete';
import { useAppStore } from '../store/useAppStore';

export const TombstonePurgePanel: React.FC = () => {
  const [tombstones, setTombstones] = useState<TombstoneItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIds, setSelectedIds] = useState<Record<string, any[]>>({});
  const [maxAgeDays, setMaxAgeDays] = useState<number>(90);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);
  const [purgeResult, setPurgeResult] = useState<PurgeResult | null>(null);

  const isRootMode = useAppStore((state) => state.isRootMode);

  const loadTombstones = async () => {
    setLoading(true);
    try {
      const items = await getTombstonedItems();
      setTombstones(items);
    } catch (e) {
      console.error('[TombstonePurgePanel] Error loading tombstones:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTombstones();
  }, []);

  const toggleSelectItem = (tableName: string, id: any) => {
    setSelectedIds((prev) => {
      const currentTableIds = prev[tableName] || [];
      if (currentTableIds.includes(id)) {
        return { ...prev, [tableName]: currentTableIds.filter((x) => x !== id) };
      } else {
        return { ...prev, [tableName]: [...currentTableIds, id] };
      }
    });
  };

  const selectedTotalCount = Object.values(selectedIds).reduce((acc, list) => acc + list.length, 0);

  const handleRunPurge = async (useSelectedOnly = false) => {
    setIsPurging(true);
    setPurgeResult(null);
    try {
      let res: PurgeResult;
      if (useSelectedOnly && selectedTotalCount > 0) {
        res = await purgeTombstones({ specificIds: selectedIds });
      } else {
        res = await purgeTombstones({ maxAgeDays });
      }
      setPurgeResult(res);
      setSelectedIds({});
      await loadTombstones();
    } catch (err: any) {
      console.error('Purge error:', err);
    } finally {
      setIsPurging(false);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="space-y-4 text-xs font-semibold">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl border border-rose-800/60 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-sm sm:text-base text-rose-200 flex items-center gap-2">
              <span>🗑️</span>
              <span>Törölt Elemek & Tombstone Karbantartás (Purge)</span>
            </h4>
            <p className="text-[11px] text-slate-300 font-medium">
              Lágyan törölt (soft-deleted) elemek megtekintése, helyreállítása és végleges fizikai eltávolítása (Purge) az adatbázisból és felhőből.
            </p>
          </div>

          <button
            onClick={loadTombstones}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 border border-slate-700 text-xs"
          >
            <span>🔄</span>
            <span>Frissítés</span>
          </button>
        </div>

        {/* Status Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-rose-900/80 font-mono text-xs">
          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-900/60 flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">🗑️ Törölt elemek száma:</span>
            <span className="text-rose-400 font-extrabold text-sm">{tombstones.length} db</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-900/60 flex items-center justify-between">
            <span className="text-slate-400 text-[10px] uppercase font-bold">☑️ Kijelölve ürítésre:</span>
            <span className="text-amber-400 font-extrabold text-sm">{selectedTotalCount} db</span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-900/60 flex items-center justify-between col-span-2 sm:col-span-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold">👑 Hozzáférés:</span>
            <span className={`font-extrabold text-xs px-2 py-0.5 rounded ${isRootMode ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'}`}>
              {isRootMode ? 'Root Főadmin' : 'Korlátozott'}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar for Purge */}
      {isRootMode && (
        <div className="p-3 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-amber-950 font-black text-xs">A megőrzési időkorlát (napok):</label>
              <select
                value={maxAgeDays}
                onChange={(e) => setMaxAgeDays(Number(e.target.value))}
                className="p-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold"
              >
                <option value={90}>90 napnál régebbi tombstones</option>
                <option value={30}>30 napnál régebbi tombstones</option>
                <option value={14}>14 napnál régebbi tombstones</option>
                <option value={0}>Összes lágyan törölt elem (0 nap)</option>
              </select>
            </div>

            <div className="flex gap-2">
              {selectedTotalCount > 0 && (
                <button
                  type="button"
                  onClick={() => handleRunPurge(true)}
                  disabled={isPurging}
                  className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>🔥</span>
                  <span>Kijelöltek törlése ({selectedTotalCount} db)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isPurging || tombstones.length === 0}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>⚠️</span>
                <span>Régi elemek végleges ürítése (Purge)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Result Feedback */}
      {purgeResult && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1 text-emerald-950 text-xs">
          <p className="font-extrabold flex items-center gap-1.5">
            <span>✅</span> Végleges törlés (Purge) sikeresen lefutott!
          </p>
          <p className="font-medium">
            Összesen <span className="font-bold">{purgeResult.totalPurged} db</span> rekord véglegesen eltávolítva ({purgeResult.remotePurged} felhő rekorddal együtt).
          </p>
          {purgeResult.errors.length > 0 && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-[11px] font-mono">
              ⚠️ Figyelmeztetések / Hibalista: {purgeResult.errors.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Tombstones List Table */}
      {loading ? (
        <div className="p-8 text-center text-gray-500 font-bold">Törölt elemek betöltése...</div>
      ) : tombstones.length === 0 ? (
        <div className="p-8 text-center text-emerald-700 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-1">
          <div className="text-2xl">✨</div>
          <div className="font-extrabold text-sm">Nincsenek lágyan törölt (tombstoned) elemek</div>
          <div className="text-xs text-emerald-600 font-medium">Az adatbázis teljesen tiszta, nem tartalmaz törölt sorokat.</div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-800 font-black uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Típus</th>
                  <th className="p-3">Megnevezés / Elem</th>
                  <th className="p-3">Törlés Dátuma</th>
                  <th className="p-3">Törölte</th>
                  <th className="p-3">Szinkron Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {tombstones.map((item, idx) => {
                  const tableKey = item.tableName;
                  const isChecked = selectedIds[tableKey]?.includes(item.id) || false;
                  return (
                    <tr key={`${item.tableName}_${item.id}`} className="hover:bg-rose-50/40 transition">
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectItem(item.tableName, item.id)}
                          className="w-4 h-4 text-rose-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-300">
                          {item.tableLabel}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900">{item.title}</td>
                      <td className="p-3 font-mono text-[11px]">
                        {new Date(item.deletedAt).toLocaleString('hu-HU')}
                      </td>
                      <td className="p-3 text-slate-600">{item.deletedBy}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${item.syncStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {item.syncStatus === 'pending' ? '⏳ Feltöltésre vár' : '☁️ Szinkronizálva'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto font-black">
              ⚡
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                BIZTOSAN VÉGLEG TÖRÖLNI SZERETNÉD?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                A kiválasztott <span className="font-extrabold text-red-600">{maxAgeDays > 0 ? `${maxAgeDays} napnál régebbi` : 'összes'}</span> tombstoned rekord <span className="font-bold underline text-red-700">fizikailag véglegesen törlődni fog</span> a helyi IndexedDB adatbázisból és a felhőből handles!
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-semibold text-center">
              <p className="font-bold">⚡ Ez a művelet nem vonható vissza!</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isPurging}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition text-xs cursor-pointer border border-gray-300"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={() => handleRunPurge(false)}
                disabled={isPurging}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isPurging ? 'Ürítés...' : 'Igen, Végleges Purge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
