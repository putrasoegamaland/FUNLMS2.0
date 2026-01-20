'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, testConnection } from '@/lib/supabase';

export default function TestSupabasePage() {
    const [status, setStatus] = useState('Loading...');
    const [details, setDetails] = useState(null);
    const [tables, setTables] = useState([]);

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

                // Try to fetch table counts
                try {
                    const tableCounts = {};
                    const tableNames = ['users', 'classes', 'subjects', 'books', 'assessments', 'badges'];

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
            } else {
                setStatus('❌ CONNECTION FAILED');
                setDetails(result.error);
            }
        }

        runTest();
    }, []);

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
                    <div>
                        <h2 className="font-bold mb-2">📊 Table Row Counts:</h2>
                        <div className="space-y-1">
                            {tables.map(([table, count]) => (
                                <div key={table} className="flex justify-between text-sm">
                                    <span>{table}</span>
                                    <span className="font-mono">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t">
                    <a href="/login" className="text-primary underline">
                        ← Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
