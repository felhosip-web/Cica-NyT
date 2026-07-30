import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db.js';

export class SyncService {
    constructor() {
        this.supabase = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.syncing = false;

        const url = import.meta.env.VITE_SUPABASE_URL;
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (url && key) {
            try {
                this.supabase = createClient(url, key);
            } catch (e) {
                console.error("Supabase init failed", e);
            }
        }

        this.setupOnlineListener();
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

    updateSyncUI() {
        const dot = document.getElementById('sync-dot');
        const text = document.getElementById('sync-text');

        if (!dot || !text) return;

        if (!this.supabase) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block';
            text.textContent = 'Offline (Helyi)';
            return;
        }

        if (!navigator.onLine) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block';
            text.textContent = 'Offline';
            return;
        }

        if (this.syncing) {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-blue-500 inline-block animate-pulse';
            text.textContent = 'Szinkron...';
        } else {
            dot.className = 'w-2.5 h-2.5 rounded-full bg-green-500 inline-block';
            text.textContent = 'Szinkronizálva';
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
        if (!this.supabase || !navigator.onLine || this.syncing) return;

        this.syncing = true;
        this.updateSyncUI();

        try {
            const pendingCats = await db.cats.where('syncStatus').equals('pending').toArray();

            for (const cat of pendingCats) {
                const { id, sorszam, nev, ivar, szin, szuletes, created, updated, status, osszKoltseg, deviceId, oltasok, tesztek, kezelesek } = cat;

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
                        device_group: 'foundation'
                    });

                if (!error) {
                    await db.cats.update(id, { syncStatus: 'synced' });
                } else {
                    console.error("Sync error:", error);
                }
            }
        } catch (e) {
            console.error("Sync process failed", e);
        } finally {
            this.syncing = false;
            this.updateSyncUI();
        }
    }
}

export const syncService = new SyncService();
