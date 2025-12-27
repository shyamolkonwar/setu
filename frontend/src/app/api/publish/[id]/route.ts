import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Get the website ID from URL params
        const { id } = await params;

        // Get the authorization header from the incoming request
        const authHeader = request.headers.get('Authorization');

        // Build headers for backend request
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        // Forward the auth header if present
        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        // Make request to backend
        const backendResponse = await fetch(`${BACKEND_URL}/api/publish/${id}`, {
            method: 'POST',
            headers: headers,
        });

        // Get the response data
        const data = await backendResponse.json();

        // Return the response with the same status code
        return NextResponse.json(data, { status: backendResponse.status });

    } catch (error) {
        console.error('Publish API error:', error);
        return NextResponse.json(
            { error: 'Failed to publish website', detail: String(error) },
            { status: 500 }
        );
    }
}
