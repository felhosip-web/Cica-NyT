import { db } from '../db.js';
import { ORG_ROLES } from './settings-view.js';

function getRoleBadge(role) {
    let roleText = 'magánszemély';
    let roleClass = 'bg-gray-100 text-gray-800';

    if (role === 'allatmenhely' || (role && role.includes('/'))) {
        role = 'menhely';
    }

    const orgRoleDef = ORG_ROLES.find(r => r.value === role);
    if (orgRoleDef) {
        roleText = orgRoleDef.label.toLowerCase();
    }

    if (role === 'ideiglenes_nevelo') {
        roleClass = 'bg-orange-100 text-orange-800';
    } else if (role === 'tulajdonos') {
        roleClass = 'bg-green-100 text-green-800';
    } else if (role === 'menhely') {
        roleClass = 'bg-green-100 text-green-800';
    } else if (role === 'alapitvany') {
        roleClass = 'bg-purple-100 text-purple-800';
    } else {
        roleClass = 'bg-gray-100 text-gray-800';
    }

    return { text: roleText, class: roleClass };
}

export async function renderOrgDisplay() {
    const orgNameEl = document.getElementById('org-name');
    const orgRoleBadgeEl = document.getElementById('org-role-badge');

    if (!orgNameEl || !orgRoleBadgeEl) return;

    try {
        let settings = await db.settings.get('main');
        if (!settings) {
            settings = await db.settings.get('org');
        }

        if (settings && settings.orgName) {
            orgNameEl.textContent = settings.orgName;

            const badge = getRoleBadge(settings.orgRole);

            orgRoleBadgeEl.textContent = badge.text;
            orgRoleBadgeEl.className = `px-2 py-0.5 rounded-full text-xs ${badge.class}`;
        } else {
            orgNameEl.textContent = "Saját nyilvántartás";
            orgRoleBadgeEl.textContent = "nincs beállítva";
            orgRoleBadgeEl.className = 'px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800';
        }
    } catch (e) {
        console.error('Error rendering org display', e);
    }
}
