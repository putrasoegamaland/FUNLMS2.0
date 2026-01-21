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

        // Demo users with valid UUIDs
        const users = [
            { id: '00000000-0000-0000-0000-000000000001', username: 'admin', name: 'Administrator', password: 'admin123', role: 'admin', avatar: '👑' },
            { id: '00000000-0000-0000-0000-000000000002', username: 'teacher', name: 'Ms. Johnson', password: 'teacher123', role: 'teacher', avatar: '👩‍🏫' },
            { id: '00000000-0000-0000-0000-000000000003', username: 'alex', name: 'Alex', password: 'alex123', role: 'student', avatar: '🦁' },
            { id: '00000000-0000-0000-0000-000000000004', username: 'emma', name: 'Emma', password: 'emma123', role: 'student', avatar: '🦊' },
            { id: '00000000-0000-0000-0000-000000000005', username: 'leo', name: 'Leo', password: '1234', role: 'student', avatar: '🐼' },
        ];

        const { error: usersError } = await supabase.from('users').insert(users);
        if (usersError) throw usersError;

        // Demo classes
        const classes = [
            { id: '10000000-0000-0000-0000-000000000001', name: 'Grade 1A', emoji: '🌟', description: 'First grade class A', teacher_id: '00000000-0000-0000-0000-000000000002' },
            { id: '10000000-0000-0000-0000-000000000002', name: 'Grade 1B', emoji: '🌈', description: 'First grade class B', teacher_id: '00000000-0000-0000-0000-000000000002' },
        ];

        const { error: classesError } = await supabase.from('classes').insert(classes);
        if (classesError) throw classesError;

        // Demo enrollments
        const enrollments = [
            { id: '20000000-0000-0000-0000-000000000001', student_id: '00000000-0000-0000-0000-000000000003', class_id: '10000000-0000-0000-0000-000000000001' },
            { id: '20000000-0000-0000-0000-000000000002', student_id: '00000000-0000-0000-0000-000000000004', class_id: '10000000-0000-0000-0000-000000000001' },
            { id: '20000000-0000-0000-0000-000000000003', student_id: '00000000-0000-0000-0000-000000000005', class_id: '10000000-0000-0000-0000-000000000001' },
        ];

        const { error: enrollmentsError } = await supabase.from('enrollments').insert(enrollments);
        if (enrollmentsError) throw enrollmentsError;

        // Demo subjects
        const subjects = [
            { id: '30000000-0000-0000-0000-000000000001', name: 'Mathematics', emoji: '🔢' },
            { id: '30000000-0000-0000-0000-000000000002', name: 'Science', emoji: '🔬' },
            { id: '30000000-0000-0000-0000-000000000003', name: 'Reading', emoji: '📚' },
            { id: '30000000-0000-0000-0000-000000000004', name: 'English', emoji: '🔤' },
        ];

        const { error: subjectsError } = await supabase.from('subjects').insert(subjects);
        if (subjectsError) throw subjectsError;

        // Demo progress for students
        const progress = [
            { id: '40000000-0000-0000-0000-000000000001', user_id: '00000000-0000-0000-0000-000000000003', xp: 150, total_xp: 150, level: 2, streak: 3 },
            { id: '40000000-0000-0000-0000-000000000002', user_id: '00000000-0000-0000-0000-000000000004', xp: 80, total_xp: 80, level: 1, streak: 1 },
            { id: '40000000-0000-0000-0000-000000000003', user_id: '00000000-0000-0000-0000-000000000005', xp: 200, total_xp: 200, level: 3, streak: 5 },
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
