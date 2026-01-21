/**
 * Seed Demo Data to Supabase
 * Run this once to populate the database with demo users
 */

import { supabase, isSupabaseConfigured } from './supabase';

export async function seedSupabaseData() {
    if (!isSupabaseConfigured() || !supabase) {
        console.error('Supabase not configured');
        return { success: false, error: 'Supabase not configured' };
    }

    try {
        // Check if data already exists
        const { data: existingUsers } = await supabase.from('users').select('id').limit(1);
        if (existingUsers && existingUsers.length > 0) {
            console.log('Data already seeded, skipping...');
            return { success: true, message: 'Data already exists' };
        }

        // Demo users
        const users = [
            { id: 'admin-1', username: 'admin', name: 'Administrator', password: 'admin123', role: 'admin', avatar: '👑' },
            { id: 'teacher-1', username: 'teacher', name: 'Ms. Johnson', password: 'teacher123', role: 'teacher', avatar: '👩‍🏫' },
            { id: 'student-1', username: 'alex', name: 'Alex', password: 'alex123', role: 'student', avatar: '🦁' },
            { id: 'student-2', username: 'emma', name: 'Emma', password: 'emma123', role: 'student', avatar: '🦊' },
            { id: 'student-3', username: 'leo', name: 'Leo', password: '1234', role: 'student', avatar: '🐼' },
        ];

        const { error: usersError } = await supabase.from('users').insert(users);
        if (usersError) throw usersError;

        // Demo classes
        const classes = [
            { id: 'class-1', name: 'Grade 1A', emoji: '🌟', description: 'First grade class A', teacher_id: 'teacher-1' },
            { id: 'class-2', name: 'Grade 1B', emoji: '🌈', description: 'First grade class B', teacher_id: 'teacher-1' },
        ];

        const { error: classesError } = await supabase.from('classes').insert(classes);
        if (classesError) throw classesError;

        // Demo enrollments
        const enrollments = [
            { id: 'enroll-1', student_id: 'student-1', class_id: 'class-1' },
            { id: 'enroll-2', student_id: 'student-2', class_id: 'class-1' },
            { id: 'enroll-3', student_id: 'student-3', class_id: 'class-1' },
        ];

        const { error: enrollmentsError } = await supabase.from('enrollments').insert(enrollments);
        if (enrollmentsError) throw enrollmentsError;

        // Demo subjects
        const subjects = [
            { id: 'subject-1', name: 'Mathematics', emoji: '🔢' },
            { id: 'subject-2', name: 'Science', emoji: '🔬' },
            { id: 'subject-3', name: 'Reading', emoji: '📚' },
            { id: 'subject-4', name: 'English', emoji: '🔤' },
        ];

        const { error: subjectsError } = await supabase.from('subjects').insert(subjects);
        if (subjectsError) throw subjectsError;

        // Demo progress for students
        const progress = [
            { id: 'progress-1', user_id: 'student-1', xp: 150, total_xp: 150, level: 2, streak: 3 },
            { id: 'progress-2', user_id: 'student-2', xp: 80, total_xp: 80, level: 1, streak: 1 },
            { id: 'progress-3', user_id: 'student-3', xp: 200, total_xp: 200, level: 3, streak: 5 },
        ];

        const { error: progressError } = await supabase.from('progress').insert(progress);
        if (progressError) throw progressError;

        console.log('✅ Demo data seeded to Supabase successfully!');
        return { success: true };
    } catch (error) {
        console.error('Error seeding data:', error);
        return { success: false, error: error.message };
    }
}

export default seedSupabaseData;
