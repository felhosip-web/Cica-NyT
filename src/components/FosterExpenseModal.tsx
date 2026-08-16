import React, { useState, useEffect } from 'react';
import { db } from '../js/db.js';
import { useLiveQuery } from 'dexie-react-hooks';
import { FosterExpense, FinancialTransaction, PaymentMethod, FinanceCategory } from '../types';
import { useAppStore } from '../store/useAppStore';
import { CustomSelect } from './CustomSelect';

interface FosterExpenseModalProps {
  initialFosterId?: string;
  initialCatId?: string;
  onClose: () => void;
  onSaved: () => void;
}

export const FosterExpenseModal: React.FC<FosterExpenseModalProps> = ({
  initialFosterId,
  initialCatId,
  onClose,
  onSaved,
}) => {
  const { getCurrentUser } = useAppStore();
  const currentUser = getCurrentUser();
  const fosterParents = useLiveQuery(() => db.fosterParents.toArray(), []) || [];
  const cats = useLiveQuery(() => db.cats.where('status').equals('ideiglenes').toArray(), []) || [];

  const [fosterId, setFosterId] = useState<string>(initialFosterId || '');
  const [catId, setCatId] = useState<string>(initialCatId || '');
  const [category, setCategory] = useState<'orvosi' | 'tap' | 'alom' | 'felszereles' | 'egyeb'>('orvosi');
  const [amount, setAmount] = useState<number | ''>(5000);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [syncToFinance, setSyncToFinance] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bankkartya');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!fosterId && fosterParents.length > 0) {
      setFosterId(fosterParents[0].id);
    }
  }, [fosterParents, fosterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fosterId) {
      alert('Kérjük, válasszon ideiglenes befogadót!');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      alert('Kérjük, adja meg a kiadás összegét!');
      return;
    }
    if (!description.trim()) {
      alert('Kérjük, adja meg a költség rövid leírását!');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const selectedFoster = fosterParents.find((f) => f.id === fosterId);
      const fosterName = selectedFoster ? selectedFoster.name : 'Ideiglenes befogadó';

      let linkedFinanceId: number | string | undefined;

      // Create Finance Transaction if sync is enabled
      if (syncToFinance && Number(amount) > 0) {
        let finCategory: FinanceCategory = 'orvosi';
        if (category === 'orvosi') finCategory = 'orvosi';
        else if (category === 'tap' || category === 'alom') finCategory = 'tap_alom';
        else if (category === 'felszereles') finCategory = 'felszereles';
        else finCategory = 'egyeb';

        const financePayload: Partial<FinancialTransaction> = {
          type: 'kiadas',
          category: finCategory,
          amount: Math.round(Number(amount)),
          date: date || now.split('T')[0],
          title: `Ideiglenes nevelés (${fosterName}): ${description.trim()}`,
          partnerName: fosterName,
          paymentMethod,
          status: 'teljesult',
          invoiceNumber: invoiceNo.trim() || undefined,
          fosterId: fosterId,
          catId: catId || undefined,
          sourceModule: 'foster_expense',
          notes: `Befogadói elszámolás. Kategória: ${category}`,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
          created_by_name: currentUser?.name || 'Munkatárs',
        };

        if (db.finances) {
          linkedFinanceId = await db.finances.add(financePayload);
        }
      }

      const payload: FosterExpense = {
        fosterId,
        catId: catId || undefined,
        category,
        amount: Number(amount),
        date: date || new Date().toISOString().split('T')[0],
        description: description.trim(),
        invoiceNo: invoiceNo.trim() || undefined,
        financeId: linkedFinanceId,
      };

      await db.fosterExpenses.add(payload);
      onSaved();
    } catch (err) {
      console.error('Hiba a költség rögzítésekor:', err);
      alert('Nem sikerült elmenteni a kiadást!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💵</span>
            <div>
              <h2 className="font-extrabold text-base leading-tight">
                Ideiglenes Nevelési Költség Rögzítése
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Állatorvosi, táp, alom és egyéb költségek naplózása
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
                  description: f.city || 'Cím nélkül',
                })),
              ]}
              placeholder="-- Válasszon befogadót --"
              title="🏡 Ideiglenes Befogadó Kiválasztása"
              colorScheme="emerald"
              buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-extrabold text-gray-900"
            />
          </div>

          {/* Select Cat (Optional) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Kapcsolódó Cica (Opcionális)
            </label>
            <CustomSelect
              value={catId}
              onChange={(val) => setCatId(val)}
              options={[
                { value: '', label: '-- Általános (Nem egy adott cicához) --', icon: '🌐' },
                ...cats.map((c) => ({
                  value: c.id,
                  label: `${c.nev} (#${c.sorszam || c.id.slice(0, 4)})`,
                  icon: '🐱',
                  description: c.szin || c.status,
                })),
              ]}
              placeholder="-- Általános (Nem egy adott cicához) --"
              title="🐱 Kapcsolódó Cica Kiválasztása"
              colorScheme="emerald"
              buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold text-gray-900"
            />
          </div>

          {/* Category & Amount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Kategória</label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val as any)}
                options={[
                  { value: 'orvosi', label: 'Állatorvos / Műtét', icon: '🩺' },
                  { value: 'tap', label: 'Táp / Élelmezés', icon: '🍖' },
                  { value: 'alom', label: 'Alom / Higiénia', icon: '🪵' },
                  { value: 'felszereles', label: 'Felszerelés', icon: '🛏️' },
                  { value: 'egyeb', label: 'Egyéb költség', icon: '📦' },
                ]}
                title="Kiadási Kategória Kiválasztása"
                colorScheme="emerald"
                buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Összeg (Ft) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="100"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value) : '')}
                placeholder="5000"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-black text-emerald-800 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Date & Invoice */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Költség Dátuma</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Számlaszám / Bizonylat</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="SZ-2026/001"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono text-gray-900 focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Rövid Leírás <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pl. Sürgősségi oltás és lázcsillapítás, orvosi rendelő számlája"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>

          {/* Financial Integration Option */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToFinance}
                  onChange={(e) => setSyncToFinance(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>💳 Rögzítés a Pénzügyekben is kiadásként</span>
              </label>
              <span className="text-[10px] bg-emerald-200 text-emerald-950 font-extrabold px-2 py-0.5 rounded-full">
                Mérleg Szinkron
              </span>
            </div>

            {syncToFinance && (
              <div>
                <label className="block text-[11px] font-bold text-emerald-900 mb-1">
                  Fizetési Mód
                </label>
                <CustomSelect
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                  options={[
                    { value: 'bankkartya', label: 'Bankkártya', icon: '💳' },
                    { value: 'keszpenz', label: 'Készpénz', icon: '💵' },
                    { value: 'banki_atutalas', label: 'Banki Átutalás / Visszatérítés', icon: '🏦' },
                    { value: 'paypal', label: 'Online / Egyéb', icon: '🌐' },
                  ]}
                  title="Fizetési Mód Kiválasztása"
                  colorScheme="emerald"
                  buttonClassName="p-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-gray-900"
                />
              </div>
            )}
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
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Mentés...' : 'Költség Rögzítése 💵'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
