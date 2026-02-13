
import { NextResponse } from 'next/server';
import { getLocalDB } from '@/lib/localServer';

/**
 * Health check endpoint for local hub detection.
 * Students' browsers hit this on page load to see if a local hub is running.
 * If db.json exists and has users, respond with { available: true }.
 */
export async function GET() {
    try {
        const db = await getLocalDB();
        const hasUsers = db.users && db.users.length > 0;
        return NextResponse.json({
            available: hasUsers,
            userCount: db.users?.length || 0,
            lastSync: db.last_sync || null
        });
    } catch (error) {
        return NextResponse.json({ available: false }, { status: 200 });
    }
}
