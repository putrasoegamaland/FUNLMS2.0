'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext(null);

// Translations
const translations = {
    en: {
        // Common
        app_name: 'FunLMS Kids',
        welcome: 'Welcome',
        login: 'Login',
        logout: 'Logout',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        filter: 'Filter',
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',

        // Auth
        username: 'Username',
        password: 'Password',
        login_button: 'Sign In',
        login_error: 'Invalid username or password',
        welcome_back: 'Welcome back',

        // Roles
        admin: 'Admin',
        teacher: 'Teacher',
        student: 'Student',

        // Navigation
        home: 'Home',
        dashboard: 'Dashboard',
        users: 'Users',
        classes: 'Classes',
        books: 'Books',
        quizzes: 'Quizzes',
        settings: 'Settings',
        profile: 'Profile',
        badges: 'Badges',
        quests: 'Quests',
        learn: 'Learn',
        practice: 'Practice',
        analytics: 'Analytics',
        gamification: 'Gamification',

        // Dashboard
        total_students: 'Total Students',
        total_teachers: 'Total Teachers',
        active_classes: 'Active Classes',
        quick_actions: 'Quick Actions',
        recent_activity: 'Recent Activity',
        view_all: 'View All',

        // Gamification
        xp: 'XP',
        level: 'Level',
        streak: 'Streak',
        day_streak: 'Day Streak',
        badge_unlocked: 'Badge Unlocked!',
        new_level: 'New Level!',
        keep_going: 'Keep going!',

        // Quiz
        question: 'Question',
        of: 'of',
        check_answer: 'Check Answer',
        skip: 'Skip',
        next: 'Next',
        submit: 'Submit',
        quiz_complete: 'Quiz Complete!',
        great_job: 'Great Job!',
        score: 'Score',
        xp_earned: 'XP Earned',
        review_answers: 'Review Answers',
        try_again: 'Try Again',
        go_back_home: 'Go Back Home',

        // Books
        book_library: 'Book Library',
        add_book: 'Add Book',
        assign_to_class: 'Assign to Class',

        // Classes
        manage_classes: 'Manage Classes',
        create_class: 'Create Class',
        class_name: 'Class Name',
        assign_teacher: 'Assign Teacher',
        add_students: 'Add Students',
        students: 'Students',

        // Time
        just_now: 'Just now',
        minutes_ago: '{n} minutes ago',
        hours_ago: '{n} hours ago',
        days_ago: '{n} days ago',
    },

    id: {
        // Common
        app_name: 'FunLMS Kids',
        welcome: 'Selamat Datang',
        login: 'Masuk',
        logout: 'Keluar',
        save: 'Simpan',
        cancel: 'Batal',
        delete: 'Hapus',
        edit: 'Ubah',
        create: 'Buat',
        search: 'Cari',
        filter: 'Filter',
        loading: 'Memuat...',
        error: 'Kesalahan',
        success: 'Berhasil',

        // Auth
        username: 'Nama Pengguna',
        password: 'Kata Sandi',
        login_button: 'Masuk',
        login_error: 'Nama pengguna atau kata sandi salah',
        welcome_back: 'Selamat datang kembali',

        // Roles
        admin: 'Admin',
        teacher: 'Guru',
        student: 'Siswa',

        // Navigation
        home: 'Beranda',
        dashboard: 'Dasbor',
        users: 'Pengguna',
        classes: 'Kelas',
        books: 'Buku',
        quizzes: 'Kuis',
        settings: 'Pengaturan',
        profile: 'Profil',
        badges: 'Lencana',
        quests: 'Misi',
        learn: 'Belajar',
        practice: 'Latihan',
        analytics: 'Analitik',
        gamification: 'Gamifikasi',

        // Dashboard
        total_students: 'Total Siswa',
        total_teachers: 'Total Guru',
        active_classes: 'Kelas Aktif',
        quick_actions: 'Aksi Cepat',
        recent_activity: 'Aktivitas Terbaru',
        view_all: 'Lihat Semua',

        // Gamification
        xp: 'XP',
        level: 'Level',
        streak: 'Streak',
        day_streak: 'Hari Berturut',
        badge_unlocked: 'Lencana Terbuka!',
        new_level: 'Level Baru!',
        keep_going: 'Terus semangat!',

        // Quiz
        question: 'Pertanyaan',
        of: 'dari',
        check_answer: 'Periksa Jawaban',
        skip: 'Lewati',
        next: 'Lanjut',
        submit: 'Kirim',
        quiz_complete: 'Kuis Selesai!',
        great_job: 'Kerja Bagus!',
        score: 'Skor',
        xp_earned: 'XP Diperoleh',
        review_answers: 'Tinjau Jawaban',
        try_again: 'Coba Lagi',
        go_back_home: 'Kembali ke Beranda',

        // Books
        book_library: 'Perpustakaan Buku',
        add_book: 'Tambah Buku',
        assign_to_class: 'Tugaskan ke Kelas',

        // Classes
        manage_classes: 'Kelola Kelas',
        create_class: 'Buat Kelas',
        class_name: 'Nama Kelas',
        assign_teacher: 'Tugaskan Guru',
        add_students: 'Tambah Siswa',
        students: 'Siswa',

        // Time
        just_now: 'Baru saja',
        minutes_ago: '{n} menit lalu',
        hours_ago: '{n} jam lalu',
        days_ago: '{n} hari lalu',
    },
};

export function LanguageProvider({ children }) {
    const [locale, setLocale] = useState('en');

    // Load saved language preference
    useEffect(() => {
        const saved = localStorage.getItem('funlms_language');
        if (saved && (saved === 'en' || saved === 'id')) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLocale(saved);
        }
    }, []);

    // Translation function
    const t = useCallback((key, params = {}) => {
        const text = translations[locale]?.[key] || translations.en[key] || key;

        // Replace parameters like {n}
        return Object.keys(params).reduce((str, param) => {
            return str.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
        }, text);
    }, [locale]);

    // Switch language
    const switchLanguage = useCallback((newLocale) => {
        if (newLocale === 'en' || newLocale === 'id') {
            setLocale(newLocale);
            localStorage.setItem('funlms_language', newLocale);
        }
    }, []);

    // Toggle language
    const toggleLanguage = useCallback(() => {
        const newLocale = locale === 'en' ? 'id' : 'en';
        switchLanguage(newLocale);
    }, [locale, switchLanguage]);

    const value = {
        locale,
        t,
        switchLanguage,
        toggleLanguage,
        isEnglish: locale === 'en',
        isIndonesian: locale === 'id',
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}

export default LanguageContext;
