import React, { useState, useEffect } from 'react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState<boolean>(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-amber-900/90 text-amber-100 border border-amber-600/60 px-3.5 py-2 rounded-2xl shadow-lg backdrop-blur-md flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base shrink-0 animate-pulse">📡</span>
        <span className="truncate">
          Nincs hálózati kapcsolat — helyi adat (IndexedDB) továbbra is használható
        </span>
      </div>
      <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-700/50 shrink-0">
        Offline mód
      </span>
    </div>
  );
};
