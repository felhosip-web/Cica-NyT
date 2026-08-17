import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { FosterSupply, FosterParent } from '../types';
import { CustomSelect } from './CustomSelect';

interface FosterSupplyModalProps {
  initialFosterId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export const FosterSupplyModal: React.FC<FosterSupplyModalProps> = ({
  initialFosterId,
  onClose,
  onSaved,
}) => {
  const fosterParents = useLiveQuery(() => db.fosterParents.toArray(), []) || [];

  const [fosterId, setFosterId] = useState<string>(initialFosterId || '');
  const [type, setType] = useState<'tap' | 'alom' | 'gyogyszer' | 'felszereles' | 'egyeb'>('tap');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<'kg' | 'db' | 'tasak' | 'zsak' | 'doboz'>('kg');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'igenyelve' | 'kiadva' | 'teljesitve'>('kiadva');
  const [deductFromInventory, setDeductFromInventory] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!fosterId && fosterParents.length > 0) {
      setFosterId(fosterParents[0].id);
    }
  }, [fosterParents, fosterId]);

  // Preset suggestions based on supply type
  const getPresetItems = () => {
    switch (type) {
      case 'tap':
        return ['Felnőtt száraztáp (Csirke)', 'Felnőtt nedvestáp (Konzerv)', 'Kölyöktáp (Junior)', 'Szenzitív / Gyógytáp'];
      case 'alom':
        return ['Bentonit alom (Csomósodó)', 'Szilikát alom', 'Növényi / Faalom', 'Hipotoxikus alom'];
      case 'gyogyszer':
        return ['Féregtelenítő paszta/tabletta', 'Bolha & Kullancs spot-on', 'Szemcsepp', 'Probiotikum'];
      case 'felszereles':
        return ['Alomtálca & Lapát', 'Műanyag hordozó', 'Kaparófa / Fekhely', 'Etető / Itató tálka'];
      default:
        return ['Fertőtlenítőszer / Tisztítószer', 'Játékok', 'Jutalomfalat'];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fosterId) {
      alert('Kérjük, válasszon ideiglenes befogadót!');
      return;
    }
    if (!item.trim()) {
      alert('Kérjük, adja meg a kiadott / igényelt tétel megnevezését!');
      return;
    }

    setIsSaving(true);
    try {
      const selectedFoster = fosterParents.find((f) => f.id === fosterId);
      const fosterName = selectedFoster ? selectedFoster.name : 'Ideiglenes befogadó';

      const payload: FosterSupply = {
        fosterId,
        type,
        item: item.trim(),
        quantity: Math.max(0.1, Number(quantity) || 1),
        unit,
        date: date || new Date().toISOString().split('T')[0],
        status,
        notes: notes.trim() || undefined,
      };

      const supplyId = await db.fosterSupplies.add(payload);

      // Deduct from central warehouse inventory if requested and handed out
      if (deductFromInventory && (status === 'kiadva' || status === 'teljesitve')) {
        let invItemType: 'nedves_tap' | 'szaraz_tap' | 'alom' = 'nedves_tap';
        const itemLower = item.toLowerCase();
        if (type === 'alom' || itemLower.includes('alom')) {
          invItemType = 'alom';
        } else if (itemLower.includes('száraz') || itemLower.includes('szaraz') || itemLower.includes('granulátum') || unit === 'kg') {
          invItemType = 'szaraz_tap';
        } else {
          invItemType = 'nedves_tap';
        }

        let invUnit: 'db' | 'kg' | 'csomag' | 'zsak' | 'l' = 'db';
        if (unit === 'kg') invUnit = 'kg';
        else if (unit === 'zsak') invUnit = 'zsak';
        else if (unit === 'tasak' || unit === 'doboz' || unit === 'db') invUnit = 'db';

        const inventoryPayload = {
          direction: 'kimeno' as const,
          itemType: invItemType,
          brandOrName: item.trim(),
          quantity: Math.max(0.1, Number(quantity) || 1),
          unit: invUnit,
          date: date || new Date().toISOString().split('T')[0],
          sourceOrRecipient: `${fosterName} (Befogadó)`,
          destination: selectedFoster ? `${selectedFoster.city || ''} ${selectedFoster.address || ''}`.trim() : undefined,
          notes: `Befogadói ellátmány (${status === 'kiadva' ? 'Kiadva' : 'Teljesítve'}). ${notes ? `Megj: ${notes}` : ''}`,
          fosterSupplyId: supplyId,
          syncStatus: 'pending' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (db.inventory) {
          await db.inventory.add(inventoryPayload);
        }
      }

      onSaved();
    } catch (err) {
      console.error('Hiba a táp/alom kiadás rögzítésekor:', err);
      alert('Nem sikerült elmenteni a tétel kiadását!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥫</span>
            <div>
              <h2 className="font-extrabold text-base leading-tight">
                Táp & Alom / Felszerelés Kiadás
              </h2>
              <p className="text-xs text-amber-100 font-medium">
                Ideiglenes befogadó támogatásának naplózása
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
          {/* Select Foster Parent */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Ideiglenes Befogadó <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              value={fosterId}
              onChange={(val) => setFosterId(val)}
              options={[
                { value: '', label: '-- Válasszon befogadót --', icon: '👤' },
                ...fosterParents.map((f) => ({
                  value: f.id,
                  label: f.name,
                  icon: '🏡',
                  badge: `${f.maxCapacity} cica kapacitás`,
                  description: f.city || 'Cím nélkül',
                })),
              ]}
              placeholder="-- Válasszon befogadót --"
              title="🏡 Ideiglenes Befogadó Kiválasztása"
              colorScheme="amber"
              buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-extrabold text-gray-900"
            />
          </div>

          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Típus</label>
              <CustomSelect
                value={type}
                onChange={(val) => {
                  const newType = val as any;
                  setType(newType);
                  setItem('');
                  if (newType === 'tap' || newType === 'alom') setUnit('kg');
                  else setUnit('db');
                }}
                options={[
                  { value: 'tap', label: 'Táp (Száraz / Nedves)', icon: '🍖' },
                  { value: 'alom', label: 'Alom (Bentonit / Fa)', icon: '🪵' },
                  { value: 'gyogyszer', label: 'Gyógyszer / Parazitairtó', icon: '💊' },
                  { value: 'felszereles', label: 'Felszerelés / Hordozó', icon: '🛏️' },
                  { value: 'egyeb', label: 'Egyéb tétel', icon: '📦' },
                ]}
                title="Ellátmány Típusának Kiválasztása"
                colorScheme="amber"
                buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Státusz</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as any)}
                options={[
                  { value: 'kiadva', label: 'Kiadva / Átadva', icon: '✅' },
                  { value: 'igenyelve', label: 'Igényelve (Függőben)', icon: '🟡' },
                  { value: 'teljesitve', label: 'Teljesítve', icon: '🟢' },
                ]}
                title="Kiadási Státusz Kiválasztása"
                colorScheme="amber"
                buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
              />
            </div>
          </div>

          {/* Item Name with Presets */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Tétel megnevezése <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="Pl. Royal Canin Mother & Babycat 10kg"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:bg-white transition mb-1.5"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1">
              {getPresetItems().map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setItem(preset)}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold rounded-lg border border-amber-200 cursor-pointer transition"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Unit & Date */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mennyiség</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={quantity}
                onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-black text-gray-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Egység</label>
              <CustomSelect
                value={unit}
                onChange={(val) => setUnit(val as any)}
                options={[
                  { value: 'kg', label: 'kg', icon: '⚖️' },
                  { value: 'zsak', label: 'zsák', icon: '🛍️' },
                  { value: 'tasak', label: 'tasak / alutasak', icon: '🍲' },
                  { value: 'db', label: 'db', icon: '📦' },
                  { value: 'doboz', label: 'doboz', icon: '🎁' },
                ]}
                title="Mértékegység Kiválasztása"
                colorScheme="amber"
                buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Dátum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Warehouse Deduction Toggle */}
          {(status === 'kiadva' || status === 'teljesitve') && (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deductFromInventory}
                  onChange={(e) => setDeductFromInventory(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <span>📦 Automatikus levonás a Központi Raktárkészletből</span>
              </label>
              <span className="text-[10px] bg-amber-200 text-amber-950 font-extrabold px-2 py-0.5 rounded-full">
                Kimenő tétel
              </span>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Megjegyzés</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pl. 2 hétre elegendő csomag, átvette Mária..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Rögzítés...' : 'Tétel Rögzítése 🥫'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
