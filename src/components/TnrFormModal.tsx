import React, { useState } from 'react';
import { motion } from 'motion/react';
import { db } from '../js/db.js';
import { TnrRecord } from '../types';
import { useAppStore } from '../store/useAppStore';
import { createAuditStamp, updateAuditStamp } from '../utils/audit';
import { CustomSelect } from './CustomSelect';

interface TnrFormModalProps {
  tnrToEdit?: TnrRecord | null;
  onClose: () => void;
  onSaved: () => void;
}

export const TnrFormModal: React.FC<TnrFormModalProps> = ({ tnrToEdit, onClose, onSaved }) => {
  const { addDebugLog } = useAppStore();

  const isEdit = !!tnrToEdit;
  const todayStr = new Date().toISOString().split('T')[0];

  const [catNameOrTag, setCatNameOrTag] = useState(tnrToEdit?.catNameOrTag || '');
  const [locationTrapped, setLocationTrapped] = useState(tnrToEdit?.locationTrapped || '');
  const [dateTrapped, setDateTrapped] = useState(tnrToEdit?.dateTrapped || todayStr);
  const [trappedBy, setTrappedBy] = useState(tnrToEdit?.trappedBy || '');
  const [clinicLocation, setClinicLocation] = useState(tnrToEdit?.clinicLocation || '');
  const [surgeonName, setSurgeonName] = useState(tnrToEdit?.surgeonName || '');
  const [locationReleased, setLocationReleased] = useState(tnrToEdit?.locationReleased || '');
  const [dateReleased, setDateReleased] = useState(tnrToEdit?.dateReleased || '');
  const [status, setStatus] = useState<'befogva' | 'mutet_alatt' | 'elengedve'>(
    tnrToEdit?.status || 'befogva'
  );
  const [earTip, setEarTip] = useState(tnrToEdit?.earTip ?? true);
  const [notes, setNotes] = useState(tnrToEdit?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!locationTrapped.trim()) {
      setErrorMsg('Kérjük adja meg a befogás helyszínét!');
      return;
    }
    if (!dateTrapped.trim()) {
      setErrorMsg('Kérjük adja meg a befogás időpontját!');
      return;
    }
    if (!trappedBy.trim()) {
      setErrorMsg('Kérjük adja meg, ki fogta be a cicát!');
      return;
    }
    if (!clinicLocation.trim()) {
      setErrorMsg('Kérjük adja meg a műtét helyszínét / klinikát!');
      return;
    }
    if (!locationReleased.trim()) {
      setErrorMsg('Kérjük adja meg az elengedés helyszínét!');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = useAppStore.getState().getCurrentUser();

      if (isEdit && tnrToEdit) {
        const audit = updateAuditStamp(tnrToEdit, currentUser);
        await db.tnr.update(tnrToEdit.id, {
          catNameOrTag: catNameOrTag.trim() || 'Névtelen TNR cica',
          locationTrapped: locationTrapped.trim(),
          dateTrapped,
          trappedBy: trappedBy.trim(),
          clinicLocation: clinicLocation.trim(),
          surgeonName: surgeonName.trim() || undefined,
          locationReleased: locationReleased.trim(),
          dateReleased: dateReleased || undefined,
          status,
          earTip,
          notes: notes.trim() || undefined,
          ...audit,
        });
        addDebugLog(`[TNR] Rekord frissítve: ${tnrToEdit.id}`);
      } else {
        const audit = createAuditStamp(currentUser);
        const newRecord: TnrRecord = {
          id: `tnr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          catNameOrTag: catNameOrTag.trim() || 'Névtelen TNR cica',
          locationTrapped: locationTrapped.trim(),
          dateTrapped,
          trappedBy: trappedBy.trim(),
          clinicLocation: clinicLocation.trim(),
          surgeonName: surgeonName.trim() || undefined,
          locationReleased: locationReleased.trim(),
          dateReleased: dateReleased || undefined,
          status,
          earTip,
          notes: notes.trim() || undefined,
          createdAt: audit.created_at,
          ...audit,
        };
        await db.tnr.add(newRecord);
        addDebugLog(`[TNR] Új rekord rögzítve: ${newRecord.id}`);
      }

      onSaved();
    } catch (err: any) {
      console.error('Hibás TNR mentés:', err);
      setErrorMsg('Hiba történt az mentés során: ' + (err?.message || 'Ismeretlen hiba'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-gray-200 text-xs"
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✂️</span>
            <div>
              <h3 className="font-black text-gray-900 text-sm">
                {isEdit ? '✏️ TNR Akció Szerkesztése' : '➕ Új TNR Akció Rögzítése'}
              </h3>
              <p className="text-[10px] text-gray-500">
                Befogás - Ivartalanítás - Elengedés nyilvántartási bejegyzés
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 font-bold rounded-xl text-[11px]">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Cica azonosítója / neve */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              Cica azonosítója / megnevezése (Opcionális)
            </label>
            <input
              type="text"
              value={catNameOrTag}
              onChange={(e) => setCatNameOrTag(e.target.value)}
              placeholder="Pl. Főtéri cirmos bak #1"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hol lett befogva */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                📍 Hol lett befogva? *
              </label>
              <input
                type="text"
                required
                value={locationTrapped}
                onChange={(e) => setLocationTrapped(e.target.value)}
                placeholder="Pl. Kossuth Lajos u. 12. udvar"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
              />
            </div>

            {/* Mikor lett befogva */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                📅 Mikor lett befogva? *
              </label>
              <input
                type="date"
                required
                value={dateTrapped}
                onChange={(e) => setDateTrapped(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-bold"
              />
            </div>
          </div>

          {/* Ki fogta be */}
          <div>
            <label className="block text-[11px] font-bold text-gray-800 mb-1">
              🧑‍🤝‍🧑 Ki fogta be? *
            </label>
            <input
              type="text"
              required
              value={trappedBy}
              onChange={(e) => setTrappedBy(e.target.value)}
              placeholder="Pl. Kovács Péter (TNR Önkéntes Csapat)"
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hol műtötték */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                🏥 Hol műtötték (klinika)? *
              </label>
              <input
                type="text"
                required
                value={clinicLocation}
                onChange={(e) => setClinicLocation(e.target.value)}
                placeholder="Pl. Central Állatklinika, Bp"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
              />
            </div>

            {/* Ki műtötte (opcionális) */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                👨‍⚕️ Ki műtötte? (Opcionális)
              </label>
              <input
                type="text"
                value={surgeonName}
                onChange={(e) => setSurgeonName(e.target.value)}
                placeholder="Pl. Dr. Nagy Zoltán"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hol lett elengedve */}
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                🌳 Hol lett elengedve? *
              </label>
              <input
                type="text"
                required
                value={locationReleased}
                onChange={(e) => setLocationReleased(e.target.value)}
                placeholder="Pl. Eredeti helyszín (Kossuth Lajos u.)"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
              />
            </div>

            {/* Mikor lett elengedve */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                📅 Elengedés dátuma (Opcionális)
              </label>
              <input
                type="date"
                value={dateReleased}
                onChange={(e) => setDateReleased(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-bold"
              />
            </div>
          </div>

          {/* Státusz és Fülcsipke */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-end">
            <div>
              <label className="block text-[11px] font-bold text-gray-800 mb-1">
                ⚡ Akció Státusza
              </label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as any)}
                options={[
                  { value: 'befogva', label: 'Befogva / Befogás alatt', icon: '🪤', description: 'Cica sikeresen befogva, szállítás vagy műtét előtt' },
                  { value: 'mutet_alatt', label: 'Műtét alatt / Lábadozik', icon: '✂️', description: 'Ivartalanításon átesett, jelenleg lábadozik' },
                  { value: 'elengedve', label: 'Visszaengedve a kolóniába', icon: '💚', description: 'Sikeresen visszatelepítve az eredeti élőhelyére' },
                ]}
                title="⚡ TNR Akció Státusza"
                colorScheme="pink"
                buttonClassName="p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-gray-800"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 bg-pink-50/70 p-2.5 rounded-xl border border-pink-200 w-full min-h-[42px]">
                <input
                  type="checkbox"
                  checked={earTip}
                  onChange={(e) => setEarTip(e.target.checked)}
                  className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                />
                <span>✂️ Fülcsipkézés megtörtént</span>
              </label>
            </div>
          </div>

          {/* Egyéb megjegyzés */}
          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">
              📝 Egyéb megjegyzés (Opcionális)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pl. Viselkedési megjegyzések, etetőhely megjelölése, mikrochip száma, speciális ápolás..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 font-medium"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Mentés...' : isEdit ? '💾 Módosítások Mentése' : '✨ TNR Rekord Létrehozása'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
