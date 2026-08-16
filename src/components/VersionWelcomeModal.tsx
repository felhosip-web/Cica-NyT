import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { APP_VERSION } from '../version';

export const VersionWelcomeModal: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [changelogItems, setChangelogItems] = useState<string[]>([]);
  const [currentVer, setCurrentVer] = useState(APP_VERSION);

  useEffect(() => {
    try {
      const lastSeenVersion = localStorage.getItem('cica_last_seen_version');
      
      // Ha most először fut, vagy újabb verzióra frissült a kliens:
      if (lastSeenVersion && lastSeenVersion !== APP_VERSION) {
        // Betöltjük a friss changelogot
        fetch(`/changelog.json?t=${Date.now()}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((logs: Array<{ version: string; date: string; changes: string[] }>) => {
            const latest = logs.find((l) => l.version === APP_VERSION) || logs[0];
            if (latest && latest.changes) {
              setChangelogItems(latest.changes);
            }
            setShowModal(true);
          })
          .catch(() => {
            setShowModal(true);
          });
      } else if (!lastSeenVersion) {
        // Első indításnál is regisztráljuk az aktuális verziót
        localStorage.setItem('cica_last_seen_version', APP_VERSION);
      }
    } catch (e) {
      console.warn('Version check error in VersionWelcomeModal:', e);
    }
  }, []);

  const handleAcknowledge = () => {
    localStorage.setItem('cica_last_seen_version', APP_VERSION);
    setShowModal(false);
  };

  if (!showModal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl border border-pink-300 max-w-lg w-full overflow-hidden text-gray-900 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-600 via-rose-600 to-orange-500 p-5 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner border border-white/30 shrink-0 animate-bounce">
                🎉
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black tracking-tight">Sikeres Frissítés!</h3>
                  <span className="bg-white text-pink-700 font-extrabold text-xs px-2 py-0.5 rounded-full shadow-xs">
                    v{APP_VERSION}
                  </span>
                </div>
                <p className="text-pink-100 text-xs font-medium">
                  Az alkalmazás sikeresen megújult a legfrissebb verzióra.
                </p>
              </div>
            </div>
            <button
              onClick={handleAcknowledge}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="Bezárás"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1 text-sm">
            <div className="p-3 bg-pink-50/70 border border-pink-200 rounded-xl space-y-1">
              <h4 className="font-black text-pink-900 text-xs flex items-center gap-1.5">
                ✨ Újdonságok és friss fejlesztések
              </h4>
              <p className="text-gray-600 text-xs">
                Íme a legfontosabb új funkciók és javítások, amelyek bekerültek a v{APP_VERSION} verzióba:
              </p>
            </div>

            {changelogItems.length > 0 ? (
              <ul className="space-y-2.5">
                {changelogItems.map((change, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 bg-gray-50 p-2.5 rounded-xl border border-gray-200/80 text-xs text-gray-800 leading-relaxed font-medium"
                  >
                    <span className="text-pink-500 font-bold shrink-0 mt-0.5">🔹</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2 text-xs text-gray-700">
                <div className="p-2.5 bg-gray-50 rounded-xl border">
                  💳 <b>Pénzügyi kezelés modul:</b> Bevételek és kiadások tételes nyilvántartása, dinamikus mérleg és havi kimutatások.
                </div>
                <div className="p-2.5 bg-gray-50 rounded-xl border">
                  📊 <b>Nyomtatható kimutatások & CSV export:</b> Pénzügyi beszámolók készítése és letöltése.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-gray-500 font-medium">
              A részletes súgó bármikor elérhető a ❓ gombbal.
            </span>
            <button
              onClick={handleAcknowledge}
              className="py-2.5 px-5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer shrink-0"
            >
              Rendben, használatba veszem ✨
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
