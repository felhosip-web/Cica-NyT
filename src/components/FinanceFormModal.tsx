import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../js/db.js';
import {
  FinancialTransaction,
  FinanceType,
  FinanceCategory,
  PaymentMethod,
  FinanceStatus,
  Cat,
  FosterParent,
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { CustomSelect } from './CustomSelect';

interface FinanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: FinancialTransaction | null;
  initialType?: FinanceType;
}

export const CATEGORY_LABELS: Record<FinanceCategory, { name: string; icon: string; defaultType: FinanceType }> = {
  adomany: { name: 'Adomány', icon: '💖', defaultType: 'bevetel' },
  szazalek1: { name: '1% Felajánlás', icon: '🎗️', defaultType: 'bevetel' },
  orokbefogadas: { name: 'Örökbefogadási Támogatás', icon: '🏠', defaultType: 'bevetel' },
  palyazat: { name: 'Pályázat / Támogatás', icon: '🏛️', defaultType: 'bevetel' },
  orvosi: { name: 'Orvosi & Állatorvosi Számla', icon: '🩺', defaultType: 'kiadas' },
  tap_alom: { name: 'Táp, Alom & Gondozás', icon: '🍲', defaultType: 'kiadas' },
  felszereles: { name: 'Felszerelés & Eszközök', icon: '📦', defaultType: 'kiadas' },
  mukodes: { name: 'Működés & Rezsi', icon: '⚡', defaultType: 'kiadas' },
  szallitas: { name: 'Szállítás & Üzemanyag', icon: '🚗', defaultType: 'kiadas' },
  tnr: { name: 'TNR Műtét & Csapda', icon: '✂️', defaultType: 'kiadas' },
  egyeb: { name: 'Egyéb Pénzügyi Tétel', icon: '📝', defaultType: 'kiadas' },
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { name: string; icon: string }> = {
  keszpenz: { name: 'Készpénz', icon: '💵' },
  bankkartya: { name: 'Bankkártya', icon: '💳' },
  banki_atutalas: { name: 'Banki Átutalás', icon: '🏦' },
  paypal: { name: 'PayPal / Online', icon: '🌐' },
  egyeb: { name: 'Egyéb', icon: '🔄' },
};

export const FinanceFormModal: React.FC<FinanceFormModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit,
  initialType = 'bevetel',
}) => {
  const { getCurrentUser } = useAppStore();
  const currentUser = getCurrentUser();

  const cats = (useLiveQuery(() => db.cats.toArray(), []) || []) as Cat[];
  const fosterParents = (useLiveQuery(() => db.fosterParents.toArray(), []) || []) as FosterParent[];

  const [type, setType] = useState<FinanceType>(initialType);
  const [category, setCategory] = useState<FinanceCategory>('adomany');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [partnerName, setPartnerName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('banki_atutalas');
  const [status, setStatus] = useState<FinanceStatus>('teljesult');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [catId, setCatId] = useState<string>('');
  const [fosterId, setFosterId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setCategory(transactionToEdit.category);
      setAmount(String(transactionToEdit.amount));
      setTitle(transactionToEdit.title);
      setDate(transactionToEdit.date || new Date().toISOString().slice(0, 10));
      setPartnerName(transactionToEdit.partnerName || '');
      setPaymentMethod(transactionToEdit.paymentMethod || 'banki_atutalas');
      setStatus(transactionToEdit.status || 'teljesult');
      setInvoiceNumber(transactionToEdit.invoiceNumber || '');
      setCatId(transactionToEdit.catId || '');
      setFosterId(transactionToEdit.fosterId || '');
      setNotes(transactionToEdit.notes || '');
    } else {
      setType(initialType);
      setCategory(initialType === 'bevetel' ? 'adomany' : 'orvosi');
      setAmount('');
      setTitle('');
      setDate(new Date().toISOString().slice(0, 10));
      setPartnerName('');
      setPaymentMethod('banki_atutalas');
      setStatus('teljesult');
      setInvoiceNumber('');
      setCatId('');
      setFosterId('');
      setNotes('');
    }
    setError(null);
  }, [transactionToEdit, initialType, isOpen]);

  // Handle type change and select appropriate default category
  const handleTypeChange = (newType: FinanceType) => {
    setType(newType);
    if (newType === 'bevetel' && CATEGORY_LABELS[category].defaultType === 'kiadas') {
      setCategory('adomany');
    } else if (newType === 'kiadas' && CATEGORY_LABELS[category].defaultType === 'bevetel') {
      setCategory('orvosi');
    }
  };

  const handleQuickAddAmount = (addValue: number) => {
    const currentNum = parseFloat(amount) || 0;
    setAmount(String(currentNum + addValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Kérjük, adj meg egy érvényes, pozitív összeget!');
      return;
    }

    if (!title.trim()) {
      setError('Kérjük, add meg a megnevezést / leírást!');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Omit<FinancialTransaction, 'id'> = {
        type,
        category,
        amount: Math.round(parsedAmount),
        date,
        title: title.trim(),
        partnerName: partnerName.trim() || undefined,
        paymentMethod,
        status,
        invoiceNumber: invoiceNumber.trim() || undefined,
        catId: catId || undefined,
        fosterId: fosterId || undefined,
        notes: notes.trim() || undefined,
        syncStatus: 'pending',
        createdAt: transactionToEdit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: currentUser?.name || 'Munkatárs',
      };

      if (transactionToEdit?.id) {
        await db.finances.update(transactionToEdit.id, payload);
      } else {
        await db.finances.add(payload);
      }

      onClose();
    } catch (err) {
      console.error('Error saving financial transaction:', err);
      setError('Sikerületlen mentés az adatbázisba. Próbáld újra!');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-bold shadow-md ${
                type === 'bevetel'
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white'
                  : 'bg-gradient-to-tr from-rose-600 to-pink-500 text-white'
              }`}
            >
              {type === 'bevetel' ? '📈' : '📉'}
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white">
                {transactionToEdit ? 'Pénzügyi Tétel Módosítása' : 'Új Pénzügyi Tétel Rögzítése'}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {type === 'bevetel' ? 'Bevétel (Pénzbeáramlás)' : 'Kiadás (Pénzkiáramlás)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-lg font-bold transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {/* Type Toggle */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Tranzakció Típusa</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleTypeChange('bevetel')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'bevetel'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📈 Bevétel (Be)</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('kiadas')}
                className={`py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center gap-2 cursor-pointer ${
                  type === 'kiadas'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📉 Kiadás (Ki)</span>
              </button>
            </div>
          </div>

          {/* Amount and Quick presets */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Összeg (Ft) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="pl. 15000"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-base font-black text-white focus:outline-hidden focus:border-emerald-500 pr-12"
              />
              <span className="absolute right-4 top-3.5 text-slate-400 font-bold">Ft</span>
            </div>
            {/* Quick add buttons */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold mr-1">Gyors összeg:</span>
              {[2000, 5000, 10000, 25000, 50000, 100000].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => handleQuickAddAmount(val)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700/60 transition cursor-pointer"
                >
                  +{val.toLocaleString('hu-HU')} Ft
                </button>
              ))}
            </div>
          </div>

          {/* Title / Description */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">
              Megnevezés / Leírás <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'bevetel'
                  ? 'pl. Adomány Mikitől, 1% utalás, Cica örökbefogadási díj'
                  : 'pl. Dr. Kiss Állatorvosi Klinika oltások, Fressnapf táp vásárlás'
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 font-medium text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Category & Payment method grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Kategória</label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val as FinanceCategory)}
                options={Object.entries(CATEGORY_LABELS).map(([catKey, info]) => ({
                  value: catKey,
                  label: info.name,
                  icon: info.icon,
                  badge: info.defaultType === 'bevetel' ? 'Bevétel' : 'Kiadás',
                  badgeColor: info.defaultType === 'bevetel' ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700' : 'bg-pink-900/60 text-pink-300 border-pink-700',
                }))}
                title="Pénzügyi Kategória Kiválasztása"
                colorScheme="emerald"
                buttonClassName="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Fizetési Mód</label>
              <CustomSelect
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                options={Object.entries(PAYMENT_METHOD_LABELS).map(([pmKey, info]) => ({
                  value: pmKey,
                  label: info.name,
                  icon: info.icon,
                }))}
                title="Fizetési Mód Kiválasztása"
                colorScheme="blue"
                buttonClassName="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Date & Status grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Dátum</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 font-medium text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Státusz</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as FinanceStatus)}
                options={[
                  { value: 'teljesult', label: 'Teljesült / Kiegyenlített', icon: '✅', description: 'A pénzösszeg beérkezett vagy kifizetésre került' },
                  { value: 'fuggoben', label: 'Függőben lévő / Várható', icon: '⏳', description: 'Még nem lekönyvelt, elmaradt vagy tervezett tétel' },
                  { value: 'storno', label: 'Stornózott / Érvénytelen', icon: '🚫', description: 'Visszavont, érvénytelenített tranzakció' },
                ]}
                title="Pénzügyi Státusz Kiválasztása"
                colorScheme="emerald"
                buttonClassName="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Partner / Donor & Invoice Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                {type === 'bevetel' ? 'Adományozó / Partner Neve' : 'Szállító / Állatorvos Neve'}
              </label>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="pl. Kovács Katalin, VetClinic Kft."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 font-medium text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Számlaszám / Bizonylatszám
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="pl. SZ-2026/0142"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 font-medium text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Connected Cat or Foster Parent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Kapcsolódó Gondozott Cica</label>
              <CustomSelect
                value={catId}
                onChange={(val) => setCatId(val)}
                options={[
                  { value: '', label: '-- Nincs kiválasztva cica --', icon: '🐾' },
                  ...cats.map((cat) => ({
                    value: cat.id,
                    label: `${cat.nev} (${cat.sorszam})`,
                    icon: '🐱',
                    description: cat.szin || cat.status,
                  })),
                ]}
                placeholder="-- Nincs kiválasztva cica --"
                title="Kapcsolódó Cica Kiválasztása"
                colorScheme="purple"
                buttonClassName="bg-slate-950 border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Kapcsolódó Ideiglenes Befogadó</label>
              <CustomSelect
                value={fosterId}
                onChange={(val) => setFosterId(val)}
                options={[
                  { value: '', label: '-- Nincs kiválasztva befogadó --', icon: '👤' },
                  ...fosterParents.map((fp) => ({
                    value: fp.id,
                    label: fp.name,
                    icon: '🏡',
                    description: fp.city || 'Cím nélkül',
                  })),
                ]}
                placeholder="-- Nincs kiválasztva befogadó --"
                title="Kapcsolódó Befogadó Kiválasztása"
                colorScheme="indigo"
                buttonClassName="bg-slate-950 border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5">Megjegyzések</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Egyéb részletek, utalási megjegyzés, támogatási célok..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 font-medium text-white focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition cursor-pointer"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2.5 rounded-2xl font-black text-white shadow-lg transition cursor-pointer flex items-center gap-2 ${
                type === 'bevetel'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                  : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
              }`}
            >
              <span>{isSubmitting ? 'Mentés...' : transactionToEdit ? '💾 Módosítás Mentése' : '✨ Új Tétel Rögzítése'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
