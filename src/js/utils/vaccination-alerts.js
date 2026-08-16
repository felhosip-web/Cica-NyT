import { db } from '../db.js';
import { escapeHtml } from './escape.js';
import { showToast } from './toast.js';
import { openEventModal } from '../components/event-form.js';
import { openDetailView } from '../components/cat-detail.js';
import { updateEventBadge } from './event-check.js';

/**
 * Returns all vaccination events and alerts categorized by urgency.
 * @param {Object} options
 * @param {number} options.thresholdDays Days to consider as 'approaching' (default 7)
 */
export async function getVaccinationAlerts(options = {}) {
    const thresholdDays = options.thresholdDays || 7;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thresholdDate = new Date(today);
    thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);
    thresholdDate.setHours(23, 59, 59, 999);

    const upcomingLimitDate = new Date(today);
    upcomingLimitDate.setDate(upcomingLimitDate.getDate() + 30);
    upcomingLimitDate.setHours(23, 59, 59, 999);

    // Fetch all pending or expired events
    const allEvents = await db.events.toArray();
    
    // Filter for vaccination events
    const vaxEvents = allEvents.filter(e => {
        if (e.status === 'done') return false;
        
        const typeMatch = e.type === 'oltas';
        const titleLower = (e.title || '').toLowerCase();
        const isVaxTitle = titleLower.includes('oltás') || 
                           titleLower.includes('oltas') || 
                           titleLower.includes('vakcina') || 
                           titleLower.includes('vaccine') ||
                           titleLower.includes('kombinált') ||
                           titleLower.includes('veszettség');
        
        return typeMatch || isVaxTitle;
    });

    const catCache = {};
    const items = [];

    let expiredCount = 0;
    let dueTodayCount = 0;
    let approachingCount = 0;
    let upcomingCount = 0;

    for (const e of vaxEvents) {
        let cat = null;
        if (e.catId === 'general') {
            cat = { id: 'general', nev: 'Általános esemény', sorszam: 0, chipNumber: null };
        } else {
            if (!catCache[e.catId]) {
                catCache[e.catId] = await db.cats.get(e.catId);
            }
            cat = catCache[e.catId] || { id: e.catId, nev: 'Ismeretlen cica', sorszam: 0, chipNumber: null };
        }

        // Don't alert for deceased cats
        if (cat.status === 'elhunyt') continue;

        const eventDate = new Date(e.date);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        let urgencyGroup = 'upcoming'; // 'expired' | 'dueToday' | 'approaching' | 'upcoming'
        let statusText = '';
        let badgeColorClass = '';

        if (diffDays < 0 || e.status === 'expired') {
            urgencyGroup = 'expired';
            const daysAgo = Math.abs(diffDays);
            statusText = daysAgo === 0 ? 'Ma lejárt' : `⚠️ Lejárt ${daysAgo} napja`;
            badgeColorClass = 'bg-red-100 text-red-800 border-red-300';
            expiredCount++;
        } else if (diffDays === 0) {
            urgencyGroup = 'dueToday';
            statusText = '🔔 Ma esedékes!';
            badgeColorClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
            dueTodayCount++;
        } else if (diffDays <= thresholdDays) {
            urgencyGroup = 'approaching';
            statusText = `⏳ Esedékes ${diffDays} nap múlva`;
            badgeColorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
            approachingCount++;
        } else if (diffDays <= 30) {
            urgencyGroup = 'upcoming';
            statusText = `📅 Esedékes ${diffDays} nap múlva`;
            badgeColorClass = 'bg-blue-50 text-blue-700 border-blue-200';
            upcomingCount++;
        } else {
            // Further in future than 30 days
            continue;
        }

        items.push({
            event: e,
            cat,
            diffDays,
            urgencyGroup,
            statusText,
            badgeColorClass
        });
    }

    // Sort items by urgency & date
    const urgencyOrder = { 'expired': 1, 'dueToday': 2, 'approaching': 3, 'upcoming': 4 };
    items.sort((a, b) => {
        if (urgencyOrder[a.urgencyGroup] !== urgencyOrder[b.urgencyGroup]) {
            return urgencyOrder[a.urgencyGroup] - urgencyOrder[b.urgencyGroup];
        }
        return a.diffDays - b.diffDays;
    });

    return {
        expiredCount,
        dueTodayCount,
        approachingCount,
        upcomingCount,
        totalAlertsCount: expiredCount + dueTodayCount + approachingCount,
        items
    };
}

/**
 * Triggers Web Push Notifications for due & approaching vaccinations.
 */
