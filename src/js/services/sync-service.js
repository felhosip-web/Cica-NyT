import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export class SyncService {
    constructor() {
        this.supabase = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.syncing = false;

        this.initFromSettings();
        this.setupOnlineListener();
    }

    async initFromSettings() {
        let settings = await db.settings.get('main');
        if (!settings) settings = await db.settings.get('org');

        const url = settings?.supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        const key = settings?.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (url && key) {
            try {
                this.supabase = createClient(url, key);
                console.log('[SyncService] Supabase client initialized');
            } catch (e) {
                console.error("[SyncService] Supabase init failed", e);
                this.supabase = null;
            }
        } else {
            this.supabase = null;
        }

        this.updateSyncUI();
    }

    getOrCreateDeviceId() {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('deviceId', id);
        }
        return id;
    }

    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.updateSyncUI();
            this.syncPending();
        });
        window.addEventListener('offline', () => {
            this.updateSyncUI();
        });
    }

    async updateSyncUI() {
        const dot = document.getElementById('sync-dot');
        const text = document.getElementById('sync-text');
        const queueEl = document.getElementById('sync-queue');

        if (!dot || !text) return;

        let pendingCount = 0;
        try {
            pendingCount = await db.cats.where('syncStatus').equals('pending').count();
        } catch (e) {
            console.error("[SyncService] Failed to get pending count", e);
        }

        if (queueEl) {
            if (pendingCount > 0) {
                queueEl.textContent = '(' + pendingCount + ')';
                queueEl.classList.remove('hidden');
            } else {
                queueEl.classList.add('hidden');
                queueEl.textContent = '';
            }
        }

        let settings = await db.settings.get('main');
        if (!settings) settings = await db.settings.get('org');
        const cloudEnabled = settings?.cloudEnabled ?? false;

        if (!cloudEnabled) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-gray-400 inline-block';
            text.textContent = 'Helyi (Felhő kikapcsolva)';
            return;
        }

        if (!navigator.onLine) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block';
            text.textContent = 'Offline';
            return;
        }

        if (!this.supabase) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block';
            text.textContent = 'Hiányzó API kulcs';
            return;
        }

        if (this.syncing) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse';
            text.textContent = 'Szinkron...';
        } else {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-green-500 inline-block';
            text.textContent = pendingCount > 0 ? 'Feltöltésre vár' : 'Szinkronizálva (Supabase)';
        }
    }

    async testConnection(url, key) {
        if (!url || !key) {
            return { success: false, error: 'A Supabase URL és Anon API kulcs megadása kötelező.' };
        }
        try {
            const testClient = createClient(url, key);
            // Query cats table limit 1
            const { error } = await testClient.from('cats').select('id').limit(1);
            if (error && error.code !== 'PGRST116') {
                return { success: false, error: error.message || 'Kapcsolódási hiba az adatbázishoz.' };
            }
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message || 'Sikertelen kapcsolódás.' };
        }
    }

    async queueSync(cat) {
        cat.updated = new Date().toISOString();
        cat.deviceId = this.deviceId;
        cat.syncStatus = 'pending';

        await db.cats.put(cat);

        if (navigator.onLine && this.supabase) {
            this.syncPending();
        } else {
            this.updateSyncUI();
        }
    }

    async syncPending() {
        let settings = await db.settings.get('main');
        if (!settings) settings = await db.settings.get('org');

        if (!settings?.cloudEnabled) {
            this.updateSyncUI();
            return;
        }

        if (!this.supabase) {
            await this.initFromSettings();
        }

        if (!this.supabase || !navigator.onLine || this.syncing) return;

        this.syncing = true;
        this.updateSyncUI();

        try {
            const pendingCats = await db.cats.where('syncStatus').equals('pending').toArray();

            for (const cat of pendingCats) {
                const {
                    id, sorszam, nev, ivar, szin, szuletes, created, updated, status,
                    osszKoltseg, deviceId, oltasok, tesztek, kezelesek,
                    intakeType, gazdisDate, gazdisPerson,
                    hasKiskonyv, kiskonyvSzam, kiskonyvDate,
                    hasPassport, passportSzam, passportDate,
                    hasChip, chipNumber, chipDate, chipLocation
                } = cat;

                // Upload to supabase
                const { error } = await this.supabase
                    .from('cats')
                    .upsert({
                        id,
                        sorszam,
                        nev,
                        ivar,
                        szin,
                        szuletes,
                        created,
                        updated,
                        status,
                        osszKoltseg,
                        deviceId,
                        oltasok,
                        tesztek,
                        kezelesek,
                        intakeType,
                        gazdisDate,
                        gazdisPerson,
                        hasKiskonyv,
                        kiskonyvSzam,
                        kiskonyvDate,
                        hasPassport,
                        passportSzam,
                        passportDate,
                        hasChip,
                        chipNumber,
                        chipDate,
                        chipLocation,
                        device_group: 'foundation'
                    });

                if (!error) {
                    await db.cats.update(id, { syncStatus: 'synced' });
                } else {
                    console.error("[SyncService] Sync item error:", error);
                }
            }
        } catch (e) {
            console.error("[SyncService] Sync process failed", e);
        } finally {
            this.syncing = false;
            this.updateSyncUI();
        }
    }

    async pullRemote() {
        let settings = await db.settings.get('main');
        if (!settings) settings = await db.settings.get('org');

        if (!settings?.cloudEnabled || !this.supabase || !navigator.onLine) return;

        try {
            const { data, error } = await this.supabase
                .from('cats')
                .select('*');

            if (!error && Array.isArray(data)) {
                for (const remoteCat of data) {
                    const localCat = await db.cats.get(remoteCat.id);
                    if (!localCat) {
                        remoteCat.syncStatus = 'synced';
                        await db.cats.put(remoteCat);
                    } else if (remoteCat.updated && localCat.updated && new Date(remoteCat.updated) > new Date(localCat.updated)) {
                        remoteCat.syncStatus = 'synced';
                        await db.cats.put(remoteCat);
                    }
                }
            }
        } catch (e) {
            console.error("[SyncService] Pull remote failed", e);
        }
    }
}

export const syncService = new SyncService();

