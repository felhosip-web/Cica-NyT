import { db } from '../db.js';
import { escapeHtml } from '../utils/escape.js';
import { updateEventBadge } from '../utils/event-check.js';
import { openEventModal } from './event-form.js';
import { showToast } from '../utils/toast.js';

let currentFilter = 'all';

export function initEventList() {
    window.renderEvents = renderEvents;
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
        if (e.catId === 'general') {
            catCache['general'] = { nev: 'Általános esemény', chipNumber: null };
        } else if (!catCache[e.catId]) {
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
                    <div class="event-card ${bgClass} border rounded-lg p-3 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition group" data-id="${e.id}">
                        <div class="event-click-area flex items-center gap-3 overflow-hidden flex-1" data-id="${e.id}">
                            <div class="text-2xl">${icon}</div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm truncate">${catName}${chipStr}</div>
                                <div class="font-bold truncate text-gray-800">${titleStr}</div>
                                <div class="text-xs text-gray-500">${dateDisplay}</div>
                            </div>
                        </div>
                        <div class="ml-2 flex items-center gap-3">
                            <button type="button" class="text-red-400 hover:text-red-600 p-1 bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity btn-delete-list-event" data-id="${e.id}" title="Törlés">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
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

    // Bind delete buttons
    document.querySelectorAll('.btn-delete-list-event').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
            ev.stopPropagation(); // prevent card click
            const id = parseInt(ev.currentTarget.dataset.id, 10);
            if (confirm('Biztosan törlöd ezt az eseményt?')) {
                await db.events.delete(id);
                await updateEventBadge();
                renderEvents();
                document.dispatchEvent(new CustomEvent('eventsChanged'));
                showToast('Esemény törölve', 'info');
            }
        });
    });

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

    // Bind card clicks for selection and editing
    let lastClickTime = 0;
    let lastClickedId = null;
    document.querySelectorAll('.event-click-area').forEach(area => {
        let pressTimer = null;
        let startY = 0;
        let startX = 0;

        area.addEventListener('touchstart', (ev) => {
            startY = ev.touches[0].clientY;
            startX = ev.touches[0].clientX;
            pressTimer = window.setTimeout(async () => {
                pressTimer = null;
                const id = parseInt(area.dataset.id, 10);
                await handleEventEdit(id);
            }, 600);
        }, { passive: true });

        area.addEventListener('touchmove', (ev) => {
            const moveY = ev.touches[0].clientY;
            const moveX = ev.touches[0].clientX;
            if (Math.abs(moveY - startY) > 10 || Math.abs(moveX - startX) > 10) {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
            }
        }, { passive: true });

        area.addEventListener('touchend', () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });

        area.addEventListener('click', async (ev) => {
            if (ev.target.type === 'checkbox' || ev.target.closest('.btn-delete-list-event')) return;
            ev.preventDefault();

            const currentTime = new Date().getTime();
            const id = parseInt(area.dataset.id, 10);

            if (currentTime - lastClickTime < 300 && lastClickedId === id) {
                // Double click (same item)
                lastClickTime = 0;
                lastClickedId = null;
                await handleEventEdit(id);
            } else {
                // Single click
                lastClickTime = currentTime;
                lastClickedId = id;

                // Clear selection from all cards
                document.querySelectorAll('.event-card').forEach(card => {
                    card.classList.remove('ring-2', 'ring-brand-pink', 'border-brand-pink');
                    const delBtn = card.querySelector('.btn-delete-list-event');
                    if(delBtn) delBtn.classList.remove('!opacity-100');
                });

                // Select current card
                const card = area.closest('.event-card');
                if (card) {
                    card.classList.add('ring-2', 'ring-brand-pink', 'border-brand-pink');
                    const delBtn = card.querySelector('.btn-delete-list-event');
                    if(delBtn) delBtn.classList.add('!opacity-100');
                }
            }
        });
    });
}

async function handleEventEdit(id) {
    const eventObj = await db.events.get(id);
    if (eventObj && eventObj.status === 'done') {
        showToast('Ez az esemény már teljesítve van, nem szerkeszthető.', 'warning');
        return;
    }
    openEventModal(id);
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
