import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`);
        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(
                { error: data.detail || 'Failed to get task status' },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Task status error:', error);
        return NextResponse.json(
            { error: 'Failed to get task status' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const response = await fetch(`${BACKEND_URL}/api/tasks/${id}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(
                { error: data.detail || 'Failed to cancel task' },
                { status: response.status }
            );
        }
    } catch (error) {
        console.error('Task cancel error:', error);
        return NextResponse.json(
            { error: 'Failed to cancel task' },
            { status: 500 }
        );
    }
}
