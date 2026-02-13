/**
 * Offline Database - IndexedDB Wrapper
 * Provides a Supabase-like API for local data storage
 * Used when the app is in 'local-hub' or 'offline' mode
 */

const DB_NAME = 'funlms_offline';
const DB_VERSION = 1;

import { generateUUID } from './uuid';

// All object stores (matching Supabase table names)
const STORES = [
    'users',
    'classes',
    'enrollments',
    'books',
    'subjects',
    'assessments',
    'attempts',
    'assignments',
    'submissions',
    'badges',
    'progress',
    'videos',
    'teacher_notifications',
    'teacher_activity',
    'student_activity',
    'questions',
    'question_bank',
    'ai_reviews',
    'admin_reviews',
    'subject_benchmarks',
    'topics',
    'hint_logs',
    'performance_aggregates',
    // Special stores
    '_sync_queue',      // Tracks offline changes for later sync
    '_file_cache',      // Stores downloaded file blobs (PDFs, images)
    '_preload_status',  // Tracks what has been pre-loaded
];

let dbInstance = null;

/**
 * Open the IndexedDB database, creating stores if needed
 */
function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not available'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            STORES.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id' });
                    // Add useful indexes
                    if (storeName === '_sync_queue') {
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('store', 'store', { unique: false });
                    }
                    if (storeName === 'users') {
                        store.createIndex('username', 'username', { unique: false });
                        store.createIndex('role', 'role', { unique: false });
                    }
                    if (storeName === 'enrollments') {
                        store.createIndex('student_id', 'student_id', { unique: false });
                        store.createIndex('class_id', 'class_id', { unique: false });
                    }
                    if (storeName === 'attempts') {
                        store.createIndex('user_id', 'user_id', { unique: false });
                        store.createIndex('assessment_id', 'assessment_id', { unique: false });
                    }
                    if (storeName === 'submissions') {
                        store.createIndex('student_id', 'student_id', { unique: false });
                        store.createIndex('assignment_id', 'assignment_id', { unique: false });
                    }
                    if (storeName === 'progress') {
                        store.createIndex('user_id', 'user_id', { unique: false });
                    }
                    if (storeName === 'assessments') {
                        store.createIndex('class_id', 'class_id', { unique: false });
                        store.createIndex('created_by', 'created_by', { unique: false });
                    }
                    if (storeName === 'assignments') {
                        store.createIndex('class_id', 'class_id', { unique: false });
                    }
                    if (storeName === 'books') {
                        store.createIndex('class_id', 'class_id', { unique: false });
                    }
                    if (storeName === 'videos') {
                        store.createIndex('class_id', 'class_id', { unique: false });
                    }
                }
            });
        };
    });
}

/**
 * Get all items from a store
 */
async function getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get a single item by ID
 */
async function getById(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Put (insert or update) an item
 */
async function put(storeName, item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve(item);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Put multiple items at once (bulk insert/update)
 */
async function putAll(storeName, items) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        items.forEach(item => store.put(item));
        tx.oncomplete = () => resolve(items);
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * Delete an item by ID
 */
async function deleteItem(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear all items in a store
 */
async function clearStore(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Query items by a filter (simple equality matching)
 */
async function query(storeName, filter = {}) {
    const all = await getAll(storeName);
    if (!filter || Object.keys(filter).length === 0) return all;

    return all.filter(item => {
        return Object.entries(filter).every(([key, value]) => {
            if (value === undefined || value === null) return true;
            return item[key] === value;
        });
    });
}

/**
 * Query items using an index
 */
async function getByIndex(storeName, indexName, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Count items in a store
 */
async function count(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ==================== SYNC QUEUE ====================

/**
 * Add an operation to the sync queue
 */
async function addToSyncQueue(operation, storeName, data, id = null) {
    const entry = {
        id: generateUUID(),
        operation, // 'insert' | 'update' | 'delete'
        store: storeName,
        data,
        recordId: id || data?.id,
        timestamp: new Date().toISOString(),
        synced: false,
    };
    await put('_sync_queue', entry);
    return entry;
}

/**
 * Get all pending sync operations
 */
async function getPendingSyncOps() {
    const all = await getAll('_sync_queue');
    return all
        .filter(op => !op.synced)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Mark a sync operation as completed
 */
async function markSynced(syncId) {
    const op = await getById('_sync_queue', syncId);
    if (op) {
        op.synced = true;
        op.syncedAt = new Date().toISOString();
        await put('_sync_queue', op);
    }
}

/**
 * Clear all synced operations from the queue
 */
async function clearSyncedOps() {
    const all = await getAll('_sync_queue');
    const synced = all.filter(op => op.synced);
    for (const op of synced) {
        await deleteItem('_sync_queue', op.id);
    }
    return synced.length;
}

/**
 * Get sync queue statistics
 */
async function getSyncStats() {
    const all = await getAll('_sync_queue');
    const pending = all.filter(op => !op.synced);
    const byStore = {};
    pending.forEach(op => {
        byStore[op.store] = (byStore[op.store] || 0) + 1;
    });
    return {
        totalPending: pending.length,
        byStore,
        oldestPending: pending.length > 0 ? pending[0].timestamp : null,
    };
}

// ==================== FILE CACHE ====================

/**
 * Cache a file blob (for PDFs, images, etc.)
 */
async function cacheFile(fileId, blob, metadata = {}) {
    await put('_file_cache', {
        id: fileId,
        blob,
        metadata,
        cachedAt: new Date().toISOString(),
    });
}

/**
 * Get a cached file
 */
async function getCachedFile(fileId) {
    return getById('_file_cache', fileId);
}

/**
 * Check if a file is cached
 */
async function isFileCached(fileId) {
    const file = await getById('_file_cache', fileId);
    return !!file;
}

// ==================== DATABASE MANAGEMENT ====================

/**
 * Clear the entire offline database
 */
async function clearAllData() {
    for (const store of STORES) {
        await clearStore(store);
    }
    dbInstance = null;
}

/**
 * Get database size estimate
 */
async function getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
            usage: estimate.usage,
            quota: estimate.quota,
            usageMB: (estimate.usage / (1024 * 1024)).toFixed(2),
            quotaMB: (estimate.quota / (1024 * 1024)).toFixed(2),
            percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(1),
        };
    }
    return null;
}

/**
 * Get ALL data from ALL stores (for full export/sync)
 */
async function getAllData() {
    const data = {};
    const systemStores = ['_sync_queue', '_file_cache', '_preload_status'];
    for (const store of STORES) {
        if (!systemStores.includes(store)) {
            data[store] = await getAll(store);
        }
    }
    return data;
}

/**
 * Check if IndexedDB is available
 */
function isAvailable() {
    return typeof window !== 'undefined' && !!window.indexedDB;
}

// Export the offline database API
const offlineDB = {
    // Core CRUD
    getAll,
    getById,
    put,
    putAll,
    delete: deleteItem,
    clear: clearStore,
    query,
    getByIndex,
    count,

    // Sync Queue
    addToSyncQueue,
    getPendingSyncOps,
    markSynced,
    clearSyncedOps,
    getSyncStats,
    getAllData, // Export full data getter

    // File Cache
    cacheFile,
    getCachedFile,
    isFileCached,

    // Database Management
    clearAllData,
    getStorageEstimate,
    isAvailable,
    openDB,
};

export default offlineDB;
