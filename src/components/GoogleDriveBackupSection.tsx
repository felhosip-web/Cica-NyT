import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { AutoBackupSettingsSection } from './AutoBackupSettingsSection';
import { BackupDiffValidationModal } from './BackupDiffValidationModal';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/firebaseAuth';
import {
  DriveBackupFile,
  BackupData,
  listBackupFiles,
  downloadBackupFile,
  deleteBackupFile,
  uploadBackupToDrive,
  createFullDatabaseBackup,
  restoreBackupToLocalDB,
  pullSupabaseAndBackupToDrive,
} from '../services/googleDriveService';

interface GoogleDriveBackupSectionProps {
  onRefreshLocalCounts?: () => void;
}

export const GoogleDriveBackupSection: React.FC<GoogleDriveBackupSectionProps> = ({
  onRefreshLocalCounts,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Drive files & state
  const [driveFiles, setDriveFiles] = useState<DriveBackupFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [selectedFilePreview, setSelectedFilePreview] = useState<BackupData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);

  // Status & Actions
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [isPullingSupabase, setIsPullingSupabase] = useState<boolean>(false);

  // Options
  const [syncToSupabaseOnRestore, setSyncToSupabaseOnRestore] = useState<boolean>(true);

  // Confirmation Modals
  const [confirmRestoreModal, setConfirmRestoreModal] = useState<boolean>(false);
  const [confirmPullSupabaseModal, setConfirmPullSupabaseModal] = useState<boolean>(false);
  const [fileToDelete, setFileToDelete] = useState<DriveBackupFile | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleFetchDriveFiles = async (tokenOverride?: string) => {
    const token = tokenOverride || accessToken || getAccessToken();
    if (!token) return;

    setIsLoadingFiles(true);
    setStatusMessage(null);
    try {
      const files = await listBackupFiles(token);
      setDriveFiles(files);
      if (files.length > 0 && !selectedFileId) {
        setSelectedFileId(files[0].id);
      }
    } catch (err: any) {
      console.error('Drive listing error:', err);
      setStatusMessage({
        type: 'error',
        text: `Nem sikerült lekérni a Google Drive mentéseket: ${err.message || String(err)}`,
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      handleFetchDriveFiles(accessToken);
    }
  }, [accessToken]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setStatusMessage({
          type: 'success',
          text: `Sikeres bejelentkezés! Üdvözlünk: ${result.user.email || result.user.displayName}`,
        });
        await handleFetchDriveFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setStatusMessage({
        type: 'error',
        text: `Bejelentkezési hiba: ${err.message || String(err)}`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setUser(null);
    setAccessToken(null);
    setDriveFiles([]);
    setSelectedFilePreview(null);
    setSelectedFileId('');
    setStatusMessage({ type: 'info', text: 'Kijelentkeztél a Google fiókból.' });
  };

  // Preview selected file
  useEffect(() => {
    if (!selectedFileId || !accessToken) {
      setSelectedFilePreview(null);
      return;
    }

    const loadPreview = async () => {
      setIsLoadingPreview(true);
      try {
        const data = await downloadBackupFile(accessToken, selectedFileId);
        setSelectedFilePreview(data);
      } catch (err) {
        console.error('Error downloading preview:', err);
        setSelectedFilePreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    };

    loadPreview();
  }, [selectedFileId, accessToken]);

  // 1. Export Local -> Google Drive
  const handleExportLocalToDrive = async () => {
    const token = accessToken || getAccessToken();
    if (!token) {
      alert('Kérlek, először jelentkezz be a Google fiókodba!');
      return;
    }

    setIsExporting(true);
    setStatusMessage(null);

    try {
      const fullBackup = await createFullDatabaseBackup();
      const uploadedFile = await uploadBackupToDrive(token, fullBackup);

      setStatusMessage({
        type: 'success',
        text: `✅ Sikeres mentés a Google Drive-ra! Fájlnév: ${uploadedFile.name}`,
      });

      await handleFetchDriveFiles(token);
    } catch (err: any) {
      console.error('Export error:', err);
      setStatusMessage({
        type: 'error',
        text: `Hiba a mentés során: ${err.message || String(err)}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Restore Google Drive -> Local + Supabase
  const executeRestore = async () => {
    const token = accessToken || getAccessToken();
    if (!token || !selectedFileId) return;

    setIsRestoring(true);
    setConfirmRestoreModal(false);
    setStatusMessage(null);

    try {
      const backupData = selectedFilePreview || (await downloadBackupFile(token, selectedFileId));
      const res = await restoreBackupToLocalDB(backupData, {
        syncToSupabase: syncToSupabaseOnRestore,
      });

      let msg = `✅ Sikeres visszaállítás a local adatbázisba! (Macskák: ${res.restoredCounts.cats || 0}, Események: ${res.restoredCounts.events || 0})`;
      if (syncToSupabaseOnRestore) {
        if (res.supabaseSynced) {
          msg += ' + 🔄 A Supabase felhő adatbázis is frissült a mentés alapján!';
        } else if (res.error) {
          msg += ` (⚠️ Supabase szinkron figyelmeztetés: ${res.error})`;
        }
      }

      setStatusMessage({ type: 'success', text: msg });
      if (onRefreshLocalCounts) onRefreshLocalCounts();
    } catch (err: any) {
      console.error('Restore error:', err);
      setStatusMessage({
        type: 'error',
        text: `Hiba a visszaállítás során: ${err.message || String(err)}`,
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // 3. Supabase -> Local -> Drive
  const executePullSupabaseToDrive = async () => {
    const token = accessToken || getAccessToken();
    if (!token) return;

    setIsPullingSupabase(true);
    setConfirmPullSupabaseModal(false);
    setStatusMessage(null);

    try {
      const res = await pullSupabaseAndBackupToDrive(token);
      setStatusMessage({
        type: 'success',
        text: `✅ Supabase adatok sikeresen letöltve és biztonsági mentésként feltöltve a Google Drive-ra! (${res.backupFile.name})`,
      });

      await handleFetchDriveFiles(token);
      if (onRefreshLocalCounts) onRefreshLocalCounts();
    } catch (err: any) {
      console.error('Supabase to Drive error:', err);
      setStatusMessage({
        type: 'error',
        text: `Hiba a Supabase ➔ Drive folyamatban: ${err.message || String(err)}`,
      });
    } finally {
      setIsPullingSupabase(false);
    }
  };

  // Delete Backup File
  const executeDeleteFile = async () => {
    if (!fileToDelete || !accessToken) return;

    try {
      await deleteBackupFile(accessToken, fileToDelete.id);
      setStatusMessage({
        type: 'info',
        text: `Mentési fájl törölve a Google Drive-ról: ${fileToDelete.name}`,
      });
      setFileToDelete(null);
      await handleFetchDriveFiles(accessToken);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Hiba a fájl törlésekor: ${err.message || String(err)}`,
      });
    }
  };

  if (isAuthLoading) {
    return (
      <div className="p-6 text-center text-sm text-slate-500 animate-pulse">
        🤖 Google Drive állapot ellenőrzése...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-2xl shrink-0">
            ☁️
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
              Személyes Google Drive Mentés & Visszaállítás
            </h3>
            <p className="text-xs text-blue-200">
              Biztonsági mentések kezelése közvetlenül a saját Google Drive tárhelyeden.
            </p>
          </div>
        </div>

        {user ? (
          <div className="flex items-center gap-3 bg-white/10 px-3.5 py-2 rounded-xl border border-white/20">
            <div className="text-right text-xs">
              <span className="block font-bold text-white">{user.displayName || 'Google Felhasználó'}</span>
              <span className="block text-[11px] text-blue-200">{user.email}</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition cursor-pointer"
            >
              Kijelentkezés
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="gsi-material-button bg-white hover:bg-slate-100 text-slate-900 px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2.5 shadow-sm transition cursor-pointer shrink-0 disabled:opacity-50"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5 shrink-0">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{isSigningIn ? 'Bejelentkezés folyamatban...' : 'Bejelentkezés Google-fiókkal'}</span>
          </button>
        )}
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-800 font-black cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {!user ? (
        <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
          <div className="text-4xl">🔐</div>
          <h4 className="font-bold text-slate-800 text-sm">Google Drive Szinkronizáció Engedélyezése</h4>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            A mentésekhez és visszaállításokhoz jelentkezz be a saját Google-fiókodba. Az alkalmazás kizárólag a saját maga által létrehozott mentési fájlokhoz fér hozzá a Google Drive-odon.
          </p>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
          >
            🚀 Bejelentkezés a Google-lal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Direct Local -> Drive Export */}
            <div className="p-4 bg-blue-50/60 border-2 border-blue-300 rounded-2xl space-y-3 shadow-xs hover:border-blue-400 transition">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-blue-600 text-white rounded-xl font-bold text-lg shadow-xs">☁️</span>
                <div>
                  <h4 className="font-black text-blue-950 text-xs">Local ➔ Google Drive</h4>
                  <p className="text-[11px] text-blue-800 font-bold">Mentés a helyi adatbázisból</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Elmenti az összes helyi cicát, eseményt és nyilvántartási adatot JSON fájlként a Google Drive-odra.
              </p>
              <button
                type="button"
                onClick={handleExportLocalToDrive}
                disabled={isExporting}
                className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md border-2 border-blue-900 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isExporting ? '⏳ Mentés feltöltése...' : '☁️ Mentés Google Drive-ra'}
              </button>
            </div>

            {/* Card 2: Restore Drive -> Local & Supabase */}
            <div className="p-4 bg-purple-50/60 border-2 border-purple-300 rounded-2xl space-y-3 shadow-xs hover:border-purple-400 transition">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-purple-600 text-white rounded-xl font-bold text-lg shadow-xs">📥</span>
                <div>
                  <h4 className="font-black text-purple-950 text-xs">Drive ➔ Local & Supabase</h4>
                  <p className="text-[11px] text-purple-800 font-bold">Adatbázis Visszaállítása</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Kiválasztott Google Drive mentés visszaállítása a helyi adatbázisba, és opcionálisan a Supabase felhőbe.
              </p>
              <button
                type="button"
                onClick={() => setConfirmRestoreModal(true)}
                disabled={!selectedFileId || isRestoring || isLoadingPreview}
                className="w-full py-2.5 bg-purple-800 hover:bg-purple-900 active:bg-purple-950 disabled:opacity-40 disabled:bg-slate-400 disabled:border-slate-500 text-white font-black text-xs rounded-xl shadow-md border-2 border-purple-950 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isRestoring ? '⏳ Visszaállítás...' : '📥 Visszaállítás indítása'}
              </button>
            </div>

            {/* Card 3: Supabase -> Local -> Drive */}
            <div className="p-4 bg-emerald-50/60 border-2 border-emerald-300 rounded-2xl space-y-3 shadow-xs hover:border-emerald-400 transition">
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-xs">🔄</span>
                <div>
                  <h4 className="font-black text-emerald-950 text-xs">Supabase ➔ Drive</h4>
                  <p className="text-[11px] text-emerald-800 font-bold">Felhő frissítés majd mentés</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Letölti a legfrissebb felhő rekordsorokat a Supabase-ről a helyi adatbázisba, majd mentést tölt fel a Drive-ra.
              </p>
              <button
                type="button"
                onClick={() => setConfirmPullSupabaseModal(true)}
                disabled={isPullingSupabase}
                className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md border-2 border-emerald-950 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isPullingSupabase ? '⏳ Letöltés és Mentés...' : '🔄 Supabase ➔ Drive Mentés'}
              </button>
            </div>
          </div>

          {/* Drive Files Table & Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  📁 Google Drive-on Található Mentési Fájlok ({driveFiles.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => handleFetchDriveFiles()}
                disabled={isLoadingFiles}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <span>🔄</span>
                <span>{isLoadingFiles ? 'Frissítés...' : 'Lista frissítése'}</span>
              </button>
            </div>

            {isLoadingFiles ? (
              <p className="text-xs text-slate-500 py-4 text-center animate-pulse">
                🔍 Mentési fájlok keresése a Google Drive-on...
              </p>
            ) : driveFiles.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <p className="text-xs font-bold text-slate-700">Még nincs mentési fájl a Google Drive-odon.</p>
                <p className="text-[11px] text-slate-500">Kattints a fenti "☁️ Mentés Google Drive-ra" gombra az első mentés elkészítéséhez!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] font-extrabold text-slate-500 uppercase border-b border-slate-200">
                      <tr>
                        <th className="p-3 w-8">Vál.</th>
                        <th className="p-3">Fájlnév</th>
                        <th className="p-3">Módosítva</th>
                        <th className="p-3">Méret</th>
                        <th className="p-3 text-right">Műveletek</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-semibold">
                      {driveFiles.map((f) => {
                        const isSelected = selectedFileId === f.id;
                        return (
                          <tr
                            key={f.id}
                            className={`hover:bg-purple-50/50 transition cursor-pointer ${
                              isSelected ? 'bg-purple-50/80 font-bold' : ''
                            }`}
                            onClick={() => setSelectedFileId(f.id)}
                          >
                            <td className="p-3">
                              <input
                                type="radio"
                                name="driveFileSelect"
                                checked={isSelected}
                                onChange={() => setSelectedFileId(f.id)}
                                className="text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-slate-900 font-bold flex items-center gap-1.5">
                              <span>📄</span>
                              <span>{f.name}</span>
                            </td>
                            <td className="p-3 text-slate-600">
                              {f.modifiedTime
                                ? new Date(f.modifiedTime).toLocaleString('hu-HU')
                                : '-'}
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {f.size ? `${(parseInt(f.size) / 1024).toFixed(1)} KB` : 'N/A'}
                            </td>
                            <td className="p-3 text-right space-x-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileToDelete(f);
                                }}
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-bold text-[11px] rounded-lg transition cursor-pointer"
                              >
                                🗑️ Törlés
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected File Details / Restore Settings */}
                {selectedFileId && (
                  <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                    <h5 className="font-extrabold text-purple-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      🔎 Kiválasztott Mentési Fájl Részletei:
                    </h5>

                    {isLoadingPreview ? (
                      <p className="text-xs text-purple-700 italic animate-pulse">
                        Mentési fájl tartalmának beolvasása a Drive-ról...
                      </p>
                    ) : selectedFilePreview ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div className="p-2 bg-white rounded-xl border border-purple-200">
                            <span className="text-[10px] text-slate-500 block">Készült:</span>
                            <span className="font-bold text-slate-800">
                              {selectedFilePreview.backupMetadata?.exportDate
                                ? new Date(selectedFilePreview.backupMetadata.exportDate).toLocaleString('hu-HU')
                                : 'Ismeretlen'}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-purple-200">
                            <span className="text-[10px] text-slate-500 block">Macskák száma:</span>
                            <span className="font-bold text-purple-900">
                              🐱 {selectedFilePreview.cats?.length || 0}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-purple-200">
                            <span className="text-[10px] text-slate-500 block">Események száma:</span>
                            <span className="font-bold text-purple-900">
                              📅 {selectedFilePreview.events?.length || 0}
                            </span>
                          </div>
                          <div className="p-2 bg-white rounded-xl border border-purple-200">
                            <span className="text-[10px] text-slate-500 block">Befogók száma:</span>
                            <span className="font-bold text-purple-900">
                              🏡 {selectedFilePreview.fosterParents?.length || 0}
                            </span>
                          </div>
                        </div>

                        {/* Dual-Direction Options */}
                        <div className="pt-2 flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs font-extrabold text-purple-950 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={syncToSupabaseOnRestore}
                              onChange={(e) => setSyncToSupabaseOnRestore(e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
                            />
                            <span>🔄 A visszaállított adatokat automatikusan szinkronizálja a Supabase felhőbe is (Drive ➔ Supabase)</span>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 font-bold">Nem sikerült beolvasni a fájl tartalmát.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚠️ Confirm Restore Validation Modal (MANDATORY User Confirmation & Diff Comparison) */}
      {confirmRestoreModal && selectedFilePreview && (
        <BackupDiffValidationModal
          backupData={selectedFilePreview}
          backupTitle={driveFiles.find((f) => f.id === selectedFileId)?.name || 'Google Drive Mentés'}
          backupDate={selectedFilePreview.backupMetadata?.exportDate}
          syncToSupabase={syncToSupabaseOnRestore}
          onToggleSyncToSupabase={(val) => setSyncToSupabaseOnRestore(val)}
          onConfirm={executeRestore}
          onCancel={() => setConfirmRestoreModal(false)}
          isRestoring={isRestoring}
        />
      )}

      {/* ⚠️ Confirm Supabase -> Drive Modal */}
      {confirmPullSupabaseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-emerald-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 text-2xl flex items-center justify-center mx-auto">
                🔄
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Supabase ➔ Drive Szinkronizáció</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ez a művelet letölti a Supabase felhőben lévő legfrissebb adatokat, frissíti a helyi adatbázist, majd azonnal biztonsági mentést készít a saját Google Drive-odra.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPullSupabaseModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={executePullSupabaseToDrive}
                className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Indítás
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Confirm File Delete Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-red-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-800 text-2xl flex items-center justify-center mx-auto">
                🗑️
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">Biztosan törlöd a mentési fájlt?</h3>
              <p className="text-xs text-slate-600">
                Fájl: <b className="text-slate-900">{fileToDelete.name}</b>
                <br />
                Ez a művelet véglegesen törli a mentést a Google Drive-odról.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={executeDeleteFile}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Végleges Törlés
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Automated & Incremental Backups Fine-tuning */}
      <div className="pt-4 border-t-2 border-slate-200">
        <AutoBackupSettingsSection onRefreshLocalCounts={onRefreshLocalCounts} />
      </div>
    </div>
  );
};
