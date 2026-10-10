import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FIRST_LAUNCH_SUMMARY, FULL_LICENSE_TEXT } from '../data/licenseText';
import { FullLicenseModal } from './FullLicenseModal';
import { logEvent } from '../utils/eventLog';

interface LicenseAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export const LicenseAcceptanceModal: React.FC<LicenseAcceptanceModalProps> = ({ isOpen, onAccept }) => {
  const [isChecked, setIsChecked] = useState(false);
  const [showFullLicenseModal, setShowFullLicenseModal] = useState(false);

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-pink-300 dark:border-slate-700 max-w-xl w-full flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-purple-700 p-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30 shrink-0">
                  📜
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Licencfeltételek</h3>
                  <p className="text-pink-100 text-xs font-medium">
                    HES Projects® by FePe
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
              {/* Short Hungarian Summary */}
              <div className="p-3.5 bg-pink-50 dark:bg-slate-800/80 border border-pink-200 dark:border-slate-700 rounded-xl space-y-1.5">
                <div className="font-extrabold text-pink-900 dark:text-pink-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <span>ℹ️</span> Tulajdonosi Nyilatkozat (Proprietary Software)
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                  {FIRST_LAUNCH_SUMMARY}
                </p>
                <div className="pt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  © 2025-2026 HES Projects® by FePe – All Rights Reserved.
                </div>
              </div>

              {/* Scrollable License Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                    A licencszerződés szövege:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFullLicenseModal(true)}
                    className="text-pink-600 dark:text-pink-400 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔍</span> Teljes licenc megtekintése
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                  <pre className="font-mono text-[11px] text-slate-800 dark:text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                    {FULL_LICENSE_TEXT}
                  </pre>
                </div>
              </div>

              {/* Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => setIsChecked(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-pink-600 border-slate-300 rounded focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-snug">
                    Elolvastam és elfogadom a licencfeltételeket
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                A továbblépéshez fogadd el a feltételeket.
              </span>
              <button
                type="button"
                disabled={!isChecked}
                onClick={() => {
                  logEvent({
                    category: 'license',
                    action: 'license.accept',
                    summary: 'A felhasználó elfogadta a licencfeltételeket',
                  }).catch(() => {});
                  onAccept();
                }}
                className="w-full sm:w-auto py-2.5 px-6 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 disabled:from-slate-400 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white font-extrabold text-sm rounded-xl shadow-md transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Elfogadom ✨
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      <FullLicenseModal
        isOpen={showFullLicenseModal}
        onClose={() => setShowFullLicenseModal(false)}
      />
    </>
  );
};
