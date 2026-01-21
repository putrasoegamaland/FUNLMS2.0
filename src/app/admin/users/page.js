'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUsers, useClasses, createRecord, updateRecord, deleteRecord } from '@/hooks/useSupabaseData';

export default function AdminUsersPage() {
    const { t } = useLanguage();
    const { data: users, loading, refetch } = useUsers();
    const { data: classes } = useClasses();
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = users.filter(user => {
        const matchesFilter = filter === 'all' || user.role === filter;
        const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleDelete = async (userId) => {
        if (confirm('Are you sure you want to delete this user?')) {
            await deleteRecord('users', userId);
            refetch();
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header with Bulk Import Button */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-text-main">👥 Users</h2>
                <button
                    onClick={() => setShowBulkModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload_file</span>
                    Bulk Import
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 20 }}>
                        search
                    </span>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {['all', 'admin', 'teacher', 'student'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === f
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                            }`}
                    >
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}s
                    </button>
                ))}
            </div>

            {/* Users List */}
            <div className="space-y-3">
                {filteredUsers.map((user) => (
                    <UserCard
                        key={user.id}
                        user={user}
                        onEdit={() => handleEdit(user)}
                        onDelete={() => handleDelete(user.id)}
                    />
                ))}
                {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-text-muted">
                        No users found
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={handleCreate}
                className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
                <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>add</span>
            </button>

            {/* Single User Modal */}
            {showModal && (
                <UserModal
                    user={editingUser}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        refetch();
                        setShowModal(false);
                    }}
                />
            )}

            {/* Bulk Import Modal */}
            {showBulkModal && (
                <BulkImportModal
                    classes={classes}
                    onClose={() => setShowBulkModal(false)}
                    onSave={() => {
                        refetch();
                        setShowBulkModal(false);
                    }}
                />
            )}
        </div>
    );
}

function UserCard({ user, onEdit, onDelete }) {
    const roleColors = {
        admin: 'bg-purple-100 text-purple-700',
        teacher: 'bg-blue-100 text-blue-700',
        student: 'bg-green-100 text-green-700',
    };

    const roleEmojis = {
        admin: '👨‍💼',
        teacher: '👩‍🏫',
        student: '👧',
    };

    return (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-card-light border border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl">
                {user.avatar || roleEmojis[user.role] || '👤'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-text-main truncate">{user.name}</p>
                <p className="text-sm text-text-muted">@{user.username}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${roleColors[user.role]}`}>
                {user.role}
            </span>
            <div className="flex gap-1">
                <button
                    onClick={onEdit}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 20 }}>edit</span>
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                    <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>delete</span>
                </button>
            </div>
        </div>
    );
}

