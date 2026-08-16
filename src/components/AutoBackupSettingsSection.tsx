import React, { useState, useEffect } from 'react';
import { BackupDiffValidationModal } from './BackupDiffValidationModal';
import { BackupData } from '../services/googleDriveService';
import {
  AutoBackupConfig,
  AutoBackupRecord,
  getAutoBackupConfig,
  saveAutoBackupConfig,
  runAutoBackupProcess,
  getAutoBackupRecords,
  deleteAutoBackupRecord,
  clearAllAutoBackupRecords,
  restoreAutoBackupRecord,
  downloadAutoBackupFile,
  getDatabaseSignature,
} from '../services/autoBackupEngine';
import { generateSqlDump } from '../services/sqlExportService';
import { CustomSelect } from './CustomSelect';

interface AutoBackupSettingsSectionProps {
  onRefreshLocalCounts?: () => void;
}

export const AutoBackupSettingsSection: React.FC<AutoBackupSettingsSectionProps> = ({
  onRefreshLocalCounts,
}) => {
  const [config, setConfig] = useState<AutoBackupConfig>(getAutoBackupConfig());
  const [records, setRecords] = useState<AutoBackupRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Restore Modal State
  const [selectedRecordToRestore, setSelectedRecordToRestore] = useState<AutoBackupRecord | null>(null);
  const [syncToSupabaseOnRestore, setSyncToSupabaseOnRestore] = useState<boolean>(true);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Clear all modal state
  const [confirmClearAllModal, setConfirmClearAllModal] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const recs = await getAutoBackupRecords();
      setRecords(recs);
    } catch (e) {
      console.error('Hiba a mentési pontok betöltésekor:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      setConfig(getAutoBackupConfig());
      loadData();
    };

    window.addEventListener('cica-autobackup-updated', handleUpdate);
    window.addEventListener('cica-autobackup-config-changed', handleUpdate);

    return () => {
      window.removeEventListener('cica-autobackup-updated', handleUpdate);
      window.removeEventListener('cica-autobackup-config-changed', handleUpdate);
    };
  }, []);

  const handleConfigChange = (key: keyof AutoBackupConfig, value: any) => {
    const updated = saveAutoBackupConfig({ [key]: value });
    setConfig(updated);
  };

  const handleRunBackupNow = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await runAutoBackupProcess('manual');
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        await loadData();
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Mentési hiba: ${err.message || String(err)}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantSqlDownload = async () => {
    try {
      const { backupData } = await getDatabaseSignature();
      const sqlDump = generateSqlDump(backupData);
      const dateStr = new Date().toISOString().slice(0, 10) + '_' + new Date().toISOString().slice(11, 16).replace(':', '');
      const blob = new Blob([sqlDump], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cica_nyt_database_export_${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Hiba az SQL mentés generálásakor: ${e.message}`);
    }
  };

  const handleInstantJsonDownload = async () => {
    try {
      const { backupData } = await getDatabaseSignature();
      const dateStr = new Date().toISOString().slice(0, 10) + '_' + new Date().toISOString().slice(11, 16).replace(':', '');
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cica_nyt_database_export_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`Hiba a JSON mentés generálásakor: ${e.message}`);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedRecordToRestore) return;
    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const result = await restoreAutoBackupRecord(selectedRecordToRestore, {
        syncToSupabase: syncToSupabaseOnRestore,
      });

      if (onRefreshLocalCounts) onRefreshLocalCounts();

      let msg = `✅ Sikeres visszaállítás! Helyreállítva: ${result.restoredCounts.cats || 0} macska, ${result.restoredCounts.events || 0} esemény, ${result.restoredCounts.tnr || 0} TNR rekord.`;
      if (result.supabaseSynced) {
        msg += ' (Supabase felhő adatbázis is frissítve lett)';
      }
      setStatusMessage({ type: 'success', text: msg });
      setSelectedRecordToRestore(null);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Hiba a visszaállítás során: ${err.message || String(err)}` });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDeleteRecord = async (id?: number) => {
    if (!id) return;
    await deleteAutoBackupRecord(id);
    await loadData();
  };

  const handleClearAll = async () => {
    await clearAllAutoBackupRecords();
    await loadData();
    setConfirmClearAllModal(false);
    setStatusMessage({ type: 'info', text: 'Az összes helyi mentési pont törölve lett.' });
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Status banner message */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between gap-2 shadow-xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-500 hover:text-slate-800 font-black cursor-pointer px-1.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Dashboard Card */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 text-white rounded-3xl shadow-md border border-indigo-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-indigo-600/80 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-indigo-400">
              ⏱️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">Inkrementális Auto-Mentési Rendszer</h3>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${
                    config.enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                      : 'bg-slate-700 text-slate-300 border-slate-600'
                  }`}
                >
                  {config.enabled ? '🟢 AKTÍV' : '⚪ KIKAPCSOLVA'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5 font-medium">
                Automatikus, háttérbeli adatmásolatok JSON és SQL formátumban a mentési pontok védelmére.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunBackupNow}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-98 text-white font-black text-xs rounded-xl shadow-md border border-emerald-400 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? '⏳ Mentés...' : '🚀 Mentési Pont Létrehozása'}
            </button>
          </div>
        </div>

        {/* Quick status metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-indigo-900/60 text-xs">
          <div className="p-2.5 bg-indigo-900/40 rounded-xl border border-indigo-800/80">
            <span className="text-[10px] font-bold text-indigo-300 block">Utolsó mentés dátuma</span>
            <span className="font-extrabold text-white text-[11px]">
              {config.lastBackupTime ? new Date(config.lastBackupTime).toLocaleString('hu-HU') : 'Még nem készült'}
            </span>
          </div>

          <div className="p-2.5 bg-indigo-900/40 rounded-xl border border-indigo-800/80">
            <span className="text-[10px] font-bold text-indigo-300 block">Ütemezés</span>
            <span className="font-extrabold text-white text-[11px]">
              {config.intervalMinutes === 0
                ? 'Belépéskor / Módosításkor'
                : config.intervalMinutes === 60
                ? 'Minden órában'
                : config.intervalMinutes === 360
                ? 'Minden 6 órában'
                : config.intervalMinutes === 1440
                ? 'Naponta (24h)'
                : 'Hetente'}
            </span>
          </div>

          <div className="p-2.5 bg-indigo-900/40 rounded-xl border border-indigo-800/80">
            <span className="text-[10px] font-bold text-indigo-300 block">Mentési Pontok</span>
            <span className="font-extrabold text-emerald-300 text-[11px]">
              {records.length} / {config.maxRetention} snapshot
            </span>
          </div>

          <div className="p-2.5 bg-indigo-900/40 rounded-xl border border-indigo-800/80">
            <span className="text-[10px] font-bold text-indigo-300 block">Inkrementális Szűrés</span>
            <span className="font-extrabold text-white text-[11px]">
              {config.onlyIfChanged ? '🛡️ Csak változáskor' : '⚡ Mindig elment'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration & Tuning Panel */}
      <div className="p-4 bg-white border-2 border-slate-200 rounded-3xl space-y-4 shadow-xs">
        <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
          ⚙️ Mentési Rendszer Finomhangolása
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Enable toggle */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="font-black text-slate-800 block text-xs">Automata Mentés Bekapcsolva</span>
              <span className="text-[11px] text-slate-500">Háttérbeli mentések automatikus indítása</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => handleConfigChange('enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Interval selector */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <label className="font-black text-slate-800 block text-xs">⏱️ Mentési Gyakoriság (Ütemezés)</label>
            <CustomSelect
              value={config.intervalMinutes}
              onChange={(val) => handleConfigChange('intervalMinutes', Number(val))}
              options={[
                { value: 0, label: 'Alkalmazás indításakor (Minden belépéskor)', icon: '🚀' },
                { value: 60, label: 'Minden órában (60 perc)', icon: '⏰' },
                { value: 360, label: 'Minden 6 órában', icon: '🕒' },
                { value: 1440, label: 'Naponta egyszer (24 óra)', icon: '📅' },
                { value: 10080, label: 'Hetente egyszer (7 nap)', icon: '📆' },
              ]}
              title="Mentési Gyakoriság Kiválasztása"
              colorScheme="indigo"
              buttonClassName="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
            />
          </div>

          {/* Format selector */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <label className="font-black text-slate-800 block text-xs">📄 Mentési Formátum</label>
            <CustomSelect
              value={config.format}
              onChange={(val) => handleConfigChange('format', val)}
              options={[
                { value: 'both', label: 'Mindkettő (JSON Adatcsomag + SQL Script)', icon: '✨' },
                { value: 'json', label: 'Csak JSON Adatcsomag (.json)', icon: '📦' },
                { value: 'sql', label: 'Csak SQL Adatbázis Dump (.sql)', icon: '🛠️' },
              ]}
              title="Mentési Formátum Kiválasztása"
              colorScheme="indigo"
              buttonClassName="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
            />
          </div>

          {/* Target destination */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <label className="font-black text-slate-800 block text-xs">💾 Mentés Célhelye</label>
            <CustomSelect
              value={config.destination}
              onChange={(val) => handleConfigChange('destination', val)}
              options={[
                { value: 'both', label: 'Mindkettő (Helyi IndexedDB + Google Drive feltöltés)', icon: '☁️' },
                { value: 'local', label: 'Csak Helyi Mentési Pontok (IndexedDB)', icon: '💻' },
                { value: 'drive', label: 'Csak Google Drive Felhő Tárhely', icon: '☁️' },
              ]}
              title="Mentés Célhelyének Kiválasztása"
              colorScheme="indigo"
              buttonClassName="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
            />
          </div>

          {/* Retention setting */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <label className="font-black text-slate-800 block text-xs">📦 Megőrzött Mentések Száma</label>
            <CustomSelect
              value={config.maxRetention}
              onChange={(val) => handleConfigChange('maxRetention', Number(val))}
              options={[
                { value: 5, label: 'Utolsó 5 állapot megtartása', icon: '📦' },
                { value: 10, label: 'Utolsó 10 állapot megtartása', icon: '📦' },
                { value: 20, label: 'Utolsó 20 állapot megtartása (Ajánlott)', icon: '📦' },
                { value: 50, label: 'Utolsó 50 állapot megtartása', icon: '📦' },
              ]}
              title="Megőrzött Mentések Száma"
              colorScheme="indigo"
              buttonClassName="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs"
            />
          </div>

          {/* Incremental checkbox */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
            <div className="pr-2">
              <span className="font-black text-indigo-950 block text-xs">🛡️ Inkrementális Védelem</span>
              <span className="text-[11px] text-indigo-800 font-medium leading-tight block">
                Csak akkor készít új mentési pontot, ha az adatok ténylegesen megváltoztak.
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.onlyIfChanged}
              onChange={(e) => handleConfigChange('onlyIfChanged', e.target.checked)}
              className="w-5 h-5 text-indigo-600 border-indigo-300 rounded cursor-pointer accent-indigo-600 shrink-0"
            />
          </div>
        </div>

        {/* Immediate Download Actions */}
        <div className="p-3.5 bg-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 border border-slate-200">
          <div>
            <h5 className="font-black text-slate-900 text-xs">Azonnali Manuális Letöltések</h5>
            <p className="text-[11px] text-slate-600 font-medium">
              Teljes adatbázis letöltése a jelenlegi állapot szerint egyetlen kattintással.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstantJsonDownload}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 border border-slate-950"
            >
              📦 JSON Letöltés
            </button>
            <button
              onClick={handleInstantSqlDownload}
              className="px-3.5 py-2 bg-indigo-800 hover:bg-indigo-900 text-white font-black text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5 border border-indigo-950"
            >
              🛠️ SQL Dump Letöltése
            </button>
          </div>
        </div>
      </div>

      {/* History of Auto-Backup Snapshots */}
      <div className="p-4 bg-white border-2 border-slate-200 rounded-3xl space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              🕒 Helyi Mentési Pontok Története ({records.length})
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Az alábbi mentési pontokból bármikor 1 kattintással visszaállíthatod a teljes adatbázist.
            </p>
          </div>

          {records.length > 0 && (
            <button
              onClick={() => setConfirmClearAllModal(true)}
              className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-[11px] rounded-xl transition cursor-pointer border border-rose-300"
            >
              🗑️ Összes Törlése
            </button>
          )}
        </div>

        {records.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">Még nincs elmentett helyi mentési pont.</p>
            <p className="text-[11px] text-slate-500">
              Kattints a fenti "🚀 Mentési Pont Létrehozása" gombra vagy várd meg az automatikus ütemezést!
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {records.map((rec) => (
              <div
                key={rec.id || rec.timestamp}
                className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-2xl transition flex flex-wrap items-center justify-between gap-2 shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-xs">
                      📅 {new Date(rec.timestamp).toLocaleString('hu-HU')}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        rec.triggerReason === 'manual'
                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                          : rec.triggerReason === 'scheduled'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      }`}
                    >
                      {rec.triggerReason === 'manual'
                        ? 'Manuális'
                        : rec.triggerReason === 'scheduled'
                        ? 'Ütemezett'
                        : 'Indításkori'}
                    </span>
                    {rec.driveUploaded && (
                      <span className="text-[10px] font-black px-2 py-0.5 bg-blue-600 text-white rounded-full">
                        ☁️ Drive-on is
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-600 font-bold flex flex-wrap items-center gap-3">
                    <span>📊 {rec.recordCount} rekord</span>
                    {rec.details && (
                      <span className="text-slate-500 font-medium">
                        ({rec.details.cats} macska, {rec.details.events} esemény, {rec.details.tnr} TNR, {rec.details.inventory} készlet)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {rec.jsonContent && (
                    <button
                      onClick={() => downloadAutoBackupFile(rec, 'json')}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold text-[11px] rounded-lg transition cursor-pointer"
                      title="JSON fájl letöltése"
                    >
                      📥 JSON
                    </button>
                  )}

                  <button
                    onClick={() => downloadAutoBackupFile(rec, 'sql')}
                    className="px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-extrabold text-[11px] rounded-lg transition cursor-pointer"
                    title="SQL Dump letöltése"
                  >
                    🛠️ SQL
                  </button>

                  <button
                    onClick={() => setSelectedRecordToRestore(rec)}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-[11px] rounded-lg transition cursor-pointer shadow-xs border border-emerald-900"
                  >
                    🔄 Visszaállítás
                  </button>

                  <button
                    onClick={() => handleDeleteRecord(rec.id)}
                    className="px-2 py-1.5 text-slate-400 hover:text-rose-600 font-black text-[11px] rounded-lg transition cursor-pointer"
                    title="Mentési pont törlése"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Confirmation Validation Modal */}
      {selectedRecordToRestore && (() => {
        let parsedData: BackupData;
        try {
          parsedData = selectedRecordToRestore.jsonContent
            ? JSON.parse(selectedRecordToRestore.jsonContent)
            : {
                backupMetadata: { exportDate: selectedRecordToRestore.timestamp, appVersion: '2.9.0', recordCounts: {} },
                cats: [],
                events: [],
              };
        } catch (e) {
          parsedData = {
            backupMetadata: { exportDate: selectedRecordToRestore.timestamp, appVersion: '2.9.0', recordCounts: {} },
            cats: [],
            events: [],
          };
        }

        return (
          <BackupDiffValidationModal
            backupData={parsedData}
            backupTitle={`Helyi Mentési Pont #${selectedRecordToRestore.id || ''} (${selectedRecordToRestore.triggerReason || 'Ütemezett'})`}
            backupDate={selectedRecordToRestore.timestamp}
            syncToSupabase={syncToSupabaseOnRestore}
            onToggleSyncToSupabase={(val) => setSyncToSupabaseOnRestore(val)}
            onConfirm={handleConfirmRestore}
            onCancel={() => setSelectedRecordToRestore(null)}
            isRestoring={isRestoring}
          />
        );
      })()}

      {/* Clear All Confirmation Modal */}
      {confirmClearAllModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border-2 border-rose-400 space-y-4">
            <div className="flex items-center gap-3 text-rose-800">
              <span className="p-3 bg-rose-100 rounded-2xl text-2xl">🗑️</span>
              <div>
                <h3 className="font-black text-slate-900 text-base">Összes Mentési Pont Törlése</h3>
                <p className="text-xs text-rose-700 font-bold">Végleges művelet</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              Biztosan törölni szeretnéd az összes ({records.length} db) helyi mentési pontot? Ezzel a művelettel a korábbi helyi visszaállítási pillanatképek véglegesen törlődnek.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmClearAllModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                🗑️ Igen, mindet törlöm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
