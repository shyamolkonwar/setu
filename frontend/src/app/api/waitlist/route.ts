import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Forward request to backend API
        const response = await fetch(`${BACKEND_URL}/api/waitlist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': request.headers.get('x-forwarded-for') ||
                    request.headers.get('x-real-ip') ||
                    'unknown',
                'User-Agent': request.headers.get('user-agent') || 'unknown'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return NextResponse.json(data, { status: response.status });

    } catch (error) {
        console.error('Waitlist error:', error);
        return NextResponse.json(
            { error: 'Failed to join waitlist' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        // Get waitlist count from backend
        const response = await fetch(`${BACKEND_URL}/api/waitlist/count`);
        const data = await response.json();

        return NextResponse.json(data);

    } catch (error) {
        console.error('Waitlist count error:', error);
        return NextResponse.json(
            { count: 0, error: 'Failed to fetch count' },
            { status: 500 }
        );
    }
}