function UserModal({ user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || '',
        password: user?.password || '',
        role: user?.role || 'student',
        avatar: user?.avatar || '👤',
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (user) {
                await updateRecord('users', user.id, formData);
            } else {
                await createRecord('users', formData);
            }
            onSave();
        } catch (error) {
            console.error('Error saving user:', error);
            alert('Error saving user: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
            <div className="w-full max-w-md bg-white rounded-t-3xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                    <h3 className="text-lg font-bold text-text-main">
                        {user ? 'Edit User' : 'Create User'}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6">
                    <form id="user-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Password</label>
                            <input
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            >
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </form>
                </div>

                {/* Sticky Footer */}
                <div className="p-6 pt-4 border-t border-gray-100 shrink-0">
                    <button
                        type="submit"
                        form="user-form"
                        disabled={saving}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : (user ? 'Update User' : 'Create User')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Bulk Import Modal Component
function BulkImportModal({ classes, onClose, onSave }) {
    const [step, setStep] = useState(1); // 1 = input, 2 = preview, 3 = result
    const [inputText, setInputText] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [parsedStudents, setParsedStudents] = useState([]);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState({ success: 0, failed: 0, errors: [] });

    // Parse input text (supports: name, name|username, name|username|password)
    const parseInput = () => {
        const lines = inputText.trim().split('\n').filter(line => line.trim());
        const students = lines.map((line, index) => {
            const parts = line.split(/[,|\t]/).map(p => p.trim());
            const name = parts[0] || '';
            // Generate username from name if not provided
            const username = parts[1] || name.toLowerCase().replace(/\s+/g, '').slice(0, 15);
            // Use default password if not provided
            const password = parts[2] || '1234';

            return {
                index: index + 1,
                name,
                username,
                password,
                valid: name.length >= 2 && username.length >= 2,
            };
        });

        setParsedStudents(students);
        setStep(2);
    };

    // Import students to Supabase
    const handleImport = async () => {
        if (!selectedClassId) {
            alert('Please select a class');
            return;
        }

        setImporting(true);
        let success = 0;
        let failed = 0;
        const errors = [];

        for (const student of parsedStudents.filter(s => s.valid)) {
            try {
                // Create user
                const newUser = await createRecord('users', {
                    name: student.name,
                    username: student.username,
                    password: student.password,
                    role: 'student',
                    avatar: '👧',
                });

                // Create enrollment
                await createRecord('enrollments', {
                    student_id: newUser.id,
                    class_id: selectedClassId,
                });

                success++;
            } catch (error) {
                failed++;
                errors.push(`${student.name}: ${error.message}`);
            }
        }

        setResult({ success, failed, errors });
        setStep(3);
        setImporting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center">
            <div className="w-full max-w-lg bg-white rounded-t-3xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 shrink-0 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-bold text-text-main">📥 Bulk Import Students</h3>
                        <p className="text-sm text-text-muted">
                            {step === 1 && 'Step 1: Paste student data'}
                            {step === 2 && 'Step 2: Review & assign class'}
                            {step === 3 && 'Step 3: Import complete'}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Input */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                                <p className="text-sm text-blue-700 font-medium mb-2">📋 Format Guide:</p>
                                <p className="text-xs text-blue-600">One student per line. Supports:</p>
                                <ul className="text-xs text-blue-600 list-disc list-inside mt-1">
                                    <li><code>Name</code> (username auto-generated)</li>
                                    <li><code>Name, Username</code></li>
                                    <li><code>Name, Username, Password</code></li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">
                                    Paste student list below:
                                </label>
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder={`Ahmad Rizki
Siti Nurhaliza, siti123
Budi Santoso, budi, password123
...`}
                                    rows={10}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none text-sm font-mono resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Preview */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Class Selection */}
                            <div>
                                <label className="block text-sm font-medium text-text-main mb-2">
                                    Assign to Class: <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={selectedClassId}
                                    onChange={(e) => setSelectedClassId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                    required
                                >
                                    <option value="">Select a class...</option>
                                    {classes.map(cls => (
                                        <option key={cls.id} value={cls.id}>
                                            {cls.emoji} {cls.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Preview Table */}
                            <div>
                                <p className="text-sm font-medium text-text-main mb-2">
                                    Preview ({parsedStudents.filter(s => s.valid).length} valid students):
                                </p>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">#</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Name</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Username</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Password</th>
                                                <th className="px-3 py-2 text-left text-xs font-medium text-text-muted">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {parsedStudents.map((student) => (
                                                <tr key={student.index} className={!student.valid ? 'bg-red-50' : ''}>
                                                    <td className="px-3 py-2 text-text-muted">{student.index}</td>
                                                    <td className="px-3 py-2 font-medium">{student.name}</td>
                                                    <td className="px-3 py-2 text-text-muted">{student.username}</td>
                                                    <td className="px-3 py-2 text-text-muted">{student.password}</td>
                                                    <td className="px-3 py-2">
                                                        {student.valid ? (
                                                            <span className="text-green-600 text-xs">✓ Valid</span>
                                                        ) : (
                                                            <span className="text-red-600 text-xs">✗ Invalid</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Result */}
                    {step === 3 && (
                        <div className="space-y-4 text-center py-8">
                            <div className="text-6xl mb-4">
                                {result.failed === 0 ? '🎉' : '⚠️'}
                            </div>
                            <h3 className="text-xl font-bold text-text-main">Import Complete!</h3>

                            <div className="flex justify-center gap-6 mt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-green-600">{result.success}</p>
                                    <p className="text-sm text-text-muted">Imported</p>
                                </div>
                                {result.failed > 0 && (
                                    <div className="text-center">
                                        <p className="text-3xl font-bold text-red-600">{result.failed}</p>
                                        <p className="text-sm text-text-muted">Failed</p>
                                    </div>
                                )}
                            </div>

                            {result.errors.length > 0 && (
                                <div className="mt-4 text-left bg-red-50 rounded-xl p-4">
                                    <p className="text-sm font-medium text-red-700 mb-2">Errors:</p>
                                    <ul className="text-xs text-red-600 space-y-1">
                                        {result.errors.slice(0, 5).map((err, i) => (
                                            <li key={i}>• {err}</li>
                                        ))}
                                        {result.errors.length > 5 && (
                                            <li>...and {result.errors.length - 5} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-gray-100 shrink-0 flex gap-3">
                    {step === 1 && (
                        <button
                            onClick={parseInput}
                            disabled={!inputText.trim()}
                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            Next: Preview →
                        </button>
                    )}

                    {step === 2 && (
                        <>
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 bg-gray-100 text-text-main font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                ← Back
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={importing || !selectedClassId || parsedStudents.filter(s => s.valid).length === 0}
                                className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {importing ? 'Importing...' : `Import ${parsedStudents.filter(s => s.valid).length} Students`}
                            </button>
                        </>
                    )}

                    {step === 3 && (
                        <button
                            onClick={onSave}
                            className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
