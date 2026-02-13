'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

/**
 * Sidebar navigation for tablet/desktop views
 * @param {Object} props
 * @param {Array} props.navItems - Array of {href, icon, label}
 * @param {boolean} props.collapsed - Whether sidebar is collapsed (icons only)
 * @param {Function} props.onToggle - Toggle collapsed state
 * @param {string} props.role - User role for styling (student/teacher/admin)
 */
export default function Sidebar({ navItems = [], collapsed = false, onToggle, role = 'teacher' }) {
    const pathname = usePathname();
    const [networkMode, setNetworkMode] = useState('online');

    // Read network mode from localStorage
    useEffect(() => {
        const checkMode = () => {
            const mode = localStorage.getItem('funlms_network_mode');
            setNetworkMode(mode === 'local-hub' ? 'local-hub' : (navigator.onLine ? 'online' : 'offline'));
        };
        checkMode();
        const interval = setInterval(checkMode, 3000);
        window.addEventListener('online', checkMode);
        window.addEventListener('offline', checkMode);
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', checkMode);
            window.removeEventListener('offline', checkMode);
        };
    }, []);

    const roleColors = {
        student: 'from-green-500 to-emerald-600',
        teacher: 'from-blue-500 to-indigo-600',
        admin: 'from-purple-500 to-violet-600',
    };

    const roleIcons = {
        student: '🎮',
        teacher: '👩‍🏫',
        admin: '👨‍💼',
    };

    return (
        <aside
            className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-lg z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'
                }`}
        >
            {/* Logo/Brand */}
            <div className={`h-16 flex items-center border-b border-gray-100 ${collapsed ? 'justify-center px-2' : 'px-4'}`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleColors[role]} flex items-center justify-center text-white text-xl shadow-lg`}>
                    {roleIcons[role]}
                </div>
                {!collapsed && (
                    <div className="ml-3">
                        <h1 className="font-bold text-gray-900">FunLMS</h1>
                        <p className="text-xs text-gray-500 capitalize">{role} Portal</p>
                    </div>
                )}
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                        ? `bg-gradient-to-r ${roleColors[role]} text-white shadow-md`
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                        }`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <span
                                        className="material-symbols-outlined flex-shrink-0"
                                        style={{
                                            fontSize: 22,
                                            fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"
                                        }}
                                    >
                                        {item.icon}
                                    </span>
                                    {!collapsed && (
                                        <span className="font-medium text-sm truncate">
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Network Status Indicator */}
            <div className={`px-2 mb-2 ${collapsed ? 'text-center' : ''}`}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${networkMode === 'online' ? 'bg-emerald-50 text-emerald-700' :
                        networkMode === 'local-hub' ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                    }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${networkMode === 'online' ? 'bg-emerald-500' :
                            networkMode === 'local-hub' ? 'bg-amber-500 animate-pulse' :
                                'bg-red-500'
                        }`} />
                    {!collapsed && (
                        <span>
                            {networkMode === 'online' ? '🌐 Online' :
                                networkMode === 'local-hub' ? '📡 Local Hub' :
                                    '🔴 Offline'}
                        </span>
                    )}
                </div>
            </div>

            {/* Collapse Toggle Button */}
            <div className="px-2 pb-4">
                <button
                    onClick={onToggle}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    <span
                        className="material-symbols-outlined transition-transform duration-300"
                        style={{
                            fontSize: 20,
                            transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}
                    >
                        chevron_left
                    </span>
                    {!collapsed && <span className="text-sm">Collapse</span>}
                </button>
            </div>
        </aside>
    );
}
