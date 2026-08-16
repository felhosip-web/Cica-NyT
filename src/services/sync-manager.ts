import { db } from '../lib/db';
import { syncService } from './sync-service';

class SyncManager {
    constructor() {
        this.provider = null;
    }

    async init() {
        console.log('[SyncManager] Initializing...');
        let settings = await db.settings.get('main');
        if (!settings) {
            settings = await db.settings.get('org');
        }
        if (settings && settings.cloudEnabled && settings.cloudProvider === 'supabase') {
            this.provider = 'supabase';
            await syncService.initFromSettings();
            console.log('[SyncManager] Supabase sync provider ready');
        } else {
            this.provider = null;
            syncService.updateSyncUI();
            console.log('[SyncManager] Sync is disabled or no provider configured');
        }
    }

    isEnabled() {
        return this.provider !== null;
    }

    async sync() {
        if (!this.isEnabled()) return;
        console.log('[SyncManager] Syncing...');
        await this.push();
        await this.pull();
        console.log('[SyncManager] Sync complete');
    }

    async push() {
        if (!this.isEnabled()) return;
        console.log('[SyncManager] Pushing local changes to cloud...');
        await syncService.syncPending();
    }

    async pull() {
        if (!this.isEnabled()) return;
        console.log('[SyncManager] Pulling remote changes from cloud...');
        await syncService.pullRemote();
    }
}

export const cloudSyncManager = new SyncManager();

