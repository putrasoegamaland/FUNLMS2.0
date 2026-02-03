'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isGeminiConfigured } from '@/lib/geminiAI';
import { useSubjects, useSubjectBenchmarks, updateSubjectBenchmark } from '@/hooks/useSupabaseData';

export default function AdminSettingsPage() {
    const { user } = useAuth();
    const { data: subjects, loading: subjectsLoading } = useSubjects();
    const { data: benchmarks, loading: benchmarksLoading, refetch: refetchBenchmarks } = useSubjectBenchmarks();
    const [editingBenchmark, setEditingBenchmark] = useState({});
    const [savingBenchmark, setSavingBenchmark] = useState({});

    // Get benchmark value for a subject
    const getBenchmarkForSubject = (subjectId) => {
        const benchmark = benchmarks?.find(b => b.subject_id === subjectId);
        return benchmark?.minimum_grade ?? 70;
    };

    // Handle benchmark update
    const handleBenchmarkSave = async (subjectId) => {
        const newValue = editingBenchmark[subjectId];
        if (newValue === undefined) return;

        setSavingBenchmark(prev => ({ ...prev, [subjectId]: true }));
        try {
            await updateSubjectBenchmark(subjectId, parseInt(newValue), user?.id);
            refetchBenchmarks();
            setEditingBenchmark(prev => {
                const updated = { ...prev };
                delete updated[subjectId];
                return updated;
            });
        } catch (error) {
            console.error('Error updating benchmark:', error);
            alert('Failed to update benchmark');
        } finally {
            setSavingBenchmark(prev => ({ ...prev, [subjectId]: false }));
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h2 className="text-lg font-bold text-text-main">⚙️ System Settings</h2>

            {/* Gemini AI Configuration */}
            <section className="bg-card-light rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <span className="text-xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main">Gemini AI Integration</h3>
                        <p className="text-sm text-text-muted">Powers AI hints for students</p>
                    </div>
                    <div className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${isGeminiConfigured()
                        ? 'bg-green-100 text-green-600'
                        : 'bg-yellow-100 text-yellow-600'
                        }`}>
                        {isGeminiConfigured() ? '✓ Connected' : 'Not configured'}
                    </div>
                </div>

                <div className="space-y-3">
                    {isGeminiConfigured() ? (
                        <div className="p-4 bg-green-50 rounded-xl">
                            <p className="text-green-700 font-medium">✓ AI is configured and ready!</p>
                            <p className="text-sm text-green-600 mt-1">
                                Students can use AI hints in quizzes and ask questions about books.
                            </p>
                        </div>
                    ) : (
                        <div className="p-4 bg-yellow-50 rounded-xl">
                            <p className="text-yellow-700 font-medium mb-2">📝 Setup Required</p>
                            <p className="text-sm text-yellow-700 mb-3">
                                To enable AI features, add your API key to the environment file:
                            </p>
                            <div className="bg-white/80 p-3 rounded-lg font-mono text-sm text-gray-700">
                                <p className="text-text-muted text-xs mb-1"># Edit file: app/.env.local</p>
                                <p>NEXT_PUBLIC_GEMINI_API_KEY=your_key_here</p>
                            </div>
                            <p className="text-xs text-yellow-600 mt-3">
                                Get your API key from{' '}
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                >
                                    Google AI Studio
                                </a>
                                {' '}, then restart the server.
                            </p>
                        </div>
                    )}
                </div>
            </section>

            {/* Grade Benchmark Settings */}
            <section className="bg-card-light rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main">Grade Benchmarks</h3>
                        <p className="text-sm text-text-muted">Set minimum passing grades per subject</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                        Teachers will be notified when students score below these thresholds.
                    </p>

                    {subjectsLoading || benchmarksLoading ? (
                        <div className="py-8 text-center">
                            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Loading subjects...</p>
                        </div>
                    ) : subjects?.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">
                            <span className="text-3xl">📚</span>
                            <p className="mt-2">No subjects configured yet</p>
                            <p className="text-xs mt-1">Add subjects in the Gamification settings</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {subjects?.map((subject) => {
                                const currentBenchmark = getBenchmarkForSubject(subject.id);
                                const isEditing = editingBenchmark[subject.id] !== undefined;
                                const isSaving = savingBenchmark[subject.id];

                                return (
                                    <div
                                        key={subject.id}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border"
                                    >
                                        <span className="text-xl">{subject.emoji || '📝'}</span>
                                        <span className="flex-1 font-medium text-gray-900">{subject.name}</span>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={isEditing ? editingBenchmark[subject.id] : currentBenchmark}
                                                onChange={(e) => setEditingBenchmark(prev => ({ ...prev, [subject.id]: e.target.value }))}
                                                className="w-16 px-2 py-1 text-center rounded-lg border border-gray-300 focus:border-primary outline-none text-sm font-medium"
                                            />
                                            <span className="text-sm text-gray-500">%</span>

                                            {isEditing && (
                                                <button
                                                    onClick={() => handleBenchmarkSave(subject.id)}
                                                    disabled={isSaving}
                                                    className="px-3 py-1 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                                >
                                                    {isSaving ? '...' : 'Save'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            {/* Other Settings */}
            <section className="bg-card-light rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-text-main mb-3">📊 Data Management</h3>

                <div className="space-y-3">
                    <button
                        onClick={() => {
                            const data = {};
                            const keys = [
                                'funlms_users', 'funlms_classes', 'funlms_enrollments',
                                'funlms_books', 'funlms_assessments', 'funlms_progress',
                                'funlms_badges', 'funlms_gamification_config'
                            ];
                            keys.forEach(key => {
                                data[key] = localStorage.getItem(key);
                            });
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `funlms_backup_${new Date().toISOString().split('T')[0]}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                    >
                        <span className="material-symbols-outlined text-text-muted">download</span>
                        <div className="flex-1 text-left">
                            <p className="font-medium text-text-main">Export Data Backup</p>
                            <p className="text-xs text-text-muted">Download all system data as JSON</p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'application/json';
                            input.onchange = (e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (e) => {
                                        try {
                                            const data = JSON.parse(e.target.result);
                                            Object.entries(data).forEach(([key, value]) => {
                                                if (value) localStorage.setItem(key, value);
                                            });
                                            alert('Data restored successfully! Please refresh the page.');
                                        } catch (err) {
                                            alert('Invalid backup file');
                                        }
                                    };
                                    reader.readAsText(file);
                                }
                            };
                            input.click();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:bg-gray-50"
                    >
                        <span className="material-symbols-outlined text-text-muted">upload</span>
                        <div className="flex-1 text-left">
                            <p className="font-medium text-text-main">Restore from Backup</p>
                            <p className="text-xs text-text-muted">Import data from JSON backup</p>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            if (confirm('⚠️ This will delete ALL data and reset the system. This cannot be undone!\n\nAre you sure?')) {
                                const keys = [
                                    'funlms_users', 'funlms_classes', 'funlms_enrollments',
                                    'funlms_books', 'funlms_assessments', 'funlms_progress',
                                    'funlms_badges', 'funlms_gamification_config', 'funlms_attempts',
                                    'funlms_current_user', 'funlms_gemini_api_key'
                                ];
                                keys.forEach(key => localStorage.removeItem(key));
                                alert('System reset complete. Please refresh the page.');
                            }
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-red-200 hover:bg-red-50"
                    >
                        <span className="material-symbols-outlined text-red-500">delete_forever</span>
                        <div className="flex-1 text-left">
                            <p className="font-medium text-red-600">Reset All Data</p>
                            <p className="text-xs text-red-400">Delete everything and start fresh</p>
                        </div>
                    </button>
                </div>
            </section>

            {/* System Info */}
            <section className="bg-card-light rounded-xl p-4 border border-gray-100">
                <h3 className="font-bold text-text-main mb-3">ℹ️ System Info</h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-muted">Version</span>
                        <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">Storage</span>
                        <span className="font-medium">localStorage</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-muted">AI Provider</span>
                        <span className="font-medium">{isGeminiConfigured() ? 'Google Gemini' : 'Fallback (offline)'}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
