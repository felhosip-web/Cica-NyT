import React from 'react';
import { Cat } from '../CatCard';
import { calculateAge } from '../../utils/age';
const generateCatPdf = () => import('../../utils/pdf-export').then(m => m.generateCatPdf);
import { TabType } from './types';

interface CatDetailHeaderProps {
  cat: Cat;
  catEvents?: any[];
  onClose: () => void;
  onEditCat: (cat: Cat) => void;
  onDeleteRequest: () => void;
  activeSubTab: TabType;
  setActiveSubTab: (tab: TabType) => void;
  eventsCount: number;
  financesCount: number;
  suppliesCount: number;
}

export const CatDetailHeader: React.FC<CatDetailHeaderProps> = ({
  cat,
  catEvents,
  onClose,
  onEditCat,
  onDeleteRequest,
  activeSubTab,
  setActiveSubTab,
  eventsCount,
  financesCount,
  suppliesCount,
}) => {
  const ageStr = cat?.szuletes ? calculateAge(cat.szuletes) : 'Ismeretlen kor';

  return (
    <>
      <div className="p-4 bg-gradient-to-r from-pink-500 to-orange-400 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl font-black">
            🐾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded-md font-bold">
                #{cat.sorszam || cat.id.slice(0, 4)}
              </span>
              <h2 className="text-xl font-black">{cat.nev}</h2>
            </div>
            <p className="text-xs text-white/90 font-medium">
              {cat.ivar === 'bak' ? '♂️ Kandúr (Bak)' : '♀️ Nőstény'} • {ageStr} • {cat.szin || 'Szín nincs'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white font-bold text-xl">
          ✕
        </button>
      </div>

      <div className="px-4 py-2 bg-pink-50/50 border-b border-pink-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button
          onClick={() => onEditCat(cat)}
          className="px-3 py-1.5 bg-white border border-pink-200 text-pink-600 rounded-lg text-sm font-bold shadow-sm hover:bg-pink-50 transition-colors whitespace-nowrap flex items-center gap-1"
        >
          ✏️ Szerkesztés
        </button>
        <button
          onClick={async () => {
            try {
              const fn = await generateCatPdf();
              await fn(cat, { events: catEvents });
            } catch (err) {
              console.error('PDF generálási hiba:', err);
              alert('Hiba történt a PDF generálása során!');
            }
          }}
          className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer"
        >
          📄 Adatlap PDF
        </button>
        <button
          onClick={onDeleteRequest}
          className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold shadow-sm hover:bg-red-50 transition-colors whitespace-nowrap flex items-center gap-1 ml-auto"
        >
          🗑️ Törlés
        </button>
      </div>


      {/* Sub Tabs */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-100 bg-white shrink-0 px-2">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'profile' ? 'border-pink-600 text-pink-600 bg-white' : 'hover:text-gray-900'
          }`}
        >
          <span className="font-bold flex items-center gap-1.5"><span className="text-lg">🐾</span> Alapadatok</span>
        </button>
        <button
          onClick={() => setActiveSubTab('medical')}
          className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'medical' ? 'border-teal-600 text-teal-600 bg-teal-50' : 'hover:text-gray-900'
          }`}
        >
          <span className="font-bold flex items-center gap-1.5"><span className="text-lg">⚕️</span> Eü. & Napló</span>
        </button>
        <button
          onClick={() => setActiveSubTab('events')}
          className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'events' ? 'border-sky-600 text-sky-600 bg-sky-50' : 'hover:text-gray-900'
          }`}
        >
          <span className="font-bold flex items-center gap-1.5"><span className="text-lg">📅</span> Események</span>
        </button>
        <button
          onClick={() => setActiveSubTab('cost')}
          className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'cost' ? 'border-rose-600 text-rose-600 bg-rose-50' : 'hover:text-gray-900'
          }`}
        >
          <span className="font-bold flex items-center gap-1.5"><span className="text-lg">💰</span> Költségek</span>
        </button>
        <button
          onClick={() => setActiveSubTab('connected')}
          className={`py-3 px-3 border-b-2 transition whitespace-nowrap ${
            activeSubTab === 'connected' ? 'border-indigo-600 text-indigo-600 bg-indigo-50' : 'hover:text-gray-900'
          }`}
        >
          <span className="font-bold flex items-center gap-1.5"><span className="text-lg">🔗</span> Kapcsolt ({eventsCount + financesCount + suppliesCount})</span>
        </button>
      </div>

    </>
  );
};
