import React from 'react';
import { Cat } from '../CatCard';
import { BaseTabProps } from './types';
import { getTagStyle, getTagIcon } from '../../utils/tagUtils';
import { formatAuditDate } from '../../utils/audit';

interface CatDetailProfileTabProps extends BaseTabProps {
  onEditCat: (cat: Cat) => void;
  vaxCost: number;
  medCost: number;
  testCost: number;
  eventCost: number;
  fosterCost: number;
  totalCatCost: number;

  totalFinanceIncome: number;
  totalMedicalDirect: number;

  netCatBalance: number;
  setFinType: (val: any) => void;
  setFinCategory: (val: any) => void;
  setFinAmount: (val: any) => void;
  setFinTitle: (val: any) => void;
  setShowAddFinanceModal: (val: boolean) => void;
  setShowAddLogModal: (val: any) => void;
  setActiveSubTab: (val: string) => void;
}

export const CatDetailProfileTab: React.FC<CatDetailProfileTabProps> = ({
  cat,
  onEditCat,
  vaxCost,
  medCost,
  testCost,
  eventCost,
  fosterCost,
  totalCatCost,

  totalFinanceIncome,
  totalMedicalDirect,
  netCatBalance,
  setFinType,
  setFinCategory,
  setFinAmount,
  setFinTitle,
  setShowAddFinanceModal,
  setShowAddLogModal,
  setActiveSubTab
}) => {
  return (
    <>
<div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Gondozási Státusz</span>
                  <p className="font-extrabold text-sm text-gray-900">{cat.status || 'Gondozásban'}</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Bekerülés Típusa</span>
                  <p className="font-extrabold text-sm text-gray-900">
                    {cat.intakeType === 'befogott'
                      ? 'Befogott kóbor'
                      : cat.intakeType === 'leadott'
                      ? 'Gazda által leadott'
                      : cat.intakeType === 'elkobzott'
                      ? 'Elkobzott állat'
                      : cat.intakeType === 'sajat'
                      ? 'Saját mentés'
                      : (cat.intakeType || 'Saját gondozás')}
                  </p>
                </div>
              </div>

              {/* 💰 Cica Összköltség Kimutatás (Total Cost Summary & Breakdown Widget) */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border border-indigo-500/30 shadow-md space-y-3">
                <div className="flex items-center justify-between border-b border-indigo-900/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">💰</span>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-indigo-200">
                      Cica Összköltség Kimutatás & Mérleg
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('cost')}
                    className="text-[10px] font-bold text-pink-300 hover:text-pink-100 bg-pink-950/60 hover:bg-pink-900 border border-pink-700/50 px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Részletes Költségkarton</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* 3 Main KPIs */}
                <div className="grid grid-cols-3 gap-2 text-center font-mono">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-rose-900/50">
                    <span className="text-[9px] uppercase font-bold text-rose-300 block">💸 Összes Kiadás</span>
                    <span className="text-xs sm:text-sm font-black text-rose-100">
                      {totalCatCost.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-emerald-900/50">
                    <span className="text-[9px] uppercase font-bold text-emerald-300 block">💖 Célzott Bevételek</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-100">
                      {totalFinanceIncome.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>

                  <div className={`p-2.5 rounded-xl border ${
                    netCatBalance >= 0
                      ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200'
                      : 'bg-amber-950/60 border-amber-700/60 text-amber-200'
                  }`}>
                    <span className="text-[9px] uppercase font-bold block">⚖️ Nettó Egyenleg</span>
                    <span className="text-xs sm:text-sm font-black">
                      {netCatBalance >= 0 ? `+${netCatBalance.toLocaleString('hu-HU')}` : netCatBalance.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>

                {/* Cost Distribution Progress Bar (if totalCatCost > 0) */}
                {totalCatCost > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-300 font-sans font-medium">
                      <span>Költségmegoszlás aránya:</span>
                      <span className="font-mono text-indigo-300">
                        Orvosi: {Math.round((totalMedicalDirect / (totalCatCost || 1)) * 100)}% • Egyéb/Ellátás: {100 - Math.round((totalMedicalDirect / (totalCatCost || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex border border-slate-700">
                      {vaxCost > 0 && (
                        <div
                          style={{ width: `${(vaxCost / totalCatCost) * 100}%` }}
                          className="bg-purple-500 h-full"
                          title={`Oltások: ${vaxCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {medCost > 0 && (
                        <div
                          style={{ width: `${(medCost / totalCatCost) * 100}%` }}
                          className="bg-teal-500 h-full"
                          title={`Kezelések: ${medCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {testCost > 0 && (
                        <div
                          style={{ width: `${(testCost / totalCatCost) * 100}%` }}
                          className="bg-amber-500 h-full"
                          title={`Tesztek: ${testCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {eventCost > 0 && (
                        <div
                          style={{ width: `${(eventCost / totalCatCost) * 100}%` }}
                          className="bg-sky-500 h-full"
                          title={`Események: ${eventCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                      {fosterCost > 0 && (
                        <div
                          style={{ width: `${(fosterCost / totalCatCost) * 100}%` }}
                          className="bg-rose-500 h-full"
                          title={`Befogadói ellátás: ${fosterCost.toLocaleString('hu-HU')} Ft`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Subcategory Pill Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono pt-0.5">
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-purple-200">
                    <span>💉 Oltások:</span>
                    <span className="font-bold">{vaxCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-teal-200">
                    <span>🩺 Kezelések:</span>
                    <span className="font-bold">{medCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-amber-200">
                    <span>🔬 Tesztek:</span>
                    <span className="font-bold">{testCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                  <div className="bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 flex justify-between items-center text-sky-200">
                    <span>📅 Események:</span>
                    <span className="font-bold">{eventCost.toLocaleString('hu-HU')} Ft</span>
                  </div>
                </div>

                {/* Quick Add Expense Action */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFinType('kiadas');
                      setFinCategory('orvosi');
                      setFinAmount('');
                      setFinTitle('');
                      setShowAddFinanceModal(true);
                    }}
                    className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg text-[11px] transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>➕ Pénzügyi Tétel Rögzítése</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddLogModal('kezeles')}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg text-[11px] transition cursor-pointer"
                  >
                    <span>🩺 + Kezelés Költséggel</span>
                  </button>
                </div>
              </div>

              {/* 🏷️ Egyedi Címkék (Tags / Állapotok) */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-purple-800 tracking-wider">🏷️ Egyedi Címkék & Állapotok</span>
                  <button
                    onClick={() => onEditCat(cat as Cat)}
                    className="text-[10px] text-purple-700 hover:text-purple-900 font-bold bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded transition"
                  >
                    ✏️ Címkék Módosítása
                  </button>
                </div>
                {cat.tags && cat.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {cat.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border flex items-center gap-1 ${getTagStyle(tag)}`}
                      >
                        <span>{getTagIcon(tag)}</span>
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-purple-800 italic">Nincsenek egyedi címkék hozzárendelve.</p>
                )}
              </div>

              {/* Microchip */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700">🏷️ Mikrochip Adatok</span>
                <p className="font-extrabold text-sm text-emerald-900">
                  {cat.chipNumber ? `Chip No: ${cat.chipNumber}` : '⚠️ Nincs mikrochip behelyezve'}
                </p>
                {cat.chipDate && <p className="text-[11px] text-emerald-700">Behelyezés ideje: {cat.chipDate}</p>}
                {(cat as any).chipLocation && <p className="text-[11px] text-emerald-700">Rendelő / hely: {(cat as any).chipLocation}</p>}
              </div>

              {/* Spay / Neuter */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-teal-700">✂️ Ivartalanítás</span>
                <p className="font-extrabold text-sm text-teal-900">
                  {cat.isSpayed ? '✅ Ivartalanítva' : '❌ Még nincs ivartalanítva'}
                </p>
                {(cat as any).spayedDate && <p className="text-[11px] text-teal-700">Dátum: {(cat as any).spayedDate}</p>}
                {(cat as any).spayedLocation && <p className="text-[11px] text-teal-700">Rendelő: {(cat as any).spayedLocation}</p>}
              </div>

              {/* Kiskönyv */}
              <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-pink-700">📘 Oltási Kiskönyv</span>
                  <p className="font-bold text-gray-900">
                    {cat.hasKiskonyv
                      ? `Van oltási kiskönyve${(cat as any).kiskonyvSzam ? ` (#${(cat as any).kiskonyvSzam})` : ''}`
                      : 'Nincs oltási kiskönyv'}
                  </p>
                  {(cat as any).kiskonyvDate && (
                    <p className="text-[11px] text-pink-700">Kiállítás ideje: {(cat as any).kiskonyvDate}</p>
                  )}
                </div>
                <span className="text-xl">{cat.hasKiskonyv ? '📘' : '📑'}</span>
              </div>

              {/* Audit Info Card */}
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 space-y-2 col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 flex items-center gap-1">
                    <span>🛡️</span>
                    <span>Audit & Bejegyzési Információk</span>
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono">ID: {cat.id}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Létrehozta</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>👤</span>
                      <span>{(cat as any).created_by_name || 'Rendszer'}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {formatAuditDate((cat as any).created_at || (cat as any).created)}
                    </div>
                  </div>
                  <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Utoljára Módosította</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>✏️</span>
                      <span>{(cat as any).updated_by_name || (cat as any).created_by_name || 'Rendszer'}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {formatAuditDate((cat as any).updated_at || (cat as any).updatedAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>    </>
  );
};
