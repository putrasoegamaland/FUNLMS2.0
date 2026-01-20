'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
    const router = useRouter();
    const { login, getRedirectPath } = useAuth();
    const { t, toggleLanguage, locale } = useLanguage();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = login(username, password);

        if (result.success) {
            router.replace(getRedirectPath());
        } else {
            setError(t('login_error'));
            setIsLoading(false);
        }
    };

    // Quick login buttons for demo
    const quickLogin = (role) => {
        const credentials = {
            admin: { username: 'admin', password: 'admin123' },
            teacher: { username: 'teacher', password: 'teacher123' },
            student: { username: 'leo', password: '1234' },
        };

        const cred = credentials[role];
        setUsername(cred.username);
        setPassword(cred.password);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background-light p-4">
            {/* Language Toggle */}
            <button
                onClick={toggleLanguage}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-card-light shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
            >
                {locale === 'en' ? '🇮🇩 ID' : '🇬🇧 EN'}
            </button>

            {/* Logo & Title */}
            <div className="text-center mb-8">
                <div className="text-6xl mb-4">🎓</div>
                <h1 className="text-3xl font-bold text-text-main">FunLMS Kids</h1>
                <p className="text-text-muted mt-2">{t('welcome')}</p>
            </div>

            {/* Login Form */}
            <div className="w-full max-w-sm bg-card-light rounded-2xl shadow-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1.5">
                            {t('username')}
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="Enter username"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1.5">
                            {t('password')}
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl bg-primary text-text-main font-bold shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isLoading ? t('loading') : t('login_button')}
                    </button>
                </form>

                {/* Demo Quick Login */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                    <p className="text-center text-sm text-text-muted mb-3">Quick Login (Demo)</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => quickLogin('admin')}
                            className="flex-1 py-2 px-3 rounded-lg bg-purple-100 text-purple-700 text-sm font-medium hover:bg-purple-200 transition-colors"
                        >
                            👨‍💼 Admin
                        </button>
                        <button
                            onClick={() => quickLogin('teacher')}
                            className="flex-1 py-2 px-3 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                            👩‍🏫 Teacher
                        </button>
                        <button
                            onClick={() => quickLogin('student')}
                            className="flex-1 py-2 px-3 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors"
                        >
                            👧 Student
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-8 text-sm text-text-muted">
                © 2025 FunLMS Kids. Made with ❤️ for little learners.
            </p>
        </div>
    );
}
