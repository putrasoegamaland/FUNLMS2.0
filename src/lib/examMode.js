/**
 * FunLMS Kids - Exam Mode Utilities
 * Tab lock, violation detection, and exam enforcement
 */

/**
 * Create an exam mode controller
 * @param {Object} options
 * @param {number} options.maxViolations - Auto-submit after this many violations (0 = disabled)
 * @param {boolean} options.showWarning - Show warning on first violation
 * @param {Function} options.onViolation - Callback when violation occurs
 * @param {Function} options.onMaxViolations - Callback when max violations reached
 */
export function createExamMode(options = {}) {
    const {
        maxViolations = 3,
        showWarning = true,
        onViolation = () => { },
        onMaxViolations = () => { },
    } = options;

    let violations = [];
    let isActive = false;
    let hasWarnedOnce = false;

    const handleVisibilityChange = () => {
        if (!isActive) return;

        if (document.hidden) {
            const violation = {
                type: 'tab_switch',
                at: new Date().toISOString(),
            };
            violations.push(violation);
            onViolation(violation, violations.length);

            if (maxViolations > 0 && violations.length >= maxViolations) {
                onMaxViolations(violations);
            }

            hasWarnedOnce = true;
        }
    };

    const handleWindowBlur = () => {
        if (!isActive) return;

        const violation = {
            type: 'window_blur',
            at: new Date().toISOString(),
        };
        violations.push(violation);
        onViolation(violation, violations.length);

        if (maxViolations > 0 && violations.length >= maxViolations) {
            onMaxViolations(violations);
        }

        hasWarnedOnce = true;
    };

    return {
        /**
         * Start exam mode - begin monitoring
         */
        start() {
            isActive = true;
            violations = [];
            hasWarnedOnce = false;

            document.addEventListener('visibilitychange', handleVisibilityChange);
            window.addEventListener('blur', handleWindowBlur);

            // Disable right-click and common shortcuts
            document.addEventListener('contextmenu', this.preventDefault);
            document.addEventListener('keydown', this.handleKeydown);
        },

        /**
         * Stop exam mode - stop monitoring
         */
        stop() {
            isActive = false;

            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('contextmenu', this.preventDefault);
            document.removeEventListener('keydown', this.handleKeydown);
        },

        /**
         * Prevent default action
         */
        preventDefault(e) {
            e.preventDefault();
        },

        /**
         * Block certain keyboard shortcuts
         */
        handleKeydown(e) {
            // Block Ctrl+Tab, Alt+Tab hints, F12, etc.
            if (
                (e.ctrlKey && e.key === 'Tab') ||
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.key === 'u')
            ) {
                e.preventDefault();
            }
        },

        /**
         * Get current violations
         */
        getViolations() {
            return [...violations];
        },

        /**
         * Get violation count
         */
        getViolationCount() {
            return violations.length;
        },

        /**
         * Check if should show first warning
         */
        shouldShowWarning() {
            return showWarning && violations.length === 1 && !hasWarnedOnce;
        },

        /**
         * Check if max violations reached
         */
        isMaxViolationsReached() {
            return maxViolations > 0 && violations.length >= maxViolations;
        },
    };
}

/**
 * Check if a quiz/assessment is accessible based on scheduling
 * @param {Object} assessment
 * @param {string} assessment.startAt - ISO date string
 * @param {string} assessment.endAt - ISO date string (optional)
 * @returns {Object} { accessible: boolean, reason: string, countdown: number }
 */
export function checkAccessibility(assessment) {
    const now = new Date();

    if (!assessment) {
        return { accessible: false, reason: 'Assessment not found', countdown: 0 };
    }

    // Check start time
    const start = assessment.start_date || assessment.startAt;
    if (start) {
        const startDate = new Date(start);
        if (now < startDate) {
            const countdown = Math.ceil((startDate - now) / 1000); // seconds until start
            return {
                accessible: false,
                reason: 'not_started',
                countdown,
                startAt: startDate.toLocaleString(), // standardized return key
            };
        }
    }

    // Check end time (for quizzes and essays, not written exams)
    const end = assessment.due_date || assessment.endAt;
    if (end && assessment.type !== 'written_exam') {
        const endDate = new Date(end);
        if (now > endDate) {
            return {
                accessible: false,
                reason: 'expired',
                countdown: 0,
                endAt: endDate.toLocaleString(), // standardized return key
            };
        }
    }

    return { accessible: true, reason: 'available', countdown: 0 };
}

/**
 * Format countdown time
 * @param {number} seconds
 * @returns {string}
 */
export function formatCountdown(seconds) {
    if (seconds <= 0) return '0:00';

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) {
        return `${days}d ${hours}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    return `0:${secs.toString().padStart(2, '0')}`;
}

export default {
    createExamMode,
    checkAccessibility,
    formatCountdown,
};
