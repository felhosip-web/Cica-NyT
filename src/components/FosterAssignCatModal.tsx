import React, { useState } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FosterParent } from '../types';
import { CustomSelect } from './CustomSelect';

interface FosterAssignCatModalProps {
  fosterParent: FosterParent;
  onClose: () => void;
  onSaved: () => void;
  onOpenCatDetail?: (catId: string) => void;
}

export const FosterAssignCatModal: React.FC<FosterAssignCatModalProps> = ({
  fosterParent,
  onClose,
  onSaved,
  onOpenCatDetail,
}) => {
  // Get all cats in care or ideiglenes
  const allCats = useLiveQuery(() => db.cats.where('status').notEqual('elhunyt').toArray(), []) || [];

  // Currently assigned cats to this foster parent
  const assignedCats = allCats.filter((c) => c.fosterId === fosterParent.id);

  // Unassigned cats or cats assigned to others
  const unassignedCats = allCats.filter((c) => c.fosterId !== fosterParent.id && c.status !== 'gazdis');

  const [selectedCatIdToAssign, setSelectedCatIdToAssign] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAssign = async (catId: string) => {
    if (!catId) return;
    setIsProcessing(true);
    try {
      await db.cats.update(catId, {
        fosterId: fosterParent.id,
        status: 'ideiglenes',
      });
      setSelectedCatIdToAssign('');
      onSaved();
    } catch (err) {
      console.error('Hiba a cica hozzárendelésekor:', err);
      alert('Nem sikerült hozzárendelni a cicát!');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnassign = async (catId: string) => {
    if (!confirm('Biztosan eltávolítja a cicát ettől az ideiglenes befogadótól?')) return;
    setIsProcessing(true);
    try {
      await db.cats.update(catId, {
        fosterId: null,
        status: 'gondozasban',
      });
      onSaved();
    } catch (err) {
      console.error('Hiba a cica eltávolításakor:', err);
      alert('Nem sikerült eltávolítani a cicát!');
    } finally {
      setIsProcessing(false);
    }
  };

  const occupancyCount = assignedCats.length;
  const isFull = occupancyCount >= fosterParent.maxCapacity;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🐱</span>
            <div>
              <h2 className="font-extrabold text-base leading-tight">
                Cicák Hozzárendelése: {fosterParent.name}
              </h2>
              <p className="text-xs text-indigo-100 font-medium">
                {fosterParent.city || 'Kapacitás'}: {occupancyCount} / {fosterParent.maxCapacity} cica elhelyezve
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Capacity Banner */}
          <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
            isFull
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{isFull ? '🔴' : '🟢'}</span>
              <div>
                <p className="font-extrabold">
                  {isFull ? 'Telt ház! Minden férőhely betelt.' : `Szabad kapacitás: ${fosterParent.maxCapacity - occupancyCount} cica hely`}
                </p>
                <p className="text-[11px] opacity-80">
                  Max kapacitás: {fosterParent.maxCapacity} cica
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-black">{Math.round((occupancyCount / fosterParent.maxCapacity) * 100)}%</span>
              <p className="text-[10px] uppercase tracking-wide opacity-75">Kihasználtság</p>
            </div>
          </div>

          {/* Currently Assigned Cats */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>🏠 Nála lévő cicák ({assignedCats.length})</span>
            </h3>

            {assignedCats.length === 0 ? (
              <div className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-2xl text-center text-xs text-gray-500 font-medium">
                Jelenleg egyetlen cica sincs elhelyezve ennél a befogadónál.
              </div>
            ) : (
              <div className="space-y-2">
                {assignedCats.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2.5 bg-white border border-gray-200 rounded-2xl flex items-center justify-between gap-2 hover:border-indigo-300 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-400 to-rose-300 flex items-center justify-center text-lg shrink-0 font-bold text-white shadow-xs">
                        🐱
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenCatDetail && onOpenCatDetail(cat.id)}
                          className="font-extrabold text-xs text-gray-900 hover:text-indigo-600 text-left truncate block cursor-pointer"
                        >
                          {cat.nev} <span className="text-[10px] text-gray-500 font-normal">(#{cat.sorszam || cat.id.slice(0, 4)})</span>
                        </button>
                        <p className="text-[11px] text-gray-500 font-medium truncate">
                          {cat.ivar === 'kan' ? '♂️ Kandúr' : '♀️ Nőstény'} • {cat.szin || 'Szín nélkül'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleUnassign(cat.id)}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-bold transition cursor-pointer shrink-0"
                      title="Eltávolítás a befogadótól"
                    >
                      Eltávolítás 🚫
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assign New Cat Section */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2.5">
            <h3 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1.5">
              <span>➕ Új cica áthelyezése ide</span>
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <CustomSelect
                  value={selectedCatIdToAssign}
                  onChange={(val) => setSelectedCatIdToAssign(val)}
                  options={[
                    { value: '', label: '-- Válasszon elhelyezendő cicát --', icon: '🐾' },
                    ...unassignedCats.map((cat) => ({
                      value: cat.id,
                      label: `${cat.nev} (#${cat.sorszam || cat.id.slice(0, 4)})`,
                      icon: '🐱',
                      description: cat.status === 'ideiglenes' ? 'Másik ideiglenesnél' : 'Gondozásban',
                    })),
                  ]}
                  placeholder="-- Válasszon elhelyezendő cicát --"
                  title="🐱 Cica Kiválasztása Áthelyezéshez"
                  colorScheme="indigo"
                  buttonClassName="p-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-gray-900"
                />
              </div>

              <button
                type="button"
                disabled={!selectedCatIdToAssign || isProcessing}
                onClick={() => handleAssign(selectedCatIdToAssign)}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50 shrink-0 h-[42px] flex items-center"
              >
                Elhelyezés 🏡
              </button>
            </div>
            <p className="text-[10px] text-indigo-700 font-medium">
              A cica kiválasztása után automatikusan átáll 'ideiglenes' nevelési státuszba.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold transition hover:bg-gray-900 cursor-pointer"
          >
            Kész / Bezárás
          </button>
        </div>
      </div>
    </div>
  );
};
