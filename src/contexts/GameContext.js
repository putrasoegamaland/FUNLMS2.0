'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import storage from '@/lib/storage';
import { defaultBadges, conditionTypes } from '@/config/gamification';

const GameContext = createContext(null);

export function GameProvider({ children }) {
    const [progress, setProgress] = useState(null);
    const [config, setConfig] = useState(null);
    const [badges, setBadges] = useState([]);
    const [userId, setUserId] = useState(null);

    // Load progress when userId changes
    useEffect(() => {
        if (userId) {
            const userProgress = storage.progress.get(userId);
            setProgress(userProgress);

            const gamificationConfig = storage.gamificationConfig.get();
            setConfig(gamificationConfig);

            const allBadges = storage.badges.getAll();
            setBadges(allBadges.length > 0 ? allBadges : defaultBadges);
        }
    }, [userId]);

    // Initialize with user ID
    const initForUser = useCallback((id) => {
        setUserId(id);
    }, []);

    // Award XP
    const awardXP = useCallback((amount, subject = null) => {
        if (!userId) return null;

        // Apply streak bonus
        let finalAmount = amount;
        if (progress && config?.streakBonuses) {
            const sortedStreaks = Object.keys(config.streakBonuses)
                .map(Number)
                .sort((a, b) => b - a);

            for (const streak of sortedStreaks) {
                if (progress.streak >= streak) {
                    finalAmount = Math.floor(amount * config.streakBonuses[streak]);
                    break;
                }
            }
        }

        const updatedProgress = storage.progress.addXP(userId, finalAmount, subject);
        setProgress(updatedProgress);

        // Check for new badge unlocks
        checkBadgeUnlocks(updatedProgress);

        return { xpAwarded: finalAmount, newProgress: updatedProgress };
    }, [userId, progress, config]);

    // Check and unlock badges
    const checkBadgeUnlocks = useCallback((currentProgress) => {
        if (!currentProgress || !badges) return [];

        const unlockedBadgeIds = currentProgress.badges || [];
        const newUnlocks = [];

        badges.forEach(badge => {
            if (!badge.isActive || unlockedBadgeIds.includes(badge.id)) return;

            let unlocked = false;
            const { condition } = badge;

            switch (condition.type) {
                case conditionTypes.TOTAL_XP:
                    unlocked = currentProgress.totalXp >= condition.value;
                    break;
                case conditionTypes.SUBJECT_XP:
                    unlocked = (currentProgress.subjectXp?.[condition.subject] || 0) >= condition.value;
                    break;
                case conditionTypes.LEVEL:
                    unlocked = currentProgress.level >= condition.value;
                    break;
                case conditionTypes.STREAK:
                    unlocked = currentProgress.streak >= condition.value;
                    break;
                // Add more condition types as needed
            }

            if (unlocked) {
                newUnlocks.push(badge);
                currentProgress.badges = [...unlockedBadgeIds, badge.id];
            }
        });

        if (newUnlocks.length > 0) {
            storage.progress.set(userId, currentProgress);
            setProgress({ ...currentProgress });
        }

        return newUnlocks;
    }, [badges, userId]);

    // Update streak
    const updateStreak = useCallback(() => {
        if (!userId || !progress) return;

        const today = new Date().toDateString();
        const lastActive = progress.lastActiveDate ? new Date(progress.lastActiveDate).toDateString() : null;

        if (lastActive === today) return progress.streak; // Already updated today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = 1;
        if (lastActive === yesterday.toDateString()) {
            newStreak = progress.streak + 1;
        }

        const updatedProgress = {
            ...progress,
            streak: newStreak,
            lastActiveDate: new Date().toISOString(),
        };

        storage.progress.set(userId, updatedProgress);
        setProgress(updatedProgress);
        checkBadgeUnlocks(updatedProgress);

        return newStreak;
    }, [userId, progress, checkBadgeUnlocks]);

    // Get unlocked badges
    const getUnlockedBadges = useCallback(() => {
        if (!progress?.badges) return [];
        return badges.filter(b => progress.badges.includes(b.id));
    }, [progress, badges]);

    // Get locked badges with progress
    const getLockedBadges = useCallback(() => {
        if (!progress?.badges) return badges;
        return badges.filter(b => !progress.badges.includes(b.id) && b.isActive);
    }, [progress, badges]);

    const value = {
        progress,
        config,
        badges,
        initForUser,
        awardXP,
        updateStreak,
        getUnlockedBadges,
        getLockedBadges,
        checkBadgeUnlocks,
        xp: progress?.xp || 0,
        level: progress?.level || 1,
        streak: progress?.streak || 0,
        totalXp: progress?.totalXp || 0,
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
}

export default GameContext;
