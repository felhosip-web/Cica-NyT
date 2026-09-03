import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../lib/db';
import { toSupabaseCat, fromSupabaseCat, toSupabaseFosterParent, fromSupabaseFosterParent, toSupabaseFosterSupply, toSupabaseFosterExpense, toSupabaseInventory, fromSupabaseInventory, toSupabaseFinance } from '../lib/mappers/supabase-mapper';
import { getLicenseStatus } from './licenseService';

/**
 * Service for managing synchronization between local IndexedDB and Supabase cloud database
 */
export class SyncService {
    /**
     * Initializes the SyncService with device ID and sets up online/offline listeners
     */
    constructor() {
        this.supabase = null;
        this.deviceId = this.getOrCreateDeviceId();
        this.syncing = false;

        this.initFromSettings();
        this.setupOnlineListener();
    }

    /**
     * Initializes Supabase client from stored settings or environment variables
     */
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

    /**
     * Retrieves or creates a unique device ID for tracking sync operations
     * @returns The device ID string stored in localStorage
     */
    getOrCreateDeviceId() {
        let id = localStorage.getItem('deviceId');
        if (!id) {
            id = uuidv4();
            localStorage.setItem('deviceId', id);
        }
        return id;
    }

    /**
     * Sets up event listeners for online/offline network status changes
     */
    setupOnlineListener() {
        window.addEventListener('online', () => {
            this.updateSyncUI();
            this.syncPending();
        });
        window.addEventListener('offline', () => {
            this.updateSyncUI();
        });
    }

    /**
     * Updates the sync status UI indicator based on current connection and sync state
     */
    async updateSyncUI() {
        const dot = document.getElementById('sync-dot');
        const text = document.getElementById('sync-text');
        const queueEl = document.getElementById('sync-queue');

        if (!dot || !text) return;

        let pendingCount = 0;
        try {
            const catPending = await db.cats.where('syncStatus').equals('pending').count();
            let fosterPending = 0;
            if (db.fosterParents) {
                fosterPending += await db.fosterParents.where('syncStatus').equals('pending').count().catch(() => 0);
            }
            if (db.fosterSupplies) {
                fosterPending += await db.fosterSupplies.where('syncStatus').equals('pending').count().catch(() => 0);
            }
            if (db.fosterExpenses) {
                fosterPending += await db.fosterExpenses.where('syncStatus').equals('pending').count().catch(() => 0);
            }
            if (db.inventory) {
                fosterPending += await db.inventory.where('syncStatus').equals('pending').count().catch(() => 0);
            }
            if (db.finances) {
                fosterPending += await db.finances.where('syncStatus').equals('pending').count().catch(() => 0);
            }
            pendingCount = catPending + fosterPending;
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
            text.textContent = pendingCount > 0 ? 'Feltöltésre vár (' + pendingCount + ')' : 'Szinkronizálva (Supabase)';
        }
    }

    /**
     * Tests connection to Supabase with provided credentials
     * @param url - Supabase project URL
     * @param key - Supabase anonymous API key
     * @returns Object with success status and error message if failed
     */
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

    /**
     * Queues a cat record for synchronization to Supabase
     * @param cat - The cat object to sync
     */
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

    /**
     * Queues a foster-related record for synchronization
     * @param item - The item to sync (foster parent, supply, or expense)
     * @param table - The database table name
     */
    async queueFosterSync(item, table) {
        if (!db[table]) return;
        item.updatedAt = new Date().toISOString();
        item.syncStatus = 'pending';
        await db[table].put(item);

        if (navigator.onLine && this.supabase) {
            this.syncPending();
        } else {
            this.updateSyncUI();
        }
    }

    /**
     * Queues an inventory item for synchronization
     * @param item - The inventory item to sync
     */
    async queueInventorySync(item) {
        if (!db.inventory) return;
        item.updatedAt = new Date().toISOString();
        item.syncStatus = 'pending';
        const id = await db.inventory.put(item);
        item.id = id;

        if (navigator.onLine && this.supabase) {
            this.syncPending();
        } else {
            this.updateSyncUI();
        }
    }

    /**
     * Queues a finance record for synchronization
     * @param item - The finance item to sync
     */
    async queueFinanceSync(item) {
        if (!db.finances) return;
        item.updatedAt = new Date().toISOString();
        item.syncStatus = 'pending';
        const id = await db.finances.put(item);
        item.id = id;

        if (navigator.onLine && this.supabase) {
            this.syncPending();
        } else {
            this.updateSyncUI();
        }
    }

