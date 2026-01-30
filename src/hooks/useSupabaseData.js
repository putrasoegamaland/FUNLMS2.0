/**
 * Custom hooks for Supabase data fetching
 * Provides async data loading with loading and error states
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Generic hook for fetching data from Supabase
function useSupabaseQuery(tableName, options = {}) {
    const { filter, orderBy = 'created_at', orderAsc = false, enabled = true } = options;
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Create a stable key for the filter to avoid infinite loops
    const filterKey = JSON.stringify(filter);

    const refetch = useCallback(async () => {
        if (!enabled || !isSupabaseConfigured() || !supabase) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let query = supabase.from(tableName).select('*');

            if (filter) {
                Object.entries(filter).forEach(([key, value]) => {
                    // Skip undefined values
                    if (value !== undefined && value !== null) {
                        query = query.eq(key, value);
                    }
                });
            }

            if (orderBy) {
                query = query.order(orderBy, { ascending: orderAsc });
            }

            const { data: result, error: queryError } = await query;

            if (queryError) throw queryError;
            setData(result || []);
        } catch (e) {
            console.error(`Error fetching ${tableName}:`, e);
            setError(e.message);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [tableName, filterKey, orderBy, orderAsc, enabled]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, loading, error, refetch };
}

// Hook to fetch a single item by ID
function useSupabaseItem(tableName, id) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!id || !isSupabaseConfigured() || !supabase) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data: result, error: queryError } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', id)
                .single();

            if (queryError) throw queryError;
            setData(result);
        } catch (e) {
            console.error(`Error fetching ${tableName} by ID:`, e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, [tableName, id]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { data, loading, error, refetch };
}

// ==================== SPECIFIC HOOKS ====================

export function useUsers(filter) {
    return useSupabaseQuery('users', { filter });
}

export function useClasses(filter) {
    return useSupabaseQuery('classes', { filter });
}

export function useEnrollments(filter) {
    return useSupabaseQuery('enrollments', { filter });
}

export function useAssessments(filter) {
    return useSupabaseQuery('assessments', { filter });
}

export function useAttempts(filter) {
    return useSupabaseQuery('attempts', { filter, orderBy: 'completed_at' });
}

export function useAssignments(filter) {
    return useSupabaseQuery('assignments', { filter });
}

export function useSubmissions(filter) {
    return useSupabaseQuery('submissions', { filter, orderBy: 'submitted_at' });
}

export function useVideos(filter) {
    return useSupabaseQuery('videos', { filter });
}

export function useBooks(filter) {
    return useSupabaseQuery('books', { filter });
}

export function useSubjects() {
    return useSupabaseQuery('subjects');
}

export function useBadges() {
    return useSupabaseQuery('badges');
}

export function useProgress(userId) {
    return useSupabaseQuery('progress', {
        filter: userId ? { user_id: userId } : undefined,
        enabled: !!userId
    });
}

// Fetch all progress records (for analytics)
export function useAllProgress() {
    return useSupabaseQuery('progress');
}

// Question Bank hooks
export function useQuestionBank(filter) {
    return useSupabaseQuery('question_bank', { filter, orderBy: 'created_at' });
}

// Teacher Activity hooks (for admin monitoring)
export function useTeacherActivity(filter) {
    return useSupabaseQuery('teacher_activity', { filter, orderBy: 'created_at' });
}

// Helper to log teacher activity
export async function logTeacherActivity(teacherId, activityType, entityId, entityTitle, metadata = {}) {
    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, skipping activity log');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('teacher_activity')
            .insert({
                id: crypto.randomUUID(),
                teacher_id: teacherId,
                activity_type: activityType,
                entity_id: entityId,
                entity_title: entityTitle,
                metadata,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error logging activity:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Error logging activity:', err);
        return null;
    }
}

// Student Activity hooks (for teacher/admin monitoring)
export function useStudentActivity(filter) {
    return useSupabaseQuery('student_activity', { filter, orderBy: 'created_at' });
}

// Helper to log student activity
export async function logStudentActivity(studentId, activityType, entityId, entityTitle, metadata = {}) {
    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, skipping activity log');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('student_activity')
            .insert({
                id: crypto.randomUUID(),
                student_id: studentId,
                activity_type: activityType,
                entity_id: entityId,
                entity_title: entityTitle,
                metadata,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error logging student activity:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Error logging student activity:', err);
        return null;
    }
}

// Single item hooks
export function useUser(id) {
    return useSupabaseItem('users', id);
}

export function useClass(id) {
    return useSupabaseItem('classes', id);
}

export function useAssessment(id) {
    return useSupabaseItem('assessments', id);
}

// ==================== MUTATION HELPERS ====================

export async function createRecord(tableName, data) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data: result, error } = await supabase
        .from(tableName)
        .insert({ ...data, id: data.id || crypto.randomUUID() })
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function updateRecord(tableName, id, updates) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data: result, error } = await supabase
        .from(tableName)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function deleteRecord(tableName, id) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// ==================== AUTH HELPERS ====================

export async function findUserByCredentials(username, password) {
    if (!isSupabaseConfigured() || !supabase) {
        return null;
    }

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (error) {
        console.error('Login error:', error);
        return null;
    }

    return data;
}

export async function getUserProgress(userId) {
    if (!isSupabaseConfigured() || !supabase) {
        return null;
    }

    const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching progress:', error);
    }

    return data || { xp: 0, total_xp: 0, level: 1, streak: 0, badges: [] };
}

export async function updateUserProgress(userId, updates) {
    if (!isSupabaseConfigured() || !supabase) {
        return null;
    }

    // Check if progress exists
    const { data: existing } = await supabase
        .from('progress')
        .select('id')
        .eq('user_id', userId)
        .single();

    if (existing) {
        const { data, error } = await supabase
            .from('progress')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const { data, error } = await supabase
            .from('progress')
            .insert({ user_id: userId, ...updates })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

// Export generic hooks for custom use
export { useSupabaseQuery, useSupabaseItem };
