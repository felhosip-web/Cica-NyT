import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { sendEventPushNotification } from '../utils/pushNotification';
import { useAppStore } from '../store/useAppStore';
import { createAuditStamp, updateAuditStamp } from '../utils/audit';
import { EventTemplateManagerModal } from './EventTemplateManagerModal';
import { EventTemplate } from '../types';
import { DEFAULT_EVENT_TEMPLATES } from '../data/defaultEventTemplates';
import { CustomSelect } from './CustomSelect';

interface EventFormModalProps {
  eventId?: number | null;
  initialCatId?: string;
  onClose: () => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({
  eventId,
  initialCatId = 'general',
  onClose,
}) => {
  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];
  const customTemplates = (useLiveQuery(() => db.eventTemplates?.toArray(), []) || []) as EventTemplate[];

  const templateOptions = React.useMemo(() => {
    return allTemplates.map((tmpl) => ({
      value: String(tmpl.id || tmpl.name),
      label: tmpl.name,
      icon: tmpl.icon || '📋',
      description: tmpl.defaultTitle ? `Alap: "${tmpl.defaultTitle}"` : undefined,
      badge: tmpl.type === 'oltas' ? 'Oltás' : tmpl.type === 'mutet' ? 'Műtét' : tmpl.type === 'teszt' ? 'Teszt' : 'Kezelés',
    }));
  }, [allTemplates]);

  const catOptions = React.useMemo(() => {
    const list = [
      {
        value: 'general',
        label: 'Általános / Összes cica',
        icon: '🌐',
        description: 'Nem egy konkrét cicához kötött orvosi feladat',
      },
    ];
    cats
      .filter((c) => c.status !== 'elhunyt')
      .forEach((c) => {
        list.push({
          value: c.id,
          label: `${c.nev || 'Névtelen'} (#${c.sorszam || c.id.slice(0, 4)})`,
          icon: c.nem === 'nosteny' ? '🌸' : c.nem === 'kandur' ? '💙' : '🐱',
          badge: c.status === 'gazdis' ? 'Gazdis' : c.status === 'orokbefogadhato' ? 'Örökbefogadható' : 'Gondozásban',
          description: c.szin || c.fajta ? `${c.szin || ''} ${c.fajta || ''}`.trim() : undefined,
        });
      });
    return list;
  }, [cats]);

  const eventTypeOptions = [
    { value: 'oltas', label: 'Oltás', icon: '💉', description: 'Kombinált, veszettség, leukózis védőoltások' },
    { value: 'orvosi', label: 'Orvosi Kezelés', icon: '🩺', description: 'Állatorvosi vizsgálat, kontroll, gyógyszerelés' },
    { value: 'teszt', label: 'Szűrés / Teszt', icon: '🔬', description: 'FeLV/FIV gyorstesztek, vérkép, labor' },
    { value: 'mutet', label: 'Műtét / Ivartalanítás', icon: '✂️', description: 'TNR ivartalanítás, műtéti beavatkozások' },
    { value: 'egyeni', label: 'Egyéb Esemény', icon: '📅', description: 'Gondozási, szállítási vagy egyedi feladat' },
  ];

  const eventStatusOptions = [
    { value: 'pending', label: 'Esedékes (Függőben)', icon: '⏳', description: 'Még elvégzendő, aktív feladat' },
    { value: 'done', label: 'Teljesítve', icon: '✅', description: 'Sikeresen elvégzett esemény' },
    { value: 'expired', label: 'Lejárt', icon: '⚠️', description: 'Határidőn túli, elmaradt feladat' },
  ];

  const paymentMethodOptions = [
    { value: 'bankkartya', label: 'Bankkártya', icon: '💳' },
    { value: 'keszpenz', label: 'Készpénz', icon: '💵' },
    { value: 'banki_atutalas', label: 'Banki Átutalás', icon: '🏦' },
    { value: 'paypal', label: 'Online / Egyéb', icon: '🌐' },
  ];

  const [catId, setCatId] = useState<string>(initialCatId);
  const [type, setType] = useState<'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni'>('oltas');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'pending' | 'done' | 'expired'>('pending');
  const [cost, setCost] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [syncToFinance, setSyncToFinance] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'keszpenz' | 'bankkartya' | 'banki_atutalas' | 'paypal' | 'egyeb'>('bankkartya');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [linkedFinanceId, setLinkedFinanceId] = useState<number | string | null>(null);

  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [saveAsTemplateSuccess, setSaveAsTemplateSuccess] = useState(false);

