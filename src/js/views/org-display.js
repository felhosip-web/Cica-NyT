import { db } from '../db.js';

export async function renderOrgDisplay() {
    const orgNameEl = document.getElementById('org-name');
    const orgRoleBadgeEl = document.getElementById('org-role-badge');

    if (!orgNameEl || !orgRoleBadgeEl) return;

    try {
        const settings = await db.settings.get('org');
        if (settings && settings.orgName) {
            orgNameEl.textContent = settings.orgName;

            const role = settings.orgRole;
            let roleText = 'magánszemély';
            let roleClass = 'bg-gray-100 text-gray-800'; // Default

            if (role === 'ideiglenes_nevelo') {
                roleText = 'ideiglenes nevelő';
                roleClass = 'bg-orange-100 text-orange-800';
            } else if (role === 'tulajdonos') {
                roleText = 'tulajdonos';
                roleClass = 'bg-green-100 text-green-800';
            } else if (role === 'allatmenhely') {
                roleText = 'állatmenhely';
                roleClass = 'bg-blue-100 text-blue-800';
            } else {
                 roleText = 'magánszemély';
                 roleClass = 'bg-gray-100 text-gray-800';
            }

            orgRoleBadgeEl.textContent = roleText;
            orgRoleBadgeEl.className = `px-2 py-0.5 rounded-full text-xs ${roleClass}`;
        } else {
            orgNameEl.textContent = "Saját nyilvántartás";
            orgRoleBadgeEl.textContent = "nincs beállítva";
            orgRoleBadgeEl.className = 'px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800';
        }
    } catch (e) {
        console.error('Error rendering org display', e);
    }
}