export async function checkAndSendVaccinationPushNotifications(options = {}) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const alertData = await getVaccinationAlerts(options);
    const todayStr = new Date().toISOString().split('T')[0];

    const notifiedKey = `cica_vax_notified_${todayStr}`;
    const notifiedMap = JSON.parse(localStorage.getItem(notifiedKey) || '{}');

    for (const item of alertData.items) {
        // Send notifications for expired, due today, or approaching (<= 3 days)
        if (item.urgencyGroup === 'upcoming' && item.diffDays > 3) continue;

        const eventId = item.event.id;
        if (!notifiedMap[eventId]) {
            const catName = item.cat ? item.cat.nev : 'Cica';
            const vaxTitle = item.event.title || 'Oltás esedékes';

            let bodyMsg = `${catName} - ${vaxTitle} (${item.statusText})`;
            if (item.event.date) {
                bodyMsg += ` - Dátum: ${item.event.date}`;
            }

            try {
                new Notification(`💉 Cica-NyT Oltási értesítés`, {
                    body: bodyMsg,
                    icon: '/Cica-NyT/icons/icon-192.png',
                    tag: `vax-alert-${eventId}`,
                    renotify: true
                });
                notifiedMap[eventId] = true;
            } catch (err) {
                console.warn('Notification error:', err);
            }
        }
    }

    localStorage.setItem(notifiedKey, JSON.stringify(notifiedMap));
}

/**
 * Sends a test push notification to verify browser permissions.
 */
export async function sendTestNotification() {
    if (!('Notification' in window)) {
        alert('A böngésződ nem támogatja a push értesítéseket.');
        return false;
    }

    if (Notification.permission === 'denied') {
        alert('Az értesítések le vannak tiltva a böngésző beállításaiban. Kérjük engedélyezd őket a böngésződ címsoránál.');
        return false;
    }

    if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
            alert('Az értesítési engedély megtagadva.');
            return false;
        }
    }

    try {
        new Notification('🐱 Cica-NyT Teszt Értesítés', {
            body: 'A push értesítések megfelelően működnek! Figyelmeztetést kapsz majd a közelgő oltásokról.',
            icon: '/Cica-NyT/icons/icon-192.png'
        });
        showToast('Teszt értesítés elküldve! 🔔', 'success');
        return true;
    } catch (e) {
        console.error('Test notification failed:', e);
        showToast('Értesítés küldése nem sikerült', 'error');
        return false;
    }
}

/**
 * Updates the top Vaccination Alert Banner in the main view.
 */
export async function updateVaccinationBanner() {
    const bannerContainer = document.getElementById('vaccination-alert-banner');
    if (!bannerContainer) return;

    const alertData = await getVaccinationAlerts();

    if (alertData.totalAlertsCount === 0) {
        bannerContainer.classList.add('hidden');
        return;
    }

    bannerContainer.classList.remove('hidden');

    const alertCountEl = document.getElementById('vax-banner-count');
    const alertTextEl = document.getElementById('vax-banner-text');

    if (alertCountEl) alertCountEl.textContent = alertData.totalAlertsCount;
    if (alertTextEl) {
        let msg = '';
        if (alertData.expiredCount > 0 && alertData.dueTodayCount > 0) {
            msg = `${alertData.expiredCount} lejárt és ${alertData.dueTodayCount} ma esedékes oltás!`;
        } else if (alertData.expiredCount > 0) {
            msg = `${alertData.expiredCount} cica oltása lejárt!`;
        } else if (alertData.dueTodayCount > 0) {
            msg = `${alertData.dueTodayCount} cica oltása esedékes ma!`;
        } else {
            msg = `${alertData.approachingCount} cica oltása esedékes a napokban!`;
        }
        alertTextEl.textContent = msg;
    }
}

/**
 * Opens the Daily Vaccination Summary modal.
 */
export async function openVaccinationSummaryModal() {
    let modal = document.getElementById('modal-vaccination-summary');
    
    // Create modal if it doesn't exist yet in DOM
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-vaccination-summary';
        modal.className = 'hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 md:p-4';
        document.body.appendChild(modal);
    }

    modal.classList.remove('hidden');
    await renderVaccinationSummaryContent(modal);
}

/**
 * Renders the full interactive UI for the Daily Summary Modal.
 */
