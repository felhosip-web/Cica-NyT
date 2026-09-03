import React, { useEffect, useState } from 'react';
import { useLicenseStore } from '../store/useLicenseStore';
import { useUIStore } from '../store/useUIStore';

export const LicenseBanner: React.FC = () => {
  const { status, daysRemainingInGrace } = useLicenseStore();
  const { setShowSettings } = useUIStore();

  if (status === 'valid') return null;

  return (
    <div className={`mb-4 p-4 rounded-xl shadow-sm flex items-start gap-3 text-sm font-medium
      ${status === 'locked'
        ? 'bg-red-50 text-red-900 border border-red-200'
        : 'bg-amber-50 text-amber-900 border border-amber-200'}
    `}>
      <span className="text-xl shrink-0 mt-0.5">
        {status === 'locked' ? '🚫' : '⚠️'}
      </span>
      <div className="flex-1">
        <h4 className="font-bold text-base mb-1">
          {status === 'locked' ? 'Licenc Lejárt vagy Hiányzik' : 'Licenc Figyelmeztetés'}
        </h4>
        <p>
          {status === 'locked'
            ? 'A rendszer csak olvasási módban (soft lock) érhető el. Új adatok rögzítése és mentése jelenleg tiltva van.'
            : `A rendszert grace (türelmi) időszakban használod. Hátralévő napok száma: ${daysRemainingInGrace}. Kérjük, frissítsd a licencedet!`}
        </p>
        <button
          onClick={() => setShowSettings(true)}
          className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
            ${status === 'locked'
              ? 'bg-red-100 hover:bg-red-200 text-red-800'
              : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
            }
          `}
        >
          🔑 Licenc Megadása a Beállításokban
        </button>
      </div>
    </div>
  );
};
