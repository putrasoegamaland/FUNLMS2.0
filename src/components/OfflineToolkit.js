'use client';

/**
 * Offline Toolkit Component
 * Teacher-facing panel for managing offline/local-hub mode
 * - Pre-load data from Supabase into IndexedDB
 * - Toggle local-hub mode
 * - View pre-load status and storage usage
 */

import { useState, useEffect } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { preloadAllData, preloadFiles, getPreloadStatus, clearOfflineData, getStorageUsage } from '@/lib/contentPreloader';
import offlineDB from '@/lib/offlineDB';

export default function OfflineToolkit() {
    const { networkMode, isOnline, isOfflineHub, enableLocalHub, disableLocalHub } = useNetwork();
    const [isPreloading, setIsPreloading] = useState(false);
    const [preloadProgress, setPreloadProgress] = useState(null);
    const [preloadStatus, setPreloadStatus] = useState(null);
    const [storageUsage, setStorageUsage] = useState(null);
    const [error, setError] = useState(null);
    const [isStartingServer, setIsStartingServer] = useState(false);
    const [serverStatus, setServerStatus] = useState(null);

    // Load status on mount
    useEffect(() => {
        loadStatus();
    }, []);

    const loadStatus = async () => {
        try {
            const status = await getPreloadStatus();
            setPreloadStatus(status);
            const usage = await getStorageUsage();
            setStorageUsage(usage);
        } catch (e) {
            console.error('Error loading offline status:', e);
        }
    };

    // Handle pre-load
    const handlePreload = async () => {
        setIsPreloading(true);
        setError(null);
        setPreloadProgress({ stage: 'starting', message: 'Starting pre-load...' });

        try {
            // Step 1: Download table data
            const tableResults = await preloadAllData((progress) => {
                setPreloadProgress(progress);
            });

            // Step 2: Download files (PDFs, etc.)
            setPreloadProgress({ stage: 'files', message: 'Downloading files...' });
            await preloadFiles((progress) => {
                setPreloadProgress(progress);
            });

            // Refresh status
            await loadStatus();

            setPreloadProgress({
                stage: 'done',
                message: `✅ Pre-load complete! ${tableResults.totalRecords} records downloaded.`,
            });
        } catch (e) {
            setError(e.message);
            setPreloadProgress(null);
        } finally {
            setIsPreloading(false);
        }
    };

    // Handle clear offline data
    const handleClearData = async () => {
        if (!confirm('This will delete all offline data. Are you sure?')) return;
        try {
            await clearOfflineData();
            setPreloadStatus(null);
            setStorageUsage(null);
            setPreloadProgress(null);
            await loadStatus();
        } catch (e) {
            setError(e.message);
        }
    };

    // Toggle offline mode
    const handleToggleMode = () => {
        if (isOfflineHub) {
            disableLocalHub();
        } else {
            enableLocalHub();
        }
    };

    // Start Local Server (Sync to JSON DB)
    const handleStartLocalServer = async () => {
        setIsStartingServer(true);
        setError(null);
        setServerStatus(null);
        try {
            // Get all data from IndexedDB
            const allData = await offlineDB.getAllData();

            // Push to local server
            const res = await fetch('/api/local/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allData)
            });

            const json = await res.json();

            if (res.ok && json.success) {
                setServerStatus({
                    success: true,
                    message: '✅ Local Server is Live! Students can now connect and login.'
                });
            } else {
                throw new Error(json.error || 'Failed to start local server');
            }
        } catch (e) {
            console.error('Local server error:', e);
            setError(`Failed to start local server: ${e.message}`);
        } finally {
            setIsStartingServer(false);
        }
    };

    const modeColors = {
        'online': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
        'local-hub': { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
        'offline': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
    };

    const colors = modeColors[networkMode] || modeColors.offline;

    return (
        <div className="space-y-6">
            {/* Network Status Card */}
            <div className={`rounded-2xl ${colors.bg} ${colors.border} border-2 p-5`}>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors.dot} animate-pulse`} />
                        <h3 className={`font-bold text-lg ${colors.text}`}>
                            {networkMode === 'online' ? '🌐 Online' :
                                networkMode === 'local-hub' ? '📡 Local Hub Mode' :
                                    '🔴 Offline'}
                        </h3>
                    </div>
                    <button
                        onClick={handleToggleMode}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${isOfflineHub
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                            }`}
                    >
                        {isOfflineHub ? '🌐 Go Online' : '📡 Go Offline'}
                    </button>
                </div>
                <p className={`text-sm ${colors.text} opacity-80`}>
                    {networkMode === 'online'
                        ? 'Connected to Supabase cloud. All data syncs in real-time.'
                        : networkMode === 'local-hub'
                            ? 'Running in local mode. Students can connect to your WiFi and access the app via your local IP.'
                            : 'No internet connection detected.'}
                </p>
            </div>
            {/* Local Server Control (Only in Local Hub Mode) */}
            {isOfflineHub && (
                <div className="bg-indigo-50 rounded-2xl border-2 border-indigo-200 p-5">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-indigo-800">
                        🚀 Local Server
                    </h3>
                    <p className="text-sm text-indigo-700 mb-4">
                        Push your data to the local server so students can login.
                        Do this whenever you add new quizzes or update content.
                    </p>

                    <button
                        onClick={handleStartLocalServer}
                        disabled={isStartingServer}
                        className="w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold 
                                   hover:bg-indigo-700 active:scale-[0.98] transition-all
                                   disabled:opacity-50 disabled:cursor-not-allowed
                                   flex items-center justify-center gap-2"
                    >
                        {isStartingServer ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                Starting Server...
                            </>
                        ) : (
                            <>
                                📡 Update Local Server Data
                            </>
                        )}
                    </button>

                    {serverStatus && (
                        <div className="mt-3 p-3 bg-white/60 rounded-xl text-emerald-700 font-medium text-sm border border-emerald-100">
                            {serverStatus.message}
                        </div>
                    )}
                </div>
            )}

            {/* Pre-load Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    📦 Prepare for Offline
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Download all class data, quizzes, books, and student records for offline use.
                    Do this while you have internet access.
                </p>

                {/* Pre-load Button */}
                <button
                    onClick={handlePreload}
                    disabled={isPreloading || isOfflineHub}
                    className="w-full py-3 px-4 rounded-xl bg-blue-500 text-white font-bold 
                               hover:bg-blue-600 active:scale-[0.98] transition-all
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                >
                    {isPreloading ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Downloading...
                        </>
                    ) : (
                        <>
                            ⬇️ Download Data for Offline Use
                        </>
                    )}
                </button>

                {isOfflineHub && (
                    <p className="text-xs text-amber-600 mt-2 text-center">
                        ⚠️ Switch to Online mode first to download fresh data.
                    </p>
                )}

                {/* Progress Bar */}
                {preloadProgress && preloadProgress.stage !== 'done' && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{preloadProgress.message}</span>
                            {preloadProgress.total > 0 && (
                                <span>{preloadProgress.current}/{preloadProgress.total}</span>
                            )}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: preloadProgress.total > 0
                                        ? `${(preloadProgress.current / preloadProgress.total) * 100}%`
                                        : '0%'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Success Message */}
                {preloadProgress?.stage === 'done' && (
                    <div className="mt-4 p-3 bg-emerald-50 rounded-xl text-emerald-700 text-sm">
                        {preloadProgress.message}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
                        ❌ {error}
                    </div>
                )}
            </div>

            {/* Pre-load Status */}
            {preloadStatus && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        📊 Offline Data Status
                    </h3>

                    <div className="text-sm text-gray-500 mb-3">
                        Last downloaded: {new Date(preloadStatus.completedAt).toLocaleString()}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {Object.entries(preloadStatus.currentCounts || {}).map(([table, count]) => (
                            count > 0 && (
                                <div key={table} className="bg-gray-50 rounded-lg p-2 text-center">
                                    <div className="text-lg font-bold text-gray-800">{count}</div>
                                    <div className="text-xs text-gray-500 capitalize">
                                        {table.replace(/_/g, ' ')}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                        Total: {preloadStatus.totalRecords} records
                    </div>
                </div>
            )}

            {/* Storage Usage */}
            {storageUsage && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        💾 Storage Usage
                    </h3>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-blue-500 h-3 rounded-full transition-all"
                                style={{ width: `${Math.min(parseFloat(storageUsage.percentUsed), 100)}%` }}
                            />
                        </div>
                        <span className="text-sm text-gray-600 font-medium">
                            {storageUsage.usageMB} MB
                        </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                        {storageUsage.percentUsed}% of {storageUsage.quotaMB} MB available
                    </div>
                </div>
            )}

            {/* Clear Data */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    🗑️ Clear Offline Data
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                    Remove all downloaded offline data from this device.
                </p>
                <button
                    onClick={handleClearData}
                    className="px-4 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm
                               hover:bg-red-100 transition-colors"
                >
                    Clear All Offline Data
                </button>
            </div>
        </div>
    );
}
