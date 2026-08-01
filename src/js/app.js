import '../style.css'
import { db } from './db.js';
import { syncService } from './services/sync-service.js';
import { initList } from './components/cat-list.js';
import { initModals } from './components/fab.js';
import { initDetail } from './components/cat-detail.js';
import './components/update-banner.js';
import { renderOrgDisplay } from './views/org-display.js';
import { initSettings, initSettingsActions } from './views/settings-view.js';
import { initExportModal } from './views/export-modal.js';
import { renderChangelog } from './views/help-view.js';
import { cloudSyncManager } from './cloud/sync-manager.js';
import { checkExpired, updateEventBadge } from './utils/event-check.js';
import { initEventList, renderEvents } from './components/event-list.js';
import { initEventForm } from './components/event-form.js';

function setupRouting() {
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const helpView = document.getElementById('help-view');

    function handleRoute() {
        const hash = window.location.hash;
        mainView.classList.add('hidden');
        settingsView.classList.add('hidden');
        helpView.classList.add('hidden');

        if (hash === '#settings') {
            settingsView.classList.remove('hidden');
        } else if (hash === '#help') {
            helpView.classList.remove('hidden');
        } else {
            mainView.classList.remove('hidden');
        }
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // Bind buttons
    document.getElementById('btn-header-settings')?.addEventListener('click', () => window.location.hash = '#settings');
    document.getElementById('btn-header-help')?.addEventListener('click', () => window.location.hash = '#help');
    document.getElementById('btn-settings-help')?.addEventListener('click', () => window.location.hash = '#help');
    document.getElementById('btn-back-settings')?.addEventListener('click', () => window.location.hash = '');
    document.getElementById('btn-back-help')?.addEventListener('click', () => window.location.hash = '');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swUrl = import.meta.env.BASE_URL + 'service-worker.js';
            navigator.serviceWorker.register(swUrl).catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });
        });
    }

    // Initialize UI components
    initModals();
    initDetail();
    initExportModal();
    initEventList();
    initEventForm();

    console.log('Dexie DB initialized', db.version(1).stores);

    // Fetch and display version
    try {
        const response = await fetch(import.meta.env.BASE_URL + 'version.json');
        if (response.ok) {
            const data = await response.json();
            const footer = document.getElementById('app-footer');
            if (footer) {
                footer.textContent = `v${data.version} - Build: ${data.build}`;
            }
        }
    } catch (e) {
        console.error('Failed to load version.json', e);
    }

    setupRouting();
    await renderOrgDisplay();
    await initSettings();
    initSettingsActions();
    await renderChangelog();
    await cloudSyncManager.init();

    // Listen for org settings changed
    document.addEventListener('orgSettingsChanged', () => {
        renderOrgDisplay();
    });

    // Check and update events
    await checkExpired();
    await updateEventBadge();
    await renderEvents();

    // Initial sync and list render
    await initList();
    syncService.syncPending();
});
