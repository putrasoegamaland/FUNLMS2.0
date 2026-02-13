
import { NextResponse } from 'next/server';
import { getLocalDB, saveLocalDB } from '@/lib/localServer';

// GET: Fetch data from a collection
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');
        const query = searchParams.get('query'); // Simple JSON filter

        if (!table) {
            return NextResponse.json({ error: 'Table name required' }, { status: 400 });
        }

        const db = await getLocalDB();
        let data = db[table] || [];

        // Apply simple filters
        if (query) {
            try {
                const filters = JSON.parse(query);
                data = data.filter(item => {
                    return Object.entries(filters).every(([key, value]) => {
                        // Handle array contains (e.g. class_ids)
                        if (Array.isArray(item[key]) && !Array.isArray(value)) {
                            return item[key].includes(value);
                        }
                        return item[key] === value;
                    });
                });
            } catch (e) {
                console.error('Invalid filter query:', e);
            }
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Local data fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Insert or Update a record
export async function POST(request) {
    try {
        const { table, record } = await request.json();

        if (!table || !record) {
            return NextResponse.json({ error: 'Table and record required' }, { status: 400 });
        }

        const db = await getLocalDB();

        if (!db[table]) db[table] = [];

        // Check if exists
        const index = db[table].findIndex(item => item.id === record.id);

        if (index >= 0) {
            // Update
            db[table][index] = { ...db[table][index], ...record };
        } else {
            // Insert
            db[table].push(record);
        }

        await saveLocalDB(db);

        return NextResponse.json({ data: record, success: true });
    } catch (error) {
        console.error('Local data save error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
