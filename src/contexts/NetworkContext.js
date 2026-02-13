'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Network Mode Context
 * Manages the app's connectivity state: 'online', 'offline', or 'local-hub'
 * 
 * - online: Normal mode, Supabase is reachable
 * - local-hub: Teacher has activated offline mode, data routes to IndexedDB
 * - offline: No connectivity detected (auto-detected)
 */

const NetworkContext = createContext(null);

const NETWORK_MODE_KEY = 'funlms_network_mode';
const SYNC_STATUS_KEY = 'funlms_sync_status';

export function NetworkProvider({ children }) {
    const [networkMode, setNetworkMode] = useState('online'); // 'online' | 'offline' | 'local-hub'
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);
    const [syncStatus, setSyncStatus] = useState({
        pendingChanges: 0,
        lastSyncTime: null,
        isSyncing: false,
    });
    const pingIntervalRef = useRef(null);

    // Check if Supabase is reachable
    const checkConnection = useCallback(async () => {
        // If user manually set local-hub or guest-wifi mode, respect that
        const savedMode = localStorage.getItem(NETWORK_MODE_KEY);
        if (savedMode === 'local-hub') {
            setNetworkMode('local-hub');
            setIsCheckingConnection(false);
            return false;
        }
        if (savedMode === 'guest-wifi') {
            setNetworkMode('guest-wifi');
            setIsCheckingConnection(false);
            return false;
        }

        if (!isSupabaseConfigured() || !supabase) {
            setNetworkMode('offline');
            setIsCheckingConnection(false);
            return false;
        }

        try {
            // Simple ping — try to read from Supabase
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error && error.code !== 'PGRST116') {
                setNetworkMode('offline');
                setIsCheckingConnection(false);
                return false;
            }
            setNetworkMode('online');
            setIsCheckingConnection(false);
            return true;
        } catch (e) {
            setNetworkMode('offline');
            setIsCheckingConnection(false);
            return false;
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        const savedMode = localStorage.getItem(NETWORK_MODE_KEY);
        if (savedMode === 'local-hub') {
            setNetworkMode('local-hub');
            setIsCheckingConnection(false);
        } else if (savedMode === 'guest-wifi') {
            setNetworkMode('guest-wifi');
            setIsCheckingConnection(false);
        } else {
            checkConnection();
        }

        // Load sync status
        try {
            const saved = localStorage.getItem(SYNC_STATUS_KEY);
            if (saved) setSyncStatus(JSON.parse(saved));
        } catch (e) { /* ignore */ }

        // Periodic connectivity check (every 30 seconds) only if not in local-hub mode
        pingIntervalRef.current = setInterval(() => {
            const mode = localStorage.getItem(NETWORK_MODE_KEY);
            if (mode !== 'local-hub' && mode !== 'guest-wifi') {
                checkConnection();
            }
        }, 30000);

        // Listen for browser online/offline events
        const handleOnline = () => {
            const mode = localStorage.getItem(NETWORK_MODE_KEY);
            if (mode !== 'local-hub') checkConnection();
        };
        const handleOffline = () => {
            const mode = localStorage.getItem(NETWORK_MODE_KEY);
            if (mode !== 'local-hub') setNetworkMode('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            clearInterval(pingIntervalRef.current);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkConnection]);

    // Toggle to local-hub mode (teacher action)
    const enableLocalHub = useCallback(() => {
        setNetworkMode('local-hub');
        localStorage.setItem(NETWORK_MODE_KEY, 'local-hub');
    }, []);

    // Switch back to online mode
    const disableLocalHub = useCallback(async () => {
        localStorage.removeItem(NETWORK_MODE_KEY);
        await checkConnection();
    }, [checkConnection]);

    // Update sync status
    const updateSyncStatus = useCallback((updates) => {
        setSyncStatus(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const value = {
        networkMode,
        isOnline: networkMode === 'online',
        isOfflineHub: networkMode === 'local-hub',
        isGuestWifi: networkMode === 'guest-wifi',
        isOffline: networkMode === 'offline' || networkMode === 'local-hub',
        isLocalMode: networkMode === 'local-hub' || networkMode === 'guest-wifi',
        isCheckingConnection,
        syncStatus,
        enableLocalHub,
        disableLocalHub,
        checkConnection,
        updateSyncStatus,
    };

    return (
        <NetworkContext.Provider value={value}>
            {children}
        </NetworkContext.Provider>
    );
}

export function useNetwork() {
    const context = useContext(NetworkContext);
    if (!context) {
        throw new Error('useNetwork must be used within a NetworkProvider');
    }
    return context;
}

export default NetworkContext;
