
import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
    try {
        const interfaces = os.networkInterfaces();
        let ipAddress = 'localhost';

        // Iterate over network interfaces to find a non-internal IPv4 address
        Object.keys(interfaces).forEach((ifname) => {
            interfaces[ifname].forEach((iface) => {
                // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
                if (iface.family === 'IPv4' && !iface.internal) {
                    // Prefer Wi-Fi or Ethernet interfaces if possible, but take the first valid one
                    ipAddress = iface.address;
                }
            });
        });

        return NextResponse.json({ ip: ipAddress });
    } catch (error) {
        console.error('Error detecting local IP:', error);
        return NextResponse.json({ ip: 'localhost', error: error.message }, { status: 500 });
    }
}
