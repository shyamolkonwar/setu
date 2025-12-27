import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Check if this is a scrape or generate request
        const path = request.nextUrl.pathname;

        if (path.endsWith('/scrape')) {
            const response = await fetch(`${BACKEND_URL}/api/redesign/scrape`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            const data = await response.json();

            if (response.ok) {
                return NextResponse.json(data, { status: 200 });
            } else {
                return NextResponse.json(
                    { error: data.detail || 'Failed to scrape website' },
                    { status: response.status }
                );
            }
        } else {
            // Generate request
            const { style = 'modern', language = 'en' } = body;

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
        }
    } catch (error) {
        console.error('Redesign error:', error);
        return NextResponse.json(
            { error: 'Failed to process redesign request' },
            { status: 500 }
        );
    }
}
