'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsTablet, useIsMobile } from '@/hooks/useMediaQuery';
import Sidebar from './Sidebar';

/**
 * Responsive layout wrapper that switches between:
 * - Mobile: Bottom navigation
 * - Tablet: Collapsible sidebar
 * - Desktop: Fixed sidebar
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {React.ReactNode} props.header - Header content
 * @param {Array} props.navItems - Navigation items array
 * @param {string} props.role - User role (student/teacher/admin)
 */
export default function ResponsiveLayout({ children, header, navItems = [], role = 'teacher' }) {
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [isClient, setIsClient] = useState(false);

    // Handle hydration
    useEffect(() => {
        setIsClient(true);
        // Auto-collapse on tablet
        if (isTablet && !isMobile) {
            setSidebarCollapsed(true);
        }
    }, [isTablet, isMobile]);

    // Determine sidebar width for main content margin
    const sidebarWidth = sidebarCollapsed ? 64 : 224; // 16 * 4 = 64, 14 * 16 = 224

    // During SSR or initial load, render mobile layout to avoid hydration mismatch
    if (!isClient) {
        return (
            <div className="min-h-screen bg-background-light">
                {header}
                <main className="max-w-md mx-auto pb-24">
                    {children}
                </main>
                <BottomNav navItems={navItems} />
            </div>
        );
    }

    // Mobile view - bottom navigation
    if (isMobile) {
        return (
            <div className="min-h-screen bg-background-light">
                {header}
                <main className="max-w-md mx-auto pb-24">
                    {children}
                </main>
                <BottomNav navItems={navItems} />
            </div>
        );
    }

    // Tablet/Desktop view - sidebar navigation
    return (
        <div className="min-h-screen bg-background-light">
            {/* Sidebar */}
            <Sidebar
                navItems={navItems}
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                role={role}
            />

            {/* Main content area with sidebar offset */}
            <div
                className="transition-all duration-300"
                style={{ marginLeft: sidebarWidth }}
            >
                {/* Desktop Header */}
                <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                    <div className="max-w-6xl mx-auto px-6 py-3">
                        {header}
                    </div>
                </header>

                {/* Content */}
                <main className="max-w-6xl mx-auto px-6 py-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

/**
 * Bottom navigation for mobile view
 */
function BottomNav({ navItems = [] }) {
    const pathname = usePathname();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-50">
            <div className="max-w-md mx-auto flex justify-around items-center py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 p-2 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    fontSize: 24,
                                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0"
                                }}
                            >
                                {item.icon}
                            </span>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
