import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/useUIStore';

export const LicenseWarningToast: React.FC = () => {
  const [show, setShow] = useState(false);
  const { setShowSettings } = useUIStore();

  useEffect(() => {
    const handler = () => {
      setShow(true);
      setTimeout(() => setShow(false), 5000);
    };

    window.addEventListener('licenseLockedToast', handler);
    return () => window.removeEventListener('licenseLockedToast', handler);
  }, []);

  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-2xl flex items-center gap-3 w-[90%] max-w-sm"
        >
          <span className="text-2xl shrink-0">🚫</span>
          <div className="flex-1 text-sm leading-tight">
            Nincs érvényes licenc! Az új adatok mentése sikertelen volt. Kérjük frissítsd a beállításokban.
          </div>
          <button
            onClick={() => {
              setShow(false);
              setShowSettings(true);
            }}
            className="shrink-0 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
          >
            ⚙️
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
