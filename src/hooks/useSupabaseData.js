/**
 * Custom hooks for Supabase data fetching
 * Provides async data loading with loading and error states
 * Supports offline mode via IndexedDB (offlineDB)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import offlineDB from '@/lib/offlineDB';
import { generateUUID } from '@/lib/uuid';

// Helper: check if we're in offline/local-hub mode (Teacher/Host)
function isOfflineMode() {
    if (typeof window === 'undefined') return false;
    const mode = localStorage.getItem('funlms_network_mode');
    return mode === 'local-hub';
}

// Helper: check if we're in guest-wifi mode (Student/Guest)
function isGuestMode() {
    if (typeof window === 'undefined') return false;
    const mode = localStorage.getItem('funlms_network_mode');
    return mode === 'guest-wifi';
}

// Generic hook for fetching data from Supabase (or IndexedDB when offline)
function useSupabaseQuery(tableName, options = {}) {
    const { filter, orderBy = 'created_at', orderAsc = false, enabled = true } = options;
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Create a stable key for the filter to avoid infinite loops
    const filterKey = JSON.stringify(filter);

    const refetch = useCallback(async () => {
        if (!enabled) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // GUEST MODE: Route to Local API
            if (isGuestMode()) {
                const queryParams = new URLSearchParams({
                    table: tableName,
                    query: filter ? JSON.stringify(filter) : ''
                });
                const res = await fetch(`/api/local/data?${queryParams.toString()}`);
                const json = await res.json();

                let result = json.data || [];
                // Sort client-side since API simplistic
                if (orderBy) {
                    result.sort((a, b) => {
                        const aVal = a[orderBy] || '';
                        const bVal = b[orderBy] || '';
                        return orderAsc
                            ? String(aVal).localeCompare(String(bVal))
                            : String(bVal).localeCompare(String(aVal));
                    });
                }
                setData(result);
                setLoading(false);
                return;
            }

            // OFFLINE MODE: Route to IndexedDB
            if (isOfflineMode()) {
                let result = [];
                if (filter && Object.keys(filter).length > 0) {
                    result = await offlineDB.query(tableName, filter);
                } else {
                    result = await offlineDB.getAll(tableName);
                }
                // Sort locally
                if (orderBy) {
                    result.sort((a, b) => {
                        const aVal = a[orderBy] || '';
                        const bVal = b[orderBy] || '';
                        return orderAsc
                            ? String(aVal).localeCompare(String(bVal))
                            : String(bVal).localeCompare(String(aVal));
                    });
                }
                setData(result);
                setLoading(false);
                return;
            }

            // ONLINE MODE: Query Supabase (original behavior)
            if (!isSupabaseConfigured() || !supabase) {
                setLoading(false);
                return;
            }

            let query = supabase.from(tableName).select('*');

            if (filter) {
                Object.entries(filter).forEach(([key, value]) => {
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

// Hook to fetch a single item by ID (with offline support)
function useSupabaseItem(tableName, id) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!id) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // GUEST MODE: Route to Local API
            if (isGuestMode()) {
                const queryParams = new URLSearchParams({
                    table: tableName,
                    query: JSON.stringify({ id })
                });
                const res = await fetch(`/api/local/data?${queryParams.toString()}`);
                const json = await res.json();
                setData(json.data?.[0] || null);
                setLoading(false);
                return;
            }

            // OFFLINE MODE
            if (isOfflineMode()) {
                const result = await offlineDB.getById(tableName, id);
                setData(result);
                setLoading(false);
                return;
            }

            // ONLINE MODE
            if (!isSupabaseConfigured() || !supabase) {
                setLoading(false);
                return;
            }

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

// ==================== BENCHMARK & NOTIFICATION HOOKS ====================

// Subject benchmarks (admin-configurable minimum grades)
export function useSubjectBenchmarks() {
    return useSupabaseQuery('subject_benchmarks');
}

// Teacher notifications
export function useTeacherNotifications(teacherId) {
    return useSupabaseQuery('teacher_notifications', {
        filter: teacherId ? { teacher_id: teacherId } : undefined,
        orderBy: 'created_at',
        enabled: !!teacherId
    });
}

// Create notification for teacher
export async function createTeacherNotification(teacherId, type, title, message, metadata = {}) {
    const record = {
        id: generateUUID(),
        teacher_id: teacherId,
        type,
        title,
        message,
        metadata,
        is_read: false,
        created_at: new Date().toISOString()
    };

    // OFFLINE MODE: Store in IndexedDB + queue for sync
    if (isOfflineMode()) {
        try {
            await offlineDB.put('teacher_notifications', record);
            await offlineDB.addToSyncQueue('insert', 'teacher_notifications', record);
            return record;
        } catch (err) {
            console.error('Error storing offline notification:', err);
            return null;
        }
    }

    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, skipping notification');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('teacher_notifications')
            .insert(record)
            .select()
            .single();

        if (error) {
            console.error('Error creating notification:', error);
            return null;
        }
        return data;
    } catch (err) {
        console.error('Error creating notification:', err);
        return null;
    }
}

// Mark notification as read
export async function markNotificationRead(notificationId) {
    // OFFLINE MODE
    if (isOfflineMode()) {
        try {
            const existing = await offlineDB.getById('teacher_notifications', notificationId);
            if (existing) {
                const updated = { ...existing, is_read: true };
                await offlineDB.put('teacher_notifications', updated);
                await offlineDB.addToSyncQueue('update', 'teacher_notifications', { is_read: true }, notificationId);
                return updated;
            }
            return null;
        } catch (err) {
            console.error('Error marking notification read offline:', err);
            return null;
        }
    }

    if (!isSupabaseConfigured() || !supabase) return null;

    try {
        const { data, error } = await supabase
            .from('teacher_notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error marking notification as read:', err);
        return null;
    }
}

// Mark all notifications as read for a teacher
export async function markAllNotificationsRead(teacherId) {
    // OFFLINE MODE
    if (isOfflineMode()) {
        try {
            const all = await offlineDB.query('teacher_notifications', { teacher_id: teacherId });
            const unread = all.filter(n => !n.is_read);
            for (const notif of unread) {
                await offlineDB.put('teacher_notifications', { ...notif, is_read: true });
            }
            return true;
        } catch (err) {
            console.error('Error marking all notifications read offline:', err);
            return null;
        }
    }

    if (!isSupabaseConfigured() || !supabase) return null;

    try {
        const { error } = await supabase
            .from('teacher_notifications')
            .update({ is_read: true })
            .eq('teacher_id', teacherId)
            .eq('is_read', false);

        if (error) throw error;
        return true;
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        return null;
    }
}

// Update subject benchmark (admin only)
export async function updateSubjectBenchmark(subjectId, minimumGrade, adminId) {
    // OFFLINE MODE
    if (isOfflineMode()) {
        try {
            const record = {
                id: subjectId, // Use subject_id as the key for upsert behavior
                subject_id: subjectId,
                minimum_grade: minimumGrade,
                created_by: adminId,
                updated_at: new Date().toISOString()
            };
            await offlineDB.put('subject_benchmarks', record);
            await offlineDB.addToSyncQueue('update', 'subject_benchmarks', record, subjectId);
            return record;
        } catch (err) {
            console.error('Error updating offline benchmark:', err);
            return null;
        }
    }

    if (!isSupabaseConfigured() || !supabase) return null;

    try {
        // Upsert - insert or update
        const { data, error } = await supabase
            .from('subject_benchmarks')
            .upsert({
                subject_id: subjectId,
                minimum_grade: minimumGrade,
                created_by: adminId,
                updated_at: new Date().toISOString()
            }, { onConflict: 'subject_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error('Error updating benchmark:', err);
        return null;
    }
}

// Get benchmark for a specific subject
export async function getSubjectBenchmark(subjectId) {
    // OFFLINE MODE
    if (isOfflineMode()) {
        try {
            const benchmarks = await offlineDB.query('subject_benchmarks', { subject_id: subjectId });
            return benchmarks.length > 0 ? (benchmarks[0]?.minimum_grade || 70) : 70;
        } catch (e) {
            return 70;
        }
    }

    if (!isSupabaseConfigured() || !supabase) return 70; // Default

    try {
        const { data, error } = await supabase
            .from('subject_benchmarks')
            .select('minimum_grade')
            .eq('subject_id', subjectId)
            .single();

        if (error) return 70; // Default if not found
        return data?.minimum_grade || 70;
    } catch (err) {
        return 70;
    }
}

// Mock Data for fallback
const MOCK_TEACHER_ACTIVITY = [
    {
        id: '60000000-0000-0000-0000-000000000001',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'create_quiz',
        entity_title: 'Math Quiz Week 1',
        metadata: { questionCount: 10, type: 'multiple_choice' },
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
        id: '60000000-0000-0000-0000-000000000002',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'grade_submission',
        entity_title: 'Alex - Science Quiz',
        metadata: { score: 85, maxScore: 100 },
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
        id: '60000000-0000-0000-0000-000000000003',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'add_question',
        entity_title: 'What is 5 + 3?',
        metadata: { type: 'mc', subject: 'Mathematics' },
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
    {
        id: '60000000-0000-0000-0000-000000000006',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'create_quiz',
        entity_title: 'Science Quiz',
        metadata: { questionCount: 5, type: 'multiple_choice' },
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago (Before grading)
    },
    {
        id: '60000000-0000-0000-0000-000000000004',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'create_assignment',
        entity_title: 'Reading Homework Week 2',
        metadata: { dueDate: '2026-02-07' },
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
        id: '60000000-0000-0000-0000-000000000007',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'create_assignment',
        entity_title: 'Reading Homework Week 1',
        metadata: { dueDate: '2026-01-31' },
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago (Before submission)
    },
    {
        id: '60000000-0000-0000-0000-000000000005',
        teacher_id: '00000000-0000-0000-0000-000000000002',
        activity_type: 'upload_book',
        entity_title: 'Fun with Numbers',
        metadata: { pages: 32, subject: 'Mathematics' },
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
];

const MOCK_STUDENT_ACTIVITY = [
    {
        id: '70000000-0000-0000-0000-000000000001',
        student_id: '00000000-0000-0000-0000-000000000003',
        activity_type: 'quiz_completed',
        entity_id: '80000000-0000-0000-0000-000000000001',
        entity_title: 'Math Quiz Week 1',
        metadata: { score: 90, timeSpent: 600, correctAnswers: 9, totalQuestions: 10 },
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 mins ago (After creation)
    },
    {
        id: '70000000-0000-0000-0000-000000000002',
        student_id: '00000000-0000-0000-0000-000000000004',
        activity_type: 'quiz_completed',
        entity_id: '80000000-0000-0000-0000-000000000001',
        entity_title: 'Math Quiz Week 1',
        metadata: { score: 80, timeSpent: 720, correctAnswers: 8, totalQuestions: 10 },
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 mins ago (After creation)
    },
    {
        id: '70000000-0000-0000-0000-000000000008',
        student_id: '00000000-0000-0000-0000-000000000003', // Alex
        activity_type: 'quiz_completed',
        entity_id: '80000000-0000-0000-0000-000000000002',
        entity_title: 'Science Quiz',
        metadata: { score: 85, timeSpent: 500, correctAnswers: 4, totalQuestions: 5 },
        created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(), // 3.5 hours ago (After creation, Before grading)
    },
    {
        id: '70000000-0000-0000-0000-000000000003',
        student_id: '00000000-0000-0000-0000-000000000005',
        activity_type: 'book_read',
        entity_title: 'Fun with Numbers',
        metadata: { pagesRead: 15, totalPages: 32 },
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago (After upload)
    },
    {
        id: '70000000-0000-0000-0000-000000000004',
        student_id: '00000000-0000-0000-0000-000000000003',
        activity_type: 'video_watched',
        entity_title: 'Introduction to Fractions',
        metadata: { watchTime: 300, duration: 420 },
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '70000000-0000-0000-0000-000000000005',
        student_id: '00000000-0000-0000-0000-000000000004',
        activity_type: 'game_played',
        entity_title: 'Math Adventure',
        metadata: { score: 1500, level: 3, xpEarned: 25 },
        created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
        id: '70000000-0000-0000-0000-000000000006',
        student_id: '00000000-0000-0000-0000-000000000005',
        activity_type: 'assignment_submitted',
        entity_title: 'Reading Homework Week 1',
        metadata: { onTime: true },
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago (Matches Week 1 creation)
    },
];

// Teacher Activity hooks (for admin monitoring)
export function useTeacherActivity(filter) {
    return useSupabaseQuery('teacher_activity', { filter, orderBy: 'created_at' });
}

// Helper to log teacher activity
export async function logTeacherActivity(teacherId, activityType, entityId, entityTitle, metadata = {}) {
    const record = {
        id: generateUUID(),
        teacher_id: teacherId,
        activity_type: activityType,
        entity_id: entityId,
        entity_title: entityTitle,
        metadata,
        created_at: new Date().toISOString()
    };

    // OFFLINE MODE: Store in IndexedDB + queue for sync
    if (isOfflineMode()) {
        try {
            await offlineDB.put('teacher_activity', record);
            await offlineDB.addToSyncQueue('insert', 'teacher_activity', record);
            return record;
        } catch (err) {
            console.error('Error storing offline teacher activity:', err);
            return null;
        }
    }

    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, skipping activity log');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('teacher_activity')
            .insert(record)
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
    const record = {
        id: generateUUID(),
        student_id: studentId,
        activity_type: activityType,
        entity_id: entityId,
        entity_title: entityTitle,
        metadata,
        created_at: new Date().toISOString()
    };

    // GUEST MODE: Route to Local API
    if (isGuestMode()) {
        try {
            await fetch('/api/local/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: 'student_activity', record })
            });
            return record;
        } catch (e) {
            console.error('Error logging guest activity:', e);
            return null;
        }
    }

    // OFFLINE MODE: Store in IndexedDB + queue for sync
    if (isOfflineMode()) {
        try {
            await offlineDB.put('student_activity', record);
            await offlineDB.addToSyncQueue('insert', 'student_activity', record);
            return record;
        } catch (err) {
            console.error('Error storing offline student activity:', err);
            return null;
        }
    }

    if (!isSupabaseConfigured() || !supabase) {
        console.warn('Supabase not configured, skipping activity log');
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('student_activity')
            .insert(record)
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

// ==================== MUTATION HELPERS (with offline support) ====================

export async function createRecord(tableName, data) {
    const record = { ...data, id: data.id || generateUUID(), created_at: data.created_at || new Date().toISOString() };

    // GUEST MODE
    if (isGuestMode()) {
        try {
            await fetch('/api/local/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, record })
            });
            return record;
        } catch (e) {
            throw new Error(`Guest create failed: ${e.message}`);
        }
    }

    // OFFLINE MODE: Store in IndexedDB + queue for sync
    if (isOfflineMode()) {
        await offlineDB.put(tableName, record);
        await offlineDB.addToSyncQueue('insert', tableName, record);
        return record;
    }

    // ONLINE MODE
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data: result, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function updateRecord(tableName, id, updates) {
    const updateData = { ...updates, updated_at: new Date().toISOString() };

    // GUEST MODE
    if (isGuestMode()) {
        try {
            const updateRecord = { id, ...updateData };
            await fetch('/api/local/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, record: updateRecord })
            });
            return updateRecord;
        } catch (e) {
            throw new Error(`Guest update failed: ${e.message}`);
        }
    }

    // OFFLINE MODE
    if (isOfflineMode()) {
        const existing = await offlineDB.getById(tableName, id);
        if (existing) {
            const updated = { ...existing, ...updateData };
            await offlineDB.put(tableName, updated);
            await offlineDB.addToSyncQueue('update', tableName, updateData, id);
            return updated;
        }
        throw new Error(`Record ${id} not found in offline DB`);
    }

    // ONLINE MODE
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data: result, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return result;
}

export async function deleteRecord(tableName, id) {
    // GUEST MODE: Route to Local API
    if (isGuestMode()) {
        try {
            const res = await fetch('/api/local/data', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName, id })
            });
            // If the API doesn't support DELETE yet, just return true silently
            return true;
        } catch (e) {
            console.error('Guest delete failed:', e);
            return true; // Non-critical, don't block the UI
        }
    }

    // OFFLINE MODE
    if (isOfflineMode()) {
        await offlineDB.delete(tableName, id);
        await offlineDB.addToSyncQueue('delete', tableName, null, id);
        return true;
    }

    // ONLINE MODE
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

// ==================== AUTH HELPERS (with offline support) ====================

export async function findUserByCredentials(username, password) {
    // GUEST MODE: Route to Local API
    if (isGuestMode()) {
        try {
            const queryParams = new URLSearchParams({
                table: 'users',
                query: JSON.stringify({ username, password })
            });
            const res = await fetch(`/api/local/data?${queryParams.toString()}`);
            const json = await res.json();
            return json.data?.[0] || null;
        } catch (e) {
            console.error('Guest login lookup error:', e);
            return null;
        }
    }

    // OFFLINE MODE: search local IndexedDB
    if (isOfflineMode()) {
        try {
            const users = await offlineDB.getByIndex('users', 'username', username);
            const match = users.find(u => u.password === password);
            return match || null;
        } catch (e) {
            console.error('Offline login error:', e);
            return null;
        }
    }

    // ONLINE MODE
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
    // GUEST MODE
    if (isGuestMode()) {
        try {
            const queryParams = new URLSearchParams({
                table: 'progress',
                query: JSON.stringify({ user_id: userId })
            });
            const res = await fetch(`/api/local/data?${queryParams.toString()}`);
            const json = await res.json();
            return json.data?.[0] || { xp: 0, total_xp: 0, level: 1, streak: 0, badges: [] };
        } catch (e) {
            return { xp: 0, total_xp: 0, level: 1, streak: 0, badges: [] };
        }
    }

    // OFFLINE MODE
    if (isOfflineMode()) {
        try {
            const allProgress = await offlineDB.query('progress', { user_id: userId });
            return allProgress.length > 0 ? allProgress[0] : { xp: 0, total_xp: 0, level: 1, streak: 0, badges: [] };
        } catch (e) {
            return { xp: 0, total_xp: 0, level: 1, streak: 0, badges: [] };
        }
    }

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
    // GUEST MODE
    if (isGuestMode()) {
        try {
            // First get existing to merge (simple version: just send updates with ID if we knew it, but here we query first)
            // Actually API POST handles upsert if ID provided. 
            // We need to know the ID though.
            const queryParams = new URLSearchParams({
                table: 'progress',
                query: JSON.stringify({ user_id: userId })
            });
            const res = await fetch(`/api/local/data?${queryParams.toString()}`);
            const json = await res.json();
            const existing = json.data?.[0];

            const record = {
                id: existing?.id || generateUUID(),
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            };

            if (!existing) {
                record.created_at = new Date().toISOString();
            } else {
                // Merge existing data so we don't lose fields not in 'updates'
                Object.assign(record, existing, updates, { updated_at: new Date().toISOString() });
            }

            await fetch('/api/local/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: 'progress', record })
            });
            return record;
        } catch (e) {
            console.error('Guest progress update failed:', e);
            return null;
        }
    }

    // OFFLINE MODE
    if (isOfflineMode()) {
        try {
            const allProgress = await offlineDB.query('progress', { user_id: userId });
            if (allProgress.length > 0) {
                const updated = { ...allProgress[0], ...updates, updated_at: new Date().toISOString() };
                await offlineDB.put('progress', updated);
                await offlineDB.addToSyncQueue('update', 'progress', updates, allProgress[0].id);
                return updated;
            } else {
                const newProgress = { id: generateUUID(), user_id: userId, ...updates, created_at: new Date().toISOString() };
                await offlineDB.put('progress', newProgress);
                await offlineDB.addToSyncQueue('insert', 'progress', newProgress);
                return newProgress;
            }
        } catch (e) {
            console.error('Error updating offline progress:', e);
            return null;
        }
    }

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

// ============================================
// HOTS QC SYSTEM HOOKS
// ============================================

// Hook: Get all questions (with optional filters)
export function useQuestions(options = {}) {
    const { authorId, status, subjectId } = options;
    const filter = {};
    if (authorId) filter.author_id = authorId;
    if (status) filter.status = status;
    if (subjectId) filter.subject_id = subjectId;

    return useSupabaseQuery('questions', {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: 'updated_at',
        orderAsc: false
    });
}

// Hook: Get admin review queue (questions needing admin review)
export function useAdminReviewQueue() {
    return useSupabaseQuery('questions', {
        filter: { status: 'admin_review_required' },
        orderBy: 'updated_at',
        orderAsc: false
    });
}

// Hook: Get quiz review queue (assessments pending QC review)
export function useQuizReviewQueue() {
    return useSupabaseQuery('assessments', {
        filter: { qc_status: 'pending_review' },
        orderBy: 'created_at',
        orderAsc: false
    });
}

// Hook: Get AI review for a question
export function useAIReview(questionId) {
    return useSupabaseItem('ai_reviews', { filter: { question_id: questionId } });
}

// Hook: Get admin reviews for a question
export function useAdminReviews(questionId) {
    return useSupabaseQuery('admin_reviews', {
        filter: { question_id: questionId },
        orderBy: 'created_at',
        orderAsc: false
    });
}

// Hook: Get hint logs for a question or student
export function useHintLogs(options = {}) {
    const { questionId, studentId } = options;
    const filter = {};
    if (questionId) filter.question_id = questionId;
    if (studentId) filter.student_id = studentId;

    return useSupabaseQuery('hint_logs', {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy: 'created_at',
        orderAsc: false
    });
}

// Hook: Get performance aggregates for a question
export function usePerformanceAggregate(questionId) {
    return useSupabaseItem('performance_aggregates', { filter: { question_id: questionId } });
}

// Hook: Get topics for a subject
export function useTopics(subjectId) {
    return useSupabaseQuery('topics', {
        filter: subjectId ? { subject_id: subjectId } : undefined,
        orderBy: 'name',
        orderAsc: true
    });
}

// ============================================
// HOTS QC HELPER FUNCTIONS
// ============================================

// Create a new question
export async function createQuestion(questionData) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('questions')
        .insert({
            ...questionData,
            status: 'draft',
            version: 1
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update a question
export async function updateQuestion(questionId, updates) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', questionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Update question status
export async function updateQuestionStatus(questionId, newStatus, additionalData = {}) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('questions')
        .update({ status: newStatus, ...additionalData })
        .eq('id', questionId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Save AI review results
export async function saveAIReview(questionId, aiResult) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    // Map the AI result to our database schema
    const reviewData = {
        question_id: questionId,
        primary_bloom_level: aiResult.primary_bloom_level,
        secondary_bloom_levels: aiResult.secondary_bloom_levels || [],
        hots_flag: aiResult.hots?.flag || false,
        hots_strength: aiResult.hots?.strength || 'S0',
        hots_signals: aiResult.hots?.signals || [],
        boundedness: aiResult.boundedness,
        difficulty_score: aiResult.difficulty?.score_1_10,
        difficulty_label: aiResult.difficulty?.label,
        difficulty_reasons: aiResult.difficulty?.reasons || [],
        clarity_score: aiResult.quality?.clarity_score_0_100,
        ambiguity_flags: aiResult.quality?.ambiguity_flags || [],
        missing_info_flags: aiResult.quality?.missing_info_flags || [],
        grade_fit_flags: aiResult.quality?.grade_fit_flags || [],
        subject_match_score: aiResult.alignment?.subject_match_score_0_100,
        topic_match_score: aiResult.alignment?.topic_match_score_0_100,
        bloom_confidence: aiResult.confidence?.bloom,
        hots_confidence: aiResult.confidence?.hots,
        difficulty_confidence: aiResult.confidence?.difficulty,
        boundedness_confidence: aiResult.confidence?.boundedness,
        suggested_edits: aiResult.suggested_edits || [],
        full_json_report: aiResult,
        model_version: aiResult.model_version || 'qc-v1'
    };

    const { data, error } = await supabase
        .from('ai_reviews')
        .insert(reviewData)
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Create admin review decision
export async function createAdminReview(questionId, reviewerId, decision, overrides = {}, notes = '') {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('admin_reviews')
        .insert({
            question_id: questionId,
            reviewer_id: reviewerId,
            decision,
            override_bloom: overrides.bloom,
            override_hots_flag: overrides.hotsFlag,
            override_hots_strength: overrides.hotsStrength,
            override_difficulty: overrides.difficulty,
            override_boundedness: overrides.boundedness,
            notes,
            return_reasons: overrides.returnReasons || []
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Log a hint request
export async function logHintRequest(studentId, questionId, attemptId, hintType, request, response, tokensUsed) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase
        .from('hint_logs')
        .insert({
            student_id: studentId,
            question_id: questionId,
            attempt_id: attemptId,
            hint_type: hintType,
            hint_request: request,
            hint_response: response,
            tokens_used: tokensUsed
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// Get hint count for a student on a question
export async function getHintCount(studentId, questionId) {
    if (!isSupabaseConfigured() || !supabase) {
        return 0;
    }

    const { count, error } = await supabase
        .from('hint_logs')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('question_id', questionId);

    if (error) {
        console.error('Error getting hint count:', error);
        return 0;
    }

    return count || 0;
}

// Update performance aggregates
export async function updatePerformanceAggregate(questionId, attemptData) {
    if (!isSupabaseConfigured() || !supabase) {
        throw new Error('Supabase not configured');
    }

    // Get existing aggregate
    const { data: existing } = await supabase
        .from('performance_aggregates')
        .select('*')
        .eq('question_id', questionId)
        .single();

    if (existing) {
        // Update existing
        const newAttemptCount = existing.attempt_count + 1;
        const newCorrectCount = existing.correct_count + (attemptData.isCorrect ? 1 : 0);
        const newAccuracy = (newCorrectCount / newAttemptCount) * 100;

        const { data, error } = await supabase
            .from('performance_aggregates')
            .update({
                attempt_count: newAttemptCount,
                correct_count: newCorrectCount,
                accuracy_rate: newAccuracy,
                last_updated: new Date().toISOString()
            })
            .eq('question_id', questionId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        // Create new
        const { data, error } = await supabase
            .from('performance_aggregates')
            .insert({
                question_id: questionId,
                attempt_count: 1,
                correct_count: attemptData.isCorrect ? 1 : 0,
                accuracy_rate: attemptData.isCorrect ? 100 : 0
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

// Export generic hooks for custom use
export { useSupabaseQuery, useSupabaseItem };
