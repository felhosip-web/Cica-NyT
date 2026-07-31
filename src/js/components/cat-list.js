import { db } from '../db.js';
import { calculateAge } from '../utils/age.js';
import { escapeHtml } from '../utils/escape.js';
import { openDetailView } from './cat-detail.js';

let allCats = [];

let currentChipFilter = 'mind'; // mind, befogott, behozott, gazdis

export async function initList() {
    await renderCatList();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCatList();
        });
    }

    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            // Update active state
            filterChips.forEach(c => {
                c.classList.remove('bg-gray-800', 'text-white');
                c.classList.add('bg-gray-200', 'text-gray-700');
            });
            const clicked = e.target;
            clicked.classList.remove('bg-gray-200', 'text-gray-700');
            clicked.classList.add('bg-gray-800', 'text-white');

            currentChipFilter = clicked.dataset.filter;
            renderCatList();
        });
    });
}

export async function renderCatList() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

    const container = document.getElementById('cat-list-container');

    allCats = await db.cats.orderBy('sorszam').reverse().toArray();
    console.log(`Rendering ${allCats.length} cats`);

    let filteredCats = allCats;

    // 1. Chip Filter
    if (currentChipFilter === 'befogott') {
        filteredCats = filteredCats.filter(cat => cat.intakeType === 'befogott');
    } else if (currentChipFilter === 'behozott') {
        filteredCats = filteredCats.filter(cat => cat.intakeType === 'behozott');
    } else if (currentChipFilter === 'gazdis') {
        filteredCats = filteredCats.filter(cat => cat.status === 'gazdis');
    }

    // 2. Search Filter
    if (searchTerm) {
        filteredCats = filteredCats.filter(cat =>
            cat.nev.toLowerCase().includes(searchTerm) ||
            String(cat.sorszam).includes(searchTerm) ||
            (cat.gazdisPerson && cat.gazdisPerson.toLowerCase().includes(searchTerm)) ||
            (cat.befogottHol && cat.befogottHol.toLowerCase().includes(searchTerm)) ||
            (cat.befogottKi && cat.befogottKi.toLowerCase().includes(searchTerm)) ||
            (cat.behozottKi && cat.behozottKi.toLowerCase().includes(searchTerm)) ||
            (cat.behozottAtvevoKi && cat.behozottAtvevoKi.toLowerCase().includes(searchTerm))
        );
    }

    container.innerHTML = '';

    if (filteredCats.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 py-10" id="empty-state">
            Nincsenek cicák.
        </div>`;
        return;
    }

    filteredCats.forEach(cat => {
        const card = document.createElement('div');
        const sorszamStr = String(cat.sorszam).padStart(2, '0');
        const ageCalc = calculateAge(cat.szuletes).split('(')[0].trim();

        const isGazdis = cat.status === 'gazdis';
        const borderClass = isGazdis ? 'border-green-400' : 'border-transparent';
        const bgClass = isGazdis ? 'bg-green-50' : 'bg-white';

        card.className = `${bgClass} rounded-xl shadow p-4 mb-2 cursor-pointer transition-all active:scale-95 flex items-center gap-3 border ${borderClass}`;
        card.dataset.id = cat.id;

        let gazdisBadge = '';
        if (isGazdis) {
            gazdisBadge = `
                <div class="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                    GAZDIS - ${escapeHtml(cat.gazdisPerson || '')}
                </div>
            `;
        }

        // Always make card relative for absolute positioning of badges
        card.classList.add('relative');

        let intakeIndicator = '';
        if (cat.intakeType === 'befogott') {
            intakeIndicator = `
                <div class="text-xs text-blue-600 font-medium mt-1 truncate">
                    🐾 Befogott - ${escapeHtml(cat.befogottHol || '')}
                </div>
            `;
        } else if (cat.intakeType === 'behozott') {
            intakeIndicator = `
                <div class="text-xs text-orange-600 font-medium mt-1 truncate">
                    📦 Behozott - ${escapeHtml(cat.behozottKi || '')}
                </div>
            `;
        }

        card.innerHTML = `
            ${gazdisBadge}
            <div class="flex-1 min-w-0 mt-1">
                <p class="text-gray-900 font-medium truncate flex items-center gap-2">
                    <span class="bg-pink-500 text-white rounded px-2 py-1 font-mono text-sm">${sorszamStr}</span>
                    ${escapeHtml(cat.nev)} - ${escapeHtml(cat.ivar)} - ${ageCalc} - ${escapeHtml(cat.szin)}
                </p>
                ${intakeIndicator}
            </div>
            <div class="checkbox-wrapper w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4 text-white opacity-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
        `;

        // Interaction logic
        let touchTimer = null;

        const selectCard = (e) => {
            e.preventDefault();
            const isSelected = card.classList.contains('border-blue-500');

            if (isSelected) {
                card.classList.remove('border-blue-500', 'bg-blue-50');
                card.querySelector('.checkbox-wrapper').classList.remove('bg-blue-500', 'border-blue-500');
                card.querySelector('svg').classList.add('opacity-0');
            } else {
                card.classList.add('border-blue-500', 'bg-blue-50');
                card.querySelector('.checkbox-wrapper').classList.add('bg-blue-500', 'border-blue-500');
                card.querySelector('svg').classList.remove('opacity-0');
            }
        };

        const openDetail = (e) => {
             e.preventDefault();
             openDetailView(cat.id);
        };

        // Desktop Double Click
        card.addEventListener('dblclick', openDetail);

        // Desktop Single Click / Mobile Tap
        card.addEventListener('click', (e) => {
            // If it's a mobile touch event, it's handled below to differentiate from long press
            if (e.pointerType === 'touch') return;
            selectCard(e);
        });

        // Mobile touch events for tap (open) vs long press (select)
        card.addEventListener('touchstart', (e) => {
             touchTimer = setTimeout(() => {
                 selectCard(e);
                 touchTimer = null;
             }, 500); // 500ms for long press
        }, {passive: true});

        card.addEventListener('touchend', (e) => {
             if (touchTimer) {
                 clearTimeout(touchTimer);
                 touchTimer = null;
                 // It was a short tap
                 openDetail(e);
             }
        });

        card.addEventListener('touchmove', () => {
             if (touchTimer) {
                 clearTimeout(touchTimer);
                 touchTimer = null;
             }
        });

        container.appendChild(card);
    });
}
