'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@/lib/storage';

export default function TeacherClassesPage() {
    const { user } = useAuth();
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);

    useEffect(() => {
        loadClasses();
    }, [user]);

    const loadClasses = () => {
        const allClasses = storage.classes.getAll();
        const teacherClasses = allClasses.filter(c => c.teacherId === user?.id);

        const withStudents = teacherClasses.map(cls => {
            const enrollments = storage.enrollments.getAll().filter(e => e.classId === cls.id);
            const students = enrollments.map(e => storage.users.getById(e.studentId)).filter(Boolean);
            return { ...cls, students };
        });

        setClasses(withStudents);
        if (withStudents.length > 0 && !selectedClass) {
            setSelectedClass(withStudents[0]);
        }
    };

    return (
        <div className="p-4 space-y-4">
            {/* Class Tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {classes.map((cls) => (
                    <button
                        key={cls.id}
                        onClick={() => setSelectedClass(cls)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedClass?.id === cls.id
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                            }`}
                    >
                        {cls.name}
                    </button>
                ))}
            </div>

            {selectedClass ? (
                <>
                    {/* Class Info */}
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                        <h2 className="text-xl font-bold">{selectedClass.name}</h2>
                        <p className="text-blue-100">{selectedClass.level} • {selectedClass.students.length} students</p>
                    </div>

                    {/* Students List */}
                    <div>
                        <h3 className="font-bold text-text-main mb-3">Students</h3>
                        <div className="space-y-2">
                            {selectedClass.students.map((student) => (
                                <StudentCard key={student.id} student={student} />
                            ))}
                            {selectedClass.students.length === 0 && (
                                <p className="text-center py-8 text-text-muted">No students enrolled</p>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-4">📚</div>
                    <p>No classes assigned to you yet.</p>
                    <p className="text-sm">Contact your admin to get started.</p>
                </div>
            )}
        </div>
    );
}

function StudentCard({ student }) {
    const progress = storage.progress.get(student.id);

    return (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-card-light border border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-white font-bold">
                {student.name.charAt(0)}
            </div>
            <div className="flex-1">
                <p className="font-medium text-text-main">{student.name}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>⭐ {progress.totalXp || 0} XP</span>
                    <span>•</span>
                    <span>Level {progress.level || 1}</span>
                </div>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                <span className="text-xs">🔥</span>
                <span className="text-xs font-bold text-orange-600">{progress.streak || 0}</span>
            </div>
        </div>
    );
}
