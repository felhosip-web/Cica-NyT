import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/useAppStore';
import { fetchWithRenderWakeup } from '../utils/renderWakeup';
import { APP_VERSION } from '../version';

function isNewerVersion(serverVer: string, currentVer: string): boolean {
  if (!serverVer || !currentVer) return false;
  const p1 = serverVer.split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = currentVer.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const v1 = p1[i] || 0;
    const v2 = p2[i] || 0;
    if (v1 > v2) return true;
    if (v1 < v2) return false;
  }
  return false;
}

export const PwaToast: React.FC = () => {
  const {
    canInstall,
    isInstalled,
    isIos,
    updateAvailable,
    latestVersion,
    setDeferredPrompt,
    setCanInstall,
    setIsInstalled,
    setUpdateAvailable,
    triggerInstall,
    triggerUpdate,
    showIosHelpModal,
    setShowIosHelpModal,
    addDebugLog,
  } = useAppStore();

  const [dismissedInstallToast, setDismissedInstallToast] = useState(false);
  const [dismissedUpdateToast, setDismissedUpdateToast] = useState(false);

  // Initialize PWA event listeners & SW checks
  useEffect(() => {
    // 1. Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      addDebugLog('[PWA] beforeinstallprompt event captured');
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // 2. Listen for appinstalled
    const handleAppInstalled = () => {
      addDebugLog('[PWA] App installed successfully');
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. Register & monitor Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          addDebugLog(`[PWA] Service Worker registered in scope: ${reg.scope}`);

          if (reg.waiting) {
            addDebugLog('[PWA] SW waiting worker found');
            setUpdateAvailable(true);
          }

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  addDebugLog('[PWA] SW update installed and waiting');
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] SW registration failed:', err);
        });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        addDebugLog('[PWA] Service Worker controller changed');
      });
    }

    // 4. Periodically check version.json with Render cold-start wake-up support
    const checkVersionJson = async () => {
      try {
        const res = await fetchWithRenderWakeup(
          `/version.json?t=${Date.now()}`,
          {},
          {
            maxRetries: 3,
            timeoutMs: 30000,
            retryDelayMs: 4000,
            onProgress: (status) => {
              if (status.isWakingUp) {
                addDebugLog(`[PWA Render] Szerver ébresztése... (Próbálkozás ${status.attempt}/${status.maxRetries})`);
              }
            },
          }
        );
        if (!res.ok) return;
        const data = await res.json();

        if (data.version && isNewerVersion(data.version, APP_VERSION)) {
          addDebugLog(`[PWA] Newer version available: server=${data.version}, client=${APP_VERSION}`);
          setUpdateAvailable(true, data.version);
        } else {
          localStorage.setItem('appVersion', APP_VERSION);
          setUpdateAvailable(false);
        }
      } catch (e: any) {
        console.warn('[PWA] Version check failed (Render sleeping/unreachable):', e?.message || e);
      }
    };

    checkVersionJson();
    const interval = setInterval(checkVersionJson, 1000 * 60 * 15); // check every 15 min

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, [setDeferredPrompt, setCanInstall, setIsInstalled, setUpdateAvailable, addDebugLog]);

  const showInstallToast = !isInstalled && (canInstall || isIos) && !dismissedInstallToast && !updateAvailable;
  const showUpdateToast = updateAvailable && !dismissedUpdateToast;

  return (
    <>
      {/* Toast Notification Container */}
      <AnimatePresence>
        {/* Scenario 1: Update Toast */}
        {showUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-pink-500/40 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center text-xl shrink-0 font-black animate-bounce">
                🚀
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    Új frissítés érhető el!
                    {latestVersion && (
                      <span className="text-[10px] bg-pink-500 text-white px-1.5 py-0.5 rounded-md font-bold">
                        v{latestVersion}
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={() => setDismissedUpdateToast(true)}
                    className="text-gray-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                    title="Bezárás"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Megjelent a Cica-NyT újabb verziója. Frissítsd az alkalmazást a legújabb funkciókért!
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={triggerUpdate}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>🔄</span>
                    <span>Frissítés most</span>
                  </button>
                  <button
                    onClick={() => setDismissedUpdateToast(true)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Később
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scenario 2: Install Toast */}
        {showInstallToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-50 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-purple-500/40 backdrop-blur-md"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-400/30 flex items-center justify-center text-xl shrink-0 font-black">
                📲
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    Telepítsd az alkalmazást!
                  </h4>
                  <button
                    onClick={() => setDismissedInstallToast(true)}
                    className="text-gray-400 hover:text-white text-xs font-bold p-1 cursor-pointer"
                    title="Bezárás"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Add hozzá a Cica-NyT-t a telefonodhoz vagy gépedhez az azonnali elérésért és offline használatért!
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={triggerInstall}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>📲</span>
                    <span>Telepítés</span>
                  </button>
                  <button
                    onClick={() => setDismissedInstallToast(true)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Később
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Instruction Modal */}
      {showIosHelpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150 text-gray-900 border border-purple-200">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
              🍏
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-gray-900">
                Telepítés iPhone / iPad-re
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Kövesd ezt a 3 egyszerű lépést a kezdőképernyőre helyezéshez:
              </p>
            </div>

            <div className="space-y-2 text-xs bg-purple-50 p-3.5 rounded-xl border border-purple-200 font-medium text-purple-950">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>Koppints a böngésző <strong>Megosztás (⬆️)</strong> gombjára.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>Görgess le és válaszd a <strong>"Hozzáadás a kezdőképernyőhöz" ➕</strong> opciót.</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>Nyomd meg a <strong>"Hozzáadás"</strong> gombot a jobb felső sarokban.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIosHelpModal(false)}
              className="w-full py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-xl transition text-xs cursor-pointer shadow-md"
            >
              Értem, bezárás
            </button>
          </div>
        </div>
      )}
    </>
  );
};
