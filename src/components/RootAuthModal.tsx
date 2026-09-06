import React, { useState } from 'react';
import { logAuthAuditEvent } from '../services/authAuditService';
import { validateLicenseKey } from '../lib/licenseCrypto';

interface RootAuthModalProps {
  onClose: () => void;
  onSuccess: (durationMinutes: number) => void;
}

export const RootAuthModal: React.FC<RootAuthModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Hibás jelszó vagy Service kód!');

  const checkAndConsumeServiceCode = (code: string): boolean => {
    const validation = validateLicenseKey(code);
    if (!validation.valid || validation.tier !== 'SERVICE') {
      setErrorMessage(validation.reason || 'Érvénytelen Service kód');
      return false;
    }

    const usedCodesRaw = localStorage.getItem('cica_used_service_codes') || '[]';
    let usedCodes: string[] = [];
    try {
      usedCodes = JSON.parse(usedCodesRaw);
    } catch (e) {
      usedCodes = [];
    }

    if (usedCodes.includes(code)) {
      setErrorMessage('Ez a Service kód már fel lett használva!');
      return false;
    }

    usedCodes.push(code);
    localStorage.setItem('cica_used_service_codes', JSON.stringify(usedCodes));
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = password.trim();

    if (trimmedInput === '1342') {
      logAuthAuditEvent('ROOT_MODE_ENTER', { id: 'user_root', name: 'Root Rendszergazda', roleId: 'root' }, 'Sikeres Root Mód aktiválás jelszóval');
      onSuccess(30); // 30 minutes timeout for PIN
    } else if (trimmedInput.startsWith('CICA-SERVICE-')) {
      if (checkAndConsumeServiceCode(trimmedInput)) {
        logAuthAuditEvent('ROOT_MODE_ENTER', { id: 'user_root', name: 'Távoli Segítség (Service)', roleId: 'root' }, 'Sikeres ideiglenes Root aktiválás Service kóddal');
        onSuccess(60); // 60 minutes timeout for Service code
      } else {
        setError(true);
        logAuthAuditEvent('ROOT_AUTH_FAILED', { id: 'unknown', name: 'Ismeretlen kísérletező', roleId: 'guest' }, 'Hibás vagy felhasznált Service kód', {
          status: 'FAILED',
        });
      }
    } else {
      setError(true);
      setErrorMessage('Hibás jelszó vagy formátum!');
      logAuthAuditEvent('ROOT_AUTH_FAILED', { id: 'unknown', name: 'Ismeretlen kísérletező', roleId: 'guest' }, 'Hibás Root jelszó megadási kísérlet', {
        status: 'FAILED',
      });
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-xs border border-purple-100">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-base font-black">
              🔑
            </span>
            <div>
              <h3 className="text-sm font-black text-gray-900">Root Hozzáférés</h3>
              <p className="text-[10px] text-gray-500 font-medium">Adja meg a PIN vagy Service kódot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-base p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-bold mb-1">Jelszó / Service Kód:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="•••• vagy CICA-SERVICE-..."
              autoFocus
              className={`w-full p-3 bg-gray-50 border rounded-xl font-mono text-center text-lg tracking-widest focus:ring-2 focus:bg-white transition ${
                error
                  ? 'border-red-500 focus:ring-red-400 bg-red-50 text-red-900'
                  : 'border-gray-300 focus:ring-purple-500'
              }`}
            />
            {error && (
              <p className="text-[11px] font-bold text-red-600 mt-1.5 flex items-center gap-1">
                ⚠️ {errorMessage}
              </p>
            )}
          </div>

          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-[10px] text-purple-900 leading-snug space-y-1">
            <p>⚡ <strong>Root Mód:</strong> Hozzáférés az SQL sémához, IndexedDB-hez és nyers adatokhoz.</p>
            <p className="text-purple-700 font-medium">A Service kód (távoli segítség) ideiglenes, egyszer használatos, és nem módosítja az alap licencet.</p>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
            >
              Mégse
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs transition"
            >
              🔓 Belépés Rootként
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
