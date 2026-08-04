import { db } from '../db.js';
import { renderOrgDisplay } from './org-display.js';
import { prepareExportModal } from './export-modal.js';
import { openModal } from '../components/fab.js';
import { THEMES, applyTheme, getCurrentThemeId, saveTheme } from '../utils/theme-manager.js';
import { syncService } from '../services/sync-service.js';
import { cloudSyncManager } from '../cloud/sync-manager.js';

export const ORG_ROLES = [
  {value:'tulajdonos', label:'Tulajdonos', icon:'👤'},
  {value:'ideiglenes_nevelo', label:'Ideiglenes nevelő / Befogadó', icon:'🏠'},
  {value:'menhely', label:'Menhely', icon:'🏚️'},
  {value:'alapitvany', label:'Alapítvány / Egyesület', icon:'🤝'},
  {value:'maganszemely', label:'Magánszemély', icon:'🙋'}
];

export async function initSettings() {
    renderQuickFilterSettings();
    const orgNameInput = document.getElementById('settings-org-name');
    const orgRoleSelect = document.getElementById('settings-org-role');
    const form = document.getElementById('form-settings-org');

    const cloudEnabledEl = document.getElementById('settings-cloud-enabled');
    const supabaseConfigFields = document.getElementById('supabase-config-fields');
    const supabaseUrlEl = document.getElementById('settings-supabase-url');
    const supabaseKeyEl = document.getElementById('settings-supabase-key');
    const btnTestSupabase = document.getElementById('btn-test-supabase');
    const btnManualSync = document.getElementById('btn-manual-sync');
    const supabaseTestResult = document.getElementById('supabase-test-result');

    if (orgRoleSelect) {
        orgRoleSelect.innerHTML = ORG_ROLES.map(opt => `<option value="${opt.value}">${opt.icon} ${opt.label}</option>`).join('');
    }

    // Toggle Supabase config fields visibility
    const toggleSupabaseFields = (enabled) => {
        if (supabaseConfigFields) {
            if (enabled) {
                supabaseConfigFields.classList.remove('hidden');
            } else {
                supabaseConfigFields.classList.add('hidden');
            }
        }
    };

    if (cloudEnabledEl) {
        cloudEnabledEl.addEventListener('change', (e) => {
            toggleSupabaseFields(e.target.checked);
        });
    }

    // Render theme selector list
    const themeListContainer = document.getElementById('settings-theme-list');
    if (themeListContainer) {
        const renderThemeSelector = () => {
            const activeThemeId = getCurrentThemeId();
            themeListContainer.innerHTML = Object.values(THEMES).map(theme => {
                const isActive = theme.id === activeThemeId;
                const pinkColor = theme.colors['brand-pink'];
                const orangeColor = theme.colors['brand-orange'];
                
                return `
                    <div id="theme-card-${theme.id}" class="flex items-center justify-between p-3 border-2 ${isActive ? 'border-pink-500 bg-pink-50/30' : 'border-gray-200 bg-white'} rounded-xl cursor-pointer hover:bg-gray-50 transition-all duration-200 shadow-sm">
                        <div class="flex-1">
                            <div class="font-bold text-sm text-gray-800 flex items-center gap-2">
                                ${theme.name}
                                ${isActive ? '<span class="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-medium">Aktív</span>' : ''}
                            </div>
                            <div class="text-xs text-gray-500 mt-1">${theme.description}</div>
                        </div>
                        <div class="flex items-center gap-1.5 pl-3">
                            <span class="w-5 h-5 rounded-full border border-gray-300 inline-block" style="background-color: ${pinkColor}"></span>
                            <span class="w-5 h-5 rounded-full border border-gray-300 inline-block" style="background-color: ${orangeColor}"></span>
                        </div>
                    </div>
                `;
            }).join('');

            // Add click listeners to theme cards
            Object.values(THEMES).forEach(theme => {
                const card = document.getElementById(`theme-card-${theme.id}`);
                if (card) {
                    card.addEventListener('click', () => {
                        saveTheme(theme.id);
                        renderThemeSelector();
                        
                        // Simple elegant toast notification
                        const toast = document.createElement('div');
                        toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow z-50 text-sm font-medium';
                        toast.textContent = `Színséma módosítva: ${theme.name}`;
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 2000);
                    });
                }
            });
        };

        renderThemeSelector();
    }

    // Load initial settings
    try {
        let settings = await db.settings.get('main');
        if (!settings) {
            settings = await db.settings.get('org');
        }

        if (settings) {
            orgNameInput.value = settings.orgName || '';
            let savedRole = settings.orgRole || 'maganszemely';

            // Migration
            if (savedRole === 'allatmenhely' || savedRole.includes('/')) {
                savedRole = 'menhely';
            }

            orgRoleSelect.value = savedRole;

            const showDeceasedEl = document.getElementById('showDeceased');
            if (showDeceasedEl) {
                showDeceasedEl.checked = settings.showDeceased ?? true;
            }

            if (cloudEnabledEl) {
                const isCloud = settings.cloudEnabled ?? false;
                cloudEnabledEl.checked = isCloud;
                toggleSupabaseFields(isCloud);
            }

            if (supabaseUrlEl) {
                supabaseUrlEl.value = settings.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '';
            }
            if (supabaseKeyEl) {
                supabaseKeyEl.value = settings.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
            }
        }
    } catch (e) {
        console.error('Failed to load settings', e);
    }

    // Test Supabase connection button
    if (btnTestSupabase) {
        btnTestSupabase.addEventListener('click', async () => {
            const url = supabaseUrlEl ? supabaseUrlEl.value.trim() : '';
            const key = supabaseKeyEl ? supabaseKeyEl.value.trim() : '';

            btnTestSupabase.innerText = 'Tesztelés...';
            btnTestSupabase.disabled = true;

            const res = await syncService.testConnection(url, key);

            btnTestSupabase.innerText = '🔍 Kapcsolat tesztelése';
            btnTestSupabase.disabled = false;

            if (supabaseTestResult) {
                supabaseTestResult.classList.remove('hidden', 'bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
                if (res.success) {
                    supabaseTestResult.classList.add('bg-green-100', 'text-green-800');
                    supabaseTestResult.innerText = '✅ Sikeres kapcsolódás a Supabase adatbázishoz!';
                } else {
                    supabaseTestResult.classList.add('bg-red-100', 'text-red-800');
                    supabaseTestResult.innerText = `❌ Kapcsolódási hiba: ${res.error}`;
                }
            }
        });
    }

    // Manual sync button
    if (btnManualSync) {
        btnManualSync.addEventListener('click', async () => {
            btnManualSync.innerText = 'Szinkronizálás...';
            btnManualSync.disabled = true;

            await cloudSyncManager.init();
            await cloudSyncManager.sync();

            btnManualSync.innerText = '🔄 Szinkronizálás most';
            btnManualSync.disabled = false;

            const toast = document.createElement('div');
            toast.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-lg shadow z-50 text-sm font-medium';
            toast.textContent = 'Szinkronizálás befejeződött';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        });
    }

    const showDeceasedEl = document.getElementById('showDeceased');
    if (showDeceasedEl) {
        showDeceasedEl.addEventListener('change', async (e) => {
            let currentSettings = await db.settings.get('main');
            if (!currentSettings) currentSettings = { id: 'main' };
            currentSettings.showDeceased = e.target.checked;
            await db.settings.put(currentSettings);

            // Reload list to apply filter immediately
            const { initList } = await import('../components/cat-list.js');
            initList();
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const orgName = orgNameInput.value.trim();
        const orgRole = orgRoleSelect.value;

        let currentSettings = await db.settings.get('main');
        if (!currentSettings) currentSettings = { id: 'main' };

        const showDeceasedEl = document.getElementById('showDeceased');
        const isCloudEnabled = cloudEnabledEl ? cloudEnabledEl.checked : false;

        const supabaseUrl = supabaseUrlEl ? supabaseUrlEl.value.trim() : '';
        const supabaseKey = supabaseKeyEl ? supabaseKeyEl.value.trim() : '';

        const settingsObj = {
            ...currentSettings,
            id: 'main',
            orgName,
            orgRole,
            cloudEnabled: isCloudEnabled,
            cloudProvider: isCloudEnabled ? 'supabase' : null,
            supabaseUrl: supabaseUrl,
            supabaseKey: supabaseKey,
            showDeceased: showDeceasedEl ? showDeceasedEl.checked : true
        };

        try {
            await db.settings.put(settingsObj);

            // Re-init sync with new settings
            await cloudSyncManager.init();

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

export const AVAILABLE_QUICK_FILTERS = [
    { id: 'expired', label: 'Lejárt oltások', icon: '🔴', colorClass: 'text-red-600', bgClass: 'bg-red-50', borderClass: 'border-red-200' },
    { id: 'no-chip', label: 'Chipre vár', icon: '🟡', colorClass: 'text-yellow-700', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-200' },
    { id: 'adoptable', label: 'Gazdisodhat', icon: '🟢', colorClass: 'text-green-700', bgClass: 'bg-green-50', borderClass: 'border-green-200' },
    { id: 'captured', label: 'Befogott', icon: '🐾', colorClass: 'text-blue-700', bgClass: 'bg-blue-50', borderClass: 'border-blue-200' },
    { id: 'brought-in', label: 'Behozott', icon: '📦', colorClass: 'text-orange-700', bgClass: 'bg-orange-50', borderClass: 'border-orange-200' },
    { id: 'adopted', label: 'Gazdis', icon: '🏠', colorClass: 'text-purple-700', bgClass: 'bg-purple-50', borderClass: 'border-purple-200' }
];

async function renderQuickFilterSettings() {
    const container = document.getElementById('settings-quick-filters-list');
    if (!container) return;

    let settings = await db.settings.get('main');
    let activeFilters = settings?.quickFilters || ['expired', 'no-chip', 'adoptable'];

    let html = '';
    AVAILABLE_QUICK_FILTERS.forEach(filter => {
        const isChecked = activeFilters.includes(filter.id);
        html += `
            <label class="flex items-center justify-between p-3 border ${isChecked ? 'border-brand-pink bg-pink-50' : 'border-gray-200'} rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-2">
                    <span>${filter.icon}</span>
                    <span class="text-sm font-medium text-gray-700">${filter.label}</span>
                </div>
                <input type="checkbox" value="${filter.id}" class="qf-checkbox rounded text-brand-pink focus:ring-brand-pink h-5 w-5 border-gray-300" ${isChecked ? 'checked' : ''}>
            </label>
        `;
    });
    container.innerHTML = html;

    const checkboxes = container.querySelectorAll('.qf-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', async (e) => {
            const checked = Array.from(checkboxes).filter(c => c.checked);
            if (checked.length > 3) {
                e.preventDefault();
                cb.checked = false;
                alert('Maximum 3 gyorsszűrőt választhatsz!');
                return;
            }

            const newFilters = checked.map(c => c.value);
            settings = await db.settings.get('main') || { id: 'main' };
            settings.quickFilters = newFilters;
            await db.settings.put(settings);

            // Re-render to update border classes
            renderQuickFilterSettings();

            // Trigger refresh in main view
            window.dispatchEvent(new Event('orgSettingsChanged'));
        });
    });
}
