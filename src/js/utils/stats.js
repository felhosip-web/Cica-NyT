import { db } from '../db.js';

export async function updateFooterStats() {
    try {
        const catCount = await db.cats.count();
        const eventCount = await db.events.where('status').equals('pending').count();
        const statsEl = document.getElementById('app-stats');
        if (statsEl) {
            statsEl.textContent = `${catCount} cica • ${eventCount} függő`;
        }
    } catch (e) {
        console.error('Failed to update stats', e);
    }
}
