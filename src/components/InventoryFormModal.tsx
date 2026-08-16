import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  InventoryDirection,
  InventoryCategory,
  InventoryUnit,
  InventorySourceType,
  PaymentMethod,
  FinancialTransaction,
} from '../types';
import { db } from '../lib/db';
import { syncService } from '../services/sync-service';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../store/useAppStore';
import { CustomSelect } from './CustomSelect';

interface InventoryFormModalProps {
  itemToEdit?: InventoryItem | null;
  onClose: () => void;
  defaultDirection?: InventoryDirection;
}

export const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  itemToEdit,
  onClose,
  defaultDirection = 'bejovo',
}) => {
  const { getCurrentUser } = useAppStore();
  const currentUser = getCurrentUser();
  const fosterParents = useLiveQuery(() => db.fosterParents.toArray(), []) || [];

  const [direction, setDirection] = useState<InventoryDirection>(
    itemToEdit?.direction || defaultDirection
  );
  const [itemType, setItemType] = useState<InventoryCategory>(
    itemToEdit?.itemType || 'nedves_tap'
  );
  const [sourceType, setSourceType] = useState<InventorySourceType>(
    itemToEdit?.sourceType || 'adomany'
  );
  const [date, setDate] = useState<string>(
    itemToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [expiryDate, setExpiryDate] = useState<string>(
    itemToEdit?.expiryDate || ''
  );
  const [batchNumber, setBatchNumber] = useState<string>(
    itemToEdit?.batchNumber || ''
  );
  const [targetAgeOrCondition, setTargetAgeOrCondition] = useState<string>(
    itemToEdit?.targetAgeOrCondition || ''
  );
  const [minStockThreshold, setMinStockThreshold] = useState<number | ''>(
    itemToEdit?.minStockThreshold ?? ''
  );
  const [sourceOrRecipient, setSourceOrRecipient] = useState<string>(
    itemToEdit?.sourceOrRecipient || ''
  );
  const [destination, setDestination] = useState<string>(
    itemToEdit?.destination || ''
  );
  const [brandOrName, setBrandOrName] = useState<string>(
    itemToEdit?.brandOrName || ''
  );
  const [quantity, setQuantity] = useState<number | ''>(
    itemToEdit?.quantity ?? 1
  );

  // Financial Integration States
  const [syncToFinance, setSyncToFinance] = useState(true);
  const [purchaseCost, setPurchaseCost] = useState<number | ''>(itemToEdit?.purchaseCost || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bankkartya');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');

  // Determine initial unit
  const getInitialUnit = (cat: InventoryCategory): InventoryUnit => {
    if (itemToEdit?.unit) return itemToEdit.unit;
    switch (cat) {
      case 'nedves_tap':
        return 'db';
      case 'szaraz_tap':
        return 'kg';
      case 'alom':
        return 'kg';
      case 'gyogyszer':
        return 'doboz';
      case 'parazitamentesito':
        return 'pipetta';
      case 'felszereles':
        return 'db';
      case 'higienia_fertotlenito':
        return 'l';
      case 'egyeb':
      default:
        return 'db';
    }
  };

  const [unit, setUnit] = useState<InventoryUnit>(itemToEdit?.unit || getInitialUnit(itemType));
  const [notes, setNotes] = useState<string>(itemToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-adjust unit when itemType changes
  const handleItemTypeChange = (newType: InventoryCategory) => {
    setItemType(newType);
    setUnit(getInitialUnit(newType));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceOrRecipient.trim()) {
      alert(direction === 'bejovo' ? 'Kérjük adja meg a forrást / adományozót!' : 'Kérjük adja meg a címzettet!');
      return;
    }
    const parsedQty = Number(quantity);
    if (!parsedQty || parsedQty <= 0) {
      alert('Kérjük adjon meg érvényes, 0-nál nagyobb mennyiséget!');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      let linkedFinanceId = itemToEdit?.financeId;

      // Handle Finance transaction creation/sync if purchased
      if (direction === 'bejovo' && sourceType === 'sajat_kor' && syncToFinance && purchaseCost && Number(purchaseCost) > 0) {
        let financeCategory: any = 'tap_alom';
        let itemCategoryName = 'Készlet';

        switch (itemType) {
          case 'nedves_tap':
            itemCategoryName = 'Nedves táp';
            financeCategory = 'tap_alom';
            break;
          case 'szaraz_tap':
            itemCategoryName = 'Száraz táp';
            financeCategory = 'tap_alom';
            break;
          case 'alom':
            itemCategoryName = 'Alom';
            financeCategory = 'tap_alom';
            break;
          case 'gyogyszer':
            itemCategoryName = 'Gyógyszer';
            financeCategory = 'orvosi';
            break;
          case 'parazitamentesito':
            itemCategoryName = 'Parazitamentesítő';
            financeCategory = 'orvosi';
            break;
          case 'felszereles':
            itemCategoryName = 'Felszerelés';
            financeCategory = 'felszereles';
            break;
          case 'higienia_fertotlenito':
            itemCategoryName = 'Higiénia / Fertőtlenítő';
            financeCategory = 'mukodes';
            break;
          case 'egyeb':
          default:
            itemCategoryName = 'Egyéb készlet';
            financeCategory = 'egyeb';
            break;
        }

        const financePayload: Partial<FinancialTransaction> = {
          type: 'kiadas',
          category: financeCategory,
          amount: Math.round(Number(purchaseCost)),
          date,
          title: `Készlet vásárlás: ${itemCategoryName} - ${brandOrName.trim() || itemCategoryName} (${parsedQty} ${unit})`,
          partnerName: sourceOrRecipient.trim(),
          paymentMethod,
          status: 'teljesult',
          invoiceNumber: invoiceNumber.trim() || undefined,
          sourceModule: 'inventory_purchase',
          notes: notes.trim() || undefined,
          updatedAt: now,
          created_by_name: currentUser?.name || 'Munkatárs',
        };

        if (linkedFinanceId && db.finances) {
          await db.finances.update(linkedFinanceId, financePayload);
        } else if (db.finances) {
          financePayload.createdAt = now;
          financePayload.syncStatus = 'pending';
          const newFinId = await db.finances.add(financePayload);
          linkedFinanceId = newFinId;
        }
      }

      const payload: InventoryItem = {
        ...(itemToEdit?.id ? { id: itemToEdit.id } : {}),
        direction,
        itemType,
        sourceType: direction === 'bejovo' ? sourceType : undefined,
        brandOrName: brandOrName.trim(),
        quantity: parsedQty,
        unit,
        date,
        expiryDate: expiryDate ? expiryDate : undefined,
        batchNumber: batchNumber.trim() || undefined,
        targetAgeOrCondition: targetAgeOrCondition.trim() || undefined,
        minStockThreshold: minStockThreshold !== '' ? Number(minStockThreshold) : undefined,
        sourceOrRecipient: sourceOrRecipient.trim(),
        destination: direction === 'kimeno' ? destination.trim() : undefined,
        notes: notes.trim(),
        purchaseCost: direction === 'bejovo' && sourceType === 'sajat_kor' && purchaseCost ? Number(purchaseCost) : undefined,
        financeId: linkedFinanceId,
        updatedAt: now,
        createdAt: itemToEdit?.createdAt || now,
        syncStatus: 'pending',
      };

      await syncService.queueInventorySync(payload);
      onClose();
    } catch (err) {
      console.error('Error saving inventory item:', err);
      alert('Hiba történt a készlet rekord mentése során!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = { colorScheme: 'light' as const };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white text-slate-900 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between rounded-t-3xl border-b ${
            direction === 'bejovo'
              ? 'bg-emerald-800 border-emerald-900 text-white'
              : 'bg-blue-800 border-blue-900 text-white'
          }`}
          style={{
            backgroundColor: direction === 'bejovo' ? '#065f46' : '#1e40af',
            color: '#ffffff',
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl p-2 bg-white/10 rounded-2xl shrink-0">
              {direction === 'bejovo' ? '📥' : '📤'}
            </span>
            <div>
              <h2
                className="text-base sm:text-lg font-black tracking-tight leading-tight"
                style={{ color: '#ffffff' }}
              >
                {itemToEdit
                  ? `Készlet Bejegyzés Módosítása (${direction === 'bejovo' ? 'Bejövő' : 'Kimenő'})`
                  : direction === 'bejovo'
                  ? 'Új Bejövő Készlet (Adomány / Vásárlás)'
                  : 'Új Kimenő Készlet (Kiadás)'}
              </h2>
              <p
                className="text-xs font-semibold opacity-90 mt-0.5"
                style={{ color: '#e2e8f0' }}
              >
                Alom és Táp Készletnyilvántartás
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 font-black text-sm flex items-center justify-center transition cursor-pointer shrink-0"
            style={{ color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            aria-label="Bezárás"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 bg-white text-slate-900">
          {/* Irány Választó Toggle */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
              Készlet Mozgás Iránya:
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setDirection('bejovo')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  direction === 'bejovo'
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-900 bg-white hover:bg-slate-50 border border-slate-300'
                }`}
                style={{
                  backgroundColor: direction === 'bejovo' ? '#047857' : '#ffffff',
                  color: direction === 'bejovo' ? '#ffffff' : '#0f172a',
                }}
              >
                <span>📥 Bejövő</span>
                <span className="text-[10px] font-bold opacity-90">(Adomány / Vétel)</span>
              </button>
              <button
                type="button"
                onClick={() => setDirection('kimeno')}
                className={`py-2 px-3 rounded-xl font-extrabold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  direction === 'kimeno'
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-900 bg-white hover:bg-slate-50 border border-slate-300'
                }`}
                style={{
                  backgroundColor: direction === 'kimeno' ? '#1d4ed8' : '#ffffff',
                  color: direction === 'kimeno' ? '#ffffff' : '#0f172a',
                }}
              >
                <span>📤 Kimenő</span>
                <span className="text-[10px] font-bold opacity-90">(Kiadás / Használat)</span>
              </button>
            </div>
          </div>

          {/* Subtype for Inbound */}
          {direction === 'bejovo' && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
              <label className="block text-xs font-black text-emerald-950">
                🎁 Bejövő Forrás Típusa:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  sourceType === 'adomany'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="sourceType"
                    value="adomany"
                    checked={sourceType === 'adomany'}
                    onChange={() => setSourceType('adomany')}
                    className="sr-only"
                  />
                  <span>🎁 Adomány</span>
                </label>
                <label className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition ${
                  sourceType === 'sajat_kor'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                }`}>
                  <input
                    type="radio"
                    name="sourceType"
                    value="sajat_kor"
                    checked={sourceType === 'sajat_kor'}
                    onChange={() => setSourceType('sajat_kor')}
                    className="sr-only"
                  />
                  <span>🛒 Vett (saját/menhelyi)</span>
                </label>
              </div>

              <div className="pt-1">
                <label className="block text-xs font-black text-emerald-950 mb-1">
                  🤝 Forrás / Honnan / Kitől (Bolt / Szállító):
                </label>
                <input
                  type="text"
                  placeholder={
                    sourceType === 'adomany'
                      ? 'pl. Cuki Táp Kft adományozó, vagy Kovács Éva'
                      : 'pl. Fressnapf, Alpha-Vet, AlphaZoo, saját vásárlás'
                  }
                  value={sourceOrRecipient}
                  onChange={(e) => setSourceOrRecipient(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-900 border border-emerald-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Financial Booking Options when purchased */}
              {sourceType === 'sajat_kor' && (
                <div className="mt-2 pt-2.5 border-t border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToFinance}
                        onChange={(e) => setSyncToFinance(e.target.checked)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>💳 Rögzítés a Pénzügyi Mérlegben is kiadásként</span>
                    </label>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                      Automatikus Szinkron
                    </span>
                  </div>

                  {syncToFinance && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 bg-white/70 p-2.5 rounded-xl border border-emerald-300/80">
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-0.5">
                          Kiadás Összege (Ft) *
                        </label>
                        <input
                          type="number"
                          placeholder="pl. 14500"
                          value={purchaseCost}
                          onChange={(e) => setPurchaseCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full p-2 bg-white text-slate-900 border border-emerald-300 rounded-lg font-mono font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                          style={inputStyle}
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-0.5">
                          Fizetési Mód
                        </label>
                        <CustomSelect
                          value={paymentMethod}
                          onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                          options={[
                            { value: 'bankkartya', label: 'Bankkártya', icon: '💳' },
                            { value: 'keszpenz', label: 'Készpénz', icon: '💵' },
                            { value: 'banki_atutalas', label: 'Átutalás', icon: '🏦' },
                            { value: 'paypal', label: 'Online / PayPal', icon: '🌐' },
                          ]}
                          title="Fizetési Mód Kiválasztása"
                          colorScheme="emerald"
                          buttonClassName="p-2 bg-white text-slate-900 border border-emerald-300 rounded-lg font-bold text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-950 mb-0.5">
                          Számla / Nyugtaszám
                        </label>
                        <input
                          type="text"
                          placeholder="pl. NY-2026/089"
                          value={invoiceNumber}
                          onChange={(e) => setInvoiceNumber(e.target.value)}
                          className="w-full p-2 bg-white text-slate-900 border border-emerald-300 rounded-lg font-bold text-xs focus:ring-2 focus:ring-emerald-500"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Subtype and Details for Outbound */}
          {direction === 'kimeno' && (
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl space-y-3">
              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  👤 Kinek adtuk ki / Címzett (kötelező):
                </label>
                <input
                  type="text"
                  placeholder="pl. Nagy Péter (befogadó), Saját Helyi Menhely, vagy Karantén rögzítés"
                  value={sourceOrRecipient}
                  onChange={(e) => setSourceOrRecipient(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-900 border border-blue-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  style={inputStyle}
                  required
                />
              </div>

              {/* Quick selector from registered Foster Parents */}
              {fosterParents.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-950 font-black block">
                    Gyors választás nyilvántartott befogadók közül:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceOrRecipient('Saját helyi menhely');
                        setDestination('Gondozási Központ');
                      }}
                      className="text-[10px] bg-white hover:bg-blue-100 text-blue-950 border border-blue-300 px-2.5 py-1 rounded-lg font-extrabold transition shadow-2xs cursor-pointer"
                    >
                      🏫 Saját Helyi Menhely
                    </button>
                    {fosterParents.slice(0, 5).map((fp) => (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => {
                          setSourceOrRecipient(`${fp.name} (befogadó)`);
                          if (fp.city || fp.address) setDestination(`${fp.city || ''} ${fp.address || ''}`.trim());
                        }}
                        className="text-[10px] bg-white hover:bg-indigo-100 text-indigo-950 border border-indigo-300 px-2.5 py-1 rounded-lg font-extrabold transition shadow-2xs cursor-pointer"
                      >
                        🏡 {fp.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-blue-950 mb-1">
                  📍 Hova / Célállomás (opcionális helyszín/cím):
                </label>
                <input
                  type="text"
                  placeholder="pl. Kispest karantén szoba, vagy 1111 Bp. Kossuth u."
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full p-2.5 bg-white text-slate-900 border border-blue-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                📅 Dátum:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-slate-500"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                📦 Kategória:
              </label>
              <CustomSelect
                value={itemType}
                onChange={(val) => handleItemTypeChange(val as InventoryCategory)}
                options={[
                  { value: 'nedves_tap', label: 'Nedves táp', icon: '🥫', description: 'Konzerv, alutasak, pástétom' },
                  { value: 'szaraz_tap', label: 'Száraz táp', icon: '🥣', description: 'Granulátum, tápszer, jutalomfalat' },
                  { value: 'alom', label: 'Alom', icon: '📦', description: 'Szilikát, fapellet, csomósodó alom' },
                  { value: 'gyogyszer', label: 'Gyógyszer', icon: '💊', description: 'Antibiotikum, szemcsepp, szirup' },
                  { value: 'parazitamentesito', label: 'Parazitamentesítő', icon: '🛡️', description: 'Spot-on csepp, féreghajtó paszta/tabletta' },
                  { value: 'felszereles', label: 'Felszerelés', icon: '🧺', description: 'Hordozó, ketrec, tálka, fekhely' },
                  { value: 'higienia_fertotlenito', label: 'Higiénia & Fertőtlenítő', icon: '🧼', description: 'Virucid szer, kesztyű, fertőtlenítő kendő' },
                  { value: 'egyeb', label: 'Egyéb készlet', icon: '📝', description: 'Egyéb nyilvántartott menhelyi cikk' },
                ]}
                title="📦 Készlet Kategória Kiválasztása"
                colorScheme="emerald"
                buttonClassName="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-xs"
              />
            </div>
          </div>

          {/* Brand / Specific Name */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1">
              🏷️ Márka / Cikk megnevezése:
            </label>
            <input
              type="text"
              placeholder={
                itemType === 'nedves_tap'
                  ? 'pl. Royal Canin Kitten tasakos, Felix lazacos'
                  : itemType === 'szaraz_tap'
                  ? 'pl. Josera Catelux, Purina Pro Plan Sterilised'
                  : itemType === 'alom'
                  ? 'pl. Biokat’s csomósodó alom, Tigerino szilikát'
                  : itemType === 'gyogyszer'
                  ? 'pl. Synulox 50mg tabletta, Meloxidyl szirup, Tobrex szemcsepp'
                  : itemType === 'parazitamentesito'
                  ? 'pl. Advocate spot-on csepp (macska 4-8kg), Milprazon tabletta'
                  : itemType === 'felszereles'
                  ? 'pl. Műanyag szállítóbox, Fém karanténketrec, Kaparófa'
                  : itemType === 'higienia_fertotlenito'
                  ? 'pl. Virkon S virucid fertőtlenítő, Nitril gumikesztyű (M)'
                  : 'pl. Készlet cikk megnevezése'
              }
              value={brandOrName}
              onChange={(e) => setBrandOrName(e.target.value)}
              className="w-full p-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-slate-500 placeholder-slate-400"
              style={inputStyle}
            />
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                🔢 Mennyiség:
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                placeholder="10"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full p-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-slate-500 placeholder-slate-400"
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                📏 Mértékegység:
              </label>
              <CustomSelect
                value={unit}
                onChange={(val) => setUnit(val as InventoryUnit)}
                options={[
                  { value: 'db', label: 'db (darab / tasak / tálka)', icon: '📦' },
                  { value: 'kg', label: 'kg (kilogramm)', icon: '⚖️' },
                  { value: 'g', label: 'g (gramm)', icon: '⚖️' },
                  { value: 'csomag', label: 'csomag', icon: '🎁' },
                  { value: 'zsak', label: 'zsák', icon: '🛍️' },
                  { value: 'l', label: 'l (liter)', icon: '🧪' },
                  { value: 'ml', label: 'ml (milliliter)', icon: '💉' },
                  { value: 'doboz', label: 'doboz', icon: '📦' },
                  { value: 'pipetta', label: 'pipetta / ampulla', icon: '💧' },
                  { value: 'tabletta', label: 'tabletta / szem', icon: '💊' },
                ]}
                title="📏 Mértékegység Kiválasztása"
                colorScheme="emerald"
                buttonClassName="p-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl font-bold text-xs"
              />
            </div>
          </div>

          {/* Expiry Tracking & Threshold Settings */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                <span>⏳</span>
                <span>Szavatosság & Készletszint Figyelés</span>
              </span>
              <span className="text-[10px] text-amber-900 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                Lejárat & Riasztás
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  ⏳ Szavatossági / Lejárati Idő:
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-2 bg-white text-slate-900 border border-amber-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  🏷️ Sarzsszám / Tétel (Lot / Batch):
                </label>
                <input
                  type="text"
                  placeholder="pl. LOT-2026-X49"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full p-2 bg-white text-slate-900 border border-amber-300 rounded-xl font-mono font-bold text-xs focus:ring-2 focus:ring-amber-500"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  🎯 Célcsoport / Speciális Igény:
                </label>
                <input
                  type="text"
                  placeholder="pl. Kölyök (Kitten), Renal diéta, Karantén"
                  value={targetAgeOrCondition}
                  onChange={(e) => setTargetAgeOrCondition(e.target.value)}
                  className="w-full p-2 bg-white text-slate-900 border border-amber-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500"
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-amber-950 mb-1">
                  ⚠️ Minimális Készletküszöb (Riasztáshoz):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="pl. 10 (ha ez alá csökken, riaszt)"
                  value={minStockThreshold}
                  onChange={(e) => setMinStockThreshold(e.target.value ? Number(e.target.value) : '')}
                  className="w-full p-2 bg-white text-slate-900 border border-amber-300 rounded-xl font-bold text-xs focus:ring-2 focus:ring-amber-500 font-mono"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-slate-800 mb-1">
              📝 Megjegyzés / Tárolási hely:
            </label>
            <textarea
              rows={2}
              placeholder="Egyéb részletek, lejárati idő, speciális diéta, doboz száma..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl font-medium text-xs focus:ring-2 focus:ring-slate-500 resize-none placeholder-slate-400"
              style={inputStyle}
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer ${
                direction === 'bejovo'
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-blue-700 hover:bg-blue-800 text-white'
              }`}
              style={{
                backgroundColor: direction === 'bejovo' ? '#047857' : '#1d4ed8',
                color: '#ffffff',
              }}
            >
              <span>💾</span>
              <span style={{ color: '#ffffff' }}>{isSubmitting ? 'Mentés...' : 'Rekord Mentése'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
