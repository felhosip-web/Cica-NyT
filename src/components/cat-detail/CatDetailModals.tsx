import React from 'react';
import { FinanceType, FinanceCategory, PaymentMethod, InventoryItem } from '../../types';
import { CustomSelect } from '../CustomSelect';

export const CatDetailMedicalLogModal = ({
  showAddLogModal,
  setShowAddLogModal,
  logName,
  setLogName,
  logDate,
  setLogDate,
  logCost,
  setLogCost,
  logNotes,
  setLogNotes,
  syncMedicalToFinance,
  setSyncMedicalToFinance,
  handleAddMedicalLog
}: any) => {
  if (!showAddLogModal) return null;
  return (
<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3">
            <h4 className="font-black text-sm text-gray-900">
              ➕ Új {showAddLogModal === 'oltas' ? 'Védőoltás' : showAddLogModal === 'kezeles' ? 'Kezelés' : 'Teszt'} Rögzítése
            </h4>

            <form onSubmit={handleAddMedicalLog} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Megnevezés:</label>
                <input
                  type="text"
                  required
                  value={logName}
                  onChange={(e) => setLogName(e.target.value)}
                  placeholder="pl. Kombinált oltás..."
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dátum:</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Költség (Ft):</label>
                <input
                  type="number"
                  value={logCost}
                  onChange={(e) => setLogCost(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0"
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              {Number(logCost) > 0 && (
                <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-xl">
                  <label className="text-[11px] font-bold text-pink-950 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncMedicalToFinance}
                      onChange={(e) => setSyncMedicalToFinance(e.target.checked)}
                      className="w-3.5 h-3.5 text-pink-600 rounded"
                    />
                    <span>💳 Automatikus rögzítés a Pénzügyi Mérlegben is</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogModal(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 font-bold rounded-lg"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-pink-600 text-white font-bold rounded-lg shadow-xs"
                >
                  Hozzáadás
                </button>
              </div>
            </form>
          </div>
        </div>  );
};

export const CatDetailFinanceModal = ({
  cat,
  showAddFinanceModal,
  setShowAddFinanceModal,
  finType,
  setFinType,
  finCategory,
  setFinCategory,
  finAmount,
  setFinAmount,
  finTitle,
  setFinTitle,
  finDate,
  setFinDate,
  finPartner,
  setFinPartner,
  finPaymentMethod,
  setFinPaymentMethod,
  finInvoiceNumber,
  setFinInvoiceNumber,
  isSubmittingFin,
  handleAddFinance
}: any) => {
  if (!showAddFinanceModal) return null;
  return (
<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <span>💰</span>
                <span>Pénzügyi Tétel Rögzítése - {cat.nev}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddFinanceModal(false)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFinance} className="space-y-3 text-xs">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFinType('kiadas');
                    setFinCategory('orvosi');
                  }}
                  className={`py-2 rounded-xl font-bold border transition ${
                    finType === 'kiadas'
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  💸 Kiadás (Költség)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFinType('bevetel');
                    setFinCategory('adomany');
                  }}
                  className={`py-2 rounded-xl font-bold border transition ${
                    finType === 'bevetel'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  💖 Célzott Adomány / Bevétel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kategória:</label>
                  <CustomSelect
                    value={finCategory}
                    onChange={(val) => setFinCategory(val as any)}
                    options={
                      finType === 'kiadas'
                        ? [
                            { value: 'orvosi', label: 'Orvosi számla', icon: '🩺' },
                            { value: 'tap_alom', label: 'Táp & Alom', icon: '🍲' },
                            { value: 'felszereles', label: 'Felszerelés', icon: '📦' },
                            { value: 'szallitas', label: 'Szállítás', icon: '🚗' },
                            { value: 'egyeb', label: 'Egyéb kiadás', icon: '📝' },
                          ]
                        : [
                            { value: 'adomany', label: 'Célzott adomány', icon: '💖' },
                            { value: 'orokbefogadas', label: 'Örökbefogadási díj', icon: '🏠' },
                            { value: 'egyeb', label: 'Egyéb bevétel', icon: '📝' },
                          ]
                    }
                    title="Pénzügyi Kategória Kiválasztása"
                    colorScheme={finType === 'kiadas' ? 'rose' : 'emerald'}
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Összeg (Ft) *:</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={finAmount}
                    onChange={(e) => setFinAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="pl. 15000"
                    className="w-full p-2 bg-gray-50 border rounded-xl font-black font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Megnevezés / Leírás *:</label>
                <input
                  type="text"
                  required
                  value={finTitle}
                  onChange={(e) => setFinTitle(e.target.value)}
                  placeholder={finType === 'kiadas' ? 'pl. Vérvétel és infúzió' : 'pl. Kovács Anna célzott támogatása'}
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dátum:</label>
                  <input
                    type="date"
                    required
                    value={finDate}
                    onChange={(e) => setFinDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Fizetési Mód:</label>
                  <CustomSelect
                    value={finPaymentMethod}
                    onChange={(val) => setFinPaymentMethod(val as any)}
                    options={[
                      { value: 'bankkartya', label: 'Bankkártya', icon: '💳' },
                      { value: 'keszpenz', label: 'Készpénz', icon: '💵' },
                      { value: 'banki_atutalas', label: 'Átutalás', icon: '🏦' },
                      { value: 'paypal', label: 'Online/PayPal', icon: '🌐' },
                    ]}
                    title="Fizetési Mód Kiválasztása"
                    colorScheme="indigo"
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Partner / Támogató neve:</label>
                  <input
                    type="text"
                    value={finPartner}
                    onChange={(e) => setFinPartner(e.target.value)}
                    placeholder="pl. Alpha-Vet vagy Adományozó"
                    className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Bizonylatszám:</label>
                  <input
                    type="text"
                    value={finInvoiceNumber}
                    onChange={(e) => setFinInvoiceNumber(e.target.value)}
                    placeholder="pl. SZ-2026/102"
                    className="w-full p-2 bg-gray-50 border rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddFinanceModal(false)}
                  className="px-3.5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFin}
                  className={`px-4 py-2 text-white font-extrabold rounded-xl shadow-xs transition ${
                    finType === 'bevetel' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingFin ? 'Mentés...' : 'Tétel Mentése 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>  );
};

export const CatDetailSupplyModal = ({
  cat,
  showAddSupplyModal,
  setShowAddSupplyModal,
  supplyType,
  setSupplyType,
  supplyItem,
  setSupplyItem,
  supplyQty,
  setSupplyQty,
  supplyUnit,
  setSupplyUnit,
  supplyDate,
  setSupplyDate,
  supplyStatus,
  setSupplyStatus,
  supplyNotes,
  setSupplyNotes,
  supplyDeductInventory,
  setSupplyDeductInventory,
  isSavingSupply,
  allInventoryItems,
  handleAddSupply
}: any) => {
  if (!showAddSupplyModal) return null;
  return (
<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-3 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-extrabold text-sm text-gray-900 flex items-center gap-1.5">
                <span>📦</span>
                <span>Készletigény / Ellátmány Rögzítése - {cat.nev}</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSupplyModal(false)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCatSupply} className="space-y-3 text-xs">
              {/* Type Switcher */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Ellátmány Típusa:</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1 text-[11px]">
                  {(['tap', 'alom', 'gyogyszer', 'felszereles', 'egyeb'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSupplyType(t);
                        setSupplyItem('');
                      }}
                      className={`p-1.5 rounded-lg font-bold border text-center transition capitalize ${
                        supplyType === t
                          ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {t === 'tap' ? '🍲 Táp' : t === 'alom' ? '📦 Alom' : t === 'gyogyszer' ? '💊 Gyógyszer' : t === 'felszereles' ? '🧺 Felszerelés' : '🧩 Egyéb'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preset Chips */}
              <div>
                <label className="block font-bold text-gray-500 text-[10px] mb-1">Gyakori Sablonok (Kattints a beíráshoz):</label>
                <div className="flex flex-wrap gap-1">
                  {getSupplyPresetItems().map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSupplyItem(preset)}
                      className="px-2 py-0.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 text-gray-700 border border-gray-200 rounded text-[10px] font-medium transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Tétel Megnevezése / Márkája *</label>
                <input
                  type="text"
                  required
                  value={supplyItem}
                  onChange={(e) => setSupplyItem(e.target.value)}
                  placeholder="pl. Royal Canin Kitten / Milprazon..."
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium focus:bg-white focus:outline-teal-500"
                />
              </div>

              {/* Qty & Unit */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mennyiség *</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={supplyQty}
                    onChange={(e) => setSupplyQty(e.target.value ? Number(e.target.value) : '')}
                    className="w-full p-2 bg-gray-50 border rounded-xl font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Mértékegység *</label>
                  <CustomSelect
                    value={supplyUnit}
                    onChange={(val) => setSupplyUnit(val as any)}
                    options={[
                      { value: 'db', label: 'db (Darab)', icon: '🔢' },
                      { value: 'kg', label: 'kg (Kilogramm)', icon: '⚖️' },
                      { value: 'tasak', label: 'tasak / alutasak', icon: '🍲' },
                      { value: 'doboz', label: 'doboz / konzerv', icon: '🥫' },
                      { value: 'zsak', label: 'zsák', icon: '📦' },
                      { value: 'pipetta', label: 'pipetta / ampulla', icon: '💧' },
                    ]}
                    title="Mértékegység Kiválasztása"
                    colorScheme="emerald"
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Dátum *</label>
                  <input
                    type="date"
                    required
                    value={supplyDate}
                    onChange={(e) => setSupplyDate(e.target.value)}
                    className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Státusz *</label>
                  <CustomSelect
                    value={supplyStatus}
                    onChange={(val) => setSupplyStatus(val as any)}
                    options={[
                      { value: 'kiadva', label: 'Kiadva (Átadva)', icon: '📦' },
                      { value: 'igenyelve', label: 'Igényelve (Függőben)', icon: '⏳' },
                      { value: 'teljesitve', label: 'Teljesítve', icon: '✅' },
                    ]}
                    title="Adag Státusz Kiválasztása"
                    colorScheme="emerald"
                    buttonClassName="p-2 bg-gray-50 border rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Deduct from Inventory Checkbox */}
              <div className="p-2.5 bg-teal-50 border border-teal-200 rounded-xl">
                <label className="text-[11px] font-bold text-teal-950 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supplyDeductInventory}
                    onChange={(e) => setSupplyDeductInventory(e.target.checked)}
                    className="w-3.5 h-3.5 text-teal-600 rounded"
                  />
                  <span>📦 Levonás a Központi Raktárkészletből (Kimenő raktári tétel)</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Megjegyzés / Részletek:</label>
                <textarea
                  rows={2}
                  value={supplyNotes}
                  onChange={(e) => setSupplyNotes(e.target.value)}
                  placeholder="pl. 2 heti adag az ideiglenes befogadónak / napi 1 tabletta..."
                  className="w-full p-2 bg-gray-50 border rounded-xl font-medium"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddSupplyModal(false)}
                  className="px-3.5 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupply}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-xs transition"
                >
                  {isSavingSupply ? 'Mentés...' : 'Készletigény Mentése 💾'}
                </button>
              </div>
            </form>
          </div>
        </div>  );
};
