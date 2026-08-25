import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export const BotDetection: React.FC = () => {
  const [isBotSuspected, setIsBotSuspected] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);
  const [hasChecked, setHasChecked] = useState<boolean>(false);

  useEffect(() => {
    // Basic bot detection heuristics
    const checkBot = () => {
      const isWebDriver = navigator.webdriver === true;
      const ua = navigator.userAgent?.toLowerCase() || '';
      const isBotUA = /bot|crawler|spider|crawling|headless|slurp|yandex|baidu|bingbot/i.test(ua);

      // Some simple heuristics for headless browsers
      const isHeadless = window.outerWidth === 0 && window.outerHeight === 0;

      if (isWebDriver || isBotUA || isHeadless) {
        setIsBotSuspected(true);
      } else {
        setShowSuccessToast(true);
        // Auto-hide success toast after 3 seconds
        setTimeout(() => setShowSuccessToast(false), 3000);
      }
      setHasChecked(true);
    };

    // Run check after a short delay to ensure app is mounted
    const timer = setTimeout(checkBot, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleConfirmHuman = () => {
    setIsBotSuspected(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  if (!hasChecked) return null;

  return (
    <>
      <AnimatePresence>
        {isBotSuspected && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-rose-200 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl mx-auto font-black shadow-inner">
                🤖
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900">
                  Gyanús tevékenység észlelve
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Rendszerünk automatizált hozzáférést (bot) érzékelt. Kérjük, erősítse meg, hogy Ön egy valós felhasználó.
                </p>
              </div>
              <button
                onClick={handleConfirmHuman}
                className="w-full py-3 mt-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer text-sm"
              >
                Nem vagyok robot
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessToast && !isBotSuspected && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[110] bg-emerald-500 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-400/50 flex items-center gap-3 backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg shrink-0">
              ✅
            </div>
            <div className="flex-1 pr-2">
              <p className="font-extrabold text-sm whitespace-nowrap">
                Emberi felhasználó megerősítve!
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
