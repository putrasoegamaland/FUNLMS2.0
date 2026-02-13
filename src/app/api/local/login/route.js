
import { NextResponse } from 'next/server';
import { getLocalDB } from '@/lib/localServer';

export async function POST(request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const db = await getLocalDB();
        const users = db.users || [];

        // Simple plaintext check (since local DB stores what was synced)
        // Note: Real app should hash passwords, but for this local-hub prototype we rely on the teacher's sync
        const user = users.find(u => u.username === username && u.password === password);

        if (user) {
            // Return user without password
            const { password: _, ...safeUser } = user;
            return NextResponse.json({ success: true, user: safeUser });
        } else {
            return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
        }
    } catch (error) {
        console.error('Local login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
