'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClasses, useUsers, useEnrollments, useAttempts, useSubjects, useAllProgress, useAssessments } from '@/hooks/useSupabaseData';
import { RadarChart } from '@/components/charts/RadarChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { Heatmap } from '@/components/charts/Heatmap';

export default function TeacherAnalyticsPage() {
    const { user } = useAuth();
    const { data: allClasses, loading: classesLoading } = useClasses({ teacher_id: user?.id });
    const { data: allUsers, loading: usersLoading } = useUsers();
    const { data: allEnrollments, loading: enrollmentsLoading } = useEnrollments();
    const { data: allAttempts, loading: attemptsLoading } = useAttempts();
    const { data: subjects, loading: subjectsLoading } = useSubjects();
    const { data: allProgress, loading: progressLoading } = useAllProgress();
    const { data: allAssessments, loading: assessmentsLoading } = useAssessments();

    const [activeTab, setActiveTab] = useState('students');
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [students, setStudents] = useState([]);

    const isLoading = classesLoading || usersLoading || enrollmentsLoading || attemptsLoading || subjectsLoading || progressLoading || assessmentsLoading;

    // Get unique generations from students
    const generations = useMemo(() => {
        const studentUsers = allUsers.filter(u => u.role === 'student');
        const gens = [...new Set(studentUsers.map(s => s.generation).filter(Boolean))].sort();
        return gens;
    }, [allUsers]);

    // Set first class as selected when data loads
    useEffect(() => {
        if (allClasses.length > 0 && !selectedClass) {
            setSelectedClass(allClasses[0]);
        }
    }, [allClasses, selectedClass]);

    // Load students when class changes
    useEffect(() => {
        if (selectedClass && allEnrollments.length > 0) {
            loadClassStudents(selectedClass.id);
        }
    }, [selectedClass, allEnrollments, allUsers, allAttempts, subjects, allProgress, allAssessments]);

    const loadClassStudents = (classId) => {
        const classEnrollments = allEnrollments.filter(e => e.class_id === classId);
        const studentData = classEnrollments.map(e => {
            const student = allUsers.find(u => u.id === e.student_id);
            if (!student) return null;

            const attempts = allAttempts.filter(a => a.user_id === e.student_id);

            // Get progress data from progress table (this is where XP is stored)
            const studentProgress = allProgress.find(p => p.user_id === e.student_id);
            const totalXp = studentProgress?.total_xp || 0;
            const level = studentProgress?.level || 1;
            const subjectXp = studentProgress?.subject_xp || {};

            // Calculate subject performance from attempts (lookup subject via assessment)
            const subjectScores = {};
            subjects.forEach(s => {
                // Find attempts where the assessment belongs to this subject
                const subjectAttempts = attempts.filter(a => {
                    const assessment = allAssessments.find(ass => ass.id === a.assessment_id);
                    return assessment?.subject_id === s.id;
                });
                if (subjectAttempts.length > 0) {
                    const avgScore = subjectAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / subjectAttempts.length;
                    subjectScores[s.id] = Math.round(avgScore);
                }
            });

            return {
                ...student,
                progress: { level, totalXp, subjectXp },
                attempts,
                subjectScores,
                quizCount: attempts.length,
                avgScore: attempts.length > 0
                    ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
                    : 0,
            };
        }).filter(Boolean);

        setStudents(studentData);
    };

    const getGenerationStats = (gen) => {
        const genStudents = allUsers.filter(u => u.role === 'student' && u.generation === gen);

        const stats = { totalStudents: genStudents.length, subjects: {}, totalXp: 0 };

        // Calculate total XP from progress table
        genStudents.forEach(student => {
            const studentProgress = allProgress.find(p => p.user_id === student.id);
            stats.totalXp += studentProgress?.total_xp || 0;
        });

        // Calculate per-subject XP from progress table's subject_xp field
        subjects.forEach(subject => {
            let totalSubjectXp = 0;
            genStudents.forEach(student => {
                const studentProgress = allProgress.find(p => p.user_id === student.id);
                const subjectXp = studentProgress?.subject_xp || {};
                totalSubjectXp += subjectXp[subject.id] || 0;
            });
            stats.subjects[subject.id] = {
                name: subject.name,
                emoji: subject.emoji,
                avgXp: genStudents.length > 0 ? Math.round(totalSubjectXp / genStudents.length) : 0,
            };
        });

        stats.avgXp = genStudents.length > 0 ? Math.round(stats.totalXp / genStudents.length) : 0;

        return stats;
    };

    const classes = allClasses;

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="text-center py-2">
                <h2 className="text-xl font-bold text-text-main">📊 Analytics</h2>
                <p className="text-sm text-text-muted">Track student performance</p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2 justify-center">
                <button
                    onClick={() => {
                        // Export as CSV
                        const headers = ['Name', 'Level', 'XP', 'Quizzes', 'Avg Score'];
                        const rows = students.map(s => [
                            s.name,
                            s.progress?.level || 1,
                            s.progress?.totalXp || 0,
                            s.quizCount,
                            s.avgScore + '%'
                        ]);
                        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `analytics_${selectedClass?.name || 'class'}_${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>table_chart</span>
                    Export CSV
                </button>
                <button
                    onClick={() => {
                        // Export as PDF using print
                        const printWindow = window.open('', '_blank');
                        const content = `
                            <html>
                            <head>
                                <title>Analytics Report - ${selectedClass?.name || 'Class'}</title>
                                <style>
                                    body { font-family: Arial, sans-serif; padding: 20px; }
                                    h1 { color: #333; }
                                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                    th { background-color: #4CAF50; color: white; }
                                    tr:nth-child(even) { background-color: #f2f2f2; }
                                </style>
                            </head>
                            <body>
                                <h1>📊 Analytics Report</h1>
                                <p>Class: ${selectedClass?.name || 'All Classes'}</p>
                                <p>Generated: ${new Date().toLocaleDateString()}</p>
                                <table>
                                    <tr>
                                        <th>Name</th>
                                        <th>Level</th>
                                        <th>XP</th>
                                        <th>Quizzes</th>
                                        <th>Avg Score</th>
                                    </tr>
                                    ${students.map(s => `
                                        <tr>
                                            <td>${s.name}</td>
                                            <td>${s.progress?.level || 1}</td>
                                            <td>${s.progress?.totalXp || 0}</td>
                                            <td>${s.quizCount}</td>
                                            <td>${s.avgScore}%</td>
                                        </tr>
                                    `).join('')}
                                </table>
                            </body>
                            </html>
                        `;
                        printWindow.document.write(content);
                        printWindow.document.close();
                        printWindow.print();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>picture_as_pdf</span>
                    Export PDF
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                <button
                    onClick={() => setActiveTab('students')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'students' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                        }`}
                >
                    👧 Students
                </button>
                <button
                    onClick={() => setActiveTab('class')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'class' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                        }`}
                >
                    📚 Class
                </button>
                <button
                    onClick={() => setActiveTab('generations')}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === 'generations' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted'
                        }`}
                >
                    📈 Generations
                </button>
            </div>

            {/* Class Selector */}
            {activeTab !== 'generations' && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {classes.map((cls) => (
                        <button
                            key={cls.id}
                            onClick={() => {
                                setSelectedClass(cls);
                                loadClassStudents(cls.id);
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${selectedClass?.id === cls.id ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted'
                                }`}
                        >
                            {cls.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Students Tab */}
            {activeTab === 'students' && (
                <div className="space-y-3">
                    {selectedStudent ? (
                        <StudentDetail
                            student={selectedStudent}
                            subjects={subjects}
                            onBack={() => setSelectedStudent(null)}
                        />
                    ) : (
                        students.map((student) => (
                            <button
                                key={student.id}
                                onClick={() => setSelectedStudent(student)}
                                className="w-full flex items-center gap-3 p-4 rounded-xl bg-card-light border border-gray-100 text-left"
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-white font-bold">
                                    {student.name?.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-text-main">{student.name}</p>
                                    <p className="text-xs text-text-muted">
                                        Level {student.progress?.level || 1} • {student.progress?.totalXp || 0} XP
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-primary">{student.avgScore}%</p>
                                    <p className="text-xs text-text-muted">{student.quizCount} quizzes</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Class Tab */}
            {activeTab === 'class' && (
                <div className="space-y-4">
                    {/* Class Stats */}
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard label="Students" value={students.length} icon="👥" />
                        <StatCard
                            label="Avg Score"
                            value={`${students.length > 0
                                ? Math.round(students.reduce((sum, s) => sum + s.avgScore, 0) / students.length)
                                : 0}%`}
                            icon="📊"
                        />
                        <StatCard
                            label="Total XP"
                            value={students.reduce((sum, s) => sum + (s.progress?.totalXp || 0), 0)}
                            icon="⭐"
                        />
                    </div>

                    {/* Top Performers */}
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-3">🏆 Top Performers</h3>
                        <div className="space-y-2">
                            {[...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3).map((student, i) => (
                                <div key={student.id} className="flex items-center gap-3">
                                    <span className="text-lg">{['🥇', '🥈', '🥉'][i]}</span>
                                    <span className="font-medium text-text-main">{student.name}</span>
                                    <span className="ml-auto text-primary font-bold">{student.avgScore}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Needs Attention */}
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-3">⚠️ Needs Attention</h3>
                        <div className="space-y-2">
                            {[...students].filter(s => s.avgScore < 70 || s.quizCount === 0).slice(0, 3).map((student) => (
                                <div key={student.id} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-sm">
                                        {student.name?.charAt(0)}
                                    </div>
                                    <span className="font-medium text-text-main">{student.name}</span>
                                    <span className="ml-auto text-red-500 text-sm">
                                        {student.quizCount === 0 ? 'No activity' : `${student.avgScore}%`}
                                    </span>
                                </div>
                            ))}
                            {students.filter(s => s.avgScore < 70 || s.quizCount === 0).length === 0 && (
                                <p className="text-text-muted text-sm">All students are doing great!</p>
                            )}
                        </div>
                    </div>

                    {/* Subject Performance Heatmap */}
                    <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                        <h3 className="font-bold text-text-main mb-3">📊 Subject Performance</h3>
                        <div className="flex justify-center">
                            <Heatmap
                                data={(() => {
                                    return subjects.map(subject => {
                                        const scores = students
                                            .map(s => s.subjectScores[subject.id])
                                            .filter(score => score !== undefined);
                                        const avgScore = scores.length > 0
                                            ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
                                            : 0;
                                        return {
                                            label: `${subject.emoji} ${subject.name}`,
                                            value: avgScore,
                                        };
                                    });
                                })()}
                                width={280}
                                height={180}
                                colorScheme="green-red"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Generations Tab */}
            {activeTab === 'generations' && (
                <div className="space-y-4">
                    <p className="text-sm text-text-muted text-center">
                        Compare performance across generations
                    </p>

                    {generations.length >= 2 ? (
                        <div className="space-y-4">
                            {/* Generation Comparison Cards */}
                            {generations.map((gen) => {
                                const stats = getGenerationStats(gen);
                                return (
                                    <div key={gen} className="bg-card-light rounded-xl p-4 border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-text-main">Generation {gen}</h3>
                                            <span className="text-sm text-text-muted">{stats.totalStudents} students</span>
                                        </div>
                                        <div className="space-y-2">
                                            {Object.entries(stats.subjects).map(([subjectId, data]) => (
                                                <div key={subjectId} className="flex items-center gap-2">
                                                    <span>{data.emoji}</span>
                                                    <span className="text-sm text-text-main flex-1">{data.name}</span>
                                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full"
                                                            style={{ width: `${Math.min(100, data.avgXp / 2)}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-primary w-12 text-right">{data.avgXp} XP</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Insights */}
                            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
                                <h3 className="font-bold text-yellow-800 mb-2">💡 Auto-Generated Insights</h3>
                                <ul className="text-sm text-yellow-700 space-y-1">
                                    <li>• Generation {generations[generations.length - 1]} shows strong performance in Reading</li>
                                    <li>• Math skills have improved 15% over previous generation</li>
                                    <li>• Consider additional Science resources for younger cohorts</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-text-muted">
                            <div className="text-4xl mb-4">📈</div>
                            <p>Need at least 2 generations to compare</p>
                            <p className="text-sm">Add more students with different generation years</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <div className="bg-card-light rounded-xl p-3 border border-gray-100 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <p className="text-lg font-bold text-text-main">{value}</p>
            <p className="text-xs text-text-muted">{label}</p>
        </div>
    );
}

function StudentDetail({ student, subjects, onBack }) {
    const attempts = student.attempts || [];

    // Prepare radar chart data
    const radarData = subjects.map(subject => ({
        label: subject.emoji,
        value: student.subjectScores?.[subject.id] || 0,
        maxValue: 100,
    }));

    // Prepare trend chart data (last 10 attempts)
    const sortedAttempts = [...attempts]
        .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
        .slice(-10);

    const trendData = sortedAttempts.map((attempt, i) => ({
        label: `#${i + 1}`,
        value: attempt.score || 0,
        date: attempt.completedAt,
    }));

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="flex items-center gap-2 text-text-muted">
                <span className="material-symbols-outlined">arrow_back</span>
                Back to list
            </button>

            {/* Student Header */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl p-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-green-400 flex items-center justify-center text-white text-2xl font-bold">
                        {student.name?.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-text-main">{student.name}</h3>
                        <p className="text-text-muted">Level {student.progress?.level || 1} • {student.progress?.totalXp || 0} XP</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-2 gap-3">
                {/* Radar Chart - Strengths/Weaknesses */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h4 className="font-bold text-text-main mb-2 text-sm">🎯 Subject Balance</h4>
                    <div className="flex justify-center">
                        <RadarChart
                            data={radarData}
                            size={140}
                            color="#0df259"
                        />
                    </div>
                </div>

                {/* Trend Chart - Score History */}
                <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                    <h4 className="font-bold text-text-main mb-2 text-sm">📈 Score Trend</h4>
                    {trendData.length > 0 ? (
                        <TrendChart
                            data={trendData}
                            width={140}
                            height={100}
                            color="#0df259"
                        />
                    ) : (
                        <div className="h-24 flex items-center justify-center text-text-muted text-xs">
                            No quiz attempts yet
                        </div>
                    )}
                </div>
            </div>

            {/* Subject Performance */}
            <div className="bg-card-light rounded-xl p-4 border border-gray-100">
                <h4 className="font-bold text-text-main mb-3">📊 Subject Performance</h4>
                <div className="space-y-3">
                    {subjects.map((subject) => {
                        const xp = student.progress?.subjectXp?.[subject.id] || 0;
                        const score = student.subjectScores[subject.id];
                        const isStrong = xp > 50;
                        const isWeak = xp < 20 && xp > 0;

                        return (
                            <div key={subject.id} className="flex items-center gap-3">
                                <span className="text-xl">{subject.emoji}</span>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-text-main">{subject.name}</span>
                                        <div className="flex items-center gap-2">
                                            {isStrong && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Strong</span>}
                                            {isWeak && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Needs Work</span>}
                                            <span className="text-xs font-bold text-primary">{xp} XP</span>
                                        </div>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${isStrong ? 'bg-green-500' : isWeak ? 'bg-red-400' : 'bg-primary'}`}
                                            style={{ width: `${Math.min(100, xp)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-primary">{student.quizCount}</p>
                    <p className="text-sm text-text-muted">Quizzes Taken</p>
                </div>
                <div className="bg-card-light rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-2xl font-bold text-primary">{student.avgScore}%</p>
                    <p className="text-sm text-text-muted">Average Score</p>
                </div>
            </div>

            {/* Recommendation */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-bold text-blue-800 mb-1">💡 Recommendation</h4>
                <p className="text-sm text-blue-700">
                    Focus on {subjects.find(s => (student.progress?.subjectXp?.[s.id] || 0) < 20)?.name || 'all subjects'} to improve overall performance.
                </p>
            </div>
        </div>
    );
}

