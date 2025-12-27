import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/publish/${id}/status`);
        const data = await response.json();

        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Publish status error:', error);
        return NextResponse.json(
            { published: false },
            { status: 200 }
        );
    }
}
