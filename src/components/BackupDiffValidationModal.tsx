import React, { useEffect, useState } from 'react';
import { BackupData } from '../services/googleDriveService';
import {
  compareCurrentStateWithBackup,
  ComparisonResult,
  ItemChangeDetail,
} from '../services/backupComparisonService';

interface BackupDiffValidationModalProps {
  backupData: BackupData;
  backupTitle?: string;
  backupDate?: string;
  syncToSupabase: boolean;
  onToggleSyncToSupabase?: (val: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isRestoring?: boolean;
}

export const BackupDiffValidationModal: React.FC<BackupDiffValidationModalProps> = ({
  backupData,
  backupTitle = 'Mentési Fájl',
  backupDate,
  syncToSupabase,
  onToggleSyncToSupabase,
  onConfirm,
  onCancel,
  isRestoring = false,
}) => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'modified' | 'removed'>('all');
  const [userConfirmedDisclaimer, setUserConfirmedDisclaimer] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function runComparison() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await compareCurrentStateWithBackup(backupData);
        if (isMounted) {
          setComparison(result);
        }
      } catch (err: any) {
        console.error('Failed to compare database with backup:', err);
        if (isMounted) {
          setError(`Hiba az összehasonlítás során: ${err.message || String(err)}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    runComparison();

    return () => {
      isMounted = false;
    };
  }, [backupData]);

  const filteredHighlights = (comparison?.itemHighlights || []).filter((item) => {
    if (activeFilter === 'all') return true;
    return item.type === activeFilter;
  });

  const formattedDate = backupDate
    ? new Date(backupDate).toLocaleString('hu-HU')
    : comparison?.exportDate
    ? new Date(comparison.exportDate).toLocaleString('hu-HU')
    : 'Ismeretlen dátum';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl border border-indigo-100 max-h-[92vh] flex flex-col my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                Mentési Adatbázis Validáció & Különbség-Elemzés
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Tekintsd át a jelenlegi helyi adatbázis és a kiválasztott mentési fájl közötti eltéréseket a visszaállítás előtt.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            ✖
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-indigo-900 animate-pulse">
              Jelenlegi helyi adatbázis és mentési fájl összehasonlítása...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold space-y-2">
            <p className="font-extrabold text-red-900">⚠️ Hiba történt a validáció során:</p>
            <p>{error}</p>
          </div>
        ) : comparison ? (
          <div className="space-y-4 overflow-y-auto pr-1 text-slate-800">

            {/* Metadata Pill Banner */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] font-semibold">Mentés Neve & Dátuma:</span>
                <span className="font-extrabold text-slate-900">{backupTitle}</span>
                <span className="text-slate-500 ml-1">({formattedDate})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-lg font-bold text-[11px]">
                  Jelenlegi Rekordok: {comparison.currentTotalRecords} db
                </span>
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg font-bold text-[11px]">
                  Mentésben: {comparison.backupTotalRecords} db
                </span>
              </div>
            </div>

            {/* Risk Banner */}
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                comparison.riskLevel === 'high'
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : comparison.riskLevel === 'medium'
                  ? 'bg-blue-50/90 border-blue-300 text-blue-950'
                  : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
              }`}
            >
              <h4 className="font-black text-sm flex items-center gap-1.5">
                {comparison.riskTitle}
              </h4>
              <p className="font-medium leading-relaxed opacity-90">
                {comparison.riskDescription}
              </p>
            </div>

            {/* Collection Summary Comparison */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                📊 Kategóriák Szerinti Összehasonlítás:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {comparison.collections.map((col) => {
                  const hasDiff = col.newCount > 0 || col.modifiedCount > 0 || col.removedCount > 0;

                  return (
                    <div
                      key={col.key}
                      className={`p-2.5 rounded-2xl border text-xs space-y-1.5 transition ${
                        col.removedCount > 0
                          ? 'bg-amber-50/40 border-amber-200'
                          : hasDiff
                          ? 'bg-indigo-50/30 border-indigo-200'
                          : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-extrabold text-slate-900">
                        <span className="flex items-center gap-1.5">
                          <span>{col.icon}</span>
                          <span>{col.label}</span>
                        </span>
                        <span
                          className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                            col.netDiff > 0
                              ? 'bg-emerald-100 text-emerald-800'
                              : col.netDiff < 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {col.netDiff > 0 ? `+${col.netDiff}` : col.netDiff}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                        <span>Helyi: <b>{col.currentCount} db</b></span>
                        <span>➔ Mentésben: <b>{col.backupCount} db</b></span>
                      </div>

                      {/* Detail Badges */}
                      <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                        {col.newCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded-md">
                            +{col.newCount} Új
                          </span>
                        )}
                        {col.modifiedCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-900 font-bold rounded-md">
                            ✏️ {col.modifiedCount} Módosul
                          </span>
                        )}
                        {col.removedCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-md">
                            ⚠️ {col.removedCount} Felülíródik
                          </span>
                        )}
                        {!hasDiff && (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-md">
                            Változatlan ({col.unchangedCount} db)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Detailed Item Highlights */}
            {comparison.itemHighlights.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-600">
                    🔎 Részletes Változások Kimutatása ({comparison.itemHighlights.length} elem)
                  </h4>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveFilter('all')}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        activeFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-black' : 'text-slate-600'
                      }`}
                    >
                      Összes
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('new')}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        activeFilter === 'new' ? 'bg-emerald-600 text-white font-black' : 'text-slate-600'
                      }`}
                    >
                      Újak
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('modified')}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        activeFilter === 'modified' ? 'bg-blue-600 text-white font-black' : 'text-slate-600'
                      }`}
                    >
                      Módosulók
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveFilter('removed')}
                      className={`px-2 py-0.5 rounded-lg transition ${
                        activeFilter === 'removed' ? 'bg-amber-600 text-white font-black' : 'text-slate-600'
                      }`}
                    >
                      Felülírtak
                    </button>
                  </div>
                </div>

                <div className="max-h-44 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-2 space-y-1.5 text-xs">
                  {filteredHighlights.length === 0 ? (
                    <p className="text-center text-slate-500 py-3 italic">
                      Nincs megjeleníthető elem ebben a szűrőben.
                    </p>
                  ) : (
                    filteredHighlights.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="p-2 bg-white border border-slate-200 rounded-xl flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[10px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                                item.type === 'new'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.type === 'modified'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-900'
                              }`}
                            >
                              {item.type === 'new' ? '+ Új' : item.type === 'modified' ? '✏️ Módosul' : '⚠️ Felülíródik'}
                            </span>
                            <span className="font-extrabold text-slate-900">{item.title}</span>
                          </div>
                          {item.details && (
                            <p className="text-[11px] text-slate-500 font-medium pl-1">{item.details}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-semibold">{item.collectionLabel}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Supabase Cloud Sync Checkbox */}
            {onToggleSyncToSupabase && (
              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl">
                <label className="flex items-center gap-2 text-xs font-extrabold text-purple-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncToSupabase}
                    onChange={(e) => onToggleSyncToSupabase(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
                  />
                  <span>🔄 A visszaállított adatokat automatikusan szinkronizálja a Supabase felhőbe is</span>
                </label>
              </div>
            )}

            {/* Disclaimer Checkbox if High Risk */}
            {comparison.hasRemovedRecords && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                <label className="flex items-center gap-2 text-xs font-black text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={userConfirmedDisclaimer}
                    onChange={(e) => setUserConfirmedDisclaimer(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>
                    Megerősítem: Megértettem, hogy a helyi adatbázis felülírásra kerül és elfogadom a különbségeket.
                  </span>
                </label>
              </div>
            )}

          </div>
        ) : null}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Mégse
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              isLoading ||
              isRestoring ||
              (comparison?.hasRemovedRecords && !userConfirmedDisclaimer)
            }
            className={`py-2.5 px-5 font-black text-xs text-white rounded-xl shadow-md transition cursor-pointer flex items-center gap-2 ${
              isLoading || (comparison?.hasRemovedRecords && !userConfirmedDisclaimer)
                ? 'bg-slate-300 cursor-not-allowed opacity-60'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-98'
            }`}
          >
            {isRestoring ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Visszaállítás Folyamatban...</span>
              </>
            ) : (
              <>
                <span>📥 Visszaállítás Végrehajtása</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
