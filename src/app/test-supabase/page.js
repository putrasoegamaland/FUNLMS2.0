'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, testConnection } from '@/lib/supabase';
import { seedSupabaseData } from '@/lib/seedSupabase';

export default function TestSupabasePage() {
    const [status, setStatus] = useState('Loading...');
    const [details, setDetails] = useState(null);
    const [tables, setTables] = useState([]);
    const [seeding, setSeeding] = useState(false);
    const [seedResult, setSeedResult] = useState(null);

    const fetchTableCounts = async () => {
        try {
            const tableCounts = {};
            const tableNames = ['users', 'classes', 'subjects', 'books', 'assessments', 'badges', 'enrollments'];

            for (const table of tableNames) {
                const { count, error } = await supabase
                    .from(table)
                    .select('*', { count: 'exact', head: true });

                tableCounts[table] = error ? 'Error' : count;
            }

            setTables(Object.entries(tableCounts));
        } catch (e) {
            console.error('Error fetching counts:', e);
        }
    };

    useEffect(() => {
        async function runTest() {
            // Check if configured
            if (!isSupabaseConfigured()) {
                setStatus('❌ NOT CONFIGURED');
                setDetails('Supabase environment variables are missing');
                return;
            }

            // Test connection
            const result = await testConnection();

            if (result.success) {
                setStatus('✅ CONNECTED');
                await fetchTableCounts();
            } else {
                setStatus('❌ CONNECTION FAILED');
                setDetails(result.error);
            }
        }

        runTest();
    }, []);

    const handleSeedData = async () => {
        setSeeding(true);
        setSeedResult(null);

        try {
            const result = await seedSupabaseData();
            setSeedResult(result);
            if (result.success) {
                await fetchTableCounts(); // Refresh counts
            }
        } catch (error) {
            setSeedResult({ success: false, error: error.message });
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-4">🔌 Supabase Connection Test</h1>

                <div className={`p-4 rounded-xl mb-4 ${status.includes('✅') ? 'bg-green-100' :
                    status.includes('❌') ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                    <p className="text-xl font-bold">{status}</p>
                    {details && <p className="text-sm text-gray-600 mt-1">{details}</p>}
                </div>

                {tables.length > 0 && (
                    <div className="mb-4">
                        <h2 className="font-bold mb-2">📊 Table Row Counts:</h2>
                        <div className="space-y-1">
                            {tables.map(([table, count]) => (
                                <div key={table} className="flex justify-between text-sm">
                                    <span>{table}</span>
                                    <span className={`font-mono ${count === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Seed Data Button */}
                <div className="mb-4">
                    <button
                        onClick={handleSeedData}
                        disabled={seeding}
                        className="w-full py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50"
                    >
                        {seeding ? '⏳ Seeding...' : '🌱 Seed Demo Data'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                        Creates demo users, classes, subjects, and enrollments
                    </p>
                </div>

                {seedResult && (
                    <div className={`p-3 rounded-xl mb-4 ${seedResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                        <p className="text-sm font-medium">
                            {seedResult.success ? '✅ ' : '❌ '}
                            {seedResult.message || seedResult.error || 'Data seeded successfully!'}
                        </p>
                    </div>
                )}

                <div className="pt-4 border-t">
                    <a href="/login" className="text-primary underline">
                        ← Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
