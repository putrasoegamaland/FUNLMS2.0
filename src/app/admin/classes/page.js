'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClasses, useUsers, useEnrollments, createRecord, updateRecord, deleteRecord } from '@/hooks/useSupabaseData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function AdminClassesPage() {
    const { t } = useLanguage();
    const { data: rawClasses, loading: classesLoading, refetch: refetchClasses } = useClasses();
    const { data: users, loading: usersLoading, refetch: refetchUsers } = useUsers();
    const { data: enrollments, loading: enrollmentsLoading, refetch: refetchEnrollments } = useEnrollments();

    const [filter, setFilter] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(null);
    const [editingClass, setEditingClass] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const isLoading = classesLoading || usersLoading || enrollmentsLoading;

    // Enrich classes with teacher names and student counts
    const classes = rawClasses.map(cls => {
        const teacher = users.find(u => u.id === cls.teacher_id);
        const classEnrollments = enrollments.filter(e => e.class_id === cls.id);
        return {
            ...cls,
            teacherName: teacher?.name || 'Unassigned',
            studentCount: classEnrollments.length,
        };
    });

    // Filter classes
    const filteredClasses = classes.filter(cls => {
        const matchesFilter = filter === 'All' || cls.level === filter;
        const matchesSearch = cls.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cls.teacherName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleDelete = async (classId) => {
        if (confirm('Are you sure you want to delete this class?')) {
            // Delete enrollments first
            const classEnrollments = enrollments.filter(e => e.class_id === classId);
            for (const e of classEnrollments) {
                await deleteRecord('enrollments', e.id);
            }
            // Delete class
            await deleteRecord('classes', classId);
            refetchClasses();
            refetchEnrollments();
        }
        setShowActionSheet(null);
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setShowModal(true);
        setShowActionSheet(null);
    };

    const handleSave = () => {
        refetchClasses();
        refetchEnrollments();
        setShowModal(false);
    };

    const levels = ['All', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3'];

    if (isLoading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-muted">Loading classes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-main">🎓 Manage Classes</h2>
            </div>

            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 20 }}>
                    search
                </span>
                <input
                    type="text"
                    placeholder="Search classes or teachers"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                />
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {levels.map((level) => (
                    <button
                        key={level}
                        onClick={() => setFilter(level)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filter === level
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                            }`}
                    >
                        {level}
                    </button>
                ))}
            </div>

            {/* Classes List */}
            <div className="space-y-3">
                {filteredClasses.map((cls) => (
                    <ClassCard
                        key={cls.id}
                        classData={cls}
                        onTap={() => setShowActionSheet(cls)}
                    />
                ))}
                {filteredClasses.length === 0 && (
                    <div className="text-center py-8 text-text-muted">
                        No classes found. Create one!
                    </div>
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => {
                    setEditingClass(null);
                    setShowModal(true);
                }}
                className="fixed bottom-24 right-4 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
            >
                <span className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>add</span>
            </button>

            {/* Action Sheet */}
            {showActionSheet && (
                <ActionSheet
                    classData={showActionSheet}
                    onClose={() => setShowActionSheet(null)}
                    onEdit={() => handleEdit(showActionSheet)}
                    onDelete={() => handleDelete(showActionSheet.id)}
                />
            )}

            {/* Modal */}
            {showModal && (
                <ClassModal
                    classData={editingClass}
                    users={users}
                    enrollments={enrollments}
                    onClose={() => setShowModal(false)}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function ClassCard({ classData, onTap }) {
    const levelColors = {
        'Kindergarten': 'bg-pink-500',
        'Grade 1': 'bg-blue-500',
        'Grade 2': 'bg-green-500',
        'Grade 3': 'bg-purple-500',
    };

    return (
        <button
            onClick={onTap}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 shadow-sm text-left hover:shadow-md transition-shadow"
        >
            <div className={`w-12 h-12 rounded-xl ${levelColors[classData.level] || 'bg-gray-500'} flex items-center justify-center text-white text-xl`}>
                {classData.emoji || '📚'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-text-main">{classData.name}</p>
                <p className="text-sm text-text-muted">{classData.studentCount} Students</p>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    👩‍🏫
                </div>
                <span className="text-xs text-text-muted">{classData.teacherName?.split(' ')[0]}</span>
            </div>
        </button>
    );
}

function ActionSheet({ classData, onClose, onEdit, onDelete }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
            <div className="w-full max-w-md bg-white rounded-t-3xl p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                        {classData.emoji || '🎓'}
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main">{classData.name}</h3>
                        <p className="text-sm text-text-muted">{classData.studentCount} Students</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={onEdit}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary text-white font-bold"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit Class
                    </button>
                    <button
                        onClick={onDelete}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50"
                    >
                        <span className="material-symbols-outlined">delete</span>
                        Delete Class
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-4 py-3 text-text-muted font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

function ClassModal({ classData, users, enrollments, onClose, onSave }) {
    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');

    const [selectedStudents, setSelectedStudents] = useState([]);
    const [formData, setFormData] = useState({
        name: classData?.name || '',
        emoji: classData?.emoji || '📚',
        level: classData?.level || 'Grade 1',
        teacher_id: classData?.teacher_id || '',
        description: classData?.description || '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (classData) {
            const classEnrollments = enrollments.filter(e => e.class_id === classData.id);
            setSelectedStudents(classEnrollments.map(e => e.student_id));
        }
    }, [classData, enrollments]);

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            let classId;
            if (classData) {
                await updateRecord('classes', classData.id, formData);
                classId = classData.id;

                // Clear old enrollments
                const oldEnrollments = enrollments.filter(e => e.class_id === classId);
                for (const e of oldEnrollments) {
                    await deleteRecord('enrollments', e.id);
                }
            } else {
                const newClass = await createRecord('classes', formData);
                classId = newClass.id;
            }

            // Add new enrollments
            for (const studentId of selectedStudents) {
                await createRecord('enrollments', { class_id: classId, student_id: studentId });
            }

            onSave();
        } catch (error) {
            console.error('Error saving class:', error);
            alert('Error saving class: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const emojis = ['📚', '🌟', '🌈', '🎨', '🔬', '🎵', '⚽', '🌸'];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 pb-4 shrink-0 border-b">
                    <button onClick={onClose} className="text-text-muted">Cancel</button>
                    <h3 className="font-bold text-text-main">{classData ? 'Edit Class' : 'New Class'}</h3>
                    <div className="w-16" />
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
                        {/* Emoji Picker */}
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-2">Icon</label>
                            <div className="flex gap-2 flex-wrap">
                                {emojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, emoji })}
                                        className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${formData.emoji === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'bg-gray-100 hover:bg-gray-200'
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Class Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Grade 2 - Sunflowers"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Level</label>
                            <select
                                value={formData.level}
                                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            >
                                <option>Kindergarten</option>
                                <option>Grade 1</option>
                                <option>Grade 2</option>
                                <option>Grade 3</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Assign Teacher</label>
                            <select
                                value={formData.teacher_id}
                                onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                            >
                                <option value="">Select a lead teacher</option>
                                {teachers.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">
                                Add Students ({selectedStudents.length} selected)
                            </label>
                            <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                {students.length === 0 ? (
                                    <p className="p-4 text-center text-text-muted">No students available</p>
                                ) : (
                                    students.map(student => (
                                        <button
                                            key={student.id}
                                            type="button"
                                            onClick={() => toggleStudent(student.id)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                                                {student.avatar || '👧'}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-text-main">{student.name}</p>
                                                <p className="text-xs text-text-muted">@{student.username}</p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 ${selectedStudents.includes(student.id)
                                                ? 'bg-primary border-primary'
                                                : 'border-gray-300'
                                                } flex items-center justify-center`}>
                                                {selectedStudents.includes(student.id) && (
                                                    <span className="material-symbols-outlined text-white" style={{ fontSize: 16 }}>check</span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-6 pt-4 border-t shrink-0">
                    <button
                        type="submit"
                        form="class-form"
                        disabled={saving}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {saving ? 'Saving...' : (classData ? 'Update Class' : 'Create Class')}
                    </button>
                </div>
            </div>
        </div>
    );
}
