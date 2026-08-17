import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FosterParent, FosterSupply, FosterExpense } from '../types';
import { FosterFormModal } from './FosterFormModal';
import { FosterSupplyModal } from './FosterSupplyModal';
import { FosterExpenseModal } from './FosterExpenseModal';
import { FosterAssignCatModal } from './FosterAssignCatModal';
import { FosterDetailModal } from './FosterDetailModal';

interface FosterViewProps {
  onOpenCatDetail?: (catId: string) => void;
}

export const FosterView: React.FC<FosterViewProps> = ({ onOpenCatDetail }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktiv' | 'szunetel' | 'available' | 'full'>('all');

  // Modal States
  const [fosterToEdit, setFosterToEdit] = useState<FosterParent | null | 'new'>(null);
  const [selectedFosterDetailId, setSelectedFosterDetailId] = useState<string | null>(null);
  const [assignCatFosterParent, setAssignCatFosterParent] = useState<FosterParent | null>(null);
  const [supplyModalFosterId, setSupplyModalFosterId] = useState<string | null | 'open'>(null);
  const [expenseModalFosterId, setExpenseModalFosterId] = useState<string | null | 'open'>(null);

  // Live Query DB Data
  const fosterParents = useLiveQuery(() => db.fosterParents.toArray(), []) || [];
  const allCats = useLiveQuery(() => db.cats.where('status').notEqual('elhunyt').toArray(), []) || [];
  const allSupplies = useLiveQuery(() => db.fosterSupplies.toArray(), []) || [];
  const allExpenses = useLiveQuery(() => db.fosterExpenses.toArray(), []) || [];

  // Seed sample data if empty
  useEffect(() => {
    const seedInitialFosterData = async () => {
      const count = await db.fosterParents.count();
      if (count === 0) {
        const sampleFosters: FosterParent[] = [
          {
            id: 'foster_1',
            name: 'Nagy Péter',
            phone: '+36 30 111 2233',
            email: 'peter.nagy@example.hu',
            city: 'Budapest, IV. kerület',
            address: 'Árpád út 45.',
            status: 'aktiv',
            maxCapacity: 4,
            housingType: 'lakas',
            acceptsKittens: true,
            acceptsSick: true,
            notes: 'Hálózott erkély, külön karantén szoba rendelkezésre áll.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'foster_2',
            name: 'Kovács Katalin',
            phone: '+36 20 444 5566',
            email: 'kata.kovacs@example.hu',
            city: 'Gödöllő',
            address: 'Petőfi Sándor u. 12.',
            status: 'aktiv',
            maxCapacity: 3,
            housingType: 'kertes_haz',
            acceptsKittens: true,
            acceptsSick: false,
            notes: 'Benti tartás, saját cica van, jól szocializált.',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'foster_3',
            name: 'Kertész József',
            phone: '+36 70 888 9900',
            email: 'jjozsef@example.hu',
            city: 'Szentendre',
            address: 'Duna korzó 8.',
            status: 'szunetel',
            maxCapacity: 2,
            housingType: 'lakas',
            acceptsKittens: false,
            acceptsSick: false,
            notes: 'Pillanatnyilag felújítás miatt szünetel a befogadás.',
            createdAt: new Date().toISOString(),
          },
        ];

        for (const foster of sampleFosters) {
          await db.fosterParents.put(foster);
        }

        // Link existing ideiglenes cats to first foster if any
        const ideiglenesCats = allCats.filter((c) => c.status === 'ideiglenes');
        if (ideiglenesCats.length > 0) {
          await db.cats.update(ideiglenesCats[0].id, { fosterId: 'foster_1' });
          if (ideiglenesCats.length > 1) {
            await db.cats.update(ideiglenesCats[1].id, { fosterId: 'foster_2' });
          }
        }
      }
    };

    seedInitialFosterData();
  }, [allCats]);

  // Compute Network Capacity KPI Stats
  const totalFostersCount = fosterParents.length;
  const activeFosters = fosterParents.filter((f) => f.status === 'aktiv');
  const totalMaxCapacity = fosterParents.reduce((sum, f) => sum + (f.maxCapacity || 0), 0);

  // Placed cats assigned to any foster parent or status 'ideiglenes'
  const fosterCats = allCats.filter((c) => c.status === 'ideiglenes' || !!c.fosterId);
  const totalPlacedCatsCount = fosterCats.length;
  const freeCapacityCount = Math.max(0, totalMaxCapacity - totalPlacedCatsCount);
  const networkOccupancyPercent = totalMaxCapacity > 0 ? Math.round((totalPlacedCatsCount / totalMaxCapacity) * 100) : 0;

  // Estimated Monthly Demands (Táp & Alom)
  // ~150g food / cat / day -> ~4.5kg / month
  // ~0.5kg litter / cat / day -> ~15kg / month
  const estimatedMonthlyFoodKg = Math.round(totalPlacedCatsCount * 4.5);
  const estimatedMonthlyLitterKg = Math.round(totalPlacedCatsCount * 15);

  // Total Expenses
  const totalExpenseSum = allExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // Filter Fosters List
  const filteredFosters = fosterParents.filter((f) => {
    const placedForFoster = allCats.filter((c) => c.fosterId === f.id).length;
    const isFull = placedForFoster >= f.maxCapacity;

    // Search filter
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.city && f.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (f.phone && f.phone.includes(searchTerm));

    // Status filter
    if (statusFilter === 'aktiv') return matchesSearch && f.status === 'aktiv';
    if (statusFilter === 'szunetel') return matchesSearch && f.status === 'szunetel';
    if (statusFilter === 'available') return matchesSearch && f.status === 'aktiv' && !isFull;
    if (statusFilter === 'full') return matchesSearch && isFull;

    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Section */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 rounded-3xl p-4 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-9xl opacity-10 pointer-events-none select-none">
          🏡
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold shadow-xs">
                🏡
              </div>
              <div>
                <h2 className="font-black text-lg sm:text-xl tracking-tight leading-tight flex items-center gap-2">
                  <span>Ideiglenes Befogadó Hálózat</span>
                  <span className="text-xs bg-pink-500/30 text-pink-200 border border-pink-400/30 px-2 py-0.5 rounded-full font-bold">
                    {totalFostersCount} Hálózati Tag
                  </span>
                </h2>
                <p className="text-xs text-indigo-200 font-medium">
                  Kapacitás-kihasználtság, táp- és alomigények, költségnyilvántartás
                </p>
              </div>
            </div>

            {/* Top Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFosterToEdit('new')}
                className="px-3.5 py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-2xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>➕ Új Befogadó</span>
              </button>
              <button
                onClick={() => setSupplyModalFosterId('open')}
                className="px-3.5 py-2 bg-amber-500/90 hover:bg-amber-600 text-white rounded-2xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🥫 Táp / Alom Kiadás</span>
              </button>
              <button
                onClick={() => setExpenseModalFosterId('open')}
                className="px-3.5 py-2 bg-emerald-600/90 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <span>💵 Költség Naplózás</span>
              </button>
            </div>
          </div>

          {/* KPI Metrics Dashboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            {/* KPI 1: Occupancy Rate */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-indigo-200 block">
                📊 Kihasználtság
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black">{networkOccupancyPercent}%</span>
                <span className="text-xs font-bold text-pink-200">{totalPlacedCatsCount} / {totalMaxCapacity} cica</span>
              </div>
              <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, networkOccupancyPercent)}%` }}
                />
              </div>
            </div>

            {/* KPI 2: Free Capacity */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-indigo-200 block">
                🟢 Szabad Helyek
              </span>
              <p className="text-xl font-black text-emerald-300">
                {freeCapacityCount} <span className="text-xs font-semibold text-white/80">férőhely</span>
              </p>
              <p className="text-[10px] text-indigo-200">
                {activeFosters.length} aktív fogadóképes hálózati tag
              </p>
            </div>

            {/* KPI 3: Food & Litter Monthly Demand */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-indigo-200 block">
                🥫 Havi Táp & Alom Igény
              </span>
              <p className="text-sm font-black text-amber-200 truncate">
                🍗 ~{estimatedMonthlyFoodKg} kg táp
              </p>
              <p className="text-xs font-extrabold text-amber-300 truncate">
                🪵 ~{estimatedMonthlyLitterKg} kg alom
              </p>
            </div>

            {/* KPI 4: Total Expenses */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-indigo-200 block">
                💵 Nevelési Költségek
              </span>
              <p className="text-xl font-black text-emerald-300">
                {totalExpenseSum.toLocaleString('hu-HU')} Ft
              </p>
              <p className="text-[10px] text-indigo-200">
                {allExpenses.length} rögzített kiadás tétel
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-2 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Keresés név, város, tel alapján..."
            className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
          <span className="absolute left-2.5 top-2.5 text-xs opacity-50">🔍</span>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white font-extrabold shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Mind ({fosterParents.length})
          </button>
          <button
            onClick={() => setStatusFilter('available')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              statusFilter === 'available'
                ? 'bg-emerald-600 text-white font-extrabold shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            🟢 Szabad Hely
          </button>
          <button
            onClick={() => setStatusFilter('full')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              statusFilter === 'full'
                ? 'bg-rose-600 text-white font-extrabold shadow-xs'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800'
            }`}
          >
            🔴 Telt Ház
          </button>
          <button
            onClick={() => setStatusFilter('szunetel')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer shrink-0 ${
              statusFilter === 'szunetel'
                ? 'bg-gray-700 text-white font-extrabold shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            ⚪ Szünetel
          </button>
        </div>
      </div>

      {/* Foster Cards Grid */}
      {filteredFosters.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-3">
          <span className="text-4xl">🏡</span>
          <h3 className="font-extrabold text-gray-800 text-sm">Nincs találat a kiválasztott szűrésre</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Módosítsa a keresési feltételeket, vagy vegyen fel új ideiglenes befogadót a hálózatba!
          </p>
          <button
            onClick={() => setFosterToEdit('new')}
            className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition cursor-pointer"
          >
            ➕ Új Befogadó Felvétele
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFosters.map((foster) => {
            const assignedCats = allCats.filter((c) => c.fosterId === foster.id);
            const occupancyCount = assignedCats.length;
            const isFull = occupancyCount >= foster.maxCapacity;
            const occupancyPercent = Math.round((occupancyCount / foster.maxCapacity) * 100);

            return (
              <div
                key={foster.id}
                className="bg-white rounded-3xl border border-gray-200/90 shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                {/* Card Top Section */}
                <div className="p-4 space-y-3">
                  {/* Name, Status & City */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-black text-lg shrink-0">
                        🏡
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-gray-900 truncate flex items-center gap-1.5">
                          <span>{foster.name}</span>
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium truncate">
                          📍 {foster.city || 'Cím nélkül'} {foster.phone ? `• 📞 ${foster.phone}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {foster.status === 'szunetel' ? (
                        <span className="bg-gray-100 text-gray-700 text-[10px] font-black px-2 py-0.5 rounded-full">⚪ Szünetel</span>
                      ) : isFull ? (
                        <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-0.5 rounded-full">🔴 Telt ház</span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">🟢 Szabad</span>
                      )}
                    </div>
                  </div>

                  {/* Occupancy Progress Bar */}
                  <div className="p-2.5 bg-gray-50 rounded-2xl border border-gray-200/70 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-gray-700">Férőhely használat:</span>
                      <span className={isFull ? 'text-rose-700 font-extrabold' : 'text-emerald-700 font-extrabold'}>
                        {occupancyCount} / {foster.maxCapacity} cica ({occupancyPercent}%)
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          occupancyPercent >= 100
                            ? 'bg-rose-500'
                            : occupancyPercent >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, occupancyPercent)}%` }}
                      />
                    </div>
                  </div>

                  {/* Assigned Cats Thumbnails */}
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-gray-500 tracking-wider block mb-1.5">
                      Nála elhelyezett cicák ({assignedCats.length}):
                    </span>

                    {assignedCats.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Jelenleg nincs nála cica.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedCats.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => onOpenCatDetail && onOpenCatDetail(cat.id)}
                            className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl text-xs font-extrabold text-pink-900 flex items-center gap-1 transition cursor-pointer"
                          >
                            <span>🐱</span>
                            <span>{cat.nev}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Housing & Special badges */}
                  <div className="flex flex-wrap gap-1 pt-1 text-[10px] font-bold text-gray-600">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-lg">
                      {foster.housingType === 'lakas' && '🏢 Lakás'}
                      {foster.housingType === 'kertes_haz' && '🏡 Kertes ház'}
                      {foster.housingType === 'karanten_szoba' && '🚪 Karantén szoba'}
                      {(!foster.housingType || foster.housingType === 'egyeb') && '📦 Egyéb'}
                    </span>
                    {foster.acceptsKittens && <span className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded-lg border border-purple-200">🍼 Kölyök OK</span>}
                    {foster.acceptsSick && <span className="bg-rose-50 text-rose-800 px-2 py-0.5 rounded-lg border border-rose-200">🩺 Beteg OK</span>}
                  </div>
                </div>

                {/* Card Actions Bottom */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAssignCatFosterParent(foster)}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl font-bold transition cursor-pointer"
                      title="Cica áthelyezése ide"
                    >
                      🐱 Cica ➕
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupplyModalFosterId(foster.id)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl font-bold transition cursor-pointer"
                      title="Táp / Alom csomag kiadása"
                    >
                      🥫 Táp
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpenseModalFosterId(foster.id)}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl font-bold transition cursor-pointer"
                      title="Költség rögzítése"
                    >
                      💵 Költség
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFosterToEdit(foster)}
                      className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-bold transition cursor-pointer"
                      title="Szerkesztés"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFosterDetailId(foster.id)}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold transition cursor-pointer"
                    >
                      Profil ➔
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALS */}
      {/* 1. Foster Form Modal (Add / Edit) */}
      {fosterToEdit && (
        <FosterFormModal
          fosterToEdit={fosterToEdit === 'new' ? null : fosterToEdit}
          onClose={() => setFosterToEdit(null)}
          onSaved={() => setFosterToEdit(null)}
        />
      )}

      {/* 2. Foster Detail Modal */}
      {selectedFosterDetailId && (
        <FosterDetailModal
          fosterId={selectedFosterDetailId}
          onClose={() => setSelectedFosterDetailId(null)}
          onEdit={(foster) => {
            setSelectedFosterDetailId(null);
            setFosterToEdit(foster);
          }}
          onOpenAssignCat={() => {
            const f = fosterParents.find((fp) => fp.id === selectedFosterDetailId);
            if (f) setAssignCatFosterParent(f);
          }}
          onOpenSupplyModal={() => setSupplyModalFosterId(selectedFosterDetailId)}
          onOpenExpenseModal={() => setExpenseModalFosterId(selectedFosterDetailId)}
          onOpenCatDetail={onOpenCatDetail}
        />
      )}

      {/* 3. Assign Cat Modal */}
      {assignCatFosterParent && (
        <FosterAssignCatModal
          fosterParent={assignCatFosterParent}
          onClose={() => setAssignCatFosterParent(null)}
          onSaved={() => {}}
          onOpenCatDetail={onOpenCatDetail}
        />
      )}

      {/* 4. Supply Modal */}
      {supplyModalFosterId && (
        <FosterSupplyModal
          initialFosterId={typeof supplyModalFosterId === 'string' && supplyModalFosterId !== 'open' ? supplyModalFosterId : undefined}
          onClose={() => setSupplyModalFosterId(null)}
          onSaved={() => setSupplyModalFosterId(null)}
        />
      )}

      {/* 5. Expense Modal */}
      {expenseModalFosterId && (
        <FosterExpenseModal
          initialFosterId={typeof expenseModalFosterId === 'string' && expenseModalFosterId !== 'open' ? expenseModalFosterId : undefined}
          onClose={() => setExpenseModalFosterId(null)}
          onSaved={() => setExpenseModalFosterId(null)}
        />
      )}
    </div>
  );
};
