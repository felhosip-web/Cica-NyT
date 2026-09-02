import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface MobileWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const MobileWarningModal: React.FC<MobileWarningModalProps> = ({
  isOpen,
  onClose,
  title = '🖥️ Csak Desktopon Aktív Munkaterület',
  message = 'A vizuális interaktív kártya- és összefüggés-vászon kizárólag Asztali Gépen (Desktop / PC / Laptop) érhető el a kényelmes vászon-irányítás, a nagy képernyős felbontás és a komplex koordináta-vezérlés miatt. Kérjük, nyisd meg az alkalmazást asztali böngészőből!',
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-100 relative">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl p-2 bg-amber-950 border border-amber-700/80 rounded-2xl">📱</span>
              <div>
                <h4 className="font-extrabold text-sm text-amber-300">{title}</h4>
                <p className="text-[10px] font-mono text-slate-400">Rendszer Értesítés</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-300 leading-relaxed space-y-2">
            <p>{message}</p>
            <div className="p-2.5 bg-amber-950/60 border border-amber-700/80 rounded-xl text-[11px] text-amber-200 font-medium flex items-center gap-1.5">
              <span>💡</span>
              <span>Tipp: Nagyobb kijelzőn az egérgörgővel és koordináta-vonszolással szabadon mozoghat a vásznon!</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-black rounded-xl shadow-lg transition cursor-pointer text-xs"
            >
              Rendben, Megértettem
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
};
