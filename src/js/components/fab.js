import { db } from '../db.js';
import { syncService } from '../services/sync-service.js';
import { renderCatList } from './cat-list.js';
import { showToast } from '../utils/toast.js';

export function initModals() {
    // FAB Add Cat
    const fabAdd = document.getElementById('fab-add-cat');
    if (fabAdd) {
        fabAdd.addEventListener('click', () => {
            document.getElementById('form-cat').reset();
            document.getElementById('cat-id').value = '';
            document.getElementById('cat-form-title').innerText = 'Új Cica Hozzáadása';

            // Reset kiskonyv fields state manually since reset() doesn't trigger change event
            const kiskonyvFields = document.getElementById('kiskonyv-fields');
            if (kiskonyvFields) {
                kiskonyvFields.classList.add('max-h-0', 'opacity-0');
                kiskonyvFields.classList.remove('max-h-[500px]');
            }

            const chipError = document.getElementById('chip-error');
            if (chipError) {
                chipError.classList.add('hidden');
            }

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

    // Intake Type change listener
    const intakeRadios = document.querySelectorAll('input[name="intakeType"]');
    const befogottFields = document.getElementById('befogott-fields');
    const behozottFields = document.getElementById('behozott-fields');

    intakeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Update labels styling
            document.querySelectorAll('.intake-radio-lbl').forEach(lbl => {
                lbl.classList.remove('border-pink-500', 'bg-pink-50', 'ring-2', 'ring-pink-500');
            });
            const selectedLbl = e.target.closest('.intake-radio-lbl');
            if (selectedLbl) {
                selectedLbl.classList.add('border-pink-500', 'bg-pink-50', 'ring-2', 'ring-pink-500');
            }

            // Show/hide fields with smooth transitions
            if (e.target.value === 'befogott') {
                befogottFields.classList.remove('max-h-0', 'opacity-0');
                befogottFields.classList.add('max-h-[500px]');
                behozottFields.classList.add('max-h-0', 'opacity-0');
                behozottFields.classList.remove('max-h-[500px]');
            } else if (e.target.value === 'behozott') {
                behozottFields.classList.remove('max-h-0', 'opacity-0');
                behozottFields.classList.add('max-h-[500px]');
                befogottFields.classList.add('max-h-0', 'opacity-0');
                befogottFields.classList.remove('max-h-[500px]');
            }
        });
    });

    // Status change listener for gazdis and elhunyt fields
    const statusSelect = document.getElementById('cat-status');
    const gazdisExtra = document.getElementById('gazdis-extra');
    const elhunytExtra = document.getElementById('elhunyt-extra');
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            if (gazdisExtra) {
                if (e.target.value === 'gazdis') {
                    gazdisExtra.classList.remove('hidden');
                } else {
                    gazdisExtra.classList.add('hidden');
                }
            }
            if (elhunytExtra) {
                const elhunytDate = document.getElementById('elhunytDate');
                if (e.target.value === 'elhunyt') {
                    elhunytExtra.classList.remove('hidden');
                    if (elhunytDate) elhunytDate.required = true;
                } else {
                    elhunytExtra.classList.add('hidden');
                    if (elhunytDate) {
                        elhunytDate.required = false;
                        elhunytDate.value = '';
                    }
                }
            }
        });
    }

    // Kiskonyv toggle listener
    const kiskonyvCheckbox = document.getElementById('cat-has-kiskonyv');
    const kiskonyvFields = document.getElementById('kiskonyv-fields');
    if (kiskonyvCheckbox && kiskonyvFields) {
        kiskonyvCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                kiskonyvFields.classList.remove('max-h-0', 'opacity-0');
                kiskonyvFields.classList.add('max-h-[500px]');
            } else {
                kiskonyvFields.classList.add('max-h-0', 'opacity-0');
                kiskonyvFields.classList.remove('max-h-[500px]');
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
            const intakeType = document.querySelector('input[name="intakeType"]:checked')?.value || 'befogott';

            if (intakeType === 'befogott') {
                const hol = document.getElementById('cat-befogott-hol').value;
                const mikor = document.getElementById('cat-befogott-mikor').value;
                if (!hol) {
                    alert('Add meg hol fogták be!');
                    return;
                }
                if (!mikor) {
                    alert('Add meg mikor fogták be!');
                    return;
                }
            } else if (intakeType === 'behozott') {
                const ki = document.getElementById('cat-behozott-ki').value;
                const mikor = document.getElementById('cat-behozott-mikor').value;
                const atvevo = document.getElementById('cat-behozott-atvevo').value;
                if (!ki) {
                    alert('Add meg ki hozta be!');
                    return;
                }
                if (!mikor) {
                    alert('Add meg mikor hozták be!');
                    return;
                }
                if (!atvevo) {
                    alert('Add meg ki vette át!');
                    return;
                }
            }

            if (status === 'gazdis') {
                const gazdisDate = document.getElementById('cat-gazdis-date').value;
                const gazdisPerson = document.getElementById('cat-gazdis-person').value;
                if (!gazdisDate || !gazdisPerson) {
                    alert('Add meg a gazdis dátumot és az örökbefogadó nevét!');
                    return;
                }
            }

            if (status === 'elhunyt') {
                const d = document.getElementById('elhunytDate').value;
                if (!d) {
                    const errEl = document.getElementById('elhunytDate-error');
                    if (errEl) errEl.classList.remove('hidden');
                    return;
                }
            }

            const hasKiskonyv = document.getElementById('cat-has-kiskonyv').checked;

            const chipNumberInput = document.getElementById('cat-chip-number').value.trim();
            const chipError = document.getElementById('chip-error');
            if (chipError) chipError.classList.add('hidden');

            if (chipNumberInput && chipNumberInput !== '') {
                if (!/^(900|348)\d{12}$/.test(chipNumberInput)) {
                    if (chipError) chipError.classList.remove('hidden');
                    return false;
                }
            }

            const catData = {
                nev: document.getElementById('cat-nev').value,
                ivar: document.getElementById('cat-ivar').value,
                status: status,
                szuletes: document.getElementById('cat-szuletes').value,
                szin: document.getElementById('cat-szin').value,
                intakeType: intakeType,
                befogottHol: intakeType === 'befogott' ? document.getElementById('cat-befogott-hol').value : null,
                befogottMikor: intakeType === 'befogott' ? document.getElementById('cat-befogott-mikor').value : null,
                befogottKi: intakeType === 'befogott' ? document.getElementById('cat-befogott-ki').value : null,
                behozottKi: intakeType === 'behozott' ? document.getElementById('cat-behozott-ki').value : null,
                behozottMikor: intakeType === 'behozott' ? document.getElementById('cat-behozott-mikor').value : null,
                behozottAtvevoKi: intakeType === 'behozott' ? document.getElementById('cat-behozott-atvevo').value : null,
                hasKiskonyv: hasKiskonyv,
                kiskonyvSzam: hasKiskonyv ? document.getElementById('cat-kiskonyv-szam').value : null,
                kiskonyvDate: hasKiskonyv ? document.getElementById('cat-kiskonyv-date').value : null,
                chipNumber: chipNumberInput || null,
                chipDate: chipNumberInput ? document.getElementById('cat-chip-date').value : null,
                chipLocation: chipNumberInput ? document.getElementById('cat-chip-location').value : null,
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

            if (status === 'elhunyt') {
                catData.elhunytDate = document.getElementById('elhunytDate').value;
                catData.elhunytOk = document.getElementById('elhunytOk').value;
                catData.elhunytNotes = document.getElementById('elhunytNotes').value;
            } else {
                catData.elhunytDate = null;
                catData.elhunytOk = null;
                catData.elhunytNotes = null;
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

            showToast('Cica sikeresen mentve!', 'success');
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
