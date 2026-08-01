import { db } from '../db.js';
import { checkExpired, updateEventBadge } from './event-check.js';

export function requestPermission() {
    if (!('Notification' in window)) {
        console.warn('A böngésző nem támogatja a push értesítéseket.');
        return;
    }

    if (Notification.permission !== 'denied' && Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

export async function scheduleLocalCheck() {
    await checkExpired();
    await updateEventBadge();

    if (!('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Keressünk lejárt, vagy holnap esedékes pending eseményeket
    const events = await db.events.toArray();

    const notifiedEvents = JSON.parse(sessionStorage.getItem('notifiedEvents') || '{}');

    for (let e of events) {
        if (e.status === 'done') continue;

        let shouldNotify = false;
        const eDate = new Date(e.date);

        if (e.status === 'expired') {
            shouldNotify = true;
        } else if (e.status === 'pending' && eDate <= tomorrow) {
            shouldNotify = true;
        }

        // Csak akkor küldünk értesítést, ha a jelenlegi sessionben még nem küldtünk róla
        if (shouldNotify && !notifiedEvents[e.id]) {
            const cat = await db.cats.get(e.catId);
            const catName = cat ? cat.nev : 'Ismeretlen cica';
            const title = e.title || 'Névtelen esemény';
            const dateStr = e.date || '';

            new Notification(`🐱 Cica: ${title}`, {
                body: `${catName} - ${dateStr}`,
                icon: '/Cica-NyT/icons/icon-192.png' // A projekt icon path alapján
            });

            notifiedEvents[e.id] = true;
        }
    }

    sessionStorage.setItem('notifiedEvents', JSON.stringify(notifiedEvents));
}
