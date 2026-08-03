import { db } from '../db.js';
import { openModal, closeModal } from '../components/fab.js';

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- CICA-NYT APPLIKÁCIÓ SUPABASE TELJES SQL SÉMA
-- Másold be ezt a kódot a Supabase SQL Editor-ba és futtasd!
-- ========================================================

-- 1. CATS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS public.cats (
    "id" TEXT PRIMARY KEY,
    "sorszam" TEXT,
    "nev" TEXT NOT NULL,
    "ivar" TEXT,
    "szin" TEXT,
    "szuletes" TEXT,
    "status" TEXT DEFAULT 'befogadhato',
    "intakeType" TEXT,
    "gazdisDate" TEXT,
    "gazdisPerson" TEXT,
    "hasKiskonyv" BOOLEAN DEFAULT FALSE,
    "kiskonyvSzam" TEXT,
    "kiskonyvDate" TEXT,
    "hasPassport" BOOLEAN DEFAULT FALSE,
    "passportSzam" TEXT,
    "passportDate" TEXT,
    "hasChip" BOOLEAN DEFAULT FALSE,
    "chipNumber" VARCHAR(15),
    "chipDate" TEXT,
    "chipLocation" TEXT,
    "oltasok" JSONB DEFAULT '[]'::jsonb,
    "tesztek" JSONB DEFAULT '[]'::jsonb,
    "kezelesek" JSONB DEFAULT '[]'::jsonb,
    "osszKoltseg" NUMERIC DEFAULT 0,
    "deviceId" TEXT,
    "device_group" TEXT DEFAULT 'foundation',
    "created" TIMESTAMPTZ DEFAULT NOW(),
    "updated" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. EVENTS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS public.events (
    "id" TEXT PRIMARY KEY,
    "catId" TEXT,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "type" TEXT,
    "notes" TEXT,
    "completed" BOOLEAN DEFAULT FALSE,
    "created" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXEK LÉTREHOZÁSA GYORS SORSZÁM ÉS CHIP SZŰRÉSHEZ
CREATE INDEX IF NOT EXISTS idx_cats_sorszam ON public.cats("sorszam");
CREATE INDEX IF NOT EXISTS idx_cats_chipNumber ON public.cats("chipNumber");
CREATE INDEX IF NOT EXISTS idx_cats_status ON public.cats("status");
CREATE INDEX IF NOT EXISTS idx_events_catId ON public.events("catId");

-- 4. ROW LEVEL SECURITY (RLS) BEÁLLÍTÁSA (Anonim / Nyilvános olvasás és írás engedélyezése)
ALTER TABLE public.cats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anonim hozzáférés engedélyezése a cats táblához
DROP POLICY IF EXISTS "Allow anon all on cats" ON public.cats;
CREATE POLICY "Allow anon all on cats" ON public.cats
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Anonim hozzáférés engedélyezése az events táblához
DROP POLICY IF EXISTS "Allow anon all on events" ON public.events;
CREATE POLICY "Allow anon all on events" ON public.events
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. AUTOMATIKUS UPDATED MEZŐ FRISSÍTÉS TRIGGER (MÓDOSÍTÁSKOR)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cats_updated_at ON public.cats;
CREATE TRIGGER update_cats_updated_at
    BEFORE UPDATE ON public.cats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

export function initDebugModal() {
    const debugBtns = document.querySelectorAll('#btn-open-debug-pass, .btn-open-debug-pass');
    const formAuth = document.getElementById('form-debug-auth');
    const passInput = document.getElementById('input-debug-pass');
    const passError = document.getElementById('debug-auth-error');

    const modalAuth = document.getElementById('modal-debug-auth');
    const modalDebug = document.getElementById('modal-debug');

    const tabBtnAudit = document.getElementById('tab-btn-db-audit');
    const tabBtnSql = document.getElementById('tab-btn-sql-gen');
    const tabContentAudit = document.getElementById('tab-content-db-audit');
    const tabContentSql = document.getElementById('tab-content-sql-gen');

    const btnRefreshAudit = document.getElementById('btn-refresh-db-audit');
    const btnCopySql = document.getElementById('btn-copy-sql');
    const sqlCodeEl = document.getElementById('supabase-sql-code');

    // Close button wiring for debug modals
    [modalAuth, modalDebug].forEach(m => {
        if (!m) return;
        m.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                closeModal(m.id);
            });
        });
        m.addEventListener('click', (e) => {
            if (e.target === m) {
                closeModal(m.id);
            }
        });
    });

    // Wire all Debug mode buttons to open the Debug auth modal first
    debugBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e) e.preventDefault();
            btn.blur();
            openModal('modal-debug-auth');
            // Ensure pass error is hidden when opening fresh
            if (passError) passError.classList.add('hidden');
            if (passInput) {
                passInput.value = '';
                setTimeout(() => passInput.focus(), 100);
            }
        });
    });

    if (formAuth) {
        formAuth.addEventListener('submit', (e) => {
            e.preventDefault();
            const pass = passInput ? passInput.value.trim() : '';
            if (pass === '1342' || pass === '') {
                closeModal('modal-debug-auth');
                if (passInput) passInput.value = '';
                if (passError) passError.classList.add('hidden');

                if (sqlCodeEl) {
                    sqlCodeEl.textContent = SUPABASE_SQL_SCHEMA;
                }

                openModal('modal-debug');
                runDbAudit();
            } else {
                if (passError) passError.classList.remove('hidden');
            }
        });
    }

    // Tabs switching
    if (tabBtnAudit && tabBtnSql && tabContentAudit && tabContentSql) {
        tabBtnAudit.addEventListener('click', () => {
            tabBtnAudit.classList.add('border-purple-600', 'text-purple-600', 'font-bold');
            tabBtnAudit.classList.remove('border-transparent', 'text-gray-500', 'font-medium');

            tabBtnSql.classList.remove('border-purple-600', 'text-purple-600', 'font-bold');
            tabBtnSql.classList.add('border-transparent', 'text-gray-500', 'font-medium');

            tabContentAudit.classList.remove('hidden');
            tabContentSql.classList.add('hidden');
        });

        tabBtnSql.addEventListener('click', () => {
            tabBtnSql.classList.add('border-purple-600', 'text-purple-600', 'font-bold');
            tabBtnSql.classList.remove('border-transparent', 'text-gray-500', 'font-medium');

            tabBtnAudit.classList.remove('border-purple-600', 'text-purple-600', 'font-bold');
            tabBtnAudit.classList.add('border-transparent', 'text-gray-500', 'font-medium');

            tabContentSql.classList.remove('hidden');
            tabContentAudit.classList.add('hidden');
        });
    }

    if (btnRefreshAudit) {
        btnRefreshAudit.addEventListener('click', runDbAudit);
    }

    if (btnCopySql && sqlCodeEl) {
        btnCopySql.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
            } catch (err) {
                // Fallback for older browsers / iframe permission quirks
                const textarea = document.createElement('textarea');
                textarea.value = SUPABASE_SQL_SCHEMA;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            const originalText = btnCopySql.innerHTML;
            btnCopySql.innerHTML = '✅ Másolva!';
            btnCopySql.classList.remove('bg-brand-pink', 'hover:bg-pink-600');
            btnCopySql.classList.add('bg-green-600', 'hover:bg-green-700');

            setTimeout(() => {
                btnCopySql.innerHTML = originalText;
                btnCopySql.classList.remove('bg-green-600', 'hover:bg-green-700');
                btnCopySql.classList.add('bg-brand-pink', 'hover:bg-pink-600');
            }, 2000);
        });
    }
}

