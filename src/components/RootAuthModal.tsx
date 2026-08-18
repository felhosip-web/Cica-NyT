import React, { useState } from 'react';
import { logAuthAuditEvent } from '../services/authAuditService';

interface RootAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const RootAuthModal: React.FC<RootAuthModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1342') {
      logAuthAuditEvent('ROOT_MODE_ENTER', { id: 'user_root', name: 'Root Rendszergazda', roleId: 'root' }, 'Sikeres Root Mód aktiválás jelszóval');
      onSuccess();
    } else {
      setError(true);
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
              <p className="text-[10px] text-gray-500 font-medium">Adja meg a root belépési jelszót</p>
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
            <label className="block text-gray-700 font-bold mb-1">Root Jelszó:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              placeholder="••••"
              autoFocus
              className={`w-full p-3 bg-gray-50 border rounded-xl font-mono text-center text-lg tracking-widest focus:ring-2 focus:bg-white transition ${
                error
                  ? 'border-red-500 focus:ring-red-400 bg-red-50 text-red-900'
                  : 'border-gray-300 focus:ring-purple-500'
              }`}
            />
            {error && (
              <p className="text-[11px] font-bold text-red-600 mt-1.5 flex items-center gap-1">
                ⚠️ Hibás jelszó! Próbáld újra
              </p>
            )}
          </div>

          <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200 text-[10px] text-purple-900 leading-snug">
            ⚡ <strong>Root Mód:</strong> Hozzáférés az SQL sémához, IndexedDB állapothoz, nyers adatokhoz és rendszertesztelő eszközökhöz.
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
