import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../js/db.js';
import { EventTemplate } from '../types';
import { DEFAULT_EVENT_TEMPLATES } from '../data/defaultEventTemplates';
import { CustomSelect } from './CustomSelect';

interface EventTemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: EventTemplate) => void;
}

export const EventTemplateManagerModal: React.FC<EventTemplateManagerModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  // Query custom templates from Dexie DB
  const customTemplatesFromDb = (useLiveQuery(() => db.eventTemplates?.toArray(), []) || []) as EventTemplate[];

  // Combine default built-in templates with custom templates
  const allTemplates: EventTemplate[] = [
    ...DEFAULT_EVENT_TEMPLATES,
    ...customTemplatesFromDb.map((t) => ({ ...t, isBuiltIn: false })),
  ];

  // State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Partial<EventTemplate> | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | string | null>(null);

  // Form State for Create/Edit
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni'>('oltas');
  const [formTitle, setFormTitle] = useState('');
  const [formCost, setFormCost] = useState<number | ''>('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'pending' | 'done'>('done');
  const [formDaysOffset, setFormDaysOffset] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('Saját Sablonok');
  const [formIcon, setFormIcon] = useState('📋');

  useEffect(() => {
    if (editingTemplate) {
      setFormName(editingTemplate.name || '');
      setFormType(editingTemplate.type || 'oltas');
      setFormTitle(editingTemplate.defaultTitle || '');
      setFormCost(editingTemplate.defaultCost ?? '');
      setFormNotes(editingTemplate.defaultNotes || '');
      setFormStatus(editingTemplate.defaultStatus || 'done');
      setFormDaysOffset(editingTemplate.daysOffset || 0);
      setFormCategory(editingTemplate.category || 'Saját Sablonok');
      setFormIcon(editingTemplate.icon || '📋');
    } else {
      setFormName('');
      setFormType('oltas');
      setFormTitle('');
      setFormCost('');
      setFormNotes('');
      setFormStatus('done');
      setFormDaysOffset(0);
      setFormCategory('Saját Sablonok');
      setFormIcon('📋');
    }
  }, [editingTemplate]);

  if (!isOpen) return null;

  // Categories list
  const categories = Array.from(
    new Set(['all', ...allTemplates.map((t) => t.category || 'Egyéb')])
  );

  // Filter templates
  const filteredTemplates = allTemplates.filter((tmpl) => {
    if (selectedCategory !== 'all' && tmpl.category !== selectedCategory) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = tmpl.name.toLowerCase().includes(q);
      const matchTitle = tmpl.defaultTitle.toLowerCase().includes(q);
      const matchNotes = tmpl.defaultNotes.toLowerCase().includes(q);
      return matchName || matchTitle || matchNotes;
    }
    return true;
  });

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim() || !formTitle.trim()) return;

    const payload: Omit<EventTemplate, 'id'> = {
      name: formName.trim(),
      type: formType,
      defaultTitle: formTitle.trim(),
      defaultCost: formCost !== '' ? Number(formCost) : '',
      defaultNotes: formNotes.trim(),
      defaultStatus: formStatus,
      daysOffset: Number(formDaysOffset) || 0,
      isBuiltIn: false,
      category: formCategory.trim() || 'Saját Sablonok',
      icon: formIcon,
    };

    if (editingTemplate?.id && typeof editingTemplate.id === 'number') {
      await db.eventTemplates.update(editingTemplate.id, payload);
    } else {
      await db.eventTemplates.add(payload);
    }

    setEditingTemplate(null);
    setIsCreatingNew(false);
  };

  const handleDeleteCustom = async (id: number | string) => {
    if (typeof id === 'number') {
      await db.eventTemplates.delete(id);
    }
    setDeleteConfirmId(null);
  };

  const handleDuplicate = (tmpl: EventTemplate) => {
    setEditingTemplate({
      ...tmpl,
      id: undefined,
      name: `${tmpl.name} (Másolat)`,
      isBuiltIn: false,
    });
    setIsCreatingNew(true);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-800 border border-gray-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 bg-purple-800/60 border border-purple-500/50 rounded-2xl">📋</span>
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-purple-100">
                <span>Esemény Sablonkezelő</span>
                <span className="px-2 py-0.5 bg-purple-500/30 border border-purple-400/50 text-purple-200 text-[10px] font-mono rounded-full uppercase">
                  Gyors Adatbevitel
                </span>
              </h3>
              <p className="text-xs text-purple-200/80">
                Előre konfigurált űrlap-sablonok oltásokhoz, műtétekhez és rendszeres orvosi beavatkozásokhoz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingNew && !editingTemplate && (
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(null);
                  setIsCreatingNew(true);
                }}
                className="px-3 py-1.5 bg-pink-600 hover:bg-pink-500 text-white font-extrabold rounded-xl text-xs transition cursor-pointer flex items-center gap-1 shadow-md"
              >
                <span>➕</span>
                <span className="hidden sm:inline">Új Sablon</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white hover:bg-purple-800/50 rounded-xl font-bold transition cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {isCreatingNew || editingTemplate ? (
          /* CREATE / EDIT FORM VIEW */
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 bg-gray-50 flex-1">
            <div className="flex items-center justify-between border-b pb-3">
              <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <span>{editingTemplate?.id ? '✏️ Sablon Szerkesztése' : '✨ Új Sablon Létrehozása'}</span>
              </h4>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNew(false);
                  setEditingTemplate(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-800 font-bold underline"
              >
                Vissza a sablonokhoz
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs font-semibold">
              {/* Template Name & Icon */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-gray-700 font-bold mb-1">🏷️ Sablon Neve (Azonosító):</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="pl. FIP Speciális Injekciós Kúra, Veszettség Éves..."
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">🎭 Ikon:</label>
                  <CustomSelect
                    value={formIcon}
                    onChange={(val) => setFormIcon(val)}
                    options={[
                      { value: '📋', label: 'Mappa / Lista', icon: '📋' },
                      { value: '💉', label: 'Oltás / Injekció', icon: '💉' },
                      { value: '✂️', label: 'Műtét / Ivartalanítás', icon: '✂️' },
                      { value: '🔬', label: 'Labor / Szűrés', icon: '🔬' },
                      { value: '💊', label: 'Gyógyszer / Tabletta', icon: '💊' },
                      { value: '💧', label: 'Spot-On / Csepp', icon: '💧' },
                      { value: '🩺', label: 'Kontroll / Orvosi', icon: '🩺' },
                      { value: '🔔', label: 'Emlékeztető', icon: '🔔' },
                      { value: '🏥', label: 'Kórház / Klinika', icon: '🏥' },
                    ]}
                    title="Sablon Ikon Kiválasztása"
                    colorScheme="purple"
                    buttonClassName="p-2.5 bg-white border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              {/* Event Type & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">📂 Esemény Típusa:</label>
                  <CustomSelect
                    value={formType}
                    onChange={(val) => setFormType(val as any)}
                    options={[
                      { value: 'oltas', label: 'Oltás', icon: '💉' },
                      { value: 'orvosi', label: 'Orvosi Kezelés', icon: '🩺' },
                      { value: 'teszt', label: 'Szűrés / Teszt', icon: '🔬' },
                      { value: 'mutet', label: 'Műtét / Ivartalanítás', icon: '✂️' },
                      { value: 'egyeni', label: 'Egyéb Esemény', icon: '📅' },
                    ]}
                    title="Esemény Típus Kiválasztása"
                    colorScheme="purple"
                    buttonClassName="p-2.5 bg-white border border-gray-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">🏷️ Kategória Tág:</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="pl. Védőoltások, Saját Kezelések..."
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Default Title */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">📝 Előre kitöltött Megnevezés:</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="pl. Kombinált oltás (Purevax), Kontroll vizsgálat..."
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Cost & Days Offset */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">💰 Becsült Költség (Ft):</label>
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">📌 Alapértelmezett Státusz:</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as any)}
                    options={[
                      { value: 'done', label: 'Teljesítve (Azonnali)', icon: '✅' },
                      { value: 'pending', label: 'Esedékes (Függőben)', icon: '⏳' },
                    ]}
                    title="Alapértelmezett Státusz"
                    colorScheme="purple"
                    buttonClassName="p-2.5 bg-white border border-gray-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">📅 Dátum Eltolás (nap):</label>
                  <input
                    type="number"
                    value={formDaysOffset}
                    onChange={(e) => setFormDaysOffset(Number(e.target.value))}
                    placeholder="0 (Mai nap) vagy pl. 365"
                    className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-semibold focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-gray-500 font-normal">0 = Ma, 365 = 1 év múlva</span>
                </div>
              </div>

              {/* Default Notes */}
              <div>
                <label className="block text-gray-700 font-bold mb-1">💬 Előre kitöltött Megjegyzés / Protokoll:</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  placeholder="Orvosi utasítások, dózisok, kezelési útmutató..."
                  className="w-full p-2.5 bg-white border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingNew(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-extrabold rounded-xl shadow-md transition cursor-pointer"
                >
                  💾 Sablon Mentése
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* TEMPLATE LIST VIEW */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter and Search Bar */}
            <div className="p-3 bg-gray-100 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              {/* Search */}
              <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-300 rounded-xl px-3 py-1.5">
                <span className="text-gray-400">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Keresés sablon név vagy szöveg alapján..."
                  className="w-full bg-transparent border-none text-xs focus:outline-none"
                />
                {search && (
                  <button type="button" onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600 font-bold">
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-xl font-bold text-xs whitespace-nowrap transition cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {cat === 'all' ? '🌐 Összes Sablon' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Grid */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50">
              {filteredTemplates.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-dashed border-gray-300 text-gray-500 space-y-2">
                  <span className="text-3xl block">🔍</span>
                  <p className="font-bold text-sm">Nem található a keresésnek megfelelő sablon.</p>
                  <p className="text-xs text-gray-400">Próbálj más keresőszót, vagy hozz létre egy új saját sablont!</p>
                </div>
              ) : (
                filteredTemplates.map((tmpl) => {
                  const typeBadgeClass =
                    tmpl.type === 'oltas'
                      ? 'bg-pink-100 text-pink-700 border-pink-200'
                      : tmpl.type === 'mutet'
                      ? 'bg-cyan-100 text-cyan-700 border-cyan-200'
                      : tmpl.type === 'teszt'
                      ? 'bg-purple-100 text-purple-700 border-purple-200'
                      : tmpl.type === 'orvosi'
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : 'bg-amber-100 text-amber-700 border-amber-200';

                  return (
                    <div
                      key={tmpl.id || tmpl.name}
                      className="bg-white rounded-2xl border border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md transition p-3.5 flex flex-col justify-between space-y-2 group"
                    >
                      <div>
                        {/* Top bar: Category & Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-mono uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            {tmpl.category || 'Általános'}
                          </span>
                          <div className="flex items-center gap-1">
                            {tmpl.isBuiltIn ? (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                                🔒 Beépített
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                                ⭐ Saját Sablon
                              </span>
                            )}
                            <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${typeBadgeClass}`}>
                              {tmpl.type === 'oltas'
                                ? 'Oltás'
                                : tmpl.type === 'mutet'
                                ? 'Műtét'
                                : tmpl.type === 'teszt'
                                ? 'Teszt'
                                : tmpl.type === 'orvosi'
                                ? 'Kezelés'
                                : 'Egyéb'}
                            </span>
                          </div>
                        </div>

                        {/* Template Title */}
                        <h4 className="font-extrabold text-sm text-gray-900 group-hover:text-purple-700 flex items-center gap-1.5 transition">
                          <span>{tmpl.icon || '📋'}</span>
                          <span>{tmpl.name}</span>
                        </h4>

                        {/* Details */}
                        <div className="mt-1 space-y-1 text-xs text-gray-600">
                          <p className="font-semibold text-gray-800">
                            📝 {tmpl.defaultTitle}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 font-medium">
                            {tmpl.defaultCost ? (
                              <span>💰 {Number(tmpl.defaultCost).toLocaleString('hu-HU')} Ft</span>
                            ) : null}
                            <span>
                              📅 {tmpl.daysOffset ? `+${tmpl.daysOffset} nap` : 'Azonnali / Mai nap'}
                            </span>
                          </div>
                          {tmpl.defaultNotes && (
                            <p className="text-[11px] text-gray-500 italic line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                              "{tmpl.defaultNotes}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                        {/* Edit / Delete / Duplicate */}
                        <div className="flex items-center gap-1">
                          {!tmpl.isBuiltIn && typeof tmpl.id === 'number' && (
                            <>
                              <button
                                type="button"
                                onClick={() => setEditingTemplate(tmpl)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                                title="Szerkesztés"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(tmpl.id!)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[11px] rounded-lg transition cursor-pointer"
                                title="Törlés"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(tmpl)}
                            className="px-2 py-1 bg-gray-100 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                            title="Másolás új sablonként"
                          >
                            📑 Másolás
                          </button>
                        </div>

                        {/* Select Template Button */}
                        {onSelectTemplate && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectTemplate(tmpl);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-800 hover:to-pink-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                          >
                            <span>⚡ Kitöltés</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 font-medium shrink-0">
          <span>
            Összesen: <strong>{allTemplates.length} db sablon</strong> ({allTemplates.filter((t) => !t.isBuiltIn).length} saját)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition cursor-pointer"
          >
            Bezárás
          </button>
        </div>
      </div>

      {/* Custom Template Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-3 border border-red-200 text-center">
            <span className="text-3xl block">⚠️</span>
            <h4 className="font-extrabold text-sm text-gray-900">Sablon törlésének megerősítése</h4>
            <p className="text-xs text-gray-600">Biztosan törölni szeretnéd ezt a saját sablont? Ez a művelet nem vonható vissza.</p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Mégse
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustom(deleteConfirmId)}
                className="flex-1 py-2 bg-red-600 text-white font-extrabold rounded-xl text-xs cursor-pointer"
              >
                🗑️ Törlés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
