import React, { useState, useEffect } from 'react';
import {
  LocalMirrorStatus,
  getMirrorStatus,
  pickMirrorDirectory,
  getStoredDirectoryHandle,
  writeMirrorToDirectory,
  testWriteMirrorDirectory,
  removeStoredDirectoryHandle,
  downloadMirrorFallback,
  getLocalMirrorConfig,
  saveLocalMirrorConfig,
} from '../services/localMirrorService';
import { formatAuditDate } from '../utils/audit';

export const LocalMirrorSection: React.FC = () => {
  const [status, setStatus] = useState<LocalMirrorStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const refreshStatus = async () => {
    const s = await getMirrorStatus();
    setStatus(s);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handlePickDirectory = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const handle = await pickMirrorDirectory();
      if (handle) {
        setActionFeedback(`✅ Mappa sikeresen kiválasztva: ${handle.name}`);
        await refreshStatus();
      }
    } catch (err: any) {
      setActionFeedback(`❌ Hiba a mappa kiválasztásakor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMirror = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle) {
        throw new Error('Nincs csatlakoztatott mentési mappa! Előbb válaszd ki a mappát.');
      }
      await writeMirrorToDirectory(handle);
      setActionFeedback('✅ Helyi lemezes tükör mentés sikeresen elkészült!');
      await refreshStatus();
    } catch (err: any) {
      setActionFeedback(`❌ Hiba a tükör mentése során: ${err.message}`);
      await refreshStatus();
    } finally {
      setLoading(false);
    }
  };

  const handleTestWrite = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      const handle = await getStoredDirectoryHandle();
      if (!handle) {
        throw new Error('Nincs csatlakoztatott mappa.');
      }
      await testWriteMirrorDirectory(handle);
      setActionFeedback('✅ Teszt írás sikeres! A mappa írható és hozzáférhető.');
    } catch (err: any) {
      setActionFeedback(`❌ Teszt írási hiba: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setActionFeedback(null);
    try {
      await removeStoredDirectoryHandle();
      setActionFeedback('🔌 Mappa kapcsolat sikeresen bontva.');
      await refreshStatus();
    } catch (err: any) {
      setActionFeedback(`❌ Hiba a kapcsolat bontásakor: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoMirror = async (enabled: boolean) => {
    const config = await getLocalMirrorConfig();
    await saveLocalMirrorConfig({
      ...config,
      autoMirrorEnabled: enabled,
    });
    await refreshStatus();
  };

  if (!status) {
    return <div className="p-4 text-xs font-mono text-gray-400">Helyi mentési állapot lekérdezése...</div>;
  }

  const osGuidance =
    status.platformOS === 'win'
      ? 'Windows javasolt mappa: Dokumentumok\\Cica-NyT'
      : status.platformOS === 'mac'
      ? 'macOS javasolt mappa: Dokumentumok/Cica-NyT'
      : status.platformOS === 'linux'
      ? 'Linux javasolt mappa: ~/Documents/Cica-NyT'
      : 'Javasolt mappa: Dokumentumok/Cica-NyT';

  return (
    <div className="space-y-3 text-xs font-sans">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl border border-blue-500/40 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900/80 text-blue-200 border border-blue-700 flex items-center justify-center text-xl font-black shrink-0">
              📁
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Helyi Adattár / Lemezes Tükör Mappa</span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  status.permissionState === 'granted'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : status.permissionState === 'unsupported'
                    ? 'bg-amber-950 text-amber-300 border-amber-800'
                    : 'bg-blue-950 text-blue-300 border-blue-800'
                }`}>
                  {status.permissionState === 'granted'
                    ? '✅ Csatlakoztatva'
                    : status.permissionState === 'expired'
                    ? '⚠️ Jogosultság Lejárt'
                    : status.permissionState === 'unsupported'
                    ? '🌐 Fallback Mód'
                    : '⚪ Nincs Csatlakoztatva'}
                </span>
              </h4>
              <p className="text-[11px] text-blue-200/80">
                Hozz létre egy közvetlen lemezes biztonsági másolatot a saját számítógéped Dokumentumok mappájában!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadMirrorFallback}
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white font-extrabold text-[11px] rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
            >
              <span>📥</span>
              <span>Tükör Letöltése Fájlként</span>
            </button>
          </div>
        </div>

        {/* Status Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-blue-900/60">
            <span className="text-[9px] text-blue-300 block font-sans font-bold">Kiválasztott Mappa</span>
            <span className="font-extrabold text-white">{status.folderName || 'Nincs kiválasztva'}</span>
          </div>

          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-blue-900/60">
            <span className="text-[9px] text-blue-300 block font-sans font-bold">Utolsó Helyi Tükör</span>
            <span className="font-extrabold text-emerald-300">{formatAuditDate(status.lastMirrorAt || undefined)}</span>
          </div>

          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-blue-900/60">
            <span className="text-[9px] text-blue-300 block font-sans font-bold">Támogatási Státusz</span>
            <span className={status.isSupported ? 'font-extrabold text-emerald-300' : 'font-extrabold text-amber-300'}>
              {status.isSupported ? '✅ Native File System Access' : '⚠️ Fallback Letöltési Mód'}
            </span>
          </div>
        </div>

        {/* OS Guidance Banner */}
        <div className="p-2.5 bg-blue-950/80 border border-blue-800/80 rounded-xl text-[11px] text-blue-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>💻</span>
            <span className="font-semibold">{osGuidance}</span>
          </div>
          <span className="text-[10px] text-blue-300 font-mono italic shrink-0">
            OS: {status.platformOS.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-3 rounded-xl font-bold text-xs border transition-all ${
          actionFeedback.includes('❌')
            ? 'bg-rose-50 text-rose-900 border-rose-300'
            : 'bg-emerald-50 text-emerald-900 border-emerald-300'
        }`}>
          {actionFeedback}
        </div>
      )}

      {/* Control Buttons & Settings Panel */}
      <div className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h5 className="font-extrabold text-gray-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <span>⚙️</span>
            <span>Mappa Csatlakoztatás & Mentési Akciók</span>
          </h5>

          {status.hasHandle && (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
            >
              🔌 Mappa kapcsolat bontása
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Button 1: Pick Directory */}
          <button
            onClick={handlePickDirectory}
            disabled={loading || !status.isSupported}
            className="p-3 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded-xl text-left font-bold transition disabled:opacity-50 cursor-pointer space-y-1 shadow-2xs"
          >
            <div className="flex items-center gap-1.5 text-blue-900 font-extrabold">
              <span>📁</span>
              <span>1. Mappa Kiválasztása</span>
            </div>
            <p className="text-[10px] text-blue-700 font-normal leading-tight">
              Válassz ki egy mappát pl. a Dokumentumok könyvtárban.
            </p>
          </button>

          {/* Button 2: Save Mirror Now */}
          <button
            onClick={handleSaveMirror}
            disabled={loading || (!status.hasHandle && status.isSupported)}
            className="p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-left font-bold transition disabled:opacity-50 cursor-pointer space-y-1 shadow-2xs"
          >
            <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold">
              <span>💾</span>
              <span>2. Mostani Tükör Mentése</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-normal leading-tight">
              Minden cica, raktár és pénzügyi adat írása a csatlakoztatott mappába.
            </p>
          </button>

          {/* Button 3: Test Write */}
          <button
            onClick={handleTestWrite}
            disabled={loading || !status.hasHandle}
            className="p-3 bg-purple-50 hover:bg-purple-100 border border-purple-300 rounded-xl text-left font-bold transition disabled:opacity-50 cursor-pointer space-y-1 shadow-2xs"
          >
            <div className="flex items-center gap-1.5 text-purple-900 font-extrabold">
              <span>🧪</span>
              <span>3. Teszt Írás Ellenőrzése</span>
            </div>
            <p className="text-[10px] text-purple-700 font-normal leading-tight">
              Kisméretű ideiglenes tesztfájl írása és törlése az írási engedély ellenőrzésére.
            </p>
          </button>
        </div>

        {/* Auto Mirror Toggle Box */}
        <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="font-extrabold text-gray-900 text-xs block">
              🔄 Automatikus Napi Helyi Tükör Mentés
            </span>
            <p className="text-[10px] text-gray-600 leading-relaxed font-normal">
              Az alkalmazás indításakor naponta egyszer automatikusan lementi a friss tükör pillanatképet a kiválasztott mappába (amennyiben a böngésző írási engedélye aktív).
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={status.autoMirrorEnabled}
              onChange={(e) => handleToggleAutoMirror(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        {/* Informational Guidance */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
          <span className="font-bold block">ℹ️ Böngésző Biztonsági Tudnivaló:</span>
          <p className="leading-relaxed">
            A böngészők adatvédelmi szabályai miatt az alkalmazás **nem tud automatikusan, észrevétlenül írni** a merevlemezre a mappa egyszeri explicit kiválasztása nélkül. Miután kiválasztottad a mappát, a böngésző megjegyzi a kapcsolatot, és a gombra kattintva azonnal lementi a tükröt.
          </p>
        </div>
      </div>
    </div>
  );
};
