import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/preview/${id}`);
        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data);
        } else {
            return NextResponse.json(
                { error: data.detail || 'Website not found' },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Preview error:', error);
        return NextResponse.json(
            { error: 'Failed to load preview' },
            { status: 500 }
        );
    }
}
