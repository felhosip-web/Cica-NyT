import React, { useState } from 'react';
import { db } from '../js/db.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { FosterParent } from '../types';

interface FosterDetailModalProps {
  fosterId: string;
  onClose: () => void;
  onEdit: (foster: FosterParent) => void;
  onOpenAssignCat: () => void;
  onOpenSupplyModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenCatDetail?: (catId: string) => void;
}

export const FosterDetailModal: React.FC<FosterDetailModalProps> = ({
  fosterId,
  onClose,
  onEdit,
  onOpenAssignCat,
  onOpenSupplyModal,
  onOpenExpenseModal,
  onOpenCatDetail,
}) => {
  const [activeTab, setActiveTab] = useState<'cats' | 'calculator' | 'supplies' | 'expenses'>('cats');

  const foster = useLiveQuery(() => db.fosterParents.get(fosterId), [fosterId]);
  const assignedCats = useLiveQuery(() => db.cats.where('fosterId').equals(fosterId).toArray(), [fosterId]) || [];
  const supplies = useLiveQuery(() => db.fosterSupplies.where('fosterId').equals(fosterId).reverse().toArray(), [fosterId]) || [];
  const expenses = useLiveQuery(() => db.fosterExpenses.where('fosterId').equals(fosterId).reverse().toArray(), [fosterId]) || [];

  if (!foster) return null;

  const totalExpenseSum = expenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Food & Litter Calculator Estimations based on assigned cat count
  const catCount = assignedCats.length;
  // Estimated daily needs: ~150g dry/wet food per cat per day, ~0.5kg litter per cat per day
  const dailyFoodKg = Math.round(catCount * 0.15 * 10) / 10;
  const monthlyFoodKg = Math.round(catCount * 0.15 * 30);
  const monthlyLitterKg = Math.round(catCount * 0.5 * 30);

  const getStatusBadge = () => {
    if (foster.status === 'szunetel') return <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-full font-extrabold">⚪ Szünetel</span>;
    if (assignedCats.length >= foster.maxCapacity) return <span className="bg-rose-100 text-rose-800 text-xs px-2.5 py-1 rounded-full font-extrabold">🔴 Telt ház ({assignedCats.length}/{foster.maxCapacity})</span>;
    return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-extrabold">🟢 Szabad ({assignedCats.length}/{foster.maxCapacity})</span>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-600 p-5 text-white flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold shadow-xs">
              🏡
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-black text-lg leading-tight">{foster.name}</h2>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-indigo-100 font-medium mt-0.5">
                {foster.city ? `📍 ${foster.city}` : 'Település nélkül'} {foster.phone ? `• 📞 ${foster.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onEdit(foster)}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              ✏️ Szerkesztés
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Info Strip */}
        <div className="bg-indigo-50/70 p-3 px-5 border-b border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] font-bold text-indigo-800 uppercase block">Kapacitás</span>
            <span className="font-extrabold text-indigo-950">{assignedCats.length} / {foster.maxCapacity} cica</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-800 uppercase block">Lakhatás</span>
            <span className="font-extrabold text-indigo-950">
              {foster.housingType === 'lakas' && '🏢 Lakás'}
              {foster.housingType === 'kertes_haz' && '🏡 Kertes ház'}
              {foster.housingType === 'karanten_szoba' && '🚪 Karantén szoba'}
              {(!foster.housingType || foster.housingType === 'egyeb') && '📦 Egyéb'}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-800 uppercase block">Feltételek</span>
            <span className="font-semibold text-indigo-900 text-[11px]">
              {foster.acceptsKittens ? '🍼 Kölyök OK' : ''} {foster.acceptsSick ? '• 🩺 Beteg OK' : ''}
              {!foster.acceptsKittens && !foster.acceptsSick ? 'Alap feltételek' : ''}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-indigo-800 uppercase block">Összes Költség</span>
            <span className="font-black text-emerald-700">{totalExpenseSum.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('cats')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'cats'
                ? 'border-indigo-600 text-indigo-600 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🐱 Nála lévő cicák</span>
            <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full text-[10px]">{catCount}</span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'calculator'
                ? 'border-indigo-600 text-indigo-600 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🥫 Táp & Alom Igény</span>
          </button>

          <button
            onClick={() => setActiveTab('supplies')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'supplies'
                ? 'border-indigo-600 text-indigo-600 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>📦 Táp / Alom Kiadások</span>
            <span className="bg-gray-200 text-gray-800 px-1.5 py-0.2 rounded-full text-[10px]">{supplies.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2.5 px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'expenses'
                ? 'border-indigo-600 text-indigo-600 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>💵 Költség Napló</span>
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full text-[10px]">{expenses.length}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: Assigned Cats */}
          {activeTab === 'cats' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                  Gondozott cicák nála ({catCount})
                </h3>
                <button
                  onClick={onOpenAssignCat}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>➕ Cica áthelyezése</span>
                </button>
              </div>

              {assignedCats.length === 0 ? (
                <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-500">
                  Ennél az ideiglenes befogadónál jelenleg egyetlen cica sincs elhelyezve.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {assignedCats.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => onOpenCatDetail && onOpenCatDetail(cat.id)}
                      className="p-3 bg-white border border-gray-200 hover:border-indigo-400 rounded-2xl flex items-center gap-3 cursor-pointer transition shadow-2xs hover:shadow-xs"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                        🐱
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-xs text-gray-900 truncate">
                          {cat.nev} <span className="text-[10px] text-gray-400 font-normal">(#{cat.sorszam || cat.id.slice(0, 4)})</span>
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium truncate">
                          {cat.ivar === 'kan' ? '♂️ Kandúr' : '♀️ Nőstény'} • {cat.szin || 'Ismeretlen szín'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Food & Litter Calculator */}
          {activeTab === 'calculator' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="font-extrabold text-xs text-amber-950 uppercase tracking-wider">
                      Becsült Táp és Alom Szükséglet
                    </h3>
                    <p className="text-[11px] text-amber-800 font-medium">
                      A jelenleg elhelyezett {catCount} cica alapján számítva
                    </p>
                  </div>
                </div>
              </div>

              {catCount === 0 ? (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-500">
                  Nincs elhelyezett cica, így az automatikus táp- és alomigény 0 kg.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-orange-800 uppercase">🍗 Tápigény (Száraz + Nedves)</span>
                    <p className="text-xl font-black text-orange-950">{monthlyFoodKg} kg <span className="text-xs font-bold text-orange-700">/ hó</span></p>
                    <p className="text-[11px] text-orange-800 font-medium">~{dailyFoodKg} kg táp / nap</p>
                  </div>

                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-yellow-800 uppercase">🪵 Alomigény</span>
                    <p className="text-xl font-black text-yellow-950">{monthlyLitterKg} kg <span className="text-xs font-bold text-yellow-700">/ hó</span></p>
                    <p className="text-[11px] text-yellow-800 font-medium">~{catCount * 0.5} kg alom / nap</p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={onOpenSupplyModal}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs font-extrabold shadow-sm transition hover:from-amber-600 hover:to-orange-700 cursor-pointer"
                >
                  🥫 Táp / Alom Csomag Kiadása ➔
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Supplies Log */}
          {activeTab === 'supplies' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                  Kiadott csomagok és támogatások
                </h3>
                <button
                  onClick={onOpenSupplyModal}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>➕ Csomag kiadása</span>
                </button>
              </div>

              {supplies.length === 0 ? (
                <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-500">
                  Még nincs rögzítve táp- vagy alomkiadás ehhez a befogadóhoz.
                </div>
              ) : (
                <div className="space-y-2">
                  {supplies.map((sup) => (
                    <div key={sup.id} className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-extrabold text-gray-900">{sup.item}</p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {sup.quantity} {sup.unit} • {sup.date} {sup.notes ? `• ${sup.notes}` : ''}
                        </p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        sup.status === 'kiadva' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sup.status === 'kiadva' ? 'Kiadva' : 'Igényelve'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Expenses Log */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider">
                  Befogadóhoz tartozó költségek
                </h3>
                <button
                  onClick={onOpenExpenseModal}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <span>➕ Költség rögzítése</span>
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="p-6 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-500">
                  Még nincs költség naplózva ehhez a befogadóhoz.
                </div>
              ) : (
                <div className="space-y-2">
                  {expenses.map((exp) => (
                    <div key={exp.id} className="p-3 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-extrabold text-gray-900">{exp.description}</p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          {exp.date} • {exp.category.toUpperCase()} {exp.invoiceNo ? `• Szám: ${exp.invoiceNo}` : ''}
                        </p>
                      </div>
                      <span className="font-black text-emerald-700 text-sm">
                        {exp.amount.toLocaleString('hu-HU')} Ft
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold transition hover:bg-gray-900 cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
