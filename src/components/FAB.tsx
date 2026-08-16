import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

interface FABProps {
  onAddCat: () => void;
  onAddEvent: () => void;
}

export const FAB: React.FC<FABProps> = ({ onAddCat, onAddEvent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const footerMode = useAppStore((state) => state.footerMode);
  const isCompactActive = footerMode === 'compact' || footerMode === 'both';

  return (
    <div className={`fixed right-6 z-40 flex flex-col items-end gap-2 transition-all ${isCompactActive ? 'bottom-16' : 'bottom-6'}`}>
      {isOpen && (
        <div className="flex flex-col gap-2 items-end animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={() => {
              setIsOpen(false);
              onAddCat();
            }}
            className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 transition hover:scale-105"
          >
            🐾 Új Cica Felvétele
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onAddEvent();
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-2xl shadow-lg flex items-center gap-2 transition hover:scale-105"
          >
            📅 Új Esemény / Oltás
          </button>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-600 to-orange-500 text-white font-black text-2xl shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
        title="Gyors műveletek"
      >
        {isOpen ? '✕' : '➕'}
      </button>
    </div>
  );
};
