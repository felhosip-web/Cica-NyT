import React, { useState, useEffect } from 'react';
import { db } from '../js/db.js';
import { FosterParent } from '../types';
import { CustomSelect } from './CustomSelect';

interface FosterFormModalProps {
  fosterToEdit: FosterParent | null;
  onClose: () => void;
  onSaved: () => void;
}

export const FosterFormModal: React.FC<FosterFormModalProps> = ({
  fosterToEdit,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'aktiv' | 'szunetel' | 'megeltes'>('aktiv');
  const [maxCapacity, setMaxCapacity] = useState<number>(3);
  const [housingType, setHousingType] = useState<'lakas' | 'kertes_haz' | 'karanten_szoba' | 'egyeb'>('lakas');
  const [acceptsKittens, setAcceptsKittens] = useState(true);
  const [acceptsSick, setAcceptsSick] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (fosterToEdit) {
      setName(fosterToEdit.name || '');
      setPhone(fosterToEdit.phone || '');
      setEmail(fosterToEdit.email || '');
      setCity(fosterToEdit.city || '');
      setAddress(fosterToEdit.address || '');
      setStatus(fosterToEdit.status || 'aktiv');
      setMaxCapacity(fosterToEdit.maxCapacity || 3);
      setHousingType(fosterToEdit.housingType || 'lakas');
      setAcceptsKittens(fosterToEdit.acceptsKittens ?? true);
      setAcceptsSick(fosterToEdit.acceptsSick ?? false);
      setNotes(fosterToEdit.notes || '');
    }
  }, [fosterToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Kérjük, adja meg az ideiglenes befogadó nevét!');
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload: FosterParent = {
        id: fosterToEdit ? fosterToEdit.id : `foster_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
        status,
        maxCapacity: Math.max(1, Number(maxCapacity) || 1),
        housingType,
        acceptsKittens,
        acceptsSick,
        notes: notes.trim() || undefined,
        createdAt: fosterToEdit ? fosterToEdit.createdAt : now,
      };

      await db.fosterParents.put(payload);
      onSaved();
    } catch (err) {
      console.error('Hiba az ideiglenes befogadó mentésekor:', err);
      alert('Nem sikerült menteni a befogadó adatait!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏡</span>
            <div>
              <h2 className="font-extrabold text-base leading-tight">
                {fosterToEdit ? 'Befogadó Adatainak Szerkesztése' : 'Új Ideiglenes Befogadó Regisztrációja'}
              </h2>
              <p className="text-xs text-indigo-100 font-medium">
                Ideiglenes nevelő hálózati profil és kapacitás
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Befogadó Neve <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pl. Kiss Mária"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Telefonszám</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+36 30 123 4567"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Email & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">E-mail cím</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="maria@example.hu"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Település / Város</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Pl. Budapest, IV. kerület"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Pontos Cím (Belső használatra)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Utca, házszám, emelet..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Capacity, Status & Housing */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
            <h3 className="text-xs font-extrabold text-indigo-900 flex items-center gap-1">
              📊 Kapacitás és Lakhatási Feltételek
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">Max Férőhely (Cica)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-black text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">Státusz</label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val as any)}
                  options={[
                    { value: 'aktiv', label: 'Aktív (Fogadóképes)', icon: '🟢', badge: 'Szabad kapacitás', badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
                    { value: 'szunetel', label: 'Szünetel', icon: '⚪', badge: 'Pillanatnyilag nem', badgeColor: 'bg-gray-100 text-gray-700 border-gray-300' },
                    { value: 'megeltes', label: 'Megtelt (Telt ház)', icon: '🔴', badge: 'Nincs hely', badgeColor: 'bg-rose-100 text-rose-800 border-rose-300' },
                  ]}
                  title="Befogadó Státusz Kiválasztása"
                  colorScheme="indigo"
                  buttonClassName="p-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-900 mb-1">Lakhatás Típusa</label>
                <CustomSelect
                  value={housingType}
                  onChange={(val) => setHousingType(val as any)}
                  options={[
                    { value: 'lakas', label: 'Lakás', icon: '🏢' },
                    { value: 'kertes_haz', label: 'Kertes Ház', icon: '🏡' },
                    { value: 'karanten_szoba', label: 'Karantén szoba van', icon: '🚪' },
                    { value: 'egyeb', label: 'Egyéb', icon: '📦' },
                  ]}
                  title="Lakhatás Típusának Kiválasztása"
                  colorScheme="indigo"
                  buttonClassName="p-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-indigo-900"
                />
              </div>
            </div>

            {/* Special capabilities checkboxes */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-950">
                <input
                  type="checkbox"
                  checked={acceptsKittens}
                  onChange={(e) => setAcceptsKittens(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span>🍼 Kölyökmacskát vállal</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-950">
                <input
                  type="checkbox"
                  checked={acceptsSick}
                  onChange={(e) => setAcceptsSick(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <span>🩺 Beteg / Kezelésre szorulót vállal</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Megjegyzés / Feltételek
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pl. Saját kutya van, hálózott erkély áll rendelkezésre, tápszerezést vállal..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          {/* Footer Buttons */}
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
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Mentés...' : 'Befogadó Mentése 💾'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
