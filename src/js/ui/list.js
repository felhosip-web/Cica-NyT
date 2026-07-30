import { db } from '../db.js';
import { calculateAge, escapeHtml } from '../utils.js';
import { openDetailView } from './detail.js';

let allCats = [];

export async function initList() {
    await renderCatList();

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderCatList(e.target.value.toLowerCase());
        });
    }
}

export async function renderCatList(filter = '') {
    const container = document.getElementById('cat-list-container');
    const emptyState = document.getElementById('empty-state');

    allCats = await db.cats.orderBy('sorszam').reverse().toArray();

    let filteredCats = allCats;
    if (filter) {
        filteredCats = allCats.filter(cat =>
            cat.nev.toLowerCase().includes(filter) ||
            String(cat.sorszam).includes(filter)
        );
    }

    // Clear list but keep empty state element if we need it
    container.innerHTML = '';

    if (filteredCats.length === 0) {
        container.appendChild(emptyState);
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    filteredCats.forEach(cat => {
        const card = document.createElement('div');
        const sorszamStr = String(cat.sorszam).padStart(2, '0');
        const ageCalc = calculateAge(cat.szuletes).split('(')[0].trim();

        card.className = "bg-white p-4 rounded-xl shadow-sm border border-transparent cursor-pointer transition-all active:scale-95 flex items-center gap-3";
        card.dataset.id = cat.id;

        card.innerHTML = `
            <div class="flex-1 min-w-0">
                <p class="text-gray-900 font-medium truncate">
                    <span class="text-gray-500 font-mono text-sm mr-1">${sorszamStr}.</span>
                    ${escapeHtml(cat.nev)} - ${escapeHtml(cat.ivar)} - ${ageCalc} - ${escapeHtml(cat.szin)}
                </p>
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
