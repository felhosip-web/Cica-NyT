import { db } from '../lib/db';
import { syncService } from './sync-service';

/**
 * High-level manager for coordinating sync operations between local and cloud storage
 */
class SyncManager {
    /**
     * Initializes the SyncManager without a configured provider
     */
    constructor() {
        this.provider = null;
    }

    /**
     * Initializes the sync provider based on database settings
     */
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

    /**
     * Checks if sync is currently enabled
     * @returns True if a sync provider is configured and enabled
     */
    isEnabled() {
        return this.provider !== null;
    }

    /**
     * Performs full bidirectional sync: push local changes then pull remote changes
     */
    async sync() {
        if (!this.isEnabled()) return;
        console.log('[SyncManager] Syncing...');
        await this.push();
        await this.pull();
        console.log('[SyncManager] Sync complete');
    }

    /**
     * Pushes all pending local changes to the cloud
     */
    async push() {
        if (!this.isEnabled()) return;
        console.log('[SyncManager] Pushing local changes to cloud...');
        await syncService.syncPending();
    }

    /**
     * Pulls remote changes from the cloud and updates local database
     */
    async pull() {
        if (!this.isEnabled()) return;
        console.log('[SyncManager] Pulling remote changes from cloud...');
        await syncService.pullRemote();
    }
}

export const cloudSyncManager = new SyncManager();

