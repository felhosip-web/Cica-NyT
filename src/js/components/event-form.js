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

    const btnCloseTypeSelector = document.getElementById('btn-close-type-selector');
    if (btnCloseTypeSelector) {
        btnCloseTypeSelector.addEventListener('click', () => {
            document.getElementById('modal-event-type-selector').classList.add('hidden');
        });
    }

    const form = document.querySelector('#modal-new-event-form #form-new-event');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveEvent();
        });
    }

    const btnDelete = document.getElementById('btn-delete-event-form');
    if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
            const idInput = document.querySelector('#modal-new-event-form #event-id').value;
            if (!idInput) return;

            if (confirm('Biztosan törlöd ezt az eseményt?')) {
                await db.events.delete(parseInt(idInput, 10));
                closeEventModal();
                await updateEventBadge();
                renderEvents();
                document.dispatchEvent(new CustomEvent('eventsChanged'));
                showToast('Esemény törölve', 'info');
            }
        });
    }

    const fabAddEvent = document.getElementById('fab-add-event');
    if (fabAddEvent) {
        fabAddEvent.addEventListener('click', () => {
            document.getElementById('modal-event-type-selector').classList.remove('hidden');
        });
    }

    const btnAddEventView = document.getElementById('btn-add-event-view');
    if (btnAddEventView) {
        btnAddEventView.addEventListener('click', () => {
            document.getElementById('modal-event-type-selector').classList.remove('hidden');
        });
    }

    // Global function for the selector modal
    window.startNewEvent = function(mode) {
        document.getElementById('modal-event-type-selector').classList.add('hidden');
        openEventModal(null, null, mode);
    };
}

export async function openEventModal(eventId = null, catId = null, mode = 'cat') {
    const modal = document.getElementById('modal-new-event-form');
    if (!modal) return;

    if (eventId) {
        const ev = await db.events.get(eventId);
        if (ev && ev.status === 'done') {
            showToast('Ez az esemény már teljesítve van, nem szerkeszthető.', 'warning');
            return;
        }
        if (ev) {
            mode = ev.catId === 'general' ? 'general' : 'cat';
        }
    }

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
    modal.querySelector('#event-mode').value = mode;

    const catContainer = modal.querySelector('#event-cat-container');
    if (mode === 'general') {
        catContainer.classList.add('hidden');
        catSelect.removeAttribute('required');
    } else {
        catContainer.classList.remove('hidden');
        catSelect.setAttribute('required', 'required');
    }

    const titleEl = modal.querySelector('#new-event-form-title');
    titleEl.textContent = 'Új Esemény';

    const btnDelete = modal.querySelector('#btn-delete-event-form');
    if (btnDelete) {
        btnDelete.classList.add('hidden');
    }

    if (eventId) {
        titleEl.textContent = 'Esemény szerkesztése';
        if (btnDelete) btnDelete.classList.remove('hidden');
        const ev = await db.events.get(eventId);
        if (ev) {
            modal.querySelector('#event-id').value = ev.id;
            if (ev.catId !== 'general') {
                modal.querySelector('#event-cat-id').value = ev.catId;
            }
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
    const mode = modal.querySelector('#event-mode').value;

    // Get organization name for creator tracking (useful for multi-user sync later)
    let creatorName = 'Ismeretlen';
    const settings = await db.settings.get('main');
    if (settings && settings.orgName) {
        creatorName = settings.orgName;
    }

    const eventData = {
        catId: mode === 'general' ? 'general' : modal.querySelector('#event-cat-id').value,
        type: modal.querySelector('#event-type').value,
        title: modal.querySelector('#event-title').value,
        date: modal.querySelector('#event-date').value,
        repeat: modal.querySelector('#event-repeat').value,
        vetName: modal.querySelector('#event-vet').value,
        notes: modal.querySelector('#event-notes').value,
        status: 'pending',
        createdBy: creatorName,
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
