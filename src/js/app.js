import '../style.css'
import { db } from './db.js';
import { applyTheme, getCurrentThemeId } from './utils/theme-manager.js';
import { syncService } from './services/sync-service.js';
import { initList } from './components/cat-list.js';
import { initModals } from './components/fab.js';
import { initDetail } from './components/cat-detail.js';
import './components/update-banner.js';
import { renderOrgDisplay } from './views/org-display.js';
import { initSettings, initSettingsActions } from './views/settings-view.js';
import { initExportModal } from './views/export-modal.js';
import { renderChangelog } from './views/help-view.js';
import { initDebugModal } from './views/debug-modal.js';
import { cloudSyncManager } from './cloud/sync-manager.js';
import { checkExpired, updateEventBadge, getBadgeCount } from './utils/event-check.js';
import { initEventList, renderEvents } from './components/event-list.js';
import { initEventForm } from './components/event-form.js';
import { showToast } from './utils/toast.js';
import { requestPermission, scheduleLocalCheck } from './utils/push.js';
import { updateFooterStats } from './utils/stats.js';

function setupRouting() {
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const helpView = document.getElementById('help-view');

    function navigateTo(route) {
        if (!mainView || !settingsView || !helpView) return;
        mainView.classList.add('hidden');
        settingsView.classList.add('hidden');
        helpView.classList.add('hidden');

        if (route === 'settings') {
            settingsView.classList.remove('hidden');
            if (window.location.hash !== '#settings') {
                window.location.hash = '#settings';
            }
        } else if (route === 'help') {
            helpView.classList.remove('hidden');
            if (window.location.hash !== '#help') {
                window.location.hash = '#help';
            }
        } else {
            mainView.classList.remove('hidden');
            if (window.location.hash !== '') {
                window.location.hash = '';
            }
        }
    }

    function handleRoute() {
        const hash = window.location.hash;
        if (hash === '#settings') {
            navigateTo('settings');
        } else if (hash === '#help') {
            navigateTo('help');
        } else {
            navigateTo('main');
        }
    }

    window.addEventListener('hashchange', handleRoute);
    handleRoute();

    // Bind buttons directly with active class toggling to support running inside IFrames flawlessly
    document.getElementById('btn-header-settings')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('settings');
    });
    document.getElementById('btn-header-help')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('help');
    });
    document.getElementById('btn-settings-help')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('help');
    });
    document.getElementById('btn-back-settings')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('main');
    });
    document.getElementById('btn-back-help')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('main');
    });
}

async function initApp() {
    // Apply selected theme
    applyTheme(getCurrentThemeId());

    // Register Service Worker
    try {
        if ('serviceWorker' in navigator) {
            const registerSW = () => {
                const swUrl = import.meta.env.BASE_URL + 'service-worker.js';
                navigator.serviceWorker.register(swUrl).then(registration => {
                    setInterval(() => {
                        registration.update();
                    }, 60 * 60 * 1000); // 1 hour
                }).catch(err => {
                    console.error('ServiceWorker registration failed: ', err);
                });
            };

            if (document.readyState === 'complete') {
                registerSW();
            } else {
                window.addEventListener('load', registerSW);
            }

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
        }
    } catch (e) {
        console.warn('ServiceWorker setup failed:', e);
    }

    // Initialize UI components
    try {
        initModals();
        initDetail();
        initExportModal();
        initEventList();
        initEventForm();
        initDebugModal();
    } catch (e) {
        console.error('UI component initialization failed:', e);
    }

    console.log('Dexie DB initialized, version:', db.verno);

    // Initial list render (Core feature - MUST RUN!)
    try {
        await initList();
    } catch (e) {
        console.error('Failed to initialize and render cat list:', e);
    }

    // Setup routing and secondary display
    try {
        setupRouting();
        await renderOrgDisplay();
    } catch (e) {
        console.error('Failed to setup routing or org display:', e);
    }

    // Update footer stats
    try {
        await updateFooterStats();
    } catch (e) {
        console.error('Failed to update stats:', e);
    }

    // Load settings and changelog
    try {
        await initSettings();
        initSettingsActions();
    } catch (e) {
        console.error('Failed to initialize settings:', e);
    }

    try {
        await renderChangelog();
    } catch (e) {
        console.error('Failed to render changelog:', e);
    }

    // Initialize cloud sync
    try {
        await cloudSyncManager.init();
        syncService.syncPending();
    } catch (e) {
        console.error('Failed to initialize cloud sync:', e);
    }

    // Listen for org settings changed
    document.addEventListener('orgSettingsChanged', async () => {
        try {
            renderOrgDisplay();
            await cloudSyncManager.init();
            syncService.updateSyncUI();
            syncService.syncPending();
        } catch (e) {
            console.error('Error handling org settings change:', e);
        }
    });

    // Check and update events
    try {
        await checkExpired();
        await updateEventBadge();
        await renderEvents();

        // Toast if there are pending/expired events
        const count = await getBadgeCount();
        if (count > 0) {
            showToast(`${count} lejárt/közeli esemény`, count > 5 ? 'error' : 'warning');
        }
    } catch (e) {
        console.error('Failed to check and update events:', e);
    }

    // Request notification permission and set up push checks
    try {
        if (window.Notification && Notification.permission !== 'denied') {
            requestPermission();
            setInterval(scheduleLocalCheck, 60 * 60 * 1000); // check hourly
        }
    } catch (e) {
        console.warn('Notification permission check blocked or failed:', e);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
