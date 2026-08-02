import { db } from '../db.js';
import { escapeHtml } from '../utils/escape.js';
import { updateEventBadge } from '../utils/event-check.js';
import { openEventModal } from './event-form.js';
import { showToast } from '../utils/toast.js';

let currentFilter = 'all';

export function initEventList() {
    const filterButtons = document.querySelectorAll('[data-event-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update UI
            filterButtons.forEach(b => {
                b.classList.remove('active', 'font-bold', 'border-b-2', 'border-brand-pink');
            });
            e.target.classList.add('active', 'font-bold', 'border-b-2', 'border-brand-pink');

            currentFilter = e.target.dataset.eventFilter;
            renderEvents();
        });
    });
}

function getRelativeDateLabel(dateStr) {
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (eventDate < today) {
        return 'LEJÁRT';
    } else if (eventDate.getTime() === today.getTime()) {
        return 'MA';
    } else if (eventDate.getTime() === tomorrow.getTime()) {
        return 'HOLNAP';
    } else if (eventDate <= nextWeek) {
        return 'E HÉTEN';
    } else {
        return 'KÉSŐBB';
    }
}

export async function renderEvents() {
    const listEl = document.getElementById('events-list');
    if (!listEl) return;

    let events = await db.events.orderBy('date').toArray();

    // Apply filter
    if (currentFilter !== 'all') {
        events = events.filter(e => e.status === currentFilter);
    }

    if (events.length === 0) {
        listEl.innerHTML = '<div class="text-center text-gray-500 py-10">Nincsenek események.</div>';
        return;
    }

    // Grouping
    const grouped = {
        'LEJÁRT': [],
        'MA': [],
        'HOLNAP': [],
        'E HÉTEN': [],
        'KÉSŐBB': []
    };

    // Need cat details to show names and chip
    const catCache = {};

    for (let e of events) {
        if (!catCache[e.catId]) {
            const cat = await db.cats.get(e.catId);
            catCache[e.catId] = cat || { nev: 'Ismeretlen', chipNumber: null };
        }

        let label = 'KÉSŐBB';
        if (e.status === 'expired') {
            label = 'LEJÁRT';
        } else {
            label = getRelativeDateLabel(e.date);
        }

        if (grouped[label]) {
             grouped[label].push(e);
        } else {
             grouped['KÉSŐBB'].push(e);
        }
    }

    const groupOrder = ['LEJÁRT', 'MA', 'HOLNAP', 'E HÉTEN', 'KÉSŐBB'];
    let html = '';

    for (let group of groupOrder) {
        if (grouped[group].length > 0) {
            html += `<h3 class="font-bold text-gray-700 mt-4 mb-2 border-b pb-1 ${group === 'LEJÁRT' ? 'text-red-600 border-red-200' : ''}">${group}</h3>`;
            html += `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">`;
            for (let e of grouped[group]) {
                const cat = catCache[e.catId];
                const catName = escapeHtml(cat.nev);
                const chipStr = cat.chipNumber ? ` 🔖` : '';
                const titleStr = escapeHtml(e.title || 'Névtelen esemény');

                const isDone = e.status === 'done';
                const isExpired = e.status === 'expired';

                let bgClass = 'bg-blue-50 border-blue-300'; // Default pending
                if (isExpired) bgClass = 'bg-red-50 border-red-300';
                if (isDone) bgClass = 'bg-green-50 border-green-300 opacity-75';

                let icon = '📅';
                if (e.type === 'oltas') icon = '💉';
                if (e.type === 'orvosi') icon = '🩺';
                if (isExpired) icon += ' ⚠️';

                let dateDisplay = e.date;
                if (isExpired) {
                    const diffTime = Math.abs(new Date() - new Date(e.date));
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    dateDisplay = `<span class="text-red-600 font-bold">LEJÁRT ${diffDays} napja</span>`;
                }

                html += `
                    <div class="event-card ${bgClass} border rounded-lg p-3 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition" data-id="${e.id}">
                        <div class="flex items-center gap-3 overflow-hidden flex-1" onclick="window.handleEventClick(event, ${e.id})">
                            <div class="text-2xl">${icon}</div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">${catName}${chipStr}</div>
                                <div class="font-bold truncate text-gray-800">${titleStr}</div>
                                <div class="text-xs text-gray-500">${dateDisplay}</div>
                            </div>
                        </div>
                        <div class="ml-2">
                            <input type="checkbox" class="w-6 h-6 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer event-done-cb"
                                ${isDone ? 'checked disabled' : ''}
                                data-id="${e.id}">
                        </div>
                    </div>
                `;
            }
            html += `</div>`;
        }
    }

    listEl.innerHTML = html;

    // Bind checkboxes
    document.querySelectorAll('.event-done-cb').forEach(cb => {
        cb.addEventListener('change', (ev) => {
            if (ev.target.checked) {
                // Revert visual state until confirmed
                ev.target.checked = false;
                const id = parseInt(ev.target.dataset.id, 10);
                openConfirmDoneModal(id, ev.target);
            }
        });
    });
}

function openConfirmDoneModal(eventId, checkboxEl) {
    const modal = document.getElementById('modal-confirm-done');
    if (!modal) return;

    modal.classList.remove('hidden');

    const btnCancel = document.getElementById('btn-cancel-done');
    const btnConfirm = document.getElementById('btn-confirm-done');

    // Clean up previous event listeners to avoid duplicates
    const newBtnCancel = btnCancel.cloneNode(true);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    const newBtnConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    newBtnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    newBtnConfirm.addEventListener('click', async () => {
        modal.classList.add('hidden');
        if (checkboxEl) checkboxEl.checked = true;
        await markEventDone(eventId);
    });
}

window.handleEventClick = function(ev, id) {
    if (ev.target.type === 'checkbox') return; // let the checkbox handle it
    openEventModal(id);
};

async function markEventDone(id) {
    const e = await db.events.get(id);
    if (!e) return;

    await db.events.update(id, { status: 'done' });

    if (e.repeat && e.repeat !== 'nincs') {
        const currentDate = new Date(e.date);
        if (e.repeat === '3ho') currentDate.setMonth(currentDate.getMonth() + 3);
        if (e.repeat === '6ho') currentDate.setMonth(currentDate.getMonth() + 6);
        if (e.repeat === '12ho') currentDate.setFullYear(currentDate.getFullYear() + 1);

        const nextDateStr = currentDate.toISOString().split('T')[0];

        await db.events.add({
            catId: e.catId,
            type: e.type,
            title: e.title,
            date: nextDateStr,
            repeat: e.repeat,
            vetName: e.vetName,
            notes: e.notes,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    }

    showToast('Esemény teljesítve! ✅', 'info');

    await updateEventBadge();
    renderEvents();
    document.dispatchEvent(new CustomEvent('eventsChanged'));
}
