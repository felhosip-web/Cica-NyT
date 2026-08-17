import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Cat } from './CatCard';
import { useAppStore } from '../store/useAppStore';
import { createAuditStamp, updateAuditStamp } from '../utils/audit';
import { PRESET_TAGS, getTagStyle, getTagIcon } from '../utils/tagUtils';
import { CustomSelect } from './CustomSelect';

interface CatFormModalProps {
  catToEdit?: Cat | null;
  onClose: () => void;
  onSaved: () => void;
}

export const CatFormModal: React.FC<CatFormModalProps> = ({
  catToEdit,
  onClose,
  onSaved,
}) => {
  const fosterParents = useLiveQuery(() => db.fosterParents.toArray(), []) || [];

  const [sorszam, setSorszam] = useState('');
  const [nev, setNev] = useState('');
  const [ivar, setIvar] = useState<'bak' | 'nosteny'>('nosteny');
  const [szin, setSzin] = useState('');
  const [szuletes, setSzuletes] = useState('');
  const [status, setStatus] = useState<'gondozasban' | 'gazdis' | 'ideiglenes' | 'elhunyt'>('gondozasban');
  const [fosterId, setFosterId] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [intakeType, setIntakeType] = useState('sajat');
  const [hasChip, setHasChip] = useState(false);
  const [chipNumber, setChipNumber] = useState('');
  const [chipDate, setChipDate] = useState('');
  const [chipLocation, setChipLocation] = useState('');
  const [hasKiskonyv, setHasKiskonyv] = useState(false);
  const [kiskonyvSzam, setKiskonyvSzam] = useState('');
  const [kiskonyvDate, setKiskonyvDate] = useState('');
  const [isSpayed, setIsSpayed] = useState(false);
  const [spayedDate, setSpayedDate] = useState('');
  const [spayedLocation, setSpayedLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (catToEdit) {
      setSorszam(catToEdit.sorszam !== undefined && catToEdit.sorszam !== null ? String(catToEdit.sorszam) : '');
      setNev(catToEdit.nev ? String(catToEdit.nev) : '');
      setIvar((catToEdit.ivar as any) || 'nosteny');
      setSzin(catToEdit.szin ? String(catToEdit.szin) : '');
      setSzuletes(catToEdit.szuletes ? String(catToEdit.szuletes) : '');
      setStatus((catToEdit.status as any) || 'gondozasban');
      setFosterId(catToEdit.fosterId || '');
      setTags(Array.isArray(catToEdit.tags) ? catToEdit.tags : []);
      setIntakeType(catToEdit.intakeType ? String(catToEdit.intakeType) : 'sajat');

      const chipExists = !!catToEdit.chipNumber || !!(catToEdit as any).hasChip || !!catToEdit.chipDate;
      setHasChip(chipExists);
      setChipNumber(catToEdit.chipNumber ? String(catToEdit.chipNumber) : '');
      setChipDate(catToEdit.chipDate ? String(catToEdit.chipDate) : '');
      setChipLocation((catToEdit as any).chipLocation ? String((catToEdit as any).chipLocation) : '');

      const kiskonyvExists = !!catToEdit.hasKiskonyv;
      setHasKiskonyv(kiskonyvExists);
      setKiskonyvSzam((catToEdit as any).kiskonyvSzam ? String((catToEdit as any).kiskonyvSzam) : '');
      setKiskonyvDate((catToEdit as any).kiskonyvDate ? String((catToEdit as any).kiskonyvDate) : '');

      setIsSpayed(!!catToEdit.isSpayed);
      setSpayedDate((catToEdit as any).spayedDate ? String((catToEdit as any).spayedDate) : '');
      setSpayedLocation((catToEdit as any).spayedLocation ? String((catToEdit as any).spayedLocation) : '');
      setNotes((catToEdit as any).notes ? String((catToEdit as any).notes) : '');
    }
  }, [catToEdit]);

  const toggleTag = (tagName: string) => {
    if (tags.includes(tagName)) {
      setTags(tags.filter((t) => t !== tagName));
    } else {
      setTags([...tags, tagName]);
    }
  };

  const handleAddCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Delete confirm state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteCat = async () => {
    if (!catToEdit?.id) return;
    setIsDeleting(true);
    try {
      await db.cats.delete(catToEdit.id);
      await db.events.where('catId').equals(catToEdit.id).delete();
      setShowDeleteConfirm(false);
      onSaved();
      onClose();
    } catch (err) {
      console.error('Hiba a törlés során:', err);
      alert('Hiba történt a törlés során!');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const currentUser = useAppStore.getState().getCurrentUser();

    const payload = {
      sorszam: String(sorszam || '').trim(),
      nev: String(nev || '').trim() || 'Névtelen cica',
      ivar,
      szin: String(szin || '').trim(),
      szuletes,
      status,
      fosterId: status === 'ideiglenes' ? (fosterId || null) : null,
      tags,
      intakeType,
      hasChip,
      chipNumber: hasChip ? (String(chipNumber || '').trim() || null) : null,
      chipDate: hasChip ? (chipDate || null) : null,
      chipLocation: hasChip ? (String(chipLocation || '').trim() || null) : null,
      hasKiskonyv,
      kiskonyvSzam: hasKiskonyv ? (String(kiskonyvSzam || '').trim() || null) : null,
      kiskonyvDate: hasKiskonyv ? (kiskonyvDate || null) : null,
      isSpayed,
      spayedDate: isSpayed ? (spayedDate || null) : null,
      spayedLocation: isSpayed ? (String(spayedLocation || '').trim() || null) : null,
      notes,
    };

    if (catToEdit?.id) {
      const audit = updateAuditStamp(catToEdit as any, currentUser);
      await db.cats.update(catToEdit.id, {
        ...payload,
        ...audit,
        updatedAt: audit.updated_at,
      });
    } else {
      const newId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const audit = createAuditStamp(currentUser);
      await db.cats.add({
        id: newId,
        ...payload,
        ...audit,
        created: audit.created_at,
        updatedAt: audit.updated_at,
        oltasok: [],
        kezelesek: [],
        tesztek: [],
      });
    }

    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
            🐱 {catToEdit ? 'Cica Adatainak Módosítása' : 'Új Cica Felvétele'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          {/* Sorszám & Név */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1"># Sorszám:</label>
              <input
                type="text"
                value={sorszam}
                onChange={(e) => setSorszam(e.target.value)}
                placeholder="pl. 001"
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-gray-700 font-bold mb-1">🐱 Cica Neve:</label>
              <input
                type="text"
                required
                value={nev}
                onChange={(e) => setNev(e.target.value)}
                placeholder="pl. Mirci, Foltos..."
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-sm focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Ivar & Szín & Születés */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Ivar:</label>
              <CustomSelect
                value={ivar}
                onChange={(val) => setIvar(val as any)}
                options={[
                  { value: 'nosteny', label: 'Nőstény', icon: '♀️', badge: 'Lány', badgeColor: 'bg-pink-100 text-pink-700 border-pink-300' },
                  { value: 'bak', label: 'Kandúr (Bak)', icon: '♂️', badge: 'Fiú', badgeColor: 'bg-blue-100 text-blue-700 border-blue-300' },
                ]}
                title="Ivar Kiválasztása"
                colorScheme="pink"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Szín / Mintázat:</label>
              <input
                type="text"
                value={szin}
                onChange={(e) => setSzin(e.target.value)}
                placeholder="pl. Cirmos, Fekete..."
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-pink-500"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Születési Idő:</label>
              <input
                type="date"
                value={szuletes}
                onChange={(e) => setSzuletes(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>

          {/* Státusz & Beérkezés */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-bold mb-1">🏡 Gondozási Státusz:</label>
              <CustomSelect
                value={status}
                onChange={(val) => setStatus(val as any)}
                options={[
                  { value: 'gondozasban', label: 'Gondozásban', icon: '🏡', description: 'Közvetlen menhelyi / alapítványi ellátásban' },
                  { value: 'ideiglenes', label: 'Ideiglenes befogadónál', icon: '🔵', description: 'Kiadva regisztrált ideiglenes gazdihoz' },
                  { value: 'gazdis', label: 'Gazdis lett', icon: '🟢', description: 'Véglegesen örökbefogadva' },
                  { value: 'elhunyt', label: 'Elhunyt', icon: '🖤', description: 'In Memoriam / Lezárt profil' },
                ]}
                title="🏡 Gondozási Státusz Kiválasztása"
                colorScheme="purple"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">📥 Bekerülés Típusa:</label>
              <CustomSelect
                value={intakeType}
                onChange={(val) => setIntakeType(val)}
                options={[
                  { value: 'sajat', label: 'Saját mentés', icon: '🐾' },
                  { value: 'befogott', label: 'Befogott kóbor', icon: '🐈' },
                  { value: 'leadott', label: 'Gazda által leadott', icon: '📦' },
                  { value: 'elkobzott', label: 'Elkobzott', icon: '⚖️' },
                ]}
                title="📥 Bekerülés Típusának Kiválasztása"
                colorScheme="indigo"
              />
            </div>
          </div>

          {/* Conditional Foster Parent Select */}
          {status === 'ideiglenes' && (
            <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-1 animate-in fade-in duration-150">
              <label className="block text-indigo-950 font-black text-xs">
                🏡 Ideiglenes Befogadó Kiválasztása:
              </label>
              <CustomSelect
                value={fosterId}
                onChange={(val) => setFosterId(val)}
                options={[
                  { value: '', label: '-- Válasszon regisztrált befogadót --', icon: '👤' },
                  ...fosterParents.map((f) => ({
                    value: f.id,
                    label: f.name,
                    icon: '🏡',
                    badge: `${f.maxCapacity} cica kapacitás`,
                    description: f.city || f.address || 'Cím nélkül',
                  })),
                ]}
                placeholder="-- Válasszon regisztrált befogadót --"
                title="🏡 Ideiglenes Befogadó Kiválasztása"
                colorScheme="indigo"
              />
            </div>
          )}

          {/* 🏷️ Egyedi Címkék (Tags / Állapotok) */}
          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                🏷️ Egyedi Címkék / Állapotok:
              </label>
              <span className="text-[10px] text-purple-700 font-bold bg-purple-100 px-2 py-0.5 rounded-full">
                {tags.length} címke kiválasztva
              </span>
            </div>

            {/* Selected Tags Chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-white rounded-xl border border-purple-200">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${getTagStyle(tag)}`}
                  >
                    <span>{getTagIcon(tag)}</span>
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-slate-400 hover:text-slate-800 font-black cursor-pointer text-xs"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Preset Tag Toggles */}
            <div className="space-y-1">
              <span className="text-[10px] text-purple-900 font-bold block">
                Gyors választás gyakori állapotokból:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_TAGS.map((preset) => {
                  const isSelected = tags.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleTag(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                          : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100'
                      }`}
                    >
                      <span>{getTagIcon(preset)}</span>
                      <span>{preset}</span>
                      {isSelected ? ' ✓' : ' +'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add Custom Tag Input */}
            <div className="pt-1 flex items-center gap-2">
              <input
                type="text"
                placeholder="➕ Új egyedi címke (pl. karanténban, kezelés alatt)..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                className="flex-1 p-2 bg-white text-slate-900 border border-purple-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => handleAddCustomTag()}
                disabled={!newTagInput.trim()}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition cursor-pointer shrink-0"
              >
                + Hozzáadás
              </button>
            </div>
          </div>

          {/* Microchip Details */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-emerald-900 font-bold text-xs flex items-center gap-1.5">
                🏷️ Mikrochip Adatok
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasChip}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasChip(checked);
                    if (!checked) {
                      setChipNumber('');
                      setChipDate('');
                      setChipLocation('');
                    }
                  }}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-900">Rendelkezik mikrochippel</span>
              </label>
            </div>

            {hasChip && (
              <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] text-emerald-800 font-semibold mb-1">
                      Chip száma (15 számjegy):
                    </label>
                    <input
                      type="text"
                      value={chipNumber}
                      onChange={(e) => setChipNumber(e.target.value)}
                      placeholder="pl. 941000023456789..."
                      className="w-full p-2 bg-white border border-emerald-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-emerald-800 font-semibold mb-1">
                      Beültetés dátuma:
                    </label>
                    <input
                      type="date"
                      value={chipDate}
                      onChange={(e) => setChipDate(e.target.value)}
                      className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-emerald-800 font-semibold mb-1">
                    Beültetés helye / Rendelő:
                  </label>
                  <input
                    type="text"
                    value={chipLocation}
                    onChange={(e) => setChipLocation(e.target.value)}
                    placeholder="Klínika neve / orvos..."
                    className="w-full p-2 bg-white border border-emerald-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Spayed / Ivartalanítás */}
          <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-teal-900 font-bold text-xs flex items-center gap-1.5">
                ✂️ Ivartalanítás Állapota
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSpayed}
                  onChange={(e) => setIsSpayed(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-teal-900">Ivartalanítva</span>
              </label>
            </div>

            {isSpayed && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] text-teal-800 font-semibold mb-1">Dátum:</label>
                  <input
                    type="date"
                    value={spayedDate}
                    onChange={(e) => setSpayedDate(e.target.value)}
                    className="w-full p-2 bg-white border border-teal-300 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-teal-800 font-semibold mb-1">Rendelő / Orvos:</label>
                  <input
                    type="text"
                    value={spayedLocation}
                    onChange={(e) => setSpayedLocation(e.target.value)}
                    placeholder="Klínika neve..."
                    className="w-full p-2 bg-white border border-teal-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Oltási Kiskönyv Details */}
          <div className="p-3 bg-pink-50/60 border border-pink-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-pink-900 font-bold text-xs flex items-center gap-1.5">
                📘 Oltási Kiskönyv
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="chk-kiskonyv"
                  checked={hasKiskonyv}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasKiskonyv(checked);
                    if (!checked) {
                      setKiskonyvSzam('');
                      setKiskonyvDate('');
                    }
                  }}
                  className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-pink-900">Oltási kiskönyvvel rendelkezik</span>
              </label>
            </div>

            {hasKiskonyv && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] text-pink-800 font-semibold mb-1">
                    Kiskönyv száma:
                  </label>
                  <input
                    type="text"
                    value={kiskonyvSzam}
                    onChange={(e) => setKiskonyvSzam(e.target.value)}
                    placeholder="pl. HU-2024-00123..."
                    className="w-full p-2 bg-white border border-pink-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-pink-800 font-semibold mb-1">
                    Kiállítás / regisztráció dátuma:
                  </label>
                  <input
                    type="date"
                    value={kiskonyvDate}
                    onChange={(e) => setKiskonyvDate(e.target.value)}
                    className="w-full p-2 bg-white border border-pink-300 rounded-xl text-xs focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Megjegyzés */}
          <div>
            <label className="block text-gray-700 font-bold mb-1">💬 Egyéb megjegyzés:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Speciális étrend, viselkedés, előélet..."
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-pink-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t flex items-center justify-between gap-2">
            {catToEdit?.id ? (
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

      {/* Confirmation Modal for Cat Deletion */}
      {showDeleteConfirm && catToEdit && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 space-y-4 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto font-black shadow-inner">
              ⚠️
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                Biztosan törölni szeretnéd?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                A(z) <span className="font-extrabold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{catToEdit.nev}</span> nevű cica minden adata <span className="font-bold underline text-red-700">véglegesen törlődni fog</span> a nyilvántartásból!
              </p>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 font-semibold">
              <p className="flex items-center justify-center gap-1.5 font-bold">
                <span>⚡</span>
                <span>Ez a művelet nem vonható vissza!</span>
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold rounded-xl transition text-xs cursor-pointer border border-gray-300"
              >
                Mégse (Megtartom)
              </button>
              <button
                type="button"
                onClick={confirmDeleteCat}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition text-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Törlés...</span>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Végleges törlés</span>
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
