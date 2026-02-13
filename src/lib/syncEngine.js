/**
 * Sync Engine
 * Uploads offline changes from IndexedDB sync queue back to Supabase
 * Used by teachers when they reconnect to the internet
 */

import { supabase, isSupabaseConfigured } from './supabase';
import offlineDB from './offlineDB';

/**
 * Sync all pending offline changes to Supabase
 * @param {Function} onProgress - Progress callback
 * @returns {Object} Sync results
 */
export async function syncToCloud(onProgress = () => { }) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured — cannot sync');
    }

    const pending = await offlineDB.getPendingSyncOps();

    if (pending.length === 0) {
        onProgress({ stage: 'complete', message: 'Nothing to sync!', current: 0, total: 0 });
        return { synced: 0, failed: 0, errors: [] };
    }

    const results = {
        synced: 0,
        failed: 0,
        errors: [],
    };

    for (let i = 0; i < pending.length; i++) {
        const op = pending[i];

        onProgress({
            stage: 'syncing',
            current: i + 1,
            total: pending.length,
            message: `Syncing ${op.operation} on ${op.store}...`,
            operation: op,
        });

        try {
            switch (op.operation) {
                case 'insert': {
                    // Check if record already exists (avoid duplicate inserts)
                    const { data: existing } = await supabase
                        .from(op.store)
                        .select('id')
                        .eq('id', op.data.id)
                        .single();

                    if (existing) {
                        // Record exists — update instead
                        const { error } = await supabase
                            .from(op.store)
                            .update(op.data)
                            .eq('id', op.data.id);

                        if (error) throw error;
                    } else {
                        const { error } = await supabase
                            .from(op.store)
                            .insert(op.data);

                        if (error) throw error;
                    }
                    break;
                }

                case 'update': {
                    const { error } = await supabase
                        .from(op.store)
                        .update(op.data)
                        .eq('id', op.recordId);

                    if (error) throw error;
                    break;
                }

                case 'delete': {
                    const { error } = await supabase
                        .from(op.store)
                        .delete()
                        .eq('id', op.recordId);

                    // Ignore "not found" errors for deletes
                    if (error && error.code !== 'PGRST116') throw error;
                    break;
                }

                default:
                    console.warn(`Unknown sync operation: ${op.operation}`);
            }

            // Mark as synced
            await offlineDB.markSynced(op.id);
            results.synced++;
        } catch (e) {
            console.error(`Sync error for ${op.operation} on ${op.store}:`, e);
            results.failed++;
            results.errors.push({
                operation: op,
                error: e.message,
            });
        }
    }

    // Clean up synced operations
    if (results.synced > 0) {
        await offlineDB.clearSyncedOps();
    }

    // Save sync history
    const syncRecord = {
        id: `sync_${Date.now()}`,
        completedAt: new Date().toISOString(),
        results,
    };

    try {
        // Store sync history in localStorage (not IndexedDB since we'll clear it)
        const history = JSON.parse(localStorage.getItem('funlms_sync_history') || '[]');
        history.unshift(syncRecord);
        // Keep only last 20 sync records
        localStorage.setItem('funlms_sync_history', JSON.stringify(history.slice(0, 20)));
    } catch (e) { /* ignore */ }

    onProgress({
        stage: 'complete',
        current: pending.length,
        total: pending.length,
        message: `Sync complete! ${results.synced} synced, ${results.failed} failed.`,
    });

    return results;
}

/**
 * Get pending sync statistics (by table)
 */
export async function getSyncStats() {
    return offlineDB.getSyncStats();
}

/**
 * Get sync history from localStorage
 */
export function getSyncHistory() {
    try {
        return JSON.parse(localStorage.getItem('funlms_sync_history') || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Clear sync history
 */
export function clearSyncHistory() {
    localStorage.removeItem('funlms_sync_history');
}

export default {
    syncToCloud,
    getSyncStats,
    getSyncHistory,
    clearSyncHistory,
};