  // Apply template
  const applyTemplate = (tmpl: EventTemplate) => {
    setType(tmpl.type);
    setTitle(tmpl.defaultTitle);
    setCost(tmpl.defaultCost ?? '');
    setNotes(tmpl.defaultNotes || '');
    setStatus((tmpl.defaultStatus as any) || 'done');

    if (tmpl.daysOffset) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + tmpl.daysOffset);
      setDate(targetDate.toISOString().split('T')[0]);
    } else {
      setDate(new Date().toISOString().split('T')[0]);
    }
  };

  const handleSaveAsNewTemplate = async () => {
    if (!title.trim()) return;
    try {
      await db.eventTemplates.add({
        name: `${title.trim()} (Saját)`,
        type,
        defaultTitle: title.trim(),
        defaultCost: cost !== '' ? Number(cost) : '',
        defaultNotes: notes.trim(),
        defaultStatus: status === 'expired' ? 'pending' : status,
        daysOffset: 0,
        isBuiltIn: false,
        category: 'Saját Sablonok',
        icon: '⭐',
      });
      setSaveAsTemplateSuccess(true);
      setTimeout(() => setSaveAsTemplateSuccess(false), 3000);
    } catch (e) {
      console.error('Hiba a sablon mentésekor:', e);
    }
  };

  useEffect(() => {
    if (eventId) {
      db.events.get(eventId).then((ev: any) => {
        if (ev) {
          setCatId(ev.catId || 'general');
          setType(ev.type || 'oltas');
          setTitle(ev.title || '');
          setDate(ev.date || new Date().toISOString().split('T')[0]);
          setStatus(ev.status || 'pending');
          setCost(ev.cost || '');
          setNotes(ev.notes || '');
          if (ev.financeId) {
            setLinkedFinanceId(ev.financeId);
          }
          if (ev.paymentMethod) {
            setPaymentMethod(ev.paymentMethod);
          }
          if (ev.invoiceNumber) {
            setInvoiceNumber(ev.invoiceNumber);
          }
        }
      });
    }
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentUser = useAppStore.getState().getCurrentUser();
    const now = new Date().toISOString();
    const numCost = cost !== '' ? Number(cost) : 0;
    const selectedCat = cats.find((c) => c.id === catId);
    const catName = selectedCat ? selectedCat.nev : 'Általános';

    let currentFinanceId = linkedFinanceId;

    // Handle Finance Synchronization
    if (syncToFinance && numCost > 0) {
      const typeLabel = type === 'oltas' ? 'Oltás' : type === 'orvosi' ? 'Kezelés' : type === 'mutet' ? 'Ivartalanítás / Műtét' : type === 'teszt' ? 'Labor / Teszt' : 'Állatorvosi esemény';
      const financePayload = {
        type: 'kiadas' as const,
        category: (type === 'mutet' ? 'orvosi' : 'orvosi') as any,
        amount: Math.round(numCost),
        date: date,
        title: `${catName} - ${typeLabel}: ${title.trim() || 'Orvosi beavatkozás'}`,
        partnerName: notes.trim() ? notes.split('\n')[0] : 'Állatorvosi rendelő',
        paymentMethod,
        status: (status === 'done' ? 'teljesult' : 'fuggoben') as any,
        invoiceNumber: invoiceNumber.trim() || undefined,
        catId: catId !== 'general' ? catId : undefined,
        sourceModule: 'medical_event' as any,
        notes: `Automatikusan szinkronizálva az orvosi eseményekből (${typeLabel}). ${notes ? `Megj: ${notes}` : ''}`,
        updatedAt: now,
        created_by_name: currentUser?.name || 'Munkatárs',
      };

      if (currentFinanceId && db.finances) {
        await db.finances.update(currentFinanceId, financePayload);
      } else if (db.finances) {
        const newFinId = await db.finances.add({
          ...financePayload,
          createdAt: now,
          syncStatus: 'pending',
        });
        currentFinanceId = newFinId;
      }
    }

    if (eventId) {
      const existingEv = await db.events.get(eventId);
      const audit = updateAuditStamp(existingEv as any, currentUser);
      const payload = {
        catId,
        type,
        title: title.trim() || 'Névtelen esemény',
        date,
        status,
        cost: numCost,
        notes,
        financeId: currentFinanceId,
        paymentMethod,
        invoiceNumber: invoiceNumber.trim() || undefined,
        ...audit,
      };
      await db.events.update(eventId, payload);
    } else {
      const audit = createAuditStamp(currentUser);
      const payload = {
        catId,
        type,
        title: title.trim() || 'Névtelen esemény',
        date,
        status,
        cost: numCost,
        notes,
        financeId: currentFinanceId,
        paymentMethod,
        invoiceNumber: invoiceNumber.trim() || undefined,
        createdAt: audit.created_at,
        ...audit,
      };
      await db.events.add(payload);
    }

    if (status === 'pending' || status === 'expired') {
      const typeLabel = type === 'oltas' ? 'Oltás' : type === 'orvosi' ? 'Kezelés' : 'Esemény';
      sendEventPushNotification(
        `📌 Új ${typeLabel} Rögzítve!`,
        `${catName}: ${title.trim() || 'Esemény'} (${date})`
      );
    }

    onClose();
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteEvent = async () => {
    if (!eventId) return;
    setIsDeleting(true);
    try {
      if (linkedFinanceId && db.finances) {
        await db.finances.delete(linkedFinanceId).catch(() => {});
      }
      await db.events.delete(eventId);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      console.error('Hiba az esemény törlésekor:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            📅 {eventId ? 'Esemény Szerkesztése' : 'Új Esemény Rögzítése'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          {/* Quick Template Picker Bar */}
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 p-3 rounded-2xl border border-purple-200/80 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-purple-900 flex items-center gap-1.5 text-xs">
                <span>📋</span>
                <span>Gyakori Sablonok (Gyors kitöltés):</span>
              </span>
              <button
                type="button"
                onClick={() => setShowTemplateManager(true)}
                className="text-[11px] bg-purple-700 hover:bg-purple-800 text-white font-extrabold px-2.5 py-1 rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>⚙️</span>
                <span>Sablonkezelő</span>
              </button>
            </div>

            <CustomSelect
              value=""
              onChange={(val) => {
                const selected = allTemplates.find((t) => String(t.id) === val || t.name === val);
                if (selected) {
                  applyTemplate(selected);
                }
              }}
              options={templateOptions}
              placeholder="-- Válassz előre kitöltött sablont (Oltás, Műtét, Kontroll...) --"
              title="📋 Esemény Sablon Kiválasztása"
              colorScheme="purple"
            />
          </div>

          {/* Cat Selector */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">🐱 Érintett Cica:</label>
            <CustomSelect
              value={catId}
              onChange={(val) => setCatId(val)}
              options={catOptions}
              title="🐱 Érintett Cica Kiválasztása"
              placeholder="Válassz cicát..."
              colorScheme="pink"
            />
          </div>

          {/* Event Type & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">🏷️ Típus:</label>
              <CustomSelect
                value={type}
                onChange={(val) => setType(val as any)}
                options={eventTypeOptions}
                title="🏷️ Esemény Típus Kiválasztása"
                colorScheme="purple"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">📌 Státusz:</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as any)}
                options={eventStatusOptions}
                title="📌 Esemény Státusz Kiválasztása"
                colorScheme="emerald"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">📝 Esemény Megnevezése:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="pl. Kombinált oltás emlékeztető, Kontroll..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Date & Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">📅 Dátum:</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">💰 Költség (Ft):</label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
                placeholder="0"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold font-mono text-emerald-800 focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Medical Finance Integration */}
          {Number(cost) > 0 && (
            <div className="p-3 bg-pink-50/80 border border-pink-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-pink-950 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncToFinance}
                    onChange={(e) => setSyncToFinance(e.target.checked)}
                    className="w-4 h-4 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                  <span>💳 Rögzítés a Pénzügyi Mérlegben is orvosi kiadásként</span>
                </label>
                <span className="text-[10px] bg-pink-200 text-pink-900 font-extrabold px-2 py-0.5 rounded-full">
                  Mérleg Szinkron
                </span>
              </div>

              {syncToFinance && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-pink-950 mb-0.5">
                      Fizetési Mód
                    </label>
                    <CustomSelect
                      value={paymentMethod}
                      onChange={(val) => setPaymentMethod(val as any)}
                      options={paymentMethodOptions}
                      title="💳 Fizetési Mód Kiválasztása"
                      colorScheme="pink"
                      buttonClassName="p-2 bg-white border border-pink-300 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-pink-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-pink-950 mb-0.5">
                      Számlaszám / Nyugtaszám
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="pl. DR-2026/102"
                      className="w-full p-2 bg-white border border-pink-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">💬 Megjegyzés / Részletek:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Végző orvos, gyógyszer adagolás, helyszín..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Save as Template Quick Action */}
          {!eventId && title.trim() && (
            <div className="pt-2 flex items-center justify-between bg-purple-50 p-2.5 rounded-xl border border-purple-200">
              <span className="text-[11px] font-bold text-purple-900">
                Gyakori ez az esemény típus?
              </span>
              <button
                type="button"
                onClick={handleSaveAsNewTemplate}
                className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-lg text-[11px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <span>⭐</span>
                <span>{saveAsTemplateSuccess ? 'Mentve!' : 'Mentés új sablonként'}</span>
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t flex items-center justify-between gap-2">
            {eventId ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🗑️</span>
                <span>Törlés</span>
              </button>
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-xs transition cursor-pointer"
              >
                💾 Mentés
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Event Template Manager Modal */}
      <EventTemplateManagerModal
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onSelectTemplate={applyTemplate}
      />

      {/* Confirmation Modal for Event Deletion */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
              ⚠️
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                Esemény törlésének megerősítése
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Biztosan törölni szeretnéd a(z) <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{title || 'Esemény'}</span> megnevezésű eseményt?
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition text-xs cursor-pointer border border-gray-300"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={confirmDeleteEvent}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Törlés...</span>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Igen, törlés</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
