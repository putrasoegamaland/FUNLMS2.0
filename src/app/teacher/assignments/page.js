'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import storage from '@/lib/storage';

export default function TeacherAssignmentsPage() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [classes, setClasses] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        classIds: [],
        maxScore: 100,
    });

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = () => {
        const allAssignments = storage.assignments.getAll();
        setAssignments(allAssignments.filter(a => a.createdBy === user?.id));

        const allClasses = storage.classes.getAll();
        setClasses(allClasses.filter(c => c.teacherId === user?.id));
    };

    const handleSubmit = () => {
        if (!formData.title) {
            alert('Please enter a title');
            return;
        }

        storage.assignments.create({
            ...formData,
            createdBy: user?.id,
        });

        setFormData({
            title: '',
            description: '',
            dueDate: '',
            classIds: [],
            maxScore: 100,
        });
        setShowForm(false);
        loadData();
    };

    const handleDelete = (id) => {
        if (confirm('Delete this assignment?')) {
            storage.assignments.delete(id);
            loadData();
        }
    };

    // View submissions for an assignment
    if (selectedAssignment) {
        const submissions = storage.submissions.getAll()
            .filter(s => s.assignmentId === selectedAssignment.id);

        return (
            <AssignmentSubmissions
                assignment={selectedAssignment}
                submissions={submissions}
                onBack={() => {
                    setSelectedAssignment(null);
                    loadData();
                }}
                userId={user?.id}
            />
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-text-main">📋 Assignments</h2>
                    <p className="text-sm text-text-muted">Create and manage assignments</p>
                </div>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-text-main">➕ New Assignment</h3>
                        <button onClick={() => setShowForm(false)} className="text-text-muted">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Title</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Draw Your Favorite Animal"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Instructions</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Describe what students need to do..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary outline-none resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Due Date</label>
                            <input
                                type="datetime-local"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Max Score</label>
                            <input
                                type="number"
                                value={formData.maxScore}
                                onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-main mb-2">Assign to Classes</label>
                        <div className="flex flex-wrap gap-2">
                            {classes.map((cls) => (
                                <button
                                    key={cls.id}
                                    onClick={() => {
                                        const newIds = formData.classIds.includes(cls.id)
                                            ? formData.classIds.filter(id => id !== cls.id)
                                            : [...formData.classIds, cls.id];
                                        setFormData({ ...formData, classIds: newIds });
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium ${formData.classIds.includes(cls.id)
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-text-muted'
                                        }`}
                                >
                                    {cls.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl"
                    >
                        Create Assignment
                    </button>
                </div>
            )}

            {/* Assignments List */}
            {assignments.length > 0 ? (
                <div className="space-y-3">
                    {assignments.map((assignment) => {
                        const submissions = storage.submissions.getAll()
                            .filter(s => s.assignmentId === assignment.id);
                        const gradedCount = submissions.filter(s => s.score !== undefined).length;
                        const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date();

                        return (
                            <div
                                key={assignment.id}
                                className="bg-card-light rounded-xl p-4 border border-gray-100"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">
                                        📋
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-text-main">{assignment.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-text-muted">
                                                {submissions.length} submissions
                                            </span>
                                            {gradedCount < submissions.length && (
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                                    {submissions.length - gradedCount} to grade
                                                </span>
                                            )}
                                            {isOverdue && (
                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                    Past due
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setSelectedAssignment(assignment)}
                                            className="p-2 hover:bg-blue-50 rounded-lg"
                                        >
                                            <span className="material-symbols-outlined text-blue-500" style={{ fontSize: 20 }}>visibility</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(assignment.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg"
                                        >
                                            <span className="material-symbols-outlined text-red-500" style={{ fontSize: 20 }}>delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-card-light rounded-xl border border-gray-100">
                    <span className="text-5xl mb-4 block">📋</span>
                    <p className="text-text-muted">No assignments yet</p>
                    <p className="text-sm text-text-muted">Create your first assignment!</p>
                </div>
            )}

            {/* FAB */}
            {!showForm && (
                <button
                    onClick={() => setShowForm(true)}
                    className="fixed bottom-24 right-4 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg font-bold"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Assignment
                </button>
            )}
        </div>
    );
}

// Assignment Submissions View with Grading
function AssignmentSubmissions({ assignment, submissions, onBack, userId }) {
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [score, setScore] = useState('');
    const [feedback, setFeedback] = useState('');

    const handleGrade = () => {
        if (score === '') return;

        storage.submissions.update(selectedSubmission.id, {
            score: parseInt(score),
            feedback,
            gradedAt: new Date().toISOString(),
            gradedBy: userId,
        });

        setSelectedSubmission(null);
        setScore('');
        setFeedback('');
    };

    if (selectedSubmission) {
        const student = storage.users.getById(selectedSubmission.studentId);

        return (
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedSubmission(null)}>
                        <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-text-main">Grade Submission</h2>
                        <p className="text-sm text-text-muted">{student?.name}</p>
                    </div>
                </div>

                {/* Uploaded Files */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h4 className="font-bold text-text-main mb-3">📎 Uploaded Files</h4>
                    {selectedSubmission.files?.map((file, i) => (
                        <div key={i} className="mb-3">
                            {file.type?.startsWith('image') || file.data?.startsWith('data:image') ? (
                                <img
                                    src={file.data}
                                    alt={file.name}
                                    className="max-w-full rounded-lg border"
                                />
                            ) : (
                                <a
                                    href={file.data}
                                    download={file.name}
                                    className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                                >
                                    <span className="material-symbols-outlined text-red-500">picture_as_pdf</span>
                                    <span className="text-text-main">{file.name}</span>
                                    <span className="material-symbols-outlined ml-auto text-text-muted">download</span>
                                </a>
                            )}
                        </div>
                    ))}
                    {selectedSubmission.note && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-text-muted">Student's note:</p>
                            <p className="text-text-main">{selectedSubmission.note}</p>
                        </div>
                    )}
                </div>

                {/* Grading */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 space-y-4">
                    <h4 className="font-bold text-text-main">✏️ Grade</h4>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">
                            Score (0-{assignment.maxScore || 100})
                        </label>
                        <input
                            type="number"
                            min="0"
                            max={assignment.maxScore || 100}
                            value={score}
                            onChange={(e) => setScore(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-2xl font-bold text-center"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Feedback</label>
                        <textarea
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            placeholder="Write feedback..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 resize-none"
                        />
                    </div>
                    <button
                        onClick={handleGrade}
                        disabled={score === ''}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50"
                    >
                        Save Grade
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack}>
                    <span className="material-symbols-outlined text-text-muted">arrow_back</span>
                </button>
                <div>
                    <h2 className="text-lg font-bold text-text-main">{assignment.title}</h2>
                    <p className="text-sm text-text-muted">{submissions.length} submissions</p>
                </div>
            </div>

            {assignment.description && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-sm text-blue-700">{assignment.description}</p>
                </div>
            )}

            {submissions.length > 0 ? (
                <div className="space-y-3">
                    {submissions.map((sub) => {
                        const student = storage.users.getById(sub.studentId);
                        return (
                            <button
                                key={sub.id}
                                onClick={() => setSelectedSubmission(sub)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl bg-card-light border border-gray-100 text-left hover:border-primary"
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${sub.score !== undefined ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                                    }`}>
                                    {sub.score !== undefined ? sub.score : '?'}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-text-main">{student?.name}</p>
                                    <p className="text-sm text-text-muted">
                                        Submitted: {new Date(sub.submittedAt).toLocaleString()}
                                    </p>
                                </div>
                                <span className="material-symbols-outlined text-text-muted">chevron_right</span>
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <span className="text-4xl mb-3 block">📭</span>
                    <p className="text-text-muted">No submissions yet</p>
                </div>
            )}
        </div>
    );
}
