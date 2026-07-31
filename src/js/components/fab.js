import { db } from '../db.js';
import { syncService } from '../services/sync-service.js';
import { renderCatList } from './cat-list.js';

export function initModals() {
    // FAB Add Cat
    const fabAdd = document.getElementById('fab-add-cat');
    if (fabAdd) {
        fabAdd.addEventListener('click', () => {
            document.getElementById('form-cat').reset();
            document.getElementById('cat-id').value = '';
            document.getElementById('cat-form-title').innerText = 'Új Cica Hozzáadása';
            openModal('modal-cat-form');
        });
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('div[id^="modal-"]');
            if (modal) {
                closeModal(modal.id);
            }
        });
    });

    // Status change listener for gazdis fields
    const statusSelect = document.getElementById('cat-status');
    const gazdisExtra = document.getElementById('gazdis-extra');
    if (statusSelect && gazdisExtra) {
        statusSelect.addEventListener('change', (e) => {
            if (e.target.value === 'gazdis') {
                gazdisExtra.classList.remove('hidden');
            } else {
                gazdisExtra.classList.add('hidden');
            }
        });
    }

    // Cat Form Submit
    const formCat = document.getElementById('form-cat');
    if (formCat) {
        formCat.addEventListener('submit', async (e) => {
            e.preventDefault();

            const idInput = document.getElementById('cat-id').value;
            const status = document.getElementById('cat-status').value;

            if (status === 'gazdis') {
                const gazdisDate = document.getElementById('cat-gazdis-date').value;
                const gazdisPerson = document.getElementById('cat-gazdis-person').value;
                if (!gazdisDate || !gazdisPerson) {
                    alert('Add meg a gazdis dátumot és az örökbefogadó nevét!');
                    return;
                }
            }

            const catData = {
                nev: document.getElementById('cat-nev').value,
                ivar: document.getElementById('cat-ivar').value,
                status: status,
                szuletes: document.getElementById('cat-szuletes').value,
                szin: document.getElementById('cat-szin').value,
            };

            if (status === 'gazdis') {
                catData.gazdisDate = document.getElementById('cat-gazdis-date').value;
                catData.gazdisPerson = document.getElementById('cat-gazdis-person').value;
                catData.gazdisContact = document.getElementById('cat-gazdis-contact').value;
                catData.gazdisNotes = document.getElementById('cat-gazdis-notes').value;
            } else {
                catData.gazdisDate = null;
                catData.gazdisPerson = null;
                catData.gazdisContact = null;
                catData.gazdisNotes = null;
            }

            if (idInput) {
                // Edit existing
                const existing = await db.cats.get(idInput);
                const updatedCat = { ...existing, ...catData };
                await syncService.queueSync(updatedCat);
            } else {
                // New cat
                const meta = await db.meta.get('nextSorszam') || { key: 'nextSorszam', value: 1 };
                const sorszam = meta.value;
                await db.meta.put({ key: 'nextSorszam', value: sorszam + 1 });

                const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
                const sorszamStr = String(sorszam).padStart(3, '0');
                const newId = `cat_${dateStr}_${sorszamStr}`;

                const newCat = {
                    id: newId,
                    sorszam: sorszam,
                    ...catData,
                    created: new Date().toISOString(),
                    osszKoltseg: 0,
                    oltasok: [],
                    tesztek: [],
                    kezelesek: []
                };

                await syncService.queueSync(newCat);
            }

            closeModal('modal-cat-form');
            renderCatList();
        });
    }
}

export function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

export function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('hidden');
    }
}
