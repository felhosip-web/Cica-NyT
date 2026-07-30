import './style.css'
import { db } from './js/db.js';
import { syncService } from './js/services/sync-service.js';
import { initList } from './js/ui/list.js';
import { initModals } from './js/ui/modal.js';
import { initDetail } from './js/ui/detail.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI components
    initModals();
    initDetail();

    // Initial sync and list render
    await initList();
    syncService.syncPending();
});
import './js/pwa/update-banner.js';
