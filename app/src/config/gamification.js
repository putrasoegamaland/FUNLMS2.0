/**
 * FunLMS Kids - Gamification Configuration
 * Admin-editable XP rules and badge definitions
 */

// Default XP settings (can be overridden by admin)
export const defaultXPConfig = {
    xpPerCorrect: 10,
    xpPerfectBonus: 20,
    xpPerLevel: 100,
    streakBonuses: {
        3: 1.1,   // 10% bonus at 3-day streak
        7: 1.25,  // 25% bonus at 7-day streak
        14: 1.35, // 35% bonus at 14-day streak
        30: 1.5,  // 50% bonus at 30-day streak
    },
};

// Default badge definitions
export const defaultBadges = [
    {
        id: 'great_reader',
        name: 'Great Reader',
        emoji: '📚',
        description: 'Complete 5 quizzes',
        condition: { type: 'quiz_count', value: 5 },
        isActive: true,
    },
    {
        id: 'math_star',
        name: 'Math Star',
        emoji: '🔢',
        description: 'Earn 100 XP in Math',
        condition: { type: 'subject_xp', subject: 'math', value: 100 },
        isActive: true,
    },
    {
        id: 'young_scientist',
        name: 'Young Scientist',
        emoji: '🔬',
        description: 'Earn 100 XP in Science',
        condition: { type: 'subject_xp', subject: 'science', value: 100 },
        isActive: true,
    },
    {
        id: 'word_wizard',
        name: 'Word Wizard',
        emoji: '✏️',
        description: 'Earn 100 XP in English',
        condition: { type: 'subject_xp', subject: 'english', value: 100 },
        isActive: true,
    },
    {
        id: 'streak_3',
        name: '3-Day Streak',
        emoji: '🔥',
        description: 'Login 3 days in a row',
        condition: { type: 'streak', value: 3 },
        isActive: true,
    },
    {
        id: 'streak_7',
        name: '7-Day Streak',
        emoji: '🔥',
        description: 'Login 7 days in a row',
        condition: { type: 'streak', value: 7 },
        isActive: true,
    },
    {
        id: 'streak_30',
        name: '30-Day Streak',
        emoji: '🔥',
        description: 'Login 30 days in a row',
        condition: { type: 'streak', value: 30 },
        isActive: true,
    },
    {
        id: 'perfect_score',
        name: 'Perfect Score',
        emoji: '💯',
        description: 'Get 100% on a quiz',
        condition: { type: 'perfect_score', value: 1 },
        isActive: true,
    },
    {
        id: 'level_5',
        name: 'Level 5',
        emoji: '⭐',
        description: 'Reach level 5',
        condition: { type: 'level', value: 5 },
        isActive: true,
    },
    {
        id: 'level_10',
        name: 'Level 10',
        emoji: '🌟',
        description: 'Reach level 10',
        condition: { type: 'level', value: 10 },
        isActive: true,
    },
    {
        id: 'early_bird',
        name: 'Early Bird',
        emoji: '🐦',
        description: 'Complete a quiz before 8 AM',
        condition: { type: 'time_based', before: '08:00' },
        isActive: true,
    },
];

// Badge condition types
export const conditionTypes = {
    QUIZ_COUNT: 'quiz_count',        // Complete X quizzes
    SUBJECT_XP: 'subject_xp',        // Earn X XP in a subject
    TOTAL_XP: 'total_xp',            // Earn X total XP
    STREAK: 'streak',                // Reach X-day streak
    PERFECT_SCORE: 'perfect_score',  // Get X perfect scores
    LEVEL: 'level',                  // Reach level X
    TIME_BASED: 'time_based',        // Complete at specific time
    CUSTOM: 'custom',                // Custom logic
};

export default {
    defaultXPConfig,
    defaultBadges,
    conditionTypes,
};
