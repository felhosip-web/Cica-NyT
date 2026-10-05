import React, { useState } from 'react';
import { useLicenseStore } from '../store/useLicenseStore';
import { FullLicenseModal } from './FullLicenseModal';

export const LicenseSettingsTab: React.FC = () => {
  const { status, key, daysRemainingInGrace, saveKey, removeKey, termsAccepted, termsAcceptedAt } = useLicenseStore();
  const [inputKey, setInputKey] = useState(key || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showFullLicenseModal, setShowFullLicenseModal] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveKey(inputKey);
    setIsSaving(false);
    if (!success) {
      alert('Érvénytelen licenckulcs formátum. Kérjük ellenőrizd!');
    }
  };

  const formattedAcceptedDate = termsAcceptedAt
    ? new Date(termsAcceptedAt).toLocaleString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      {/* 1. Licencinformáció Section */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
            <span>📜</span> Licencinformáció
          </h3>
          <button
            type="button"
            onClick={() => setShowFullLicenseModal(true)}
            className="px-3.5 py-1.5 bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/60 dark:hover:bg-pink-900/60 text-pink-700 dark:text-pink-300 font-bold text-xs rounded-xl border border-pink-200 dark:border-pink-800/60 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>📄</span> Teljes licenc megtekintése
          </button>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <p className="font-extrabold text-sm text-slate-900 dark:text-white">
            © 2025-2026 HES Projects® by FePe
          </p>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            All Rights Reserved.
          </p>
          {termsAccepted && formattedAcceptedDate && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold pt-1 flex items-center gap-1">
              <span>✅</span> Licencfeltételek elfogadva: {formattedAcceptedDate}
            </p>
          )}
        </div>
      </div>

      {/* 2. Licenc Kezelés & Soft-Lock Status Section */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
          <span>🔑</span> Licenc Kezelés & Státusz
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          Add meg a megvásárolt licenckulcsodat az alkalmazás írási és mentési funkcióinak feloldásához. Érvényes licenc hiányában a rendszer csak olvasási módban (soft lock) érhető el.
        </p>

        <div className="space-y-4 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Jelenlegi Státusz:
            </span>
            {status === 'valid' && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800">
                ✅ Érvényes
              </span>
            )}
            {status === 'grace' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-800">
                ⚠️ Grace ({daysRemainingInGrace} nap hátra)
              </span>
            )}
            {status === 'locked' && (
              <span className="px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-xs font-bold border border-red-300 dark:border-red-800">
                🚫 Zárolt (Csak Olvasás)
              </span>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Licenckulcs
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Ide másold a licenckulcsot..."
                className="flex-1 p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-pink-500 focus:outline-none transition font-mono"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs disabled:opacity-50 transition cursor-pointer"
              >
                {isSaving ? '⏳' : 'Mentés'}
              </button>
            </div>
          </div>

          {key && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Biztosan eltávolítod a licenckulcsot? Ezzel az alkalmazás zárolt állapotba kerülhet.')) {
                    removeKey();
                    setInputKey('');
                  }
                }}
                className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold underline cursor-pointer"
              >
                Licenckulcs törlése az eszközről
              </button>
            </div>
          )}
        </div>
      </div>

      <FullLicenseModal
        isOpen={showFullLicenseModal}
        onClose={() => setShowFullLicenseModal(false)}
      />
    </div>
  );
};
