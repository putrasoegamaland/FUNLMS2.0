'use client';

import { useState, useEffect } from 'react';

/**
 * Custom hook to detect media query matches
 * @param {string} query - CSS media query string
 * @returns {boolean} - Whether the media query matches
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        // Check if window is available (client-side)
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);

        // Set initial value
        setMatches(mediaQuery.matches);

        // Create event listener
        const handler = (event) => setMatches(event.matches);

        // Add listener
        mediaQuery.addEventListener('change', handler);

        // Cleanup
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/**
 * Check if screen is desktop size (>= 1024px)
 */
export function useIsDesktop() {
    return useMediaQuery('(min-width: 1024px)');
}

/**
 * Check if screen is tablet size (>= 768px)
 */
export function useIsTablet() {
    return useMediaQuery('(min-width: 768px)');
}

/**
 * Check if screen is mobile size (< 768px)
 */
export function useIsMobile() {
    return !useMediaQuery('(min-width: 768px)');
}

export default useMediaQuery;
