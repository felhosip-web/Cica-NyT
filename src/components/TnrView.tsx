import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/db';
import { TnrRecord } from '../types';
import { TnrCard } from './TnrCard';
import { TnrFormModal } from './TnrFormModal';
import { TnrPdfExportModal } from './TnrPdfExportModal';
import { useAppStore } from '../store/useAppStore';

export const TnrView: React.FC = () => {
  const { getCurrentUserPermissions, addDebugLog } = useAppStore();
  const perms = getCurrentUserPermissions();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'befogva' | 'mutet_alatt' | 'elengedve'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [editingTnr, setEditingTnr] = useState<TnrRecord | null | 'new'>(null);
  const [showPdfExportModal, setShowPdfExportModal] = useState(false);

  const allTnrRecords = (useLiveQuery(() => db.tnr.toArray(), []) || []) as TnrRecord[];

  const filteredRecords = allTnrRecords.filter((record) => {
    // Status filter
    if (statusFilter !== 'all' && record.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchCat = record.catNameOrTag?.toLowerCase().includes(q);
      const matchTrappedLoc = record.locationTrapped?.toLowerCase().includes(q);
      const matchTrappedBy = record.trappedBy?.toLowerCase().includes(q);
      const matchClinic = record.clinicLocation?.toLowerCase().includes(q);
      const matchSurgeon = record.surgeonName?.toLowerCase().includes(q);
      const matchReleaseLoc = record.locationReleased?.toLowerCase().includes(q);
      const matchNotes = record.notes?.toLowerCase().includes(q);

      return (
        matchCat ||
        matchTrappedLoc ||
        matchTrappedBy ||
        matchClinic ||
        matchSurgeon ||
        matchReleaseLoc ||
        matchNotes
      );
    }

    return true;
  });

  const handleDelete = async (id: string) => {
    try {
      await db.tnr.delete(id);
      addDebugLog(`[TNR] Rekord törölve: ${id}`);
    } catch (err) {
      console.error('Hiba TNR törlésénél:', err);
    }
  };

  // Stats calculation
  const totalCount = allTnrRecords.length;
  const releasedCount = allTnrRecords.filter((r) => r.status === 'elengedve').length;
  const careCount = allTnrRecords.filter((r) => r.status === 'mutet_alatt').length;
  const trappedCount = allTnrRecords.filter((r) => r.status === 'befogva').length;
  const earTipCount = allTnrRecords.filter((r) => r.earTip).length;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-900 via-rose-900 to-purple-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 border border-pink-500/30">
        <div>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <span>✂️ TNR Nyilvántartás (Befogás - Ivartalanítás - Elengedés)</span>
          </h2>
          <p className="text-xs text-pink-100/90 mt-0.5 max-w-2xl">
            Kóbor és kolónia macskák lakossági és menhelyi TNR programjának részletes nyomon követése.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowPdfExportModal(true)}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/20 backdrop-blur-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            title="TNR adatok exportálása PDF formátumban hatóságok részére"
          >
            <span>📄 Hatósági PDF Exportálás</span>
          </button>

          {perms.canManageTnr ? (
            <button
              onClick={() => setEditingTnr('new')}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ring-2 ring-pink-300/40"
            >
              ➕ Új TNR Akció Rögzítése
            </button>
          ) : (
            <button
              disabled
              title="A jelenlegi jogosultsági szinttel nem hozható létre TNR bejegyzés."
              className="px-3.5 py-2 bg-gray-700 text-gray-400 font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 opacity-70 cursor-not-allowed"
            >
              🔒 TNR Rögzítés Korlátozva
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-gray-500">Összes TNR Akció</div>
          <div className="text-xl font-black text-gray-900 flex items-center justify-between">
            <span>{totalCount}</span>
            <span className="text-base">📋</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-800">💚 Visszaengedve</div>
          <div className="text-xl font-black text-emerald-900 flex items-center justify-between">
            <span>{releasedCount}</span>
            <span className="text-xs bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded-full font-extrabold">
              {totalCount > 0 ? Math.round((releasedCount / totalCount) * 100) : 0}%
            </span>
          </div>
        </div>

        <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-purple-800">✂️ Műtét / Lábadozás</div>
          <div className="text-xl font-black text-purple-900 flex items-center justify-between">
            <span>{careCount}</span>
            <span className="text-base">🩺</span>
          </div>
        </div>

        <div className="p-3 bg-pink-50 rounded-2xl border border-pink-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-pink-800">✂️ Fülcsipkézve</div>
          <div className="text-xl font-black text-pink-900 flex items-center justify-between">
            <span>{earTipCount}</span>
            <span className="text-base">🏷️</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keresés helyszín, befogó, klinika alapján..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-pink-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Összes ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('befogva')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'befogva'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🪤 Befogva ({trappedCount})
            </button>
            <button
              onClick={() => setStatusFilter('mutet_alatt')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'mutet_alatt'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ✂️ Műtét alatt ({careCount})
            </button>
            <button
              onClick={() => setStatusFilter('elengedve')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                statusFilter === 'elengedve'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💚 Elengedve ({releasedCount})
            </button>
          </div>

          {/* View Mode Switcher: Grid vs Table */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 text-xs font-bold">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-pink-700 shadow-2xs font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="🎴 Kártyás nézet"
            >
              🎴 Kártyás
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-pink-700 shadow-2xs font-black'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              title="📋 Listás nézet"
            >
              📋 Listás
            </button>
          </div>
        </div>
      </div>

      {/* Main Records Display */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
          <div className="text-4xl">✂️</div>
          <h3 className="font-extrabold text-gray-800 text-sm">
            {allTnrRecords.length === 0
              ? 'Még nem lett rögzítve TNR akció'
              : 'Nincs a keresési feltételeknek megfelelő TNR bejegyzés'}
          </h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            {allTnrRecords.length === 0
              ? 'A TNR (Befog-Ivartalanít-Elenged) nyilvántartóval nyomon követheti a kóbor cicák befogását, műtétét és elengedését.'
              : 'Próbálja meg módosítani a keresési szűrőket vagy törölni a keresőkifejezést.'}
          </p>
          {perms.canManageTnr && allTnrRecords.length === 0 && (
            <button
              onClick={() => setEditingTnr('new')}
              className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
            >
              ➕ Első TNR Akció Rögzítése
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* KÁRTYÁS (GRID) NÉZET */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((tnr) => (
            <TnrCard
              key={tnr.id}
              tnr={tnr}
              onEdit={(record) => setEditingTnr(record)}
              onDelete={(id) => handleDelete(id)}
            />
          ))}
        </div>
      ) : (
        /* LISTÁS (TÁBLÁZATOS) NÉZET */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 font-extrabold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3.5">Cica / Azonosító</th>
                  <th className="py-3 px-3.5">Státusz</th>
                  <th className="py-3 px-3.5">Befogás (Hely & Dátum & Befogó)</th>
                  <th className="py-3 px-3.5">Műtét (Klinika & Állatorvos)</th>
                  <th className="py-3 px-3.5">Elengedés Helyszíne</th>
                  <th className="py-3 px-3.5 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-800">
                {filteredRecords.map((tnr) => (
                  <tr key={tnr.id} className="hover:bg-pink-50/40 transition">
                    <td className="py-3 px-3.5 font-bold text-gray-900">
                      <div className="flex items-center gap-1.5">
                        <span>🐱 {tnr.catNameOrTag || 'TNR Cica'}</span>
                        {tnr.earTip && (
                          <span className="text-[9px] bg-pink-100 text-pink-700 px-1 py-0.2 rounded font-bold" title="Fülcsipkés">
                            ✂️ CSIPKÉS
                          </span>
                        )}
                      </div>
                      {tnr.notes && (
                        <div className="text-[10px] text-gray-500 font-normal truncate max-w-xs mt-0.5">
                          💬 {tnr.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      {tnr.status === 'befogva' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          🪤 Befogva
                        </span>
                      )}
                      {tnr.status === 'mutet_alatt' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                          ✂️ Műtét alatt
                        </span>
                      )}
                      {tnr.status === 'elengedve' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          💚 Elengedve
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-bold text-gray-900">{tnr.locationTrapped}</div>
                      <div className="text-[10px] text-gray-500">
                        📅 {tnr.dateTrapped} &bull; 🧑‍🤝‍🧑 {tnr.trappedBy}
                      </div>
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-bold text-gray-900">{tnr.clinicLocation}</div>
                      {tnr.surgeonName && (
                        <div className="text-[10px] text-gray-500">👨‍⚕️ {tnr.surgeonName}</div>
                      )}
                    </td>

                    <td className="py-3 px-3.5">
                      <div className="font-bold text-gray-900">{tnr.locationReleased}</div>
                      {tnr.dateReleased && (
                        <div className="text-[10px] text-gray-500">📅 {tnr.dateReleased}</div>
                      )}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      {perms.canManageTnr ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingTnr(tnr)}
                            className="px-2 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 font-bold rounded-lg transition cursor-pointer text-[11px]"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Biztosan törli ezt a TNR rekordot?`)) {
                                handleDelete(tnr.id);
                              }
                            }}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg transition cursor-pointer text-[11px]"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-bold">👁️ Megtekintés</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TNR Add/Edit Form Modal & PDF Export Modal */}
      <AnimatePresence>
        {editingTnr && (
          <TnrFormModal
            tnrToEdit={editingTnr === 'new' ? null : editingTnr}
            onClose={() => setEditingTnr(null)}
            onSaved={() => setEditingTnr(null)}
          />
        )}
        {showPdfExportModal && (
          <TnrPdfExportModal
            records={allTnrRecords}
            onClose={() => setShowPdfExportModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
