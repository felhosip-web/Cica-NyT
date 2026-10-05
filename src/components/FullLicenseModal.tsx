import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FULL_LICENSE_TEXT } from '../data/licenseText';

interface FullLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullLicenseModal: React.FC<FullLicenseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full flex flex-col max-h-[85vh] text-slate-900 dark:text-slate-100 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-xl shadow-inner border border-white/20 shrink-0">
                📄
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Teljes Licencszerződés
                </h3>
                <p className="text-slate-300 text-xs font-medium">
                  HES Projects® by FePe – Bilingual LICENSE
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Bezárás"
            >
              ✕
            </button>
          </div>

          {/* Body: Scrollable license text */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <pre className="font-mono text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                {FULL_LICENSE_TEXT}
              </pre>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end shrink-0">
            <button
              onClick={onClose}
              className="py-2.5 px-5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              Bezárás
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
