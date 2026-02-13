'use client';

/**
 * Teacher Offline Management Page
 * Central hub for managing offline/local-hub mode
 */

import { useAuth } from '@/contexts/AuthContext';
import OfflineToolkit from '@/components/OfflineToolkit';
import SyncPanel from '@/components/SyncPanel';
import { useNetwork } from '@/contexts/NetworkContext';
import { useState, useEffect } from 'react';

export default function OfflinePage() {
    const { user } = useAuth();
    const { networkMode, isOfflineHub } = useNetwork();
    const [localIP, setLocalIP] = useState('');

    // Try to detect local IP for display
    useEffect(() => {
        const fetchIP = async () => {
            try {
                const res = await fetch('/api/network-ip');
                const data = await res.json();
                if (data.ip) {
                    setLocalIP(data.ip);
                } else {
                    setLocalIP(window.location.hostname);
                }
            } catch (e) {
                console.error('Failed to fetch local IP:', e);
                setLocalIP(window.location.hostname);
            }
        };

        fetchIP();
    }, []);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    📡 Offline Hub Management
                </h1>
                <p className="text-gray-500 mt-1">
                    Set up your device as a local server for classroom use without internet.
                </p>
            </div>

            {/* Quick Guide */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mb-6">
                <h3 className="font-bold text-blue-800 mb-3">🚀 Quick Setup Guide</h3>
                <ol className="space-y-2 text-sm text-blue-700">
                    <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                        <span><strong>While online:</strong> Click &quot;Download Data for Offline Use&quot; below</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                        <span><strong>Create a hotspot</strong> from your phone or use a portable WiFi router</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                        <span><strong>Click &quot;Go Offline&quot;</strong> to switch to local hub mode</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                        <span><strong>Students connect</strong> to your hotspot and visit your local IP address</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">5</span>
                        <span><strong>After class:</strong> Switch back online and click &quot;Sync to Cloud&quot;</span>
                    </li>
                </ol>

                {/* Show access URL when in local-hub mode */}
                {isOfflineHub && (
                    <div className="mt-4 p-3 bg-white/70 rounded-xl border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">🔗 Students should open:</p>
                        <p className="text-lg font-mono font-bold text-blue-800">
                            http://{localIP}:{typeof window !== 'undefined' ? window.location.port || '3001' : '3001'}
                        </p>
                        <p className="text-xs text-blue-500 mt-1">
                            Share this address with your students after they connect to your WiFi.
                        </p>
                    </div>
                )}
            </div>

            {/* Two-column layout for Toolkit and Sync */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-700 mb-3">📦 Offline Data</h2>
                    <OfflineToolkit />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-700 mb-3">☁️ Cloud Sync</h2>
                    <SyncPanel />
                </div>
            </div>
        </div>
    );
}
