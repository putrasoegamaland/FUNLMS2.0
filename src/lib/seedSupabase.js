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

        // Demo question bank
        const questionBank = [
            {
                id: '50000000-0000-0000-0000-000000000001',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                type: 'mc',
                prompt: 'What is 5 + 3?',
                options: [
                    { id: '1', text: '6', isCorrect: false },
                    { id: '2', text: '7', isCorrect: false },
                    { id: '3', text: '8', isCorrect: true },
                    { id: '4', text: '9', isCorrect: false },
                ],
                subject_id: '30000000-0000-0000-0000-000000000001',
                difficulty: 'easy',
                tags: ['addition', 'basic math'],
                times_used: 5,
            },
            {
                id: '50000000-0000-0000-0000-000000000002',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                type: 'mc',
                prompt: 'Which planet is closest to the Sun?',
                options: [
                    { id: '1', text: 'Venus', isCorrect: false },
                    { id: '2', text: 'Mercury', isCorrect: true },
                    { id: '3', text: 'Mars', isCorrect: false },
                    { id: '4', text: 'Earth', isCorrect: false },
                ],
                subject_id: '30000000-0000-0000-0000-000000000002',
                difficulty: 'medium',
                tags: ['planets', 'solar system'],
                times_used: 3,
            },
            {
                id: '50000000-0000-0000-0000-000000000003',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                type: 'essay',
                prompt: 'Describe your favorite animal and why you like it.',
                subject_id: '30000000-0000-0000-0000-000000000004',
                difficulty: 'easy',
                tags: ['writing', 'descriptive'],
                times_used: 2,
            },
            {
                id: '50000000-0000-0000-0000-000000000004',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                type: 'fill_blank',
                prompt: 'The capital of Indonesia is ____.',
                correct_answer: 'Jakarta',
                subject_id: '30000000-0000-0000-0000-000000000002',
                difficulty: 'easy',
                tags: ['geography', 'capitals'],
                times_used: 4,
            },
            {
                id: '50000000-0000-0000-0000-000000000005',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                type: 'true_false',
                prompt: 'Water boils at 100 degrees Celsius.',
                correct_answer: 'true',
                subject_id: '30000000-0000-0000-0000-000000000002',
                difficulty: 'easy',
                tags: ['physics', 'temperature'],
                times_used: 6,
            },
        ];

        const { error: questionBankError } = await supabase.from('question_bank').insert(questionBank);
        if (questionBankError) console.log('Question bank seed (may already exist):', questionBankError.message);

        // Demo teacher activity
        const teacherActivity = [
            {
                id: '60000000-0000-0000-0000-000000000001',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                activity_type: 'create_quiz',
                entity_title: 'Math Quiz Week 1',
                metadata: { questionCount: 10, type: 'multiple_choice' },
                created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '60000000-0000-0000-0000-000000000002',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                activity_type: 'grade_submission',
                entity_title: 'Alex - Science Quiz',
                metadata: { score: 85, maxScore: 100 },
                created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '60000000-0000-0000-0000-000000000003',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                activity_type: 'add_question',
                entity_title: 'What is 5 + 3?',
                metadata: { type: 'mc', subject: 'Mathematics' },
                created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '60000000-0000-0000-0000-000000000004',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                activity_type: 'create_assignment',
                entity_title: 'Reading Homework Week 2',
                metadata: { dueDate: '2026-02-07' },
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '60000000-0000-0000-0000-000000000005',
                teacher_id: '00000000-0000-0000-0000-000000000002',
                activity_type: 'upload_book',
                entity_title: 'Fun with Numbers',
                metadata: { pages: 32, subject: 'Mathematics' },
                created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            },
        ];

        const { error: teacherActivityError } = await supabase.from('teacher_activity').insert(teacherActivity);
        if (teacherActivityError) console.log('Teacher activity seed (may already exist):', teacherActivityError.message);

        // Demo student activity
        const studentActivity = [
            {
                id: '70000000-0000-0000-0000-000000000001',
                student_id: '00000000-0000-0000-0000-000000000003',
                activity_type: 'quiz_completed',
                entity_id: '80000000-0000-0000-0000-000000000001',
                entity_title: 'Math Quiz Week 1',
                metadata: { score: 90, timeSpent: 600, correctAnswers: 9, totalQuestions: 10 },
                created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            },
            {
                id: '70000000-0000-0000-0000-000000000002',
                student_id: '00000000-0000-0000-0000-000000000004',
                activity_type: 'quiz_completed',
                entity_id: '80000000-0000-0000-0000-000000000001',
                entity_title: 'Math Quiz Week 1',
                metadata: { score: 80, timeSpent: 720, correctAnswers: 8, totalQuestions: 10 },
                created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            },
            {
                id: '70000000-0000-0000-0000-000000000003',
                student_id: '00000000-0000-0000-0000-000000000005',
                activity_type: 'book_read',
                entity_title: 'Fun with Numbers',
                metadata: { pagesRead: 15, totalPages: 32 },
                created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
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
                created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '70000000-0000-0000-0000-000000000007',
                student_id: '00000000-0000-0000-0000-000000000003',
                activity_type: 'login',
                entity_title: 'Daily Login',
                metadata: { streak: 3 },
                created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
            },
        ];

        const { error: studentActivityError } = await supabase.from('student_activity').insert(studentActivity);
        if (studentActivityError) console.log('Student activity seed (may already exist):', studentActivityError.message);

        console.log('✅ Demo data seeded to Supabase successfully!');
        return { success: true };
    } catch (error) {
        console.error('Error seeding data:', error);
        return { success: false, error: error.message };
    }
}

export default seedSupabaseData;
