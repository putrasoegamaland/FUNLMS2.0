'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import storage from '@/lib/storage';

export default function AdminClassesPage() {
    const { t } = useLanguage();
    const [classes, setClasses] = useState([]);
    const [filter, setFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(null);
    const [editingClass, setEditingClass] = useState(null);

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = () => {
        const allClasses = storage.classes.getAll();
        const withDetails = allClasses.map(cls => {
            const teacher = storage.users.getById(cls.teacherId);
            const enrollments = storage.enrollments.getAll().filter(e => e.classId === cls.id);
            return {
                ...cls,
                teacherName: teacher?.name || 'Unassigned',
                studentCount: enrollments.length,
            };
        });
        setClasses(withDetails);
    };

    const handleDelete = (classId) => {
        if (confirm('Are you sure you want to delete this class?')) {
            storage.classes.delete(classId);
            // Also delete enrollments for this class
            const enrollments = storage.enrollments.getAll();
            enrollments.filter(e => e.classId === classId).forEach(e => storage.enrollments.delete(e.id));
            loadClasses();
        }
        setShowActionSheet(null);
    };

    const handleEdit = (cls) => {
        setEditingClass(cls);
        setShowModal(true);
        setShowActionSheet(null);
    };

    const levels = ['All', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3'];

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-text-main">Manage Classes</h2>
                <button className="p-2 rounded-lg hover:bg-gray-100">
                    <span className="material-symbols-outlined text-text-muted">tune</span>
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" style={{ fontSize: 20 }}>
                    search
                </span>
                <input
                    type="text"
                    placeholder="Search classes or teachers"
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
                {classes.map((cls) => (
                    <ClassCard
                        key={cls.id}
                        classData={cls}
                        onTap={() => setShowActionSheet(cls)}
                    />
                ))}
                {classes.length === 0 && (
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
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        loadClasses();
                        setShowModal(false);
                    }}
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
            <div className={`w-12 h-12 rounded-xl ${levelColors[classData.level] || 'bg-gray-500'} flex items-center justify-center text-white font-bold`}>
                {classData.name.charAt(classData.name.length - 1)}
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
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        🎓
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main">{classData.name}</h3>
                        <p className="text-sm text-text-muted">{classData.studentCount} Students • Room 104</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={onEdit}
                        className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary text-white font-bold"
                    >
                        <span className="material-symbols-outlined">edit</span>
                        Edit Student List
                    </button>
                    <button
                        onClick={onEdit}
                        className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 text-text-main font-medium hover:bg-gray-50"
                    >
                        <span className="material-symbols-outlined text-text-muted">swap_horiz</span>
                        Reassign Teacher
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

function ClassModal({ classData, onClose, onSave }) {
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [formData, setFormData] = useState({
        name: classData?.name || '',
        level: classData?.level || 'Grade 1',
        curriculum: classData?.curriculum || 'Standard',
        teacherId: classData?.teacherId || '',
        generation: classData?.generation || new Date().getFullYear().toString(),
    });

    useEffect(() => {
        const allUsers = storage.users.getAll();
        setTeachers(allUsers.filter(u => u.role === 'teacher'));
        setStudents(allUsers.filter(u => u.role === 'student'));

        if (classData) {
            const enrollments = storage.enrollments.getAll().filter(e => e.classId === classData.id);
            setSelectedStudents(enrollments.map(e => e.studentId));
        }
    }, [classData]);

    const toggleStudent = (studentId) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        let classId;
        if (classData) {
            storage.classes.update(classData.id, formData);
            classId = classData.id;
            // Clear old enrollments
            const oldEnrollments = storage.enrollments.getAll().filter(e => e.classId === classId);
            oldEnrollments.forEach(e => storage.enrollments.delete(e.id));
        } else {
            const newClass = storage.classes.create(formData);
            classId = newClass.id;
        }

        // Add new enrollments
        selectedStudents.forEach(studentId => {
            storage.enrollments.create({ classId, studentId });
        });

        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <button onClick={onClose} className="text-text-muted">Cancel</button>
                    <h3 className="font-bold text-text-main">New Class</h3>
                    <div className="w-16" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                            value={formData.teacherId}
                            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        >
                            <option value="">Select a lead teacher</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Add Students</label>
                        <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                            {students.map(student => (
                                <button
                                    key={student.id}
                                    type="button"
                                    onClick={() => toggleStudent(student.id)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm">
                                        👧
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-medium text-text-main">{student.name}</p>
                                        <p className="text-xs text-text-muted">Grade {student.generation || '?'}</p>
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
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                        Create Class
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
                    </button>
                </form>
            </div>
        </div>
    );
}
