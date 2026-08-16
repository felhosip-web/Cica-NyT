import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../js/db.js';
import { useAppStore } from '../store/useAppStore';
import { createAuditStamp } from '../utils/audit';
import { EventTemplateManagerModal } from './EventTemplateManagerModal';
import { EventTemplate } from '../types';
import { CustomSelect } from './CustomSelect';

interface EventsListViewProps {
  onOpenEventModal: (eventId?: number) => void;
  onOpenCatDetail: (catId: string) => void;
}

export interface UnifiedEvent {
  id: string;
  dbEventId?: number;
  catId: string;
  catName: string;
  title: string;
  date: string;
  type: 'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni';
  status: 'pending' | 'done' | 'expired';
  cost?: number;
  notes?: string;
  isCatLog: boolean;
}

export const EventsListView: React.FC<EventsListViewProps> = ({
  onOpenEventModal,
  onOpenCatDetail,
}) => {
  const { getCurrentUserPermissions, getCurrentUser, addDebugLog } = useAppStore();
  const perms = getCurrentUserPermissions();

  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'expired'>('all');
  const [catFilter, setCatFilter] = useState<'all' | string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'next30' | 'past30' | 'thisYear'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'cost_desc' | 'title_asc'>('date_desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const dbEvents = useLiveQuery(() => db.events.toArray(), []) || [];
  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];

  // Cat Map lookup
  const catMap = useMemo(() => {
    const map: Record<string, any> = {};
    cats.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [cats]);

  // Merge db.events and cat logs into unified list
  const allEvents = useMemo(() => {
    const merged: UnifiedEvent[] = [];
    const eventKeySet = new Set<string>();

    // 1. db.events
    for (const e of dbEvents) {
      const cat = catMap[e.catId];
      const catName = cat ? cat.nev : e.catId === 'general' ? 'Gondozóhely / Általános' : 'Ismeretlen cica';
      const titleStr = e.title || 'Névtelen esemény';
      const eventType = (e.type as any) || 'egyeni';

      const key = `${e.catId}_${eventType}_${e.date}_${titleStr.toLowerCase()}`;
      eventKeySet.add(key);

      merged.push({
        id: `dbevent_${e.id}`,
        dbEventId: e.id,
        catId: e.catId,
        catName,
        title: titleStr,
        date: e.date,
        type: eventType,
        status: e.status || 'pending',
        cost: e.cost || 0,
        notes: e.notes || '',
        isCatLog: false,
      });
    }

    // 2. Cat Health Logs (oltasok, kezelesek, tesztek)
    for (const cat of cats) {
      if (cat.status === 'elhunyt') continue;
      const catName = cat.nev;

      // Oltások
      if (Array.isArray(cat.oltasok)) {
        cat.oltasok.forEach((vax: any, idx: number) => {
          if (vax.datum) {
            const titleStr = vax.nev || 'Védőoltás';
            const key = `${cat.id}_oltas_${vax.datum}_${titleStr.toLowerCase()}`;
            if (!eventKeySet.has(key)) {
              eventKeySet.add(key);
              merged.push({
                id: `cat_oltas_${cat.id}_${idx}`,
                catId: cat.id,
                catName,
                title: titleStr,
                date: vax.datum,
                type: 'oltas',
                status: 'done',
                cost: 0,
                notes: 'Cica kiskönyvi bejegyzés',
                isCatLog: true,
              });
            }
          }
        });
      }

      // Kezelések
      if (Array.isArray(cat.kezelesek)) {
        cat.kezelesek.forEach((kez: any, idx: number) => {
          if (kez.datum) {
            const titleStr = kez.nev || 'Orvosi kezelés';
            const key = `${cat.id}_orvosi_${kez.datum}_${titleStr.toLowerCase()}`;
            if (!eventKeySet.has(key)) {
              eventKeySet.add(key);
              merged.push({
                id: `cat_kez_${cat.id}_${idx}`,
                catId: cat.id,
                catName,
                title: titleStr,
                date: kez.datum,
                type: 'orvosi',
                status: 'done',
                cost: 0,
                notes: kez.leiras || 'Cica orvosi kezelés',
                isCatLog: true,
              });
            }
          }
        });
      }

      // Tesztek
      if (Array.isArray(cat.tesztek)) {
        cat.tesztek.forEach((t: any, idx: number) => {
          if (t.datum) {
            const titleStr = `${t.nev || 'Szűrővizsgálat'} (${t.eredmeny || 'Eredmény regisztrálva'})`;
            const key = `${cat.id}_teszt_${t.datum}_${titleStr.toLowerCase()}`;
            if (!eventKeySet.has(key)) {
              eventKeySet.add(key);
              merged.push({
                id: `cat_teszt_${cat.id}_${idx}`,
                catId: cat.id,
                catName,
                title: titleStr,
                date: t.datum,
                type: 'teszt',
                status: 'done',
                cost: 0,
                notes: `Eredmény: ${t.eredmeny || 'N/A'}`,
                isCatLog: true,
              });
            }
          }
        });
      }
    }

    return merged;
  }, [dbEvents, cats, catMap]);

  // Filtered and Sorted Events
  const filteredEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    return allEvents
      .filter((ev) => {
        // Search
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchTitle = ev.title.toLowerCase().includes(q);
          const matchCat = ev.catName.toLowerCase().includes(q);
          const matchNotes = ev.notes?.toLowerCase().includes(q) || false;
          if (!matchTitle && !matchCat && !matchNotes) return false;
        }

        // Type
        if (typeFilter !== 'all' && ev.type !== typeFilter) return false;

        // Status
        if (statusFilter !== 'all' && ev.status !== statusFilter) return false;

        // Cat
        if (catFilter !== 'all' && ev.catId !== catFilter) return false;

        // Date Range
        if (dateRangeFilter !== 'all') {
          const evDate = new Date(ev.date);
          const diffDays = Math.round((evDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

          if (dateRangeFilter === 'next30') {
            if (diffDays < -1 || diffDays > 30) return false;
          } else if (dateRangeFilter === 'past30') {
            if (diffDays > 0 || diffDays < -30) return false;
          } else if (dateRangeFilter === 'thisYear') {
            if (evDate.getFullYear() !== now.getFullYear()) return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return b.date.localeCompare(a.date);
        } else if (sortBy === 'date_asc') {
          return a.date.localeCompare(b.date);
        } else if (sortBy === 'cost_desc') {
          return (b.cost || 0) - (a.cost || 0);
        } else if (sortBy === 'title_asc') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [allEvents, search, typeFilter, statusFilter, catFilter, dateRangeFilter, sortBy]);

  // Stats
  const totalCount = allEvents.length;
  const pendingCount = allEvents.filter((e) => e.status === 'pending').length;
  const expiredCount = allEvents.filter((e) => e.status === 'expired').length;
  const doneCount = allEvents.filter((e) => e.status === 'done').length;
  const totalCostHuf = allEvents.reduce((acc, e) => acc + (e.cost || 0), 0);

  // Quick Action: Mark Event as Done
  const handleMarkAsDone = async (ev: UnifiedEvent) => {
    if (!ev.dbEventId) return;
    try {
      const currentUser = getCurrentUser ? getCurrentUser() : null;
      const audit = createAuditStamp(currentUser);
      await db.events.update(ev.dbEventId, {
        status: 'done',
        updated_at: audit.updated_at || new Date().toISOString(),
        updated_by: audit.updated_by,
        updated_by_name: audit.updated_by_name,
      });
      addDebugLog(`[Esemény] Elvégezve: #${ev.dbEventId} (${ev.title})`);
    } catch (err) {
      console.error('Hiba az esemény státusz frissítésekor:', err);
    }
  };

  // Quick Action: Delete Event
  const handleDeleteEvent = async (ev: UnifiedEvent) => {
    if (!ev.dbEventId) return;
    if (!confirm(`Biztosan törölni szeretnéd a megadott eseményt?\n\n"${ev.title}"`)) {
      return;
    }
    try {
      await db.events.delete(ev.dbEventId);
      addDebugLog(`[Esemény] Törölve: #${ev.dbEventId}`);
    } catch (err) {
      console.error('Hiba az esemény törlésekor:', err);
    }
  };

  // Helpers for Event Type UI
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'oltas':
        return <span className="bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">💉 Oltás</span>;
      case 'orvosi':
        return <span className="bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">🩺 Orvosi</span>;
      case 'teszt':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">🔬 Szűrés/Teszt</span>;
      case 'mutet':
        return <span className="bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">✂️ Műtét</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 border border-gray-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">📌 Egyéb</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">✅ Elvégezve</span>;
      case 'expired':
        return <span className="bg-red-100 text-red-900 border border-red-300 px-2 py-0.5 rounded-full text-[10px] font-black animate-pulse flex items-center gap-1 shrink-0">⚠️ Lejárt / Elmaradt</span>;
      case 'pending':
      default:
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 shrink-0">🕒 Esedékes</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-pink-900 to-rose-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 border border-purple-500/30">
        <div>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <span>📋 Naptári Események & Kezelések Lista</span>
          </h2>
          <p className="text-xs text-purple-100/90 mt-0.5 max-w-2xl">
            Összesített áttekintő lista az összes védőoltásról, orvosi vizsgálatról, műtétről és egyéni emlékeztetőről.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer border border-purple-400/40"
          >
            <span>📋</span>
            <span>Sablonkezelő</span>
          </button>

          {perms.canManageMedical ? (
            <button
              onClick={() => onOpenEventModal()}
              className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer ring-2 ring-pink-300/40"
            >
              ➕ Új Esemény
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 py-2 bg-white/10 text-white/50 font-bold text-xs rounded-xl cursor-not-allowed"
            >
              🔒 Esemény Rögzítése Korlátozva
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 bg-white border border-gray-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase">Összes Esemény</div>
          <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">{totalCount} db</div>
        </div>

        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-extrabold text-amber-800 uppercase flex items-center gap-1">
            <span>🕒 Esedékes</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-950 mt-0.5">{pendingCount} db</div>
        </div>

        <div className="p-3 bg-red-50/80 border border-red-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-extrabold text-red-800 uppercase flex items-center gap-1">
            <span>⚠️ Lejárt / Elmaradt</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-red-950 mt-0.5">{expiredCount} db</div>
        </div>

        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl shadow-2xs">
          <div className="text-[10px] font-extrabold text-emerald-800 uppercase flex items-center gap-1">
            <span>✅ Elvégezve</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">{doneCount} db</div>
        </div>

        <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl shadow-2xs col-span-2 sm:col-span-1">
          <div className="text-[10px] font-extrabold text-purple-800 uppercase flex items-center gap-1">
            <span>💰 Összköltség</span>
          </div>
          <div className="text-lg sm:text-xl font-black text-purple-950 mt-0.5">
            {totalCostHuf.toLocaleString('hu-HU')} Ft
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-3.5 bg-white border border-gray-200 rounded-2xl space-y-3 shadow-2xs">
        {/* Search Row & Primary Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="🔍 Keresés címben, macskanevben vagy leírásban..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none transition font-medium text-gray-800"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* View Mode Toggle & Sort */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="min-w-[170px]">
              <CustomSelect
                value={sortBy}
                onChange={(val) => setSortBy(val as any)}
                options={[
                  { value: 'date_desc', label: 'Dátum (új → régi)', icon: '📅' },
                  { value: 'date_asc', label: 'Dátum (régi → új)', icon: '📅' },
                  { value: 'cost_desc', label: 'Költség csökkenő', icon: '💰' },
                  { value: 'title_asc', label: 'Cím ábécé szerint', icon: '🔤' },
                ]}
                title="Rendezési Sorrend"
                colorScheme="purple"
                buttonClassName="text-xs font-extrabold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-2 text-gray-800"
              />
            </div>

            <div className="flex bg-gray-100 p-1 rounded-xl text-xs shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'cards' ? 'bg-white shadow-2xs text-gray-900 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                📱 Kártyák
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-gray-900 font-extrabold' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                📊 Táblázat
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Type Filter */}
          <CustomSelect
            value={typeFilter}
            onChange={(val) => setTypeFilter(val as any)}
            options={[
              { value: 'all', label: 'Minden Esemény Típus', icon: '📋' },
              { value: 'oltas', label: 'Oltás', icon: '💉' },
              { value: 'orvosi', label: 'Orvosi Vizsgálat / Kezelés', icon: '🩺' },
              { value: 'teszt', label: 'Szűrés / Teszt', icon: '🔬' },
              { value: 'mutet', label: 'Műtét', icon: '✂️' },
              { value: 'egyeni', label: 'Egyéb Emlékeztető', icon: '📌' },
            ]}
            title="Esemény Típus Szűrése"
            colorScheme="purple"
            buttonClassName="font-extrabold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 text-xs"
          />

          {/* Status Filter */}
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as any)}
            options={[
              { value: 'all', label: 'Minden Státusz', icon: '⚡' },
              { value: 'pending', label: 'Esedékes', icon: '🕒' },
              { value: 'done', label: 'Elvégezve', icon: '✅' },
              { value: 'expired', label: 'Lejárt / Elmaradt', icon: '⚠️' },
            ]}
            title="Esemény Státusz Szűrése"
            colorScheme="amber"
            buttonClassName="font-extrabold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 text-xs"
          />

          {/* Cat Filter */}
          <CustomSelect
            value={catFilter}
            onChange={(val) => setCatFilter(val)}
            options={[
              { value: 'all', label: 'Minden Állat (Összes Cica)', icon: '🐾' },
              { value: 'general', label: 'Gondozóhely / Általános', icon: '🏠' },
              ...cats.map((c) => ({
                value: c.id,
                label: `${c.nev} (${c.sorszam || c.id.slice(0, 4)})`,
                icon: '🐱',
                description: c.szin || c.status,
              })),
            ]}
            title="Érintett Cica Szűrése"
            colorScheme="pink"
            buttonClassName="font-extrabold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 text-xs"
          />

          {/* Date Range Filter */}
          <CustomSelect
            value={dateRangeFilter}
            onChange={(val) => setDateRangeFilter(val as any)}
            options={[
              { value: 'all', label: 'Minden Időszak', icon: '🗓️' },
              { value: 'next30', label: 'Következő 30 nap', icon: '📅' },
              { value: 'past30', label: 'Elmúlt 30 nap', icon: '⏪' },
              { value: 'thisYear', label: 'Idei év', icon: '📅' },
            ]}
            title="Időszak Szűrése"
            colorScheme="blue"
            buttonClassName="font-extrabold bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-gray-800 text-xs"
          />
        </div>
      </div>

      {/* Events Display Area */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 bg-white border border-gray-200 rounded-2xl text-center space-y-2">
          <div className="text-3xl">📭</div>
          <h3 className="text-sm font-black text-gray-800">Nem található a szűrésnek megfelelő esemény</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Próbáld meg módosítani a keresési feltételeket, vagy hozz létre új naptári eseményt a fenti gombra kattintva.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card Mode Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredEvents.map((ev) => (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-3 flex flex-col justify-between transition hover:shadow-xs ${
                  ev.status === 'expired'
                    ? 'border-red-300 bg-red-50/20'
                    : ev.status === 'done'
                    ? 'border-gray-200 bg-emerald-50/10'
                    : 'border-amber-200 bg-amber-50/10'
                }`}
              >
                <div className="space-y-2">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getTypeBadge(ev.type)}
                      {getStatusBadge(ev.status)}
                    </div>
                    <span className="text-[11px] font-black text-gray-600 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                      📅 {ev.date}
                    </span>
                  </div>

                  {/* Title & Cat Button */}
                  <div>
                    <h3 className="text-sm font-black text-gray-900 leading-snug">
                      {ev.title}
                    </h3>
                    <div className="mt-1">
                      {ev.catId !== 'general' && catMap[ev.catId] ? (
                        <button
                          onClick={() => onOpenCatDetail(ev.catId)}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-pink-700 hover:text-pink-900 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-lg border border-pink-200 transition cursor-pointer"
                        >
                          <span>🐱</span>
                          <span>{ev.catName}</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200">
                          <span>🏠</span>
                          <span>{ev.catName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Notes & Cost */}
                  {ev.notes && (
                    <p className="text-xs text-gray-600 font-medium line-clamp-2 bg-gray-50/80 p-2 rounded-xl border border-gray-100 italic">
                      "{ev.notes}"
                    </p>
                  )}

                  {ev.cost && ev.cost > 0 ? (
                    <div className="text-xs font-extrabold text-purple-900 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 inline-block">
                      💰 Költség: {ev.cost.toLocaleString('hu-HU')} Ft
                    </div>
                  ) : null}
                </div>

                {/* Card Bottom Actions */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                  {ev.status !== 'done' && ev.dbEventId && perms.canManageMedical ? (
                    <button
                      onClick={() => handleMarkAsDone(ev)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-2xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>✅ Elvégezve</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-1.5">
                    {ev.dbEventId && perms.canManageMedical && (
                      <>
                        <button
                          onClick={() => onOpenEventModal(ev.dbEventId)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition cursor-pointer font-bold"
                          title="Szerkesztés"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer font-bold"
                          title="Törlés"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Table Mode */
        <div className="bg-white border border-gray-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-800">
              <thead className="bg-gray-50 border-b border-gray-200 font-extrabold text-[11px] text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="p-3">Dátum</th>
                  <th className="p-3">Esemény Címe</th>
                  <th className="p-3">Érintett Állat</th>
                  <th className="p-3">Típus</th>
                  <th className="p-3">Státusz</th>
                  <th className="p-3">Költség</th>
                  <th className="p-3 text-right">Műveletek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50/80 transition">
                    <td className="p-3 font-bold whitespace-nowrap text-gray-900">
                      📅 {ev.date}
                    </td>
                    <td className="p-3 font-extrabold text-gray-900 max-w-[220px] truncate">
                      {ev.title}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {ev.catId !== 'general' && catMap[ev.catId] ? (
                        <button
                          onClick={() => onOpenCatDetail(ev.catId)}
                          className="font-extrabold text-pink-700 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <span>🐱</span> {ev.catName}
                        </button>
                      ) : (
                        <span className="text-gray-600 font-medium">🏠 {ev.catName}</span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getTypeBadge(ev.type)}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {getStatusBadge(ev.status)}
                    </td>
                    <td className="p-3 whitespace-nowrap font-bold text-gray-900">
                      {ev.cost && ev.cost > 0 ? `${ev.cost.toLocaleString('hu-HU')} Ft` : '-'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {ev.status !== 'done' && ev.dbEventId && perms.canManageMedical && (
                          <button
                            onClick={() => handleMarkAsDone(ev)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg shadow-2xs transition cursor-pointer"
                          >
                            ✅ Kész
                          </button>
                        )}
                        {ev.dbEventId && perms.canManageMedical && (
                          <>
                            <button
                              onClick={() => onOpenEventModal(ev.dbEventId)}
                              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition cursor-pointer"
                              title="Szerkesztés"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer"
                              title="Törlés"
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event Template Manager Modal */}
      <EventTemplateManagerModal
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onSelectTemplate={() => {
          setShowTemplateManager(false);
          onOpenEventModal();
        }}
      />
    </div>
  );
};
