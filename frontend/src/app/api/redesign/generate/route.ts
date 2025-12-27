import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, style = 'modern', language = 'en' } = body;

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        const response = await fetch(`${BACKEND_URL}/api/redesign/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, style, language })
        });

        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data, { status: 201 });
        } else {
            return NextResponse.json(
                { error: data.detail || 'Failed to generate redesign' },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Generate redesign error:', error);
        return NextResponse.json(
            { error: 'Failed to generate redesign' },
            { status: 500 }
        );
    }
}
