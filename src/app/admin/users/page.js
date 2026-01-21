'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUsers, createRecord, updateRecord, deleteRecord } from '@/hooks/useSupabaseData';

export default function AdminUsersPage() {
    const { t } = useLanguage();
    const { data: users, loading, refetch } = useUsers();
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
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

            {/* Modal */}
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