    /**
     * Synchronizes all pending records from local database to Supabase
     */
    async syncPending() {
        if (getLicenseStatus().status === 'locked') return;
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
            // 1. Sync Pending Cats
            const pendingCats = await db.cats.where('syncStatus').equals('pending').toArray();
            for (const cat of pendingCats) {
                const { error } = await this.supabase
                    .from('cats')
                    .upsert(toSupabaseCat(cat));

                if (!error) {
                    await db.cats.update(cat.id, { syncStatus: 'synced' });
                } else {
                    console.error("[SyncService] Sync error:", error);
                }
            }

            // 2. Sync Pending Foster Parents
            if (db.fosterParents) {
                const pendingFosters = await db.fosterParents.where('syncStatus').equals('pending').toArray().catch(() => []);
                for (const foster of pendingFosters) {
                    const { error } = await this.supabase
                        .from('foster_parents')
                        .upsert(toSupabaseFosterParent(foster));
                    if (!error) {
                        await db.fosterParents.update(foster.id, { syncStatus: 'synced' });
                    } else {
                        console.error("[SyncService] Sync foster parent error:", error);
                    }
                }
            }

            // 3. Sync Pending Foster Supplies
            if (db.fosterSupplies) {
                const pendingSupplies = await db.fosterSupplies.where('syncStatus').equals('pending').toArray().catch(() => []);
                for (const supply of pendingSupplies) {
                    const { error } = await this.supabase
                        .from('foster_supplies')
                        .upsert(toSupabaseFosterSupply(supply));
                    if (!error) {
                        await db.fosterSupplies.update(supply.id, { syncStatus: 'synced' });
                    } else {
                        console.error("[SyncService] Sync foster supply error:", error);
                    }
                }
            }

            // 4. Sync Pending Foster Expenses
            if (db.fosterExpenses) {
                const pendingExpenses = await db.fosterExpenses.where('syncStatus').equals('pending').toArray().catch(() => []);
                for (const exp of pendingExpenses) {
                    const { error } = await this.supabase
                        .from('foster_expenses')
                        .upsert(toSupabaseFosterExpense(exp));
                    if (!error) {
                        await db.fosterExpenses.update(exp.id, { syncStatus: 'synced' });
                    } else {
                        console.error("[SyncService] Sync foster expense error:", error);
                    }
                }
            }

            // 5. Sync Pending Inventory Items
            if (db.inventory) {
                const pendingInv = await db.inventory.where('syncStatus').equals('pending').toArray().catch(() => []);
                for (const inv of pendingInv) {
                    const { error } = await this.supabase
                        .from('inventory')
                        .upsert(toSupabaseInventory(inv));
                    if (!error) {
                        await db.inventory.update(inv.id, { syncStatus: 'synced' });
                    } else {
                        console.error("[SyncService] Sync inventory error:", error);
                    }
                }
            }

            // 6. Sync Pending Finances Items
            if (db.finances) {
                const pendingFinances = await db.finances.where('syncStatus').equals('pending').toArray().catch(() => []);
                for (const fin of pendingFinances) {
                    const { error } = await this.supabase
                        .from('finances')
                        .upsert(toSupabaseFinance(fin));
                    if (!error) {
                        await db.finances.update(fin.id, { syncStatus: 'synced' });
                    } else {
                        console.error("[SyncService] Sync finances error:", error);
                    }
                }
            }

        } catch (e) {
            console.error("[SyncService] Sync process failed", e);
        } finally {
            this.syncing = false;
            this.updateSyncUI();
        }
    }

    /**
     * Pulls remote records from Supabase and updates local database with newer versions
     */
    async pullRemote() {
        if (getLicenseStatus().status === 'locked') return;
        let settings = await db.settings.get('main');
        if (!settings) settings = await db.settings.get('org');

        if (!settings?.cloudEnabled || !this.supabase || !navigator.onLine) return;

        try {
            // Pull Cats
            const { data: catData, error: catErr } = await this.supabase.from('cats').select('*');
            if (!catErr && Array.isArray(catData)) {
                for (const remoteCat of catData) {
                    const localCat = await db.cats.get(remoteCat.id);
                    if (!localCat || (remoteCat.updated && localCat.updated && new Date(remoteCat.updated) > new Date(localCat.updated))) {
                        await db.cats.put(fromSupabaseCat(remoteCat));
                    }
                }
            }

            // Pull Foster Parents
            if (db.fosterParents) {
                const { data: fosterData, error: fosterErr } = await this.supabase.from('foster_parents').select('*');
                if (!fosterErr && Array.isArray(fosterData)) {
                    for (const remoteFoster of fosterData) {
                        const localFoster = await db.fosterParents.get(remoteFoster.id);
                        const mappedFoster = fromSupabaseFosterParent(remoteFoster);
                        if (!localFoster || (mappedFoster.updatedAt && localFoster.updatedAt && new Date(mappedFoster.updatedAt) > new Date(localFoster.updatedAt))) {
                            await db.fosterParents.put(mappedFoster);
                        }
                    }
                }
            }

            // Pull Inventory
            if (db.inventory) {
                const { data: invData, error: invErr } = await this.supabase.from('inventory').select('*');
                if (!invErr && Array.isArray(invData)) {
                    for (const remoteInv of invData) {
                        const localInv = await db.inventory.get(remoteInv.id);
                        const mappedInv = fromSupabaseInventory(remoteInv);
                        if (!localInv || (mappedInv.updatedAt && localInv.updatedAt && new Date(mappedInv.updatedAt) > new Date(localInv.updatedAt))) {
                            await db.inventory.put(mappedInv);
                        }
                    }
                }
            }
        } catch (e) {
            console.error("[SyncService] Pull remote failed", e);
        }
    }
}

export const syncService = new SyncService();

