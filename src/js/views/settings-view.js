import { db } from '../db.js';
import { renderOrgDisplay } from './org-display.js';
import { prepareExportModal } from './export-modal.js';
import { openModal } from '../components/fab.js';

export async function initSettings() {
    const orgNameInput = document.getElementById('settings-org-name');
    const orgRoleSelect = document.getElementById('settings-org-role');
    const form = document.getElementById('form-settings-org');

    // Load initial settings
    try {
        const settings = await db.settings.get('org');
        if (settings) {
            orgNameInput.value = settings.orgName || '';
            orgRoleSelect.value = settings.orgRole || 'maganszemely';
        }
    } catch (e) {
        console.error('Failed to load settings', e);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const orgName = orgNameInput.value.trim();
        const orgRole = orgRoleSelect.value;

        const settingsObj = {
            id: 'org',
            orgName,
            orgRole,
            cloudEnabled: false,
            cloudProvider: null
        };

        try {
            await db.settings.put(settingsObj);

            // Dispatch custom event as requested
            const event = new CustomEvent('orgSettingsChanged');
            document.dispatchEvent(event);

            // Simple toast notification
            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow z-50';
            toast.textContent = 'Beállítások mentve';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);

        } catch (error) {
            console.error('Save settings error', error);
            alert('Hiba történt a mentés során.');
        }
    });
}

async function updateStorageStats() {
    const statsEl = document.getElementById('storage-stats');
    if (!statsEl) return;
    try {
        const count = await db.cats.count();
        const cats = await db.cats.toArray();
        const sizeBytes = new Blob([JSON.stringify(cats)]).size;
        const sizeKB = Math.round(sizeBytes / 1024);
        statsEl.textContent = `Tárolt cicák: ${count}, Méret: ~${sizeKB}KB`;
    } catch (e) {
        console.error('Failed to update storage stats', e);
    }
}

export function initSettingsActions() {
    updateStorageStats();

    const btnExport = document.getElementById('btn-export-data');
    const inputImport = document.getElementById('input-import-data');
    const btnClearCache = document.getElementById('btn-clear-cache');
    const btnClearAll = document.getElementById('btn-clear-all');

    const btnPdfSimple = document.getElementById('btn-settings-export-simple');
    const btnPdfFinancial = document.getElementById('btn-settings-export-financial');

    if (btnPdfSimple) {
        btnPdfSimple.addEventListener('click', () => {
            prepareExportModal('simple', 'all');
            openModal('modal-export');
        });
    }

    if (btnPdfFinancial) {
        btnPdfFinancial.addEventListener('click', () => {
            prepareExportModal('financial', 'all');
            openModal('modal-export');
        });
    }

    // Export Data
    btnExport.addEventListener('click', async () => {
        try {
            const cats = await db.cats.toArray();
            const settings = await db.settings.toArray();
            // Optional: Export other tables if needed in the future

            const data = {
                version: "1.1.0",
                exportDate: new Date().toISOString(),
                cats,
                settings
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `cica-nyt-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error('Export failed', e);
            alert('Hiba az exportálás során.');
        }
    });

    // Import Data
    inputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.cats && Array.isArray(data.cats)) {
                    await db.cats.bulkPut(data.cats);
                }
                if (data.settings && Array.isArray(data.settings)) {
                    await db.settings.bulkPut(data.settings);
                }
                alert('Sikeres importálás!');
                window.location.reload();
            } catch (error) {
                console.error('Import failed', error);
                alert('Hiba az importálás során. Érvénytelen JSON formátum.');
            }
            inputImport.value = ''; // Reset
        };
        reader.readAsText(file);
    });

    // Clear Cache
    btnClearCache.addEventListener('click', () => {
        if (confirm('Biztosan törlöd a cache-t és frissíted az alkalmazást? (Az adatok megmaradnak)')) {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for(let registration of registrations) {
                        registration.unregister();
                    }
                    window.location.reload(true);
                });
            } else {
                window.location.reload(true);
            }
        }
    });

    // Clear All Data
    btnClearAll.addEventListener('click', async () => {
        if (confirm('FIGYELEM! Biztosan törölsz MINDEN adatot? Ezt nem lehet visszavonni!')) {
            try {
                await db.delete();
                alert('Minden adat törölve.');
                window.location.reload();
            } catch (e) {
                console.error('Clear DB failed', e);
                alert('Hiba az adatok törlésekor.');
            }
        }
    });
}
