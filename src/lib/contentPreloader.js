/**
 * Content Pre-loader
 * Downloads all Supabase data into IndexedDB for offline use
 * Used by teachers before going into local-hub mode
 */

import { supabase, isSupabaseConfigured } from './supabase';
import offlineDB from './offlineDB';

// All tables to pre-load (in dependency order)
const TABLES_TO_PRELOAD = [
    'users',
    'subjects',
    'classes',
    'enrollments',
    'books',
    'assessments',
    'assignments',
    'videos',
    'attempts',
    'submissions',
    'badges',
    'progress',
    'teacher_notifications',
    'teacher_activity',
    'student_activity',
    'questions',
    'question_bank',
    'subject_benchmarks',
    'topics',
];

/**
 * Pre-load all data from Supabase into IndexedDB
 * Returns progress updates via the onProgress callback
 */
export async function preloadAllData(onProgress = () => { }) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured — cannot pre-load data');
    }

    const results = {
        success: [],
        failed: [],
        totalRecords: 0,
    };

    for (let i = 0; i < TABLES_TO_PRELOAD.length; i++) {
        const table = TABLES_TO_PRELOAD[i];
        onProgress({
            stage: 'tables',
            current: i + 1,
            total: TABLES_TO_PRELOAD.length,
            tableName: table,
            message: `Downloading ${table}...`,
        });

        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Table might not exist — skip non-critical tables
                console.warn(`Could not pre-load ${table}:`, error.message);
                results.failed.push({ table, error: error.message });
                continue;
            }

            if (data && data.length > 0) {
                // Clear existing data and bulk insert
                await offlineDB.clear(table);
                await offlineDB.putAll(table, data);
                results.success.push({ table, count: data.length });
                results.totalRecords += data.length;
            } else {
                results.success.push({ table, count: 0 });
            }
        } catch (e) {
            console.error(`Error pre-loading ${table}:`, e);
            results.failed.push({ table, error: e.message });
        }
    }

    // Save pre-load status
    await offlineDB.put('_preload_status', {
        id: 'latest',
        completedAt: new Date().toISOString(),
        results,
    });

    onProgress({
        stage: 'complete',
        current: TABLES_TO_PRELOAD.length,
        total: TABLES_TO_PRELOAD.length,
        message: `Pre-load complete! ${results.totalRecords} records downloaded.`,
    });

    return results;
}

/**
 * Pre-load file content (PDFs, book content) from Supabase Storage
 * This downloads actual file blobs for offline access
 */
export async function preloadFiles(onProgress = () => { }) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const books = await offlineDB.getAll('books');
    const filesToDownload = books.filter(b => b.file_url || b.content_url);
    let downloaded = 0;

    for (let i = 0; i < filesToDownload.length; i++) {
        const book = filesToDownload[i];
        const url = book.file_url || book.content_url;

        onProgress({
            stage: 'files',
            current: i + 1,
            total: filesToDownload.length,
            message: `Downloading file: ${book.title || book.name || 'Unknown'}...`,
        });

        try {
            // Check if already cached
            const cached = await offlineDB.isFileCached(`book_${book.id}`);
            if (cached) {
                downloaded++;
                continue;
            }

            // Download the file
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                await offlineDB.cacheFile(`book_${book.id}`, blob, {
                    name: book.title || book.name,
                    type: blob.type,
                    size: blob.size,
                    originalUrl: url,
                });
                downloaded++;
            }
        } catch (e) {
            console.error(`Error downloading file for book ${book.id}:`, e);
        }
    }

    onProgress({
        stage: 'files_complete',
        current: filesToDownload.length,
        total: filesToDownload.length,
        message: `Downloaded ${downloaded}/${filesToDownload.length} files.`,
    });

    return { total: filesToDownload.length, downloaded };
}

/**
 * Get pre-load status
 */
export async function getPreloadStatus() {
    try {
        const status = await offlineDB.getById('_preload_status', 'latest');
        if (!status) return null;

        // Get current counts from IndexedDB
        const counts = {};
        for (const table of TABLES_TO_PRELOAD) {
            try {
                counts[table] = await offlineDB.count(table);
            } catch (e) {
                counts[table] = 0;
            }
        }

        return {
            ...status,
            currentCounts: counts,
            totalRecords: Object.values(counts).reduce((a, b) => a + b, 0),
        };
    } catch (e) {
        return null;
    }
}

/**
 * Clear all offline data
 */
export async function clearOfflineData() {
    await offlineDB.clearAllData();
    return true;
}

/**
 * Get storage usage estimate
 */
export async function getStorageUsage() {
    return offlineDB.getStorageEstimate();
}

export default {
    preloadAllData,
    preloadFiles,
    getPreloadStatus,
    clearOfflineData,
    getStorageUsage,
};
