import { db } from '../db.js';
import { calculateTotalCost, formatCurrency } from '../utils/cost.js';

export async function renderStats() {
    const statsContainer = document.getElementById('stats-content');
    if (!statsContainer) return;

    statsContainer.innerHTML = '<div class="text-center text-gray-500 py-4">Kiszámítás folyamatban... <span class="animate-spin inline-block ml-2">⏳</span></div>';

    try {
        const cats = await db.cats.toArray();
        let totalCost = 0;
        let oltasokCost = 0;
        let tesztekCost = 0;
        let kezelesekCost = 0;
        let kiadasokCost = 0;

        cats.forEach(cat => {
            totalCost += calculateTotalCost(cat);

            if (cat.oltasok) {
                cat.oltasok.forEach(item => {
                    oltasokCost += Number(item.koltseg) || 0;
                });
            }
            if (cat.tesztek) {
                cat.tesztek.forEach(item => {
                    tesztekCost += Number(item.koltseg) || 0;
                });
            }
            if (cat.kezelesek) {
                cat.kezelesek.forEach(item => {
                    kezelesekCost += Number(item.koltseg) || 0;
                });
            }
            if (cat.kiadasok) {
                cat.kiadasok.forEach(item => {
                    kiadasokCost += Number(item.koltseg) || 0;
                });
            }
        });

        const template = `
            <div class="space-y-4">
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <p class="text-sm text-gray-500 font-medium">Összesen Költség</p>
                    <p class="text-3xl font-black text-gray-900">${formatCurrency(totalCost)}</p>
                </div>

                <h4 class="font-bold text-gray-800 border-b pb-2">Részletezés kategóriánként</h4>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="bg-pink-50 p-3 rounded-xl border border-pink-100 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">💉</span>
                            <span class="font-medium text-pink-900">Oltások</span>
                        </div>
                        <span class="font-bold text-pink-700">${formatCurrency(oltasokCost)}</span>
                    </div>

                    <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🧪</span>
                            <span class="font-medium text-blue-900">Tesztek</span>
                        </div>
                        <span class="font-bold text-blue-700">${formatCurrency(tesztekCost)}</span>
                    </div>

                    <div class="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🩺</span>
                            <span class="font-medium text-yellow-900">Kezelések</span>
                        </div>
                        <span class="font-bold text-yellow-700">${formatCurrency(kezelesekCost)}</span>
                    </div>

                    <div class="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">💰</span>
                            <span class="font-medium text-green-900">Egyedi Kiadások</span>
                        </div>
                        <span class="font-bold text-green-700">${formatCurrency(kiadasokCost)}</span>
                    </div>
                </div>
            </div>
        `;

        statsContainer.innerHTML = template;
    } catch (error) {
        console.error("Error calculating stats:", error);
        statsContainer.innerHTML = '<div class="text-red-500 font-medium py-4">Hiba történt a kimutatások betöltése közben.</div>';
    }
}
