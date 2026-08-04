import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { db } from '../db.js';
import { openEventModal } from './event-form.js';
import { escapeHtml } from '../utils/escape.js';

let calendarInstance = null;

export async function renderCalendarView(containerId, currentFilter = 'all') {
    const calendarEl = document.getElementById(containerId);
    if (!calendarEl) return;

    if (!calendarInstance) {
        calendarInstance = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,dayGridWeek'
            },
            locale: 'hu',
            buttonText: {
                today: 'Ma',
                month: 'Hónap',
                week: 'Hét'
            },
            firstDay: 1, // Monday
            height: 'auto',
            eventClick: function(info) {
                const eventId = parseInt(info.event.id, 10);
                if (eventId) {
                    // Check if done
                    const eventStatus = info.event.extendedProps.status;
                    if (eventStatus === 'done') {
                        // We use a custom event or toast here if we want, but opening edit modal
                        // handles 'done' warning inside openEventModal or event-list logic normally.
                        // Let's just open the modal. The modal handles read-only or not.
                    }
                    openEventModal(eventId);
                }
            },
            eventContent: function(arg) {
                let italicEl = document.createElement('div');
                italicEl.classList.add('fc-content-custom', 'text-xs', 'p-1', 'rounded', 'truncate', 'w-full');

                if (arg.event.extendedProps.status === 'done') {
                    italicEl.classList.add('bg-green-100', 'text-green-800', 'line-through');
                } else if (arg.event.extendedProps.status === 'expired') {
                    italicEl.classList.add('bg-red-100', 'text-red-800', 'font-bold');
                } else {
                    italicEl.classList.add('bg-blue-100', 'text-blue-800');
                }

                italicEl.innerHTML = arg.event.title;

                let arrayOfDomNodes = [ italicEl ]
                return { domNodes: arrayOfDomNodes }
            }
        });
        calendarInstance.render();
    }

    // Fetch and format events
    let events = await db.events.toArray();
    if (currentFilter !== 'all') {
        events = events.filter(e => e.status === currentFilter);
    }

    const calendarEvents = [];

    // We need to fetch cats for names, we can do it efficiently
    const catMap = {};
    const cats = await db.cats.toArray();
    cats.forEach(c => catMap[c.id] = c);

    for (const e of events) {
        const cat = catMap[e.catId];
        const catName = cat ? escapeHtml(cat.nev) : 'Ismeretlen';
        const titleStr = escapeHtml(e.title || 'Névtelen');

        let icon = '📅';
        if (e.type === 'oltas') icon = '💉';
        if (e.type === 'orvosi') icon = '🩺';

        calendarEvents.push({
            id: e.id,
            title: `${icon} ${catName} - ${titleStr}`,
            start: e.date,
            allDay: true,
            extendedProps: {
                status: e.status
            }
        });
    }

    // Remove all existing events and add new ones
    calendarInstance.removeAllEvents();
    calendarInstance.addEventSource(calendarEvents);
}

export function refreshCalendar() {
    if (calendarInstance) {
        calendarInstance.refetchEvents(); // although we use setEvents or just re-render
    }
}
