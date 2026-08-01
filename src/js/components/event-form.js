import { db } from '../db.js';
import { updateEventBadge } from '../utils/event-check.js';
import { renderEvents } from './event-list.js';
import { showToast } from '../utils/toast.js';
import { scheduleLocalCheck } from '../utils/push.js';

export function initEventForm() {
    const btnClose = document.getElementById('btn-close-new-event-modal');
    if (btnClose) {
        btnClose.addEventListener('click', closeEventModal);
    }

    const form = document.querySelector('#modal-new-event-form #form-new-event');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEvent();
        });
    }
}

export async function openEventModal(eventId = null, catId = null) {
    const modal = document.getElementById('modal-new-event-form');
    if (!modal) return;

    const catSelect = modal.querySelector('#event-cat-id');
    catSelect.innerHTML = '<option value="">Válassz cicát...</option>';

    const allCats = await db.cats.toArray();
    for (let c of allCats) {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nev;
        catSelect.appendChild(opt);
    }

    modal.querySelector('#form-new-event').reset();
    modal.querySelector('#event-id').value = '';

    const titleEl = modal.querySelector('#new-event-form-title');
    titleEl.textContent = 'Új Esemény';

    if (eventId) {
        titleEl.textContent = 'Esemény szerkesztése';
        const ev = await db.events.get(eventId);
        if (ev) {
            modal.querySelector('#event-id').value = ev.id;
            modal.querySelector('#event-cat-id').value = ev.catId;
            modal.querySelector('#event-type').value = ev.type || 'egyeni';
            modal.querySelector('#event-title').value = ev.title || '';
            modal.querySelector('#event-date').value = ev.date || '';
            modal.querySelector('#event-repeat').value = ev.repeat || 'nincs';
            modal.querySelector('#event-vet').value = ev.vetName || '';
            modal.querySelector('#event-notes').value = ev.notes || '';
        }
    } else if (catId) {
        modal.querySelector('#event-cat-id').value = catId;
    }

    modal.classList.remove('hidden');
}

export function closeEventModal() {
    const modal = document.getElementById('modal-new-event-form');
    if (modal) modal.classList.add('hidden');
}

async function saveEvent() {
    const modal = document.getElementById('modal-new-event-form');
    const idInput = modal.querySelector('#event-id').value;

    const eventData = {
        catId: modal.querySelector('#event-cat-id').value,
        type: modal.querySelector('#event-type').value,
        title: modal.querySelector('#event-title').value,
        date: modal.querySelector('#event-date').value,
        repeat: modal.querySelector('#event-repeat').value,
        vetName: modal.querySelector('#event-vet').value,
        notes: modal.querySelector('#event-notes').value,
        status: 'pending',
        createdAt: new Date().toISOString()
    };

    if (idInput) {
        const id = parseInt(idInput, 10);
        const existing = await db.events.get(id);
        if (existing) {
            eventData.status = existing.status;
            eventData.createdAt = existing.createdAt;
        }
        await db.events.update(id, eventData);
    } else {
        await db.events.add(eventData);
    }

    closeEventModal();
    await updateEventBadge();

    renderEvents();
    document.dispatchEvent(new CustomEvent('eventsChanged'));

    showToast('Esemény mentve', 'info');
    scheduleLocalCheck();
}
