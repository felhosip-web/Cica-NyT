import { db } from '../db.js';
import { calculateAge } from '../utils/age.js';
import { calculateTotalCost, formatCurrency, formatDate } from '../utils/cost.js';
import { escapeHtml } from '../utils/escape.js';
import { syncService } from '../services/sync-service.js';
import { openModal, closeModal } from './fab.js';
import { renderCatList } from './cat-list.js';
import { openEventModal } from './event-form.js';
import { showToast } from '../utils/toast.js';

let currentCatId = null;

export function openCatModal(cat) {
    if (cat) {
        document.getElementById('cat-id').value = cat.id;
        document.getElementById('cat-nev').value = cat.nev;
        document.getElementById('cat-ivar').value = cat.ivar;
        document.getElementById('cat-status').value = cat.status || 'befogadható';
        document.getElementById('cat-szuletes').value = cat.szuletes;
        document.getElementById('cat-szin').value = cat.szin;

        // Kiskonyv fields
        const hasKiskonyvEl = document.getElementById('cat-has-kiskonyv');
        if (hasKiskonyvEl) {
            hasKiskonyvEl.checked = !!cat.hasKiskonyv;
            const kiskonyvFields = document.getElementById('kiskonyv-fields');
            if (cat.hasKiskonyv) {
                kiskonyvFields.classList.remove('max-h-0', 'opacity-0');
                kiskonyvFields.classList.add('max-h-[500px]');
                document.getElementById('cat-kiskonyv-szam').value = cat.kiskonyvSzam || '';
                document.getElementById('cat-kiskonyv-date').value = cat.kiskonyvDate || '';
            } else {
                kiskonyvFields.classList.add('max-h-0', 'opacity-0');
                kiskonyvFields.classList.remove('max-h-[500px]');
                document.getElementById('cat-kiskonyv-szam').value = '';
                document.getElementById('cat-kiskonyv-date').value = '';
            }
        }

        document.getElementById('cat-chip-number').value = cat.chipNumber || '';
        document.getElementById('cat-chip-date').value = cat.chipDate || '';
        document.getElementById('cat-chip-location').value = cat.chipLocation || '';

        // Set Intake fields
        const intakeType = cat.intakeType || 'befogott';
        const radioToSelect = document.querySelector(`input[name="intakeType"][value="${intakeType}"]`);
        if (radioToSelect) {
            radioToSelect.checked = true;
            // Dispatch change event to trigger UI update
            radioToSelect.dispatchEvent(new Event('change'));
        }

        document.getElementById('cat-befogott-hol').value = cat.befogottHol || '';
        document.getElementById('cat-befogott-mikor').value = cat.befogottMikor || '';
        document.getElementById('cat-befogott-ki').value = cat.befogottKi || '';

        document.getElementById('cat-behozott-ki').value = cat.behozottKi || '';
        document.getElementById('cat-behozott-mikor').value = cat.behozottMikor || '';
        document.getElementById('cat-behozott-atvevo').value = cat.behozottAtvevoKi || '';

        const gazdisExtra = document.getElementById('gazdis-extra');
        if (cat.status === 'gazdis') {
            gazdisExtra.classList.remove('hidden');
            document.getElementById('cat-gazdis-date').value = cat.gazdisDate || '';
            document.getElementById('cat-gazdis-person').value = cat.gazdisPerson || '';
            document.getElementById('cat-gazdis-contact').value = cat.gazdisContact || '';
            document.getElementById('cat-gazdis-notes').value = cat.gazdisNotes || '';
        } else {
            gazdisExtra.classList.add('hidden');
            document.getElementById('cat-gazdis-date').value = '';
            document.getElementById('cat-gazdis-person').value = '';
            document.getElementById('cat-gazdis-contact').value = '';
            document.getElementById('cat-gazdis-notes').value = '';
        }

        const elhunytExtra = document.getElementById('elhunyt-extra');
        if (elhunytExtra) {
            if (cat.status === 'elhunyt') {
                elhunytExtra.classList.remove('hidden');
                document.getElementById('elhunytDate').value = cat.elhunytDate || '';
                document.getElementById('elhunytOk').value = cat.elhunytOk || '';
                document.getElementById('elhunytNotes').value = cat.elhunytNotes || '';
            } else {
                elhunytExtra.classList.add('hidden');
                document.getElementById('elhunytDate').value = '';
                document.getElementById('elhunytOk').value = '';
                document.getElementById('elhunytNotes').value = '';
            }
        }

        document.getElementById('cat-form-title').innerText = 'Cica szerkesztése';
        const modal = document.getElementById('modal-cat-form');
        if (modal) {
            modal.dataset.editId = cat.id;
        }
        openModal('modal-cat-form');
    }
}