async function renderVaccinationSummaryContent(modal) {
    const alertData = await getVaccinationAlerts();
    let settings = await db.settings.get('main') || { id: 'main' };
    const autoOpen = settings.autoOpenVaxSummary !== false; // Default true

    const notifPermission = ('Notification' in window) ? Notification.permission : 'unsupported';

    let notifBadge = '';
    if (notifPermission === 'granted') {
        notifBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">🔔 Értesítések engedélyezve</span>';
    } else if (notifPermission === 'denied') {
        notifBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-300">🔕 Értesítések letiltva</span>';
    } else {
        notifBadge = '<span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">🔔 Engedélyezés szükséges</span>';
    }

    let itemsHtml = '';

    if (alertData.items.length === 0) {
        itemsHtml = `
            <div class="text-center py-10 px-4 bg-green-50/50 rounded-2xl border border-green-200">
                <div class="text-4xl mb-3">🎉</div>
                <h4 class="font-bold text-green-800 text-lg">Minden oltás naprakész!</h4>
                <p class="text-sm text-green-600 mt-1">Nincs lejárt vagy 30 napon belül esedékes oltási esemény a nyilvántartásban.</p>
            </div>
        `;
    } else {
        itemsHtml = alertData.items.map(item => {
            const e = item.event;
            const cat = item.cat;
            const catName = escapeHtml(cat ? cat.nev : 'Ismeretlen');
            const catNumStr = cat && cat.sorszam ? `#${String(cat.sorszam).padStart(2, '0')}` : '';
            const chipBadge = cat && cat.chipNumber ? ' 🔖' : '';
            const vaxTitle = escapeHtml(e.title || 'Kombinált oltás');

            return `
                <div class="bg-white border rounded-xl p-3.5 shadow-xs hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div class="flex items-start gap-3 flex-1 min-w-0">
                        <div class="text-3xl p-2 bg-pink-50 rounded-xl border border-pink-100 shrink-0">💉</div>
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-bold text-gray-900 text-base hover:text-brand-pink cursor-pointer" onclick="window.vaxSummaryOpenCat('${cat ? cat.id : ''}')">${catName}</span>
                                <span class="text-xs text-gray-500 font-mono">${catNumStr}${chipBadge}</span>
                                <span class="px-2 py-0.5 text-xs font-bold rounded-full border ${item.badgeColorClass}">${item.statusText}</span>
                            </div>
                            <div class="text-sm font-semibold text-gray-800 mt-0.5">${vaxTitle}</div>
                            <div class="text-xs text-gray-500 flex flex-wrap gap-2 mt-1">
                                <span>📅 Tervezett dátum: <strong>${e.date}</strong></span>
                                ${e.vetName ? `<span>👨‍⚕️ Orvos: ${escapeHtml(e.vetName)}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <button type="button" class="flex-1 sm:flex-initial px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-medium text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1"
                            onclick="window.vaxSummaryMarkDone(${e.id})">
                            ✅ Megkapta
                        </button>
                        <button type="button" class="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                            onclick="window.vaxSummaryEditEvent(${e.id})" title="Átütemezés">
                            📅
                        </button>
                        <button type="button" class="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-brand-pink font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1"
                            onclick="window.vaxSummaryOpenCat('${cat ? cat.id : ''}')" title="Adatlap">
                            🐱
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in duration-200">
            <!-- Header -->
            <div class="bg-gradient-to-r from-pink-500 to-orange-500 p-4 text-white flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2.5">
                    <div class="w-10 h-10 bg-white/20 backdrop-blur-xs rounded-xl flex items-center justify-center text-xl">💉</div>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">Napi Oltási Összefoglaló</h3>
                        <p class="text-xs text-white/90">Lejárt és közelgő védőoltások áttekintése</p>
                    </div>
                </div>
                <button type="button" id="btn-close-vax-summary" class="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Summary Stats Bar -->
            <div class="bg-gray-50 border-b border-gray-200 p-3 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
                <div class="flex items-center gap-2">
                    <span class="px-2.5 py-1 bg-red-100 text-red-800 rounded-full font-bold">🔴 Lejárt: ${alertData.expiredCount}</span>
                    <span class="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold">🔔 Ma esedékes: ${alertData.dueTodayCount}</span>
                    <span class="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full font-bold">⏳ Közelgő: ${alertData.approachingCount}</span>
                </div>
                <div>${notifBadge}</div>
            </div>

            <!-- Items Scrollable Body -->
            <div class="p-4 overflow-y-auto space-y-3 flex-1 bg-gray-50/50">
                ${itemsHtml}
            </div>

            <!-- Footer Controls -->
            <div class="p-3.5 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-xs">
                <label class="flex items-center gap-2 cursor-pointer text-gray-700">
                    <input type="checkbox" id="cb-auto-open-vax-summary" class="rounded text-brand-pink focus:ring-brand-pink h-4 w-4 border-gray-300" ${autoOpen ? 'checked' : ''}>
                    <span>Automatikus megjelenítés alkalmazás indításakor</span>
                </label>

                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <button type="button" id="btn-test-push-notif" class="flex-1 sm:flex-initial py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5">
                        🔔 Push teszt
                    </button>
                    <button type="button" id="btn-close-vax-summary-footer" class="flex-1 sm:flex-initial py-2 px-4 bg-brand-pink hover:bg-pink-600 text-white rounded-lg font-bold transition-colors">
                        Rendben
                    </button>
                </div>
            </div>
        </div>
    `;

    // Attach listeners
    const closeBtn = modal.querySelector('#btn-close-vax-summary');
    const closeBtnFooter = modal.querySelector('#btn-close-vax-summary-footer');
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    if (closeBtnFooter) closeBtnFooter.addEventListener('click', () => modal.classList.add('hidden'));

    const autoOpenCb = modal.querySelector('#cb-auto-open-vax-summary');
    if (autoOpenCb) {
        autoOpenCb.addEventListener('change', async (e) => {
            let s = await db.settings.get('main') || { id: 'main' };
            s.autoOpenVaxSummary = e.target.checked;
            await db.settings.put(s);
            showToast('Beállítás frissítve', 'info');
        });
    }

    const testPushBtn = modal.querySelector('#btn-test-push-notif');
    if (testPushBtn) {
        testPushBtn.addEventListener('click', async () => {
            await sendTestNotification();
            await renderVaccinationSummaryContent(modal);
        });
    }
}

// Global window helpers for inline onclick handlers in modal items
window.vaxSummaryMarkDone = async function(eventId) {
    const e = await db.events.get(eventId);
    if (!e) return;

    await db.events.update(eventId, { status: 'done' });

    // Also add to cat's oltasok array if cat exists
    if (e.catId && e.catId !== 'general') {
        const cat = await db.cats.get(e.catId);
        if (cat) {
            cat.oltasok = cat.oltasok || [];
            cat.oltasok.push({
                nev: e.title || 'Védőoltás',
                datum: new Date().toISOString().split('T')[0],
                koltseg: 0
            });
            await db.cats.put(cat);
        }
    }

    // Handle repeat if present
    if (e.repeat && e.repeat !== 'nincs') {
        const currentDate = new Date(e.date);
        if (e.repeat === '3ho') currentDate.setMonth(currentDate.getMonth() + 3);
        if (e.repeat === '6ho') currentDate.setMonth(currentDate.getMonth() + 6);
        if (e.repeat === '12ho') currentDate.setFullYear(currentDate.getFullYear() + 1);

        const nextDateStr = currentDate.toISOString().split('T')[0];

        await db.events.add({
            catId: e.catId,
            type: e.type,
            title: e.title,
            date: nextDateStr,
            repeat: e.repeat,
            vetName: e.vetName,
            notes: e.notes,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    }

    showToast('Oltási esemény teljesítve! ✅', 'success');

    await updateEventBadge();
    await updateVaccinationBanner();

    if (typeof window.renderEvents === 'function') {
        window.renderEvents();
    }
    document.dispatchEvent(new CustomEvent('eventsChanged'));

    // Re-render modal content
    const modal = document.getElementById('modal-vaccination-summary');
    if (modal && !modal.classList.contains('hidden')) {
        await renderVaccinationSummaryContent(modal);
    }
};

window.vaxSummaryEditEvent = function(eventId) {
    const modal = document.getElementById('modal-vaccination-summary');
    if (modal) modal.classList.add('hidden');
    openEventModal(eventId);
};

window.vaxSummaryOpenCat = function(catId) {
    if (!catId || catId === 'general') return;
    const modal = document.getElementById('modal-vaccination-summary');
    if (modal) modal.classList.add('hidden');
    openDetailView(catId);
};

/**
 * Main initialization call for the Vaccination Alerts system.
 */
export async function initVaccinationAlertsSystem() {
    // 1. Check & send push notifications
    try {
        await checkAndSendVaccinationPushNotifications();
    } catch (err) {
        console.warn('Vaccination push check failed:', err);
    }

    // 2. Update banner
    try {
        await updateVaccinationBanner();
    } catch (err) {
        console.warn('Vaccination banner update failed:', err);
    }

    // 3. Auto open summary modal if configured and has due/expired items
    try {
        const settings = await db.settings.get('main');
        const autoOpen = settings?.autoOpenVaxSummary !== false; // Default true
        const shownThisSession = sessionStorage.getItem('vaxSummaryShownThisSession');

        if (autoOpen && !shownThisSession) {
            const alerts = await getVaccinationAlerts();
            if (alerts.expiredCount > 0 || alerts.dueTodayCount > 0 || alerts.approachingCount > 0) {
                sessionStorage.setItem('vaxSummaryShownThisSession', 'true');
                setTimeout(() => {
                    openVaccinationSummaryModal();
                }, 800);
            }
        }
    } catch (err) {
        console.warn('Auto open vaccination summary failed:', err);
    }

    // Listen to event changes to refresh banner
    document.addEventListener('eventsChanged', async () => {
        await updateVaccinationBanner();
    });
}
