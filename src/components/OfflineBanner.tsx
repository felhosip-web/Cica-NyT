import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-amber-900/90 text-amber-100 backdrop-blur-md border-b border-amber-700/80 px-4 py-2 text-xs font-sans shadow-md z-[90] relative"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">🔌</span>
              <span>
                <strong>Nincs hálózati kapcsolat</strong> — Helyi offline adatbázis továbbra is használható!
              </span>
            </div>
            <span className="text-[10px] bg-amber-950/80 text-amber-200 border border-amber-700/60 font-mono px-2 py-0.5 rounded-full shrink-0">
              OFFLINE MÓD
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