export function initDetail() {
    // Back button
    document.getElementById('btn-back-detail').addEventListener('click', () => {
        document.getElementById('detail-view').classList.add('hidden');
        renderCatList();
    });

    // Close/Back button at bottom
    document.getElementById('btn-close-detail').addEventListener('click', () => {
        document.getElementById('detail-view').classList.add('hidden');
        renderCatList();
    });

    // Edit button
    document.getElementById('btn-edit-cat').addEventListener('click', async () => {
        if (!currentCatId) return;
        const cat = await db.cats.get(currentCatId);
        if (cat) {
            openCatModal(cat);
        }
    });

    document.getElementById('btn-delete-cat').addEventListener('click', async () => {
        if (!currentCatId) return;
        if (confirm("Törlöd?")) {
            await db.cats.delete(currentCatId);
            // Delete associated events
            const events = await db.events.where({ catId: currentCatId }).toArray();
            for (let e of events) {
                await db.events.delete(e.id);
            }
            showToast('Törölve', 'info');
            document.getElementById('detail-view').classList.add('hidden');
            renderCatList();
        }
    });

    // Accordions toggle
    document.querySelectorAll('.accordion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const target = document.getElementById(targetId);
            const icon = btn.querySelector('span:last-child');

            if (target.classList.contains('hidden')) {
                target.classList.remove('hidden');
                icon.classList.add('rotate-180');
            } else {
                target.classList.add('hidden');
                icon.classList.remove('rotate-180');
            }
        });
    });

    // Add Event Buttons
    document.querySelectorAll('.btn-add-event').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;
            document.getElementById('form-event').reset();
            document.getElementById('event-type').value = type;
            document.getElementById('event-index').value = '';

            let title = '';
            let label = 'Név / Típus';

            document.getElementById('event-extra-teszt').classList.add('hidden');
            document.getElementById('event-extra-kezeles').classList.add('hidden');

            if (type === 'oltas') {
                title = 'Új Oltás';
            } else if (type === 'teszt') {
                title = 'Új Teszt';
                document.getElementById('event-extra-teszt').classList.remove('hidden');
            } else if (type === 'kezeles') {
                title = 'Új Kezelés';
                document.getElementById('event-extra-kezeles').classList.remove('hidden');
            }

            document.getElementById('event-form-title').innerText = title;
            document.getElementById('event-label-nev').innerText = label;
            document.getElementById('event-datum').value = new Date().toISOString().split('T')[0];

            openModal('modal-event-form');
        });
    });

    // Event Form Submit
    document.getElementById('form-event').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentCatId) return;

        const cat = await db.cats.get(currentCatId);
        if (!cat) return;

        const type = document.getElementById('event-type').value;
        const indexStr = document.getElementById('event-index').value;

        const eventData = {
            nev: document.getElementById('event-nev').value,
            datum: document.getElementById('event-datum').value,
            koltseg: Number(document.getElementById('event-koltseg').value) || 0
        };

        if (type === 'teszt') {
            eventData.eredmeny = document.getElementById('event-eredmeny').value;
        } else if (type === 'kezeles') {
            eventData.orvos = document.getElementById('event-orvos').value;
        }

        let targetArray = [];
        if (type === 'oltas') targetArray = cat.oltasok = cat.oltasok || [];
        if (type === 'teszt') targetArray = cat.tesztek = cat.tesztek || [];
        if (type === 'kezeles') targetArray = cat.kezelesek = cat.kezelesek || [];

        if (indexStr !== '') {
            targetArray[parseInt(indexStr)] = eventData;
        } else {
            targetArray.push(eventData);
        }

        cat.osszKoltseg = calculateTotalCost(cat);
        await syncService.queueSync(cat);
        closeModal('modal-event-form');

        // Refresh detail view
        openDetailView(currentCatId);
    });

    document.addEventListener('eventsChanged', () => {
        if (currentCatId && !document.getElementById('detail-view').classList.contains('hidden')) {
             renderCatEvents(currentCatId);
        }
    });

    const btnAddEvent = document.getElementById('btn-add-cat-event');
    if (btnAddEvent) {
        btnAddEvent.addEventListener('click', () => {
            if (currentCatId) {
                openEventModal(null, currentCatId);
            }
        });
    }
}

