import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/edit/${id}/sections`);
        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(
                { error: data.detail || 'Failed to get sections' },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Get sections error:', error);
        return NextResponse.json(
            { error: 'Failed to get sections' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const response = await fetch(`${BACKEND_URL}/api/edit/${id}/section`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(
                { error: data.detail || 'Failed to edit section' },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Edit section error:', error);
        return NextResponse.json(
            { error: 'Failed to edit section' },
            { status: 500 }
        );
    }
}
