
import { NextResponse } from 'next/server';
import { saveLocalDB } from '@/lib/localServer';

export async function POST(request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body || typeof body !== 'object') {
            return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
        }

        // Add metadata
        const dbData = {
            ...body,
            last_sync: new Date().toISOString()
        };

        // Save to file
        const success = await saveLocalDB(dbData);

        if (success) {
            return NextResponse.json({ success: true, message: 'Local server updated successfully' });
        } else {
            return NextResponse.json({ error: 'Failed to write to local storage' }, { status: 500 });
        }
    } catch (error) {
        console.error('Local sync error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
