'use client';

/**
 * Sync Panel Component
 * Teacher-facing panel for syncing offline data to the cloud
 */

import { useState, useEffect } from 'react';
import { useNetwork } from '@/contexts/NetworkContext';
import { syncToCloud, getSyncStats, getSyncHistory } from '@/lib/syncEngine';

export default function SyncPanel() {
    const { isOnline, isOfflineHub, updateSyncStatus } = useNetwork();
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(null);
    const [syncStats, setSyncStats] = useState(null);
    const [syncHistory, setSyncHistory] = useState([]);
    const [error, setError] = useState(null);

    // Load stats on mount and periodically
    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            const stats = await getSyncStats();
            setSyncStats(stats);
            updateSyncStatus({ pendingChanges: stats.totalPending });
            setSyncHistory(getSyncHistory());
        } catch (e) {
            console.error('Error loading sync stats:', e);
        }
    };

    // Handle sync
    const handleSync = async () => {
        setIsSyncing(true);
        setError(null);
        setSyncProgress({ stage: 'starting', message: 'Starting sync...' });
        updateSyncStatus({ isSyncing: true });

        try {
            const results = await syncToCloud((progress) => {
                setSyncProgress(progress);
            });

            updateSyncStatus({
                isSyncing: false,
                lastSyncTime: new Date().toISOString(),
                pendingChanges: results.failed,
            });

            await loadStats();
        } catch (e) {
            setError(e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const tableEmojis = {
        users: '👤', classes: '🏫', enrollments: '📝',
        books: '📚', assessments: '📋', attempts: '✏️',
        assignments: '📄', submissions: '📨', videos: '🎥',
        badges: '🏅', progress: '📈', subjects: '📗',
        teacher_notifications: '🔔', teacher_activity: '📊',
        student_activity: '🎮', questions: '❓', question_bank: '🗂️',
    };

    return (
        <div className="space-y-6">
            {/* Pending Changes Card */}
            <div className={`rounded-2xl p-5 border-2 ${syncStats?.totalPending > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">
                        {syncStats?.totalPending > 0 ? '📤 Pending Changes' : '✅ All Synced'}
                    </h3>
                    <span className={`text-2xl font-bold ${syncStats?.totalPending > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                        {syncStats?.totalPending || 0}
                    </span>
                </div>

                {syncStats?.totalPending > 0 && (
                    <div className="space-y-1 mb-4">
                        {Object.entries(syncStats.byStore || {}).map(([store, count]) => (
                            <div key={store} className="flex items-center justify-between text-sm text-amber-700">
                                <span>{tableEmojis[store] || '📁'} {store.replace(/_/g, ' ')}</span>
                                <span className="font-medium">{count} change{count > 1 ? 's' : ''}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Sync Button */}
                <button
                    onClick={handleSync}
                    disabled={isSyncing || !syncStats?.totalPending || isOfflineHub}
                    className="w-full py-3 px-4 rounded-xl bg-blue-500 text-white font-bold 
                               hover:bg-blue-600 active:scale-[0.98] transition-all
                               disabled:opacity-50 disabled:cursor-not-allowed
                               flex items-center justify-center gap-2"
                >
                    {isSyncing ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Syncing...
                        </>
                    ) : (
                        <>
                            ☁️ Sync to Cloud
                        </>
                    )}
                </button>

                {isOfflineHub && syncStats?.totalPending > 0 && (
                    <p className="text-xs text-amber-600 mt-2 text-center">
                        ⚠️ Switch to Online mode first to sync data to the cloud.
                    </p>
                )}
            </div>

            {/* Sync Progress */}
            {syncProgress && syncProgress.stage !== 'complete' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>{syncProgress.message}</span>
                        {syncProgress.total > 0 && (
                            <span>{syncProgress.current}/{syncProgress.total}</span>
                        )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{
                                width: syncProgress.total > 0
                                    ? `${(syncProgress.current / syncProgress.total) * 100}%`
                                    : '0%'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Sync Result */}
            {syncProgress?.stage === 'complete' && (
                <div className={`p-4 rounded-xl text-sm ${syncProgress.message.includes('failed')
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}>
                    {syncProgress.message}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 rounded-xl text-red-600 text-sm">
                    ❌ {error}
                </div>
            )}

            {/* Sync History */}
            {syncHistory.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-lg mb-3">📜 Sync History</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {syncHistory.slice(0, 10).map((record) => (
                            <div key={record.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-gray-600">
                                        {new Date(record.completedAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-emerald-600 font-medium">
                                        ✅ {record.results.synced}
                                    </span>
                                    {record.results.failed > 0 && (
                                        <span className="text-red-500 font-medium">
                                            ❌ {record.results.failed}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
