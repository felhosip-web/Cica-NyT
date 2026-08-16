import React from 'react';
import { calculateAge } from '../js/utils/age.js';
import { useAppStore } from '../store/useAppStore';
import { getTagStyle, getTagIcon } from '../utils/tagUtils';

export interface Cat {
  id: string;
  sorszam?: string;
  nev: string;
  ivar: 'bak' | 'nosteny' | string;
  szin?: string;
  szuletes?: string;
  status: 'gondozasban' | 'gazdis' | 'ideiglenes' | 'elhunyt' | string;
  fosterId?: string;
  tags?: string[];
  intakeType?: string;
  hasKiskonyv?: boolean;
  kiskonyvSzam?: string;
  kiskonyvDate?: string;
  hasChip?: boolean;
  chipNumber?: string;
  chipDate?: string;
  chipLocation?: string;
  isSpayed?: boolean;
  spayedDate?: string;
  spayedLocation?: string;
  notes?: string;
  oltasok?: Array<{ nev: string; datum: string }>;
  kezelesek?: Array<{ nev: string; datum: string }>;
  tesztek?: Array<{ nev: string; datum: string; eredmeny?: string }>;
  fotoUrl?: string;
  created_at?: string;
  updated_at?: string;
}

interface CatCardProps {
  cat: Cat;
  onOpenDetail: (catId: string) => void;
  onEditCat: (cat: Cat) => void;
}

