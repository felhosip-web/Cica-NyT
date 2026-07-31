import { db } from '../db.js';
import { PdfExporter } from '../utils/pdf-export.js';
import { getSelectedCatIds, getFilteredCats } from '../components/cat-list.js';
import { openModal, closeModal } from '../components/fab.js';

export function initExportModal() {
    const btnExportSelected = document.getElementById('btn-export-selected');
    const btnGeneratePdf = document.getElementById('btn-generate-pdf');
    const modalExport = document.getElementById('modal-export');

    if (!btnGeneratePdf || !modalExport) return;

    // Open from list action bar
    if (btnExportSelected) {
        btnExportSelected.addEventListener('click', () => {
            prepareExportModal();
            openModal('modal-export');
        });
    }

    // Handle radio button styling (Type)
    const typeRadios = document.querySelectorAll('input[name="exportType"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.export-type-lbl').forEach(lbl => {
                lbl.classList.remove('border-brand-pink', 'bg-pink-50', 'border-2');
                lbl.classList.add('border-gray-200', 'bg-white', 'border');
                const indicator = lbl.querySelector('.indicator');
                if(indicator) {
                    indicator.classList.remove('bg-brand-pink', 'ring-2', 'ring-white', 'shadow-sm');
                    indicator.classList.add('border-gray-300');
                }
            });
            const selectedLbl = e.target.closest('.export-type-lbl');
            if (selectedLbl) {
                selectedLbl.classList.remove('border-gray-200', 'bg-white', 'border');
                selectedLbl.classList.add('border-brand-pink', 'bg-pink-50', 'border-2');
                const indicator = selectedLbl.querySelector('.indicator');
                if(indicator) {
                    indicator.classList.remove('border-gray-300');
                    indicator.classList.add('bg-brand-pink', 'ring-2', 'ring-white', 'shadow-sm');
                }
            }
        });
    });

    btnGeneratePdf.addEventListener('click', async () => {
        const spinner = document.getElementById('pdf-spinner');
        spinner.classList.remove('hidden');
        btnGeneratePdf.disabled = true;

        try {
            const scope = document.querySelector('input[name="exportScope"]:checked').value;
            const type = document.querySelector('input[name="exportType"]:checked').value;
            const title = document.getElementById('export-title').value || 'Kimutatás';

            let catsToExport = [];

            if (scope === 'all') {
                catsToExport = await db.cats.orderBy('sorszam').reverse().toArray();
            } else if (scope === 'selected') {
                const selectedIds = getSelectedCatIds();
                catsToExport = await db.cats.where('id').anyOf(selectedIds).toArray();
                // Ensure correct sorting since anyOf doesn't guarantee order
                catsToExport.sort((a, b) => b.sorszam - a.sorszam);
            } else if (scope === 'filtered') {
                catsToExport = getFilteredCats();
            }

            const orgSettings = await db.settings.get('org') || {};

            await PdfExporter.exportCats({
                cats: catsToExport,
                type: type,
                title: title,
                orgSettings: orgSettings
            });

            closeModal('modal-export');
        } catch (error) {
            console.error('PDF Export Error:', error);
            alert('Hiba történt a PDF generálása során: ' + error.message);
        } finally {
            spinner.classList.add('hidden');
            btnGeneratePdf.disabled = false;
        }
    });
}

export async function prepareExportModal(overrideType = null, overrideScope = null) {
    // Counts
    const allCount = await db.cats.count();
    const selectedIds = getSelectedCatIds();
    const filteredCount = getFilteredCats().length;

    document.getElementById('export-lbl-all').innerText = `Összes állat (${allCount} db)`;

    const selectedLbl = document.getElementById('export-lbl-selected');
    const selectedContainer = document.getElementById('export-lbl-selected-container');
    const selectedInput = document.querySelector('input[name="exportScope"][value="selected"]');

    selectedLbl.innerText = `Kijelölt állatok (${selectedIds.length} db)`;
    if (selectedIds.length > 0) {
        selectedContainer.classList.remove('opacity-50');
        selectedInput.disabled = false;
        if (overrideScope === null) selectedInput.checked = true; // Auto select if there are selections
    } else {
        selectedContainer.classList.add('opacity-50');
        selectedInput.disabled = true;
        if (selectedInput.checked) {
            document.querySelector('input[name="exportScope"][value="all"]').checked = true;
        }
    }

    document.getElementById('export-lbl-filtered').innerText = `Szűrt lista (aktuális nézet: ${filteredCount} db)`;

    // Handle overrides from settings
    if (overrideType) {
        document.querySelector(`input[name="exportType"][value="${overrideType}"]`).click();
    }
    if (overrideScope) {
        const overrideInput = document.querySelector(`input[name="exportScope"][value="${overrideScope}"]`);
        if (!overrideInput.disabled) {
            overrideInput.checked = true;
        }
    }

    // Set default title
    const now = new Date();
    document.getElementById('export-title').value = `Állatnyilvántartás ${now.toISOString().split('T')[0].replace(/-/g, '.')}`;
}