export async function openDetailView(catId) {
    currentCatId = catId;
    const cat = await db.cats.get(catId);
    if (!cat) return;

    // Header Info
    const sorszamStr = String(cat.sorszam).padStart(2, '0');
    document.getElementById('detail-sorszam').innerText = `#${sorszamStr}`;
    document.getElementById('detail-nev').innerText = escapeHtml(cat.nev);

    // Status badges
    const ivarBadge = document.getElementById('detail-ivar');
    ivarBadge.innerText = escapeHtml(cat.ivar);
    if(cat.ivar === 'nőstény') { ivarBadge.className = 'px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-medium'; }
    else if(cat.ivar === 'kandúr') { ivarBadge.className = 'px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium'; }
    else { ivarBadge.className = 'px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium'; }

    const statusBadge = document.getElementById('detail-status');
    const status = cat.status || 'befogadható';
    if(status === 'elhunyt') {
        statusBadge.innerText = '🕊️ Elhunyt';
        statusBadge.className = 'px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium';
    } else {
        statusBadge.innerText = escapeHtml(status);
        if(status === 'befogadható') statusBadge.className = 'px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium';
        else if(status === 'ideiglenes') statusBadge.className = 'px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium';
        else if(status === 'gazdis') statusBadge.className = 'px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium';
        else if(status === 'orvosi') statusBadge.className = 'px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium';
    }

    const gazdisInfo = document.getElementById('detail-gazdis-info');
    if (status === 'gazdis') {
        gazdisInfo.classList.remove('hidden');
        document.getElementById('detail-gazdis-badge').innerText = `🏠 Gazdis ${formatDate(cat.gazdisDate)} óta`;
        document.getElementById('detail-gazdis-person').innerText = `Örökbefogadó: ${escapeHtml(cat.gazdisPerson || '')} ${cat.gazdisContact ? '(' + escapeHtml(cat.gazdisContact) + ')' : ''}`;
    } else {
        gazdisInfo.classList.add('hidden');
    }

    document.getElementById('detail-szin').innerText = escapeHtml(cat.szin);
    document.getElementById('detail-age').innerText = calculateAge(cat.szuletes);
    document.getElementById('detail-birth-date').innerText = `Született: ${formatDate(cat.szuletes)}`;

    // Expired event banner
    const expiredBanner = document.getElementById('expired-event-banner');
    if (expiredBanner) {
        const hasExpiredEvent = await db.events.where({ catId: id, status: 'expired' }).count() > 0;
        if (hasExpiredEvent) {
            expiredBanner.classList.remove('hidden');
        } else {
            expiredBanner.classList.add('hidden');
        }
    }

    // Elhunyt info
    const mainContent = document.getElementById('detail-main-content');
    const elhunytBanner = document.getElementById('memorial-banner');
    const elhunytMemorial = document.getElementById('memorial-section');
    const memorialDateEl = document.getElementById('memorial-date');
    const memorialNotesEl = document.getElementById('memorial-notes');

    if (status === 'elhunyt') {
        if (mainContent) {
            mainContent.classList.add('grayscale-[0.3]', 'opacity-80');
        }

        if (elhunytBanner) {
            elhunytBanner.classList.remove('hidden');
            if (memorialDateEl) memorialDateEl.innerText = formatDate(cat.elhunytDate);
        }

        if (cat.elhunytOk || cat.elhunytNotes) {
            if (elhunytMemorial) elhunytMemorial.classList.remove('hidden');
            if (memorialNotesEl) {
                let noteText = '';
                if (cat.elhunytOk) noteText += `Ok: ${escapeHtml(cat.elhunytOk)} `;
                if (cat.elhunytNotes) noteText += `- "${escapeHtml(cat.elhunytNotes)}"`;
                memorialNotesEl.innerText = noteText.trim();
            }
        } else {
            if (elhunytMemorial) elhunytMemorial.classList.add('hidden');
        }
    } else {
        if (mainContent) {
            mainContent.classList.remove('grayscale-[0.3]', 'opacity-80');
        }
        if (elhunytBanner) elhunytBanner.classList.add('hidden');
        if (elhunytMemorial) elhunytMemorial.classList.add('hidden');
    }

    // Kiskonyv Info setup
    const kiskonyvContainer = document.getElementById('detail-kiskonyv-info');
    if (cat.hasKiskonyv) {
        const szamInfo = cat.kiskonyvSzam ? `<div class="text-gray-600 text-xs mt-1 font-mono">Szám: ${escapeHtml(cat.kiskonyvSzam)}</div>` : '';
        const dateInfo = cat.kiskonyvDate ? `<div class="text-gray-500 text-xs">Kiállítva: ${formatDate(cat.kiskonyvDate)}</div>` : '';

        kiskonyvContainer.classList.remove('border-gray-300');
        kiskonyvContainer.classList.add('border-green-400');
        kiskonyvContainer.innerHTML = `
            <div>
                <div class="font-bold text-green-700 flex items-center gap-2">📘 Van kiskönyv</div>
                ${szamInfo}
                ${dateInfo}
            </div>
            <div class="text-2xl opacity-50">📋</div>
        `;
    } else {
        kiskonyvContainer.classList.remove('border-green-400');
        kiskonyvContainer.classList.add('border-gray-300');
        kiskonyvContainer.innerHTML = `
            <div class="text-gray-500 flex items-center gap-2 font-medium">📕 Nincs kiskönyv</div>
        `;
    }

    // Intake Info Card setup
    const intakeContainer = document.getElementById('detail-intake-info');
    if (!cat.intakeType) {
        intakeContainer.innerHTML = `
            <div class="flex items-center gap-2 text-gray-500">
                <span>⚠️ Beérkezés: nincs rögzítve - szerkesztéssel pótolható</span>
            </div>
        `;
    } else if (cat.intakeType === 'befogott') {
        intakeContainer.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">🐾 Befogott</span>
            </div>
            <div class="space-y-1 text-gray-700">
                <p><strong>📍 Hol:</strong> ${escapeHtml(cat.befogottHol || 'Ismeretlen')}</p>
                <p><strong>📅 Mikor:</strong> ${escapeHtml(cat.befogottMikor ? formatDate(cat.befogottMikor).replace('T', ' ') : 'Ismeretlen')}</p>
                <p><strong>👤 Ki:</strong> ${escapeHtml(cat.befogottKi || 'Ismeretlen')}</p>
            </div>
        `;
    } else if (cat.intakeType === 'behozott') {
        intakeContainer.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">📦 Behozott</span>
            </div>
            <div class="space-y-1 text-gray-700">
                <p><strong>👤 Behozta:</strong> ${escapeHtml(cat.behozottKi || 'Ismeretlen')}</p>
                <p><strong>📅 Mikor:</strong> ${escapeHtml(cat.behozottMikor ? formatDate(cat.behozottMikor).replace('T', ' ') : 'Ismeretlen')}</p>
                <p><strong>🤝 Átvevő:</strong> ${escapeHtml(cat.behozottAtvevoKi || 'Ismeretlen')}</p>
            </div>
        `;
    }

    // Render lists
    renderEventList('oltasok', cat.oltasok || []);
    renderEventList('tesztek', cat.tesztek || []);
    renderEventList('kezelesek', cat.kezelesek || []);

    document.getElementById('detail-ossz-koltseg').innerText = formatCurrency(cat.osszKoltseg || 0);

    renderCatEvents(id);

    document.getElementById('detail-view').classList.remove('hidden');
}