export const CatCard: React.FC<CatCardProps> = ({ cat, onOpenDetail, onEditCat }) => {
  const { getCurrentUserPermissions, cardInfoPockets } = useAppStore();
  const perms = getCurrentUserPermissions();
  const ageStr = cat.szuletes ? calculateAge(cat.szuletes) : 'Ismeretlen kor';
  const isBak = cat.ivar === 'bak';

  const statusBadge = () => {
    switch (cat.status) {
      case 'gazdis':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[11px] font-bold">🟢 Gazdis</span>;
      case 'ideiglenes':
        return <span className="bg-sky-100 text-sky-800 border border-sky-300 px-2 py-0.5 rounded-full text-[11px] font-bold">🔵 Ideiglenes</span>;
      case 'elhunyt':
        return <span className="bg-gray-100 text-gray-700 border border-gray-300 px-2 py-0.5 rounded-full text-[11px] font-bold">🖤 Elhunyt</span>;
      default:
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[11px] font-bold">🏡 Gondozásban</span>;
    }
  };

  const renderPocket = (pocket: { id: string; enabled: boolean; type: string }) => {
    if (!pocket.enabled || pocket.type === 'none') return null;

    switch (pocket.type) {
      case 'chip':
        return cat.chipNumber ? (
          <span key={pocket.id} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            🏷️ Chip: {cat.chipNumber}
          </span>
        ) : (
          <span key={pocket.id} className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            ⚠️ Chip hiányzik
          </span>
        );

      case 'vaccination': {
        const hasOltas = Array.isArray(cat.oltasok) && cat.oltasok.length > 0;
        return hasOltas ? (
          <span key={pocket.id} className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            💉 Oltva ({cat.oltasok?.length})
          </span>
        ) : (
          <span key={pocket.id} className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            💉 Nincs oltása
          </span>
        );
      }

      case 'spayed':
        return cat.isSpayed ? (
          <span key={pocket.id} className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            ✂️ Ivartalanítva
          </span>
        ) : (
          <span key={pocket.id} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            ✂️ Nem ivartalanított
          </span>
        );

      case 'color':
        return cat.szin ? (
          <span key={pocket.id} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium text-[11px] flex items-center gap-1">
            🎨 {cat.szin}
          </span>
        ) : null;

      case 'kiskonyv':
        return cat.hasKiskonyv ? (
          <span key={pocket.id} className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            📘 Kiskönyv megvan
          </span>
        ) : (
          <span key={pocket.id} className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            📘 Kiskönyv hiányzik
          </span>
        );

      case 'tests': {
        const hasTests = Array.isArray(cat.tesztek) && cat.tesztek.length > 0;
        return hasTests ? (
          <span key={pocket.id} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            🧪 Tesztelt ({cat.tesztek?.length})
          </span>
        ) : (
          <span key={pocket.id} className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            🧪 Tesztre vár
          </span>
        );
      }

      case 'intake':
        return (
          <span key={pocket.id} className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            🏠 {cat.intakeType === 'befogott' ? 'Befogott' : cat.intakeType === 'leadott' ? 'Leadott' : cat.intakeType === 'elkobzott' ? 'Elkobzott' : 'Saját gondozás'}
          </span>
        );

      case 'age':
        return (
          <span key={pocket.id} className="bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1">
            🎂 {ageStr}
          </span>
        );

      case 'cost':
      case 'medical_cost': {
        let totalCost = 0;
        if (Array.isArray(cat.oltasok)) cat.oltasok.forEach((i: any) => totalCost += Number(i.koltseg) || 0);
        if (Array.isArray(cat.kezelesek)) cat.kezelesek.forEach((i: any) => totalCost += Number(i.koltseg) || 0);
        if (Array.isArray(cat.tesztek)) cat.tesztek.forEach((i: any) => totalCost += Number(i.koltseg) || 0);
        return (
          <span key={pocket.id} className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 font-mono">
            💰 {totalCost.toLocaleString('hu-HU')} Ft
          </span>
        );
      }

      default:
        return null;
    }
  };

  const hasOltas = Array.isArray(cat.oltasok) && cat.oltasok.length > 0;

  return (
    <div
      onClick={() => onOpenDetail(cat.id)}
      className="bg-white border border-gray-200 hover:border-pink-300 rounded-2xl p-4 shadow-xs hover:shadow-md transition cursor-pointer flex flex-col justify-between group space-y-3"
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                #{cat.sorszam || cat.id.substring(0, 4)}
              </span>
              <h3 className="text-base font-extrabold text-gray-900 group-hover:text-pink-600 transition truncate">
                {cat.nev || 'Névtelen cica'}
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {isBak ? '♂️ Kandúr (Bak)' : '♀️ Nőstény'} • {ageStr}
            </p>
          </div>
          <div className="shrink-0">{statusBadge()}</div>
        </div>

        {/* Custom Tags / Status badges */}
        {cat.tags && cat.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1 text-[11px]">
            {cat.tags.map((tag) => (
              <span
                key={tag}
                className={`px-2 py-0.5 rounded-md font-bold border text-[10px] flex items-center gap-1 ${getTagStyle(tag)}`}
              >
                <span>{getTagIcon(tag)}</span>
                <span>{tag}</span>
              </span>
            ))}
          </div>
        )}

        {/* Configurable Info Badges / Pockets */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          {cardInfoPockets && cardInfoPockets.length > 0 ? (
            cardInfoPockets.map((pocket) => renderPocket(pocket))
          ) : (
            <>
              {cat.szin && (
                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-medium">
                  🎨 {cat.szin}
                </span>
              )}
              {cat.chipNumber ? (
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                  🏷️ Chip: {cat.chipNumber}
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                  ⚠️ Chip hiányzik
                </span>
              )}
              {hasOltas ? (
                <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold">
                  💉 Oltva ({cat.oltasok?.length})
                </span>
              ) : (
                <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md font-bold">
                  💉 Nincs oltása
                </span>
              )}
              {cat.isSpayed && (
                <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-md font-bold">
                  ✂️ Ivartalanítva
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="text-[11px] italic">
          {cat.intakeType === 'befogott'
            ? 'Befogott'
            : cat.intakeType === 'leadott'
            ? 'Leadott'
            : cat.intakeType === 'elkobzott'
            ? 'Elkobzott'
            : 'Saját gondozás'}
        </span>
        {perms.canEditCat ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEditCat(cat);
            }}
            className="px-2.5 py-1 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition font-semibold cursor-pointer"
          >
            ✏️ Szerkesztés
          </button>
        ) : (
          <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded">
            👁️ Csak Megtekintés
          </span>
        )}
      </div>
    </div>
  );
};