export async function runDbAudit() {
    const summaryGrid = document.getElementById('db-audit-summary-grid');
    const detailsContainer = document.getElementById('db-audit-tables-details');
    const healthContainer = document.getElementById('db-audit-health-status');

    if (!summaryGrid || !detailsContainer || !healthContainer) return;

    summaryGrid.innerHTML = `<div class="col-span-4 text-center py-4 text-gray-500 text-sm">Audit futtatása...</div>`;

    try {
        const allCats = await db.cats.toArray();
        const allEvents = await db.events.toArray();
        const allSettings = await db.settings.toArray();

        const pendingCats = allCats.filter(c => c.syncStatus === 'pending');
        const syncedCats = allCats.filter(c => c.syncStatus === 'synced');

        // Storage estimation
        let storageUsed = 'N/A';
        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            const usedKb = ((est.usage || 0) / 1024).toFixed(1);
            storageUsed = `${usedKb} KB`;
        }

        // Summary cards
        summaryGrid.innerHTML = `
            <div class="bg-purple-50 p-3 rounded-xl border border-purple-100">
                <div class="text-xs text-purple-600 font-medium">Összes cica</div>
                <div class="text-xl font-bold text-purple-900 mt-1">${allCats.length} db</div>
            </div>
            <div class="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <div class="text-xs text-amber-600 font-medium">Szinkronra vár</div>
                <div class="text-xl font-bold text-amber-900 mt-1">${pendingCats.length} db</div>
            </div>
            <div class="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <div class="text-xs text-blue-600 font-medium">Események</div>
                <div class="text-xl font-bold text-blue-900 mt-1">${allEvents.length} db</div>
            </div>
            <div class="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div class="text-xs text-emerald-600 font-medium">Lefoglalt tárhely</div>
                <div class="text-xl font-bold text-emerald-900 mt-1">${storageUsed}</div>
            </div>
        `;

        // Table details
        const statusCounts = {};
        allCats.forEach(c => {
            const st = c.status || 'ismeretlen';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        const statusStr = Object.entries(statusCounts)
            .map(([st, cnt]) => `<span class="px-2 py-0.5 bg-gray-200 rounded text-xs text-gray-700 font-medium">${st}: ${cnt}</span>`)
            .join(' ');

        detailsContainer.innerHTML = `
            <div class="flex flex-col sm:flex-row justify-between sm:items-center p-2 bg-white rounded-lg border border-gray-100 gap-2">
                <div>
                    <span class="font-bold text-gray-800">🐱 cats</span> (Dexie store)
                    <div class="mt-1 flex flex-wrap gap-1">${statusStr || 'Nincs rekord'}</div>
                </div>
                <div class="text-xs text-gray-500">
                    Szinckronizált: ${syncedCats.length} | Függőben: ${pendingCats.length}
                </div>
            </div>
            <div class="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100">
                <div>
                    <span class="font-bold text-gray-800">📅 events</span> (Dexie store)
                </div>
                <div class="text-xs text-gray-500">
                    Összesen: ${allEvents.length} rekord
                </div>
            </div>
            <div class="flex justify-between items-center p-2 bg-white rounded-lg border border-gray-100">
                <div>
                    <span class="font-bold text-gray-800">⚙️ settings</span> (Dexie store)
                </div>
                <div class="text-xs text-gray-500">
                    Összesen: ${allSettings.length} rekord
                </div>
            </div>
        `;

        // Health diagnostics
        const issues = [];
        const warnings = [];

        // Check cats sorszam
        const catsNoSorszam = allCats.filter(c => !c.sorszam);
        if (catsNoSorszam.length > 0) {
            warnings.push(`${catsNoSorszam.length} cicának hiányzik a sorszáma.`);
        }

        // Check invalid chip format
        const catsInvalidChip = allCats.filter(c => (c.hasChip || c.chipNumber) && c.chipNumber && !/^(900|348)\d{12}$/.test(c.chipNumber));
        if (catsInvalidChip.length > 0) {
            warnings.push(`${catsInvalidChip.length} cicánál nem 15 jegyű szabványos chip szám található.`);
        }

        // Check orphaned events
        const catIdSet = new Set(allCats.map(c => c.id));
        const orphanedEvents = allEvents.filter(e => e.catId && !catIdSet.has(e.catId));
        if (orphanedEvents.length > 0) {
            issues.push(`${orphanedEvents.length} árva esemény létezik (törölt cicához kapcsolódva).`);
        }

        let healthHtml = '';
        if (issues.length === 0 && warnings.length === 0) {
            healthHtml = `<div class="flex items-center gap-2 text-green-700 font-medium">
                <span>✅</span> Adatbázis tökéletes állapotban! Semmilyen hiba vagy hiányosság nem található.
            </div>`;
        } else {
            if (issues.length > 0) {
                healthHtml += `<div class="text-red-700 mb-1"><strong>❌ Hibák (${issues.length}):</strong><ul class="list-disc pl-4 mt-1">${issues.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
            }
            if (warnings.length > 0) {
                healthHtml += `<div class="text-amber-700"><strong>⚠️ Figyelmeztetések (${warnings.length}):</strong><ul class="list-disc pl-4 mt-1">${warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`;
            }
        }

        healthContainer.innerHTML = healthHtml;

    } catch (err) {
        console.error('Audit failed:', err);
        summaryGrid.innerHTML = `<div class="col-span-4 text-red-500 text-sm">Audit hiba: ${err.message}</div>`;
    }
}
