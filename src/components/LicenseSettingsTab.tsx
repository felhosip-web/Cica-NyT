import React, { useState } from 'react';
import { useLicenseStore } from '../store/useLicenseStore';

export const LicenseSettingsTab: React.FC = () => {
  const { status, key, daysRemainingInGrace, saveKey, removeKey } = useLicenseStore();
  const [inputKey, setInputKey] = useState(key || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await saveKey(inputKey);
    setIsSaving(false);
    if (!success) {
      alert('Érvénytelen licenckulcs formátum. Kérjük ellenőrizd!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
        <h3 className="font-extrabold text-gray-900 text-lg mb-2 flex items-center gap-2">
          <span>🔑</span> Licenc Kezelés
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Add meg a megvásárolt licenckulcsodat az alkalmazás írási és mentési funkcióinak feloldásához. Érvényes licenc hiányában a rendszer csak olvasási módban (soft lock) érhető el.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-gray-700">Jelenlegi Státusz:</span>
            {status === 'valid' && <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">✅ Érvényes</span>}
            {status === 'grace' && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">⚠️ Grace ({daysRemainingInGrace} nap hátra)</span>}
            {status === 'locked' && <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300">🚫 Zárolt (Csak Olvasás)</span>}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Licenckulcs</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Ide másold a licenckulcsot..."
                className="flex-1 p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition font-mono"
              />
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-sm shadow-xs disabled:opacity-50"
              >
                {isSaving ? '⏳' : 'Mentés'}
              </button>
            </div>
          </div>

          {key && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={() => {
                  if (confirm('Biztosan eltávolítod a licenckulcsot? Ezzel az alkalmazás zárolt állapotba kerülhet.')) {
                    removeKey();
                    setInputKey('');
                  }
                }}
                className="text-xs text-red-600 hover:text-red-800 font-bold underline"
              >
                Licenckulcs törlése az eszközről
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
