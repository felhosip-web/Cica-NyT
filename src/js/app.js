import '../style.css'
import { db } from './db.js';
import { syncService } from './services/sync-service.js';
import { initList } from './components/cat-list.js';
import { initModals } from './components/fab.js';
import { initDetail } from './components/cat-detail.js';
import './components/update-banner.js';

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

    // Initial sync and list render
    await initList();
    syncService.syncPending();
});