async function renderCatEvents(catId) {
    const listEl = document.getElementById('detail-events-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const events = await db.events.where({ catId: catId }).toArray();
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (events.length === 0) {
        listEl.innerHTML = '<div class="text-sm text-gray-500 italic">Nincsenek események.</div>';
        return;
    }

    let html = '';
    for (let e of events) {
        let icon = '📅';
        if (e.type === 'oltas') icon = '💉';
        if (e.type === 'orvosi') icon = '🩺';

        const title = escapeHtml(e.title || '');
        const dateStr = escapeHtml(e.date || '');
        let statusStr = '';
        if (e.status === 'done') statusStr = '<span class="text-xs text-green-600 font-bold ml-2">✅ Kész</span>';
        if (e.status === 'expired') statusStr = '<span class="text-xs text-red-600 font-bold ml-2">⚠️ Lejárt</span>';

        html += `
            <div class="p-2 border border-gray-200 rounded bg-white flex justify-between items-center cursor-pointer hover:bg-gray-50" onclick="window.handleDetailEventClick(${e.id})">
                <div class="flex items-center gap-2">
                    <span>${icon}</span>
                    <div>
                        <div class="text-sm font-bold text-gray-800">${title}${statusStr}</div>
                        <div class="text-xs text-gray-500">${dateStr}</div>
                    </div>
                </div>
            </div>
        `;
    }
    listEl.innerHTML = html;
}

window.handleDetailEventClick = function(id) {
    openEventModal(id);
};

function renderEventList(type, items) {
    const listEl = document.getElementById(`list-${type}`);
    const countEl = document.getElementById(`count-${type}`);

    countEl.innerText = items.length;
    listEl.innerHTML = '';

    if (items.length === 0) {
        listEl.innerHTML = `<li class="text-gray-500 text-sm italic">Nincs adat</li>`;
        return;
    }

    items.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = "bg-white border rounded-lg p-3 flex justify-between items-center shadow-sm";

        let extraInfo = '';
        if (type === 'tesztek') {
            const color = item.eredmeny === 'pozitiv' ? 'text-red-600' : (item.eredmeny === 'negativ' ? 'text-green-600' : 'text-yellow-600');
            extraInfo = `<span class="text-xs font-bold ${color}">${escapeHtml(item.eredmeny)}</span>`;
        } else if (type === 'kezelesek' && item.orvos) {
            extraInfo = `<span class="text-xs text-gray-500">👨‍⚕️ ${escapeHtml(item.orvos)}</span>`;
        }

        li.innerHTML = `
            <div class="flex-1">
                <p class="font-medium text-gray-900">${escapeHtml(item.nev)}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-gray-500">${formatDate(item.datum)}</span>
                    ${extraInfo}
                </div>
            </div>
            <div class="flex items-center gap-3">
                <span class="font-bold text-gray-900">${formatCurrency(item.koltseg)}</span>
                <button class="text-red-400 hover:text-red-600 p-1 btn-delete-event" data-type="${type}" data-index="${index}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
        `;
        listEl.appendChild(li);
    });

    // Delete handlers
    listEl.querySelectorAll('.btn-delete-event').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            if(!confirm('Biztosan törlöd ezt a tételt?')) return;

            const itemType = btn.dataset.type;
            const itemIndex = parseInt(btn.dataset.index);

            const cat = await db.cats.get(currentCatId);
            if (cat) {
                if (itemType === 'oltasok') cat.oltasok.splice(itemIndex, 1);
                if (itemType === 'tesztek') cat.tesztek.splice(itemIndex, 1);
                if (itemType === 'kezelesek') cat.kezelesek.splice(itemIndex, 1);

                cat.osszKoltseg = calculateTotalCost(cat);
                await syncService.queueSync(cat);
                openDetailView(currentCatId);
            }
        });
    });
}
