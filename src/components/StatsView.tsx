import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';
import { VisualEntityGraphModal } from './VisualEntityGraphModal';
import { MobileWarningModal } from './MobileWarningModal';
import { TnrRecord } from '../types';
import { CatWeightHistoryModal } from './CatWeightHistoryModal';

interface StatsViewProps {
  onOpenUiCustomization?: () => void;
  onOpenPdfReports?: () => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ onOpenUiCustomization, onOpenPdfReports }) => {
  const { healthCoverageItems } = useAppStore();
  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];
  const events = useLiveQuery(() => db.events.toArray(), []) || [];
  const tnrRecords = (useLiveQuery(() => db.tnr.toArray(), []) || []) as TnrRecord[];

  // Modal States
  const [showVisualGraphModal, setShowVisualGraphModal] = useState(false);
  const [showWeightHistoryModal, setShowWeightHistoryModal] = useState(false);
  const [showMobileWarningModal, setShowMobileWarningModal] = useState(false);

  const handleOpenVisualGraph = () => {
    // Check if user is on mobile or small screen / touch device
    const isMobile = window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024);
    if (isMobile) {
      setShowMobileWarningModal(true);
    } else {
      setShowVisualGraphModal(true);
    }
  };

  const totalCats = cats.length;
  const activeCats = cats.filter((c) => c.status === 'gondozasban' || c.status === 'ideiglenes').length;
  const gazdisCats = cats.filter((c) => c.status === 'gazdis').length;
  const spayedCount = cats.filter((c) => c.isSpayed).length;

  // Intake types breakdown
  const sajatCount = cats.filter((c) => c.intakeType === 'sajat' || !c.intakeType).length;
  const befogottCount = cats.filter((c) => c.intakeType === 'befogott').length;
  const leadottCount = cats.filter((c) => c.intakeType === 'leadott').length;
  const elkobzottCount = cats.filter((c) => c.intakeType === 'elkobzott').length;

  // Costs calculation
  let oltasokCost = 0;
  let kezelesekCost = 0;
  let tesztekCost = 0;

  cats.forEach((cat) => {
    if (Array.isArray(cat.oltasok)) {
      cat.oltasok.forEach((item: any) => {
        oltasokCost += Number(item.koltseg) || 0;
      });
    }
    if (Array.isArray(cat.kezelesek)) {
      cat.kezelesek.forEach((item: any) => {
        kezelesekCost += Number(item.koltseg) || 0;
      });
    }
    if (Array.isArray(cat.tesztek)) {
      cat.tesztek.forEach((item: any) => {
        tesztekCost += Number(item.koltseg) || 0;
      });
    }
  });

  let eventsCost = 0;
  events.forEach((ev) => {
    eventsCost += Number(ev.cost) || 0;
  });

  const totalCost = oltasokCost + kezelesekCost + tesztekCost + eventsCost;

  // Calculate count for a health coverage item
  const getItemCount = (type: string) => {
    switch (type) {
      case 'chipped':
        return cats.filter((c) => c.chipNumber).length;
      case 'kiskonyv':
        return cats.filter((c) => c.hasKiskonyv).length;
      case 'spayed':
        return cats.filter((c) => c.isSpayed).length;
      case 'vaccinated':
        return cats.filter((c) => Array.isArray(c.oltasok) && c.oltasok.length > 0).length;
      case 'tested':
        return cats.filter((c) => Array.isArray(c.tesztek) && c.tesztek.length > 0).length;
      case 'treated':
        return cats.filter((c) => Array.isArray(c.kezelesek) && c.kezelesek.length > 0).length;
      case 'elhunyt':
        return cats.filter((c) => c.status === 'elhunyt').length;
      default:
        return 0;
    }
  };

  const activeHealthItems = healthCoverageItems.filter((i) => i.enabled);

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
        <h3 className="text-lg font-black text-gray-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="flex items-center gap-2">📊 Menhelyi Állomány & Statisztikák</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenVisualGraph}
              className="text-xs bg-gradient-to-r from-purple-700 via-indigo-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 text-white font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              title="Állatok - Események - TNR Összefüggések Interaktív Canvas (Desktop)"
            >
              <span>🌐</span>
              <span>Vizuális megjelenítés</span>
            </button>
            <button
              onClick={() => setShowWeightHistoryModal(true)}
              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>⚖️</span>
              <span>Egy cica súly útja</span>
            </button>
            {onOpenPdfReports && (
              <button
                onClick={onOpenPdfReports}
                className="text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>📄</span>
                <span>PDF Riport Generálása</span>
              </button>
            )}
            {onOpenUiCustomization && (
              <button
                onClick={onOpenUiCustomization}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 border border-gray-300"
              >
                <span>🛠️</span>
                <span>Felületi elemek testreszabása</span>
              </button>
            )}
          </div>
        </h3>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold">
          <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl space-y-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Összes Cica</span>
            <p className="text-2xl font-black text-pink-600">{totalCats}</p>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Gondozásban</span>
            <p className="text-2xl font-black text-amber-600">{activeCats}</p>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Gazdis Lett</span>
            <p className="text-2xl font-black text-emerald-600">{gazdisCats}</p>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
            <span className="text-gray-500 uppercase tracking-wider text-[10px]">Ivartalanítva</span>
            <p className="text-2xl font-black text-teal-600">{spayedCount}</p>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Intake Type Stats */}
          <div className="p-4 bg-sky-50/60 border border-sky-200 rounded-xl space-y-2 text-xs">
            <h4 className="font-extrabold text-sky-900 uppercase tracking-wider text-[11px] border-b border-sky-200 pb-1 flex items-center gap-1.5">
              📥 Bekerülés Típusa Megoszlás
            </h4>
            <div className="flex justify-between py-1 border-b border-sky-100">
              <span className="text-gray-700 font-medium">🏡 Saját mentés:</span>
              <span className="font-bold text-gray-900 font-mono">
                {sajatCount} cica {totalCats > 0 ? `(${Math.round((sajatCount / totalCats) * 100)}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-sky-100">
              <span className="text-gray-700 font-medium">🐾 Befogott kóbor:</span>
              <span className="font-bold text-gray-900 font-mono">
                {befogottCount} cica {totalCats > 0 ? `(${Math.round((befogottCount / totalCats) * 100)}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-sky-100">
              <span className="text-gray-700 font-medium">📦 Gazda által leadott:</span>
              <span className="font-bold text-gray-900 font-mono">
                {leadottCount} cica {totalCats > 0 ? `(${Math.round((leadottCount / totalCats) * 100)}%)` : ''}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-sky-100">
              <span className="text-sky-950 font-bold flex items-center gap-1">
                <span>⚖️</span>
                <span>Elkobzott:</span>
              </span>
              <span className="font-bold text-sky-900 font-mono bg-sky-100 px-1.5 py-0.5 rounded">
                {elkobzottCount} cica {totalCats > 0 ? `(${Math.round((elkobzottCount / totalCats) * 100)}%)` : ''}
              </span>
            </div>
          </div>
          {/* Health Stats */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between items-center border-b pb-1">
              <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                🏷️ Egészségügyi Ellátottság
              </h4>
              {onOpenUiCustomization && (
                <button
                  onClick={onOpenUiCustomization}
                  className="text-[10px] text-pink-600 hover:text-pink-800 font-extrabold cursor-pointer hover:underline flex items-center gap-0.5"
                  title="Lista elemeinek módosítása"
                >
                  <span>✏️</span>
                  <span>Szerkesztés</span>
                </button>
              )}
            </div>

            {activeHealthItems.length === 0 ? (
              <p className="text-gray-400 italic py-2 text-center text-xs">
                Nincs megjeleníthető elem. Kattints a felületi elemek módosítása gombra!
              </p>
            ) : (
              activeHealthItems.map((item) => {
                const count = getItemCount(item.type);
                const percentage = item.showPercentage && totalCats > 0 ? Math.round((count / totalCats) * 100) : null;

                return (
                  <div key={item.id} className="flex justify-between py-1 border-b border-gray-200 last:border-0">
                    <span className="flex items-center gap-1.5 font-medium text-gray-700">
                      <span>{item.icon}</span>
                      <span>{item.label}:</span>
                    </span>
                    <span className="font-bold text-gray-900 font-mono">
                      {count} cica
                      {percentage !== null && <span className="text-gray-500 font-normal text-[11px] ml-1">({percentage}%)</span>}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="p-4 bg-pink-50/50 border border-pink-200 rounded-xl space-y-2 text-xs">
            <h4 className="font-extrabold text-pink-900 uppercase tracking-wider text-[11px] border-b border-pink-200 pb-1">
              💰 Összesített Költségek
            </h4>
            <div className="flex justify-between py-1 border-b border-pink-100">
              <span>Védőoltások költsége:</span>
              <span className="font-bold font-mono">{oltasokCost.toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between py-1 border-b border-pink-100">
              <span>Orvosi kezelések költsége:</span>
              <span className="font-bold font-mono">{kezelesekCost.toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between py-1 border-b border-pink-100">
              <span>Szűrések & Tesztek költsége:</span>
              <span className="font-bold font-mono">{tesztekCost.toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="flex justify-between py-1 border-b border-pink-100">
              <span>Naptári események költsége:</span>
              <span className="font-bold font-mono">{eventsCost.toLocaleString('hu-HU')} Ft</span>
            </div>
            <div className="pt-2 flex justify-between font-black text-sm text-pink-700">
              <span>TELJES KÖLTSÉG:</span>
              <span className="font-mono">{totalCost.toLocaleString('hu-HU')} Ft</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Entity Graph Canvas Modal (Desktop) */}
      <VisualEntityGraphModal
        isOpen={showVisualGraphModal}
        onClose={() => setShowVisualGraphModal(false)}
        cats={cats}
        events={events}
        tnrRecords={tnrRecords}
      />

      {/* Mobile Device Warning Notification Modal */}
      <CatWeightHistoryModal
        isOpen={showWeightHistoryModal}
        onClose={() => setShowWeightHistoryModal(false)}
      />

      <MobileWarningModal
        isOpen={showMobileWarningModal}
        onClose={() => setShowMobileWarningModal(false)}
      />
    </div>
  );
};

