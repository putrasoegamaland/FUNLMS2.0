'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserProgress, updateUserProgress } from '@/hooks/useSupabaseData';
import { defaultBadges, conditionTypes } from '@/config/gamification';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const GameContext = createContext(null);

export function GameProvider({ children }) {
    const [progress, setProgress] = useState(null);
    const [config, setConfig] = useState({
        xpPerCorrect: 10,
        xpPerfectBonus: 20,
        xpPerLevel: 100,
        streakBonuses: { 3: 1.1, 7: 1.25, 30: 1.5 },
    });
    const [badges, setBadges] = useState(defaultBadges);
    const [userId, setUserId] = useState(null);

    // Load progress when userId changes
    useEffect(() => {
        const loadProgress = async () => {
            if (!userId) return;

            try {
                const userProgress = await getUserProgress(userId);
                setProgress(userProgress || { xp: 0, total_xp: 0, level: 1, streak: 0, badges: [] });

                // Load gamification config from Supabase
                if (isSupabaseConfigured() && supabase) {
                    const { data: configData } = await supabase
                        .from('gamification_config')
                        .select('*')
                        .limit(1)
                        .single();

                    if (configData) {
                        setConfig({
                            xpPerCorrect: configData.xp_per_correct || 10,
                            xpPerfectBonus: configData.xp_perfect_bonus || 20,
                            xpPerLevel: configData.xp_per_level || 100,
                            streakBonuses: configData.streak_bonuses || { 3: 1.1, 7: 1.25, 30: 1.5 },
                        });
                    }

                    // Load badges from Supabase
                    const { data: badgesData } = await supabase
                        .from('badges')
                        .select('*')
                        .eq('is_active', true);

                    if (badgesData && badgesData.length > 0) {
                        setBadges(badgesData);
                    }
                }
            } catch (e) {
                console.error('Error loading game progress:', e);
            }
        };

        loadProgress();
    }, [userId]);

    // Initialize with user ID
    const initForUser = useCallback((id) => {
        setUserId(id);
    }, []);

    // Check and unlock badges
    const checkBadgeUnlocks = useCallback(async (currentProgress) => {
        if (!currentProgress || !badges) return [];

        const unlockedBadgeIds = currentProgress.badges || [];
        const newUnlocks = [];

        badges.forEach(badge => {
            if (!badge.is_active || unlockedBadgeIds.includes(badge.id)) return;

            let unlocked = false;
            const conditionType = badge.condition_type;
            const conditionValue = badge.condition_value;

            switch (conditionType) {
                case conditionTypes.TOTAL_XP:
                case 'total_xp':
                    unlocked = (currentProgress.total_xp || 0) >= conditionValue;
                    break;
                case conditionTypes.LEVEL:
                case 'level':
                    unlocked = currentProgress.level >= conditionValue;
                    break;
                case conditionTypes.STREAK:
                case 'streak':
                    unlocked = currentProgress.streak >= conditionValue;
                    break;
            }

            if (unlocked) {
                newUnlocks.push(badge);
                currentProgress.badges = [...unlockedBadgeIds, badge.id];
            }
        });

        if (newUnlocks.length > 0) {
            await updateUserProgress(userId, currentProgress);
            setProgress({ ...currentProgress });
        }

        return newUnlocks;
    }, [badges, userId]);

    // Award XP
    const awardXP = useCallback(async (amount, subject = null) => {
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

        // Calculate new progress
        const currentXp = progress?.xp || 0;
        const currentTotalXp = progress?.total_xp || 0;
        const currentLevel = progress?.level || 1;

        let newXp = currentXp + finalAmount;
        let newLevel = currentLevel;

        // Level up logic
        while (newXp >= config.xpPerLevel) {
            newXp -= config.xpPerLevel;
            newLevel += 1;
        }

        // Update subject XP
        const subjectXp = progress?.subject_xp || {};
        if (subject) {
            subjectXp[subject] = (subjectXp[subject] || 0) + finalAmount;
        }

        const updatedProgress = {
            ...progress,
            xp: newXp,
            total_xp: currentTotalXp + finalAmount,
            level: newLevel,
            subject_xp: subjectXp,
        };

        // Save to Supabase
        await updateUserProgress(userId, updatedProgress);
        setProgress(updatedProgress);

        // Check for new badge unlocks
        await checkBadgeUnlocks(updatedProgress);

        return { xpAwarded: finalAmount, newProgress: updatedProgress };
    }, [userId, progress, config, checkBadgeUnlocks]);

    // Update streak
    const updateStreak = useCallback(async () => {
        if (!userId || !progress) return;

        const today = new Date().toDateString();
        const lastActive = progress.last_activity_date ? new Date(progress.last_activity_date).toDateString() : null;

        if (lastActive === today) return progress.streak;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = 1;
        if (lastActive === yesterday.toDateString()) {
            newStreak = progress.streak + 1;
        }

        const updatedProgress = {
            ...progress,
            streak: newStreak,
            last_activity_date: new Date().toISOString(),
        };

        await updateUserProgress(userId, updatedProgress);
        setProgress(updatedProgress);
        await checkBadgeUnlocks(updatedProgress);

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
        return badges.filter(b => !progress.badges.includes(b.id) && b.is_active);
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
        totalXp: progress?.total_xp || 0,
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
