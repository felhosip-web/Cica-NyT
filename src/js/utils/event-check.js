import { db } from '../db.js';

export async function checkExpired() {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Consider strictly before today as expired, or before now. Let's use now for time-exactness, or today. Task says now.

    await db.events.where('status')
        .equals('pending')
        .filter(e => new Date(e.date) < now)
        .modify({ status: 'expired' });
}

export async function updateEventBadge() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    sevenDaysFromNow.setHours(23, 59, 59, 999);

    const pendingCount = await db.events
        .where({ status: 'pending' })
        .filter(e => new Date(e.date) <= sevenDaysFromNow)
        .count();

    const expiredCount = await db.events
        .where({ status: 'expired' })
        .count();

    const totalBadgeCount = pendingCount + expiredCount;

    const badgeEl = document.getElementById('events-badge');
    if (badgeEl) {
        badgeEl.textContent = totalBadgeCount;
        if (totalBadgeCount > 0) {
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    }
}
