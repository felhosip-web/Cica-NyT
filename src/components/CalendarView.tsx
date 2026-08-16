import React, { useState, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../js/db.js';
import { escapeHtml } from '../js/utils/escape.js';
import { EventTemplateManagerModal } from './EventTemplateManagerModal';
import { CustomSelect } from './CustomSelect';

interface CalendarViewProps {
  onOpenEventModal: (eventId?: number) => void;
  onOpenCatDetail: (catId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenEventModal,
  onOpenCatDetail,
}) => {
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'oltas' | 'orvosi' | 'teszt' | 'mutet' | 'egyeni'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done' | 'expired'>('all');
  const [catFilter, setCatFilter] = useState<'all' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const dbEvents = useLiveQuery(() => db.events.toArray(), []) || [];
  const cats = useLiveQuery(() => db.cats.toArray(), []) || [];

  // Create cat lookup map
  const catMap = useMemo(() => {
    const map: Record<string, any> = {};
    cats.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [cats]);

  // Merge db.events and cat logs
  const calendarEvents = useMemo(() => {
    const merged: any[] = [];
    const eventKeySet = new Set<string>();

    // 1. db.events
    for (const e of dbEvents) {
      const cat = catMap[e.catId];
      const catName = cat ? cat.nev : e.catId === 'general' ? 'Általános' : 'Ismeretlen';
      const titleStr = e.title || 'Névtelen';
      const eventType = e.type || 'egyeni';

      const key = `${e.catId}_${eventType}_${e.date}_${titleStr.toLowerCase()}`;
      eventKeySet.add(key);

      merged.push({
        id: String(e.id),
        title: titleStr,
        start: e.date,
        allDay: true,
        extendedProps: {
          catId: e.catId,
          catName,
          title: titleStr,
          type: eventType,
          status: e.status || 'pending',
          isCatLog: false,
          dbEventId: e.id,
        },
      });
    }

    // 2. Merge cat logs (oltasok, kezelesek, tesztek)
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
                title: titleStr,
                start: vax.datum,
                allDay: true,
                extendedProps: {
                  catId: cat.id,
                  catName,
                  title: titleStr,
                  type: 'oltas',
                  status: 'done',
                  isCatLog: true,
                },
              });
            }
          }
        });
      }

      // Kezelések
      if (Array.isArray(cat.kezelesek)) {
        cat.kezelesek.forEach((med: any, idx: number) => {
          if (med.datum) {
            const titleStr = med.nev || 'Orvosi kezelés';
            const key = `${cat.id}_orvosi_${med.datum}_${titleStr.toLowerCase()}`;
            if (!eventKeySet.has(key)) {
              eventKeySet.add(key);
              merged.push({
                id: `cat_kezeles_${cat.id}_${idx}`,
                title: titleStr,
                start: med.datum,
                allDay: true,
                extendedProps: {
                  catId: cat.id,
                  catName,
                  title: titleStr,
                  type: 'orvosi',
                  status: 'done',
                  isCatLog: true,
                },
              });
            }
          }
        });
      }

      // Tesztek
      if (Array.isArray(cat.tesztek)) {
        cat.tesztek.forEach((test: any, idx: number) => {
          if (test.datum) {
            const titleStr = test.nev || 'Orvosi teszt';
            const key = `${cat.id}_teszt_${test.datum}_${titleStr.toLowerCase()}`;
            if (!eventKeySet.has(key)) {
              eventKeySet.add(key);
              merged.push({
                id: `cat_teszt_${cat.id}_${idx}`,
                title: titleStr,
                start: test.datum,
                allDay: true,
                extendedProps: {
                  catId: cat.id,
                  catName,
                  title: titleStr,
                  type: 'teszt',
                  status: 'done',
                  isCatLog: true,
                },
              });
            }
          }
        });
      }
    }

    // Apply Filters
    return merged.filter((item) => {
      const props = item.extendedProps;

      // Status Filter
      if (statusFilter !== 'all' && props.status !== statusFilter) return false;

      // Type Filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'orvosi' && props.type !== 'orvosi' && props.type !== 'kezeles') return false;
        if (typeFilter === 'teszt' && props.type !== 'teszt' && props.type !== 'szures') return false;
        if (typeFilter !== 'orvosi' && typeFilter !== 'teszt' && props.type !== typeFilter) return false;
      }

      // Cat Filter
      if (catFilter !== 'all' && props.catId !== catFilter) return false;

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchCat = props.catName?.toLowerCase().includes(q);
        const matchTitle = props.title?.toLowerCase().includes(q);
        if (!matchCat && !matchTitle) return false;
      }

      return true;
    });
  }, [dbEvents, cats, catMap, statusFilter, typeFilter, catFilter, searchQuery]);

  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-4">
      {/* High-density controls bar for 100+ cats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3 rounded-xl">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Cica neve vagy esemény keresése..."
            className="w-full pl-3 pr-8 py-2 bg-white border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-pink-500 focus:border-pink-500 shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
          <div className="w-full sm:w-56">
            <CustomSelect
              value={catFilter}
              onChange={(val) => setCatFilter(val)}
              options={[
                { value: 'all', label: `Összes cica (${cats.filter((c) => c.status !== 'elhunyt').length})`, icon: '🐱' },
                ...cats
                  .filter((c) => c.status !== 'elhunyt')
                  .sort((a, b) => (a.nev || '').localeCompare(b.nev || ''))
                  .map((c) => ({
                    value: c.id,
                    label: c.nev || 'Névtelen',
                    icon: '🐾',
                    description: c.szin || c.status,
                  })),
              ]}
              title="Cica Szűrése a Naptárban"
              colorScheme="pink"
              buttonClassName="p-2 bg-white border border-gray-300 rounded-lg text-xs font-semibold"
            />
          </div>

          <button
            onClick={() => setShowTemplateManager(true)}
            className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-extrabold text-xs rounded-lg shadow-2xs transition shrink-0"
          >
            📋 Sablonok
          </button>

          <button
            onClick={() => onOpenEventModal()}
            className="px-3.5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition shrink-0"
          >
            ➕ Esemény
          </button>
        </div>
      </div>

      {/* Category Legend Pills */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="font-bold text-gray-800 flex items-center gap-1.5 shrink-0">
          🎨 <span className="uppercase tracking-wider">Kategória Színkódok:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1 rounded-full font-bold transition text-xs ${
              typeFilter === 'all'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mind
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('oltas')}
            className={`px-2.5 py-1 rounded-full font-bold border transition text-xs flex items-center gap-1 ${
              typeFilter === 'oltas'
                ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                : 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-purple-200'
            }`}
          >
            💉 Oltás
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('orvosi')}
            className={`px-2.5 py-1 rounded-full font-bold border transition text-xs flex items-center gap-1 ${
              typeFilter === 'orvosi'
                ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                : 'bg-teal-100 text-teal-900 border-teal-300 hover:bg-teal-200'
            }`}
          >
            🩺 Kezelés
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('teszt')}
            className={`px-2.5 py-1 rounded-full font-bold border transition text-xs flex items-center gap-1 ${
              typeFilter === 'teszt'
                ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
            }`}
          >
            🔬 Szűrés / Teszt
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('mutet')}
            className={`px-2.5 py-1 rounded-full font-bold border transition text-xs flex items-center gap-1 ${
              typeFilter === 'mutet'
                ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                : 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
            }`}
          >
            ✂️ Műtét
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('egyeni')}
            className={`px-2.5 py-1 rounded-full font-bold border transition text-xs flex items-center gap-1 ${
              typeFilter === 'egyeni'
                ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
            }`}
          >
            📅 Egyéb
          </button>
        </div>
      </div>

      {/* FullCalendar Component */}
      <div className="min-h-[550px]">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
          locale="hu"
          buttonText={{
            today: 'Ma',
            month: 'Hónap',
            week: 'Hét',
          }}
          firstDay={1}
          height="auto"
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} további esemény`}
          events={calendarEvents}
          eventClick={(info) => {
            const props = info.event.extendedProps;
            if (props.isCatLog && props.catId) {
              onOpenCatDetail(props.catId);
            } else if (props.dbEventId) {
              onOpenEventModal(props.dbEventId);
            }
          }}
          eventContent={(arg) => {
            const props = arg.event.extendedProps || {};
            const type = props.type || 'egyeni';
            const status = props.status || 'pending';
            const catName = props.catName || '';
            const title = props.title || '';

            let containerClass =
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold truncate w-full shadow-2xs border transition-all hover:scale-[1.01] cursor-pointer ';
            let icon = '📅';

            if (type === 'oltas') {
              icon = '💉';
              if (status === 'done') {
                containerClass +=
                  'bg-purple-50 text-purple-800 border-l-4 border-l-green-500 border-purple-200 line-through opacity-80';
              } else if (status === 'expired') {
                containerClass += 'bg-red-100 text-red-900 border-2 border-red-500 font-bold shadow-md animate-pulse';
              } else {
                containerClass +=
                  'bg-purple-100 text-purple-950 border-l-4 border-l-purple-600 border-purple-300 hover:bg-purple-200';
              }
            } else if (type === 'orvosi' || type === 'kezeles') {
              icon = '🩺';
              if (status === 'done') {
                containerClass +=
                  'bg-teal-50 text-teal-800 border-l-4 border-l-green-500 border-teal-200 line-through opacity-80';
              } else if (status === 'expired') {
                containerClass += 'bg-red-100 text-red-900 border-2 border-red-500 font-bold shadow-md animate-pulse';
              } else {
                containerClass +=
                  'bg-teal-100 text-teal-950 border-l-4 border-l-teal-600 border-teal-300 hover:bg-teal-200';
              }
            } else if (type === 'teszt' || type === 'szures') {
              icon = '🔬';
              if (status === 'done') {
                containerClass +=
                  'bg-amber-50 text-amber-800 border-l-4 border-l-green-500 border-amber-200 line-through opacity-80';
              } else if (status === 'expired') {
                containerClass += 'bg-red-100 text-red-900 border-2 border-red-500 font-bold shadow-md animate-pulse';
              } else {
                containerClass +=
                  'bg-amber-100 text-amber-950 border-l-4 border-l-amber-600 border-amber-300 hover:bg-amber-200';
              }
            } else if (type === 'mutet') {
              icon = '✂️';
              if (status === 'done') {
                containerClass +=
                  'bg-rose-50 text-rose-800 border-l-4 border-l-green-500 border-rose-200 line-through opacity-80';
              } else if (status === 'expired') {
                containerClass += 'bg-red-100 text-red-900 border-2 border-red-500 font-bold shadow-md animate-pulse';
              } else {
                containerClass +=
                  'bg-rose-100 text-rose-950 border-l-4 border-l-rose-600 border-rose-300 hover:bg-rose-200';
              }
            } else {
              icon = '📅';
              if (status === 'done') {
                containerClass +=
                  'bg-sky-50 text-sky-800 border-l-4 border-l-green-500 border-sky-200 line-through opacity-80';
              } else if (status === 'expired') {
                containerClass += 'bg-red-100 text-red-900 border-2 border-red-500 font-bold shadow-md animate-pulse';
              } else {
                containerClass +=
                  'bg-sky-100 text-sky-950 border-l-4 border-l-sky-600 border-sky-300 hover:bg-sky-200';
              }
            }

            if (status === 'done') icon += ' ✅';
            if (status === 'expired') icon += ' ⚠️';

            return (
              <div
                className={containerClass}
                title={`${catName ? catName + ': ' : ''}${title} (${
                  status === 'done' ? 'Teljesítve' : status === 'expired' ? 'Lejárt' : 'Esedékes'
                })`}
              >
                <span className="shrink-0 text-xs font-normal">{icon}</span>
                <span className="truncate">
                  {catName ? <strong className="font-extrabold">{catName} - </strong> : ''}
                  {title}
                </span>
              </div>
            );
          }}
        />
      </div>
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
