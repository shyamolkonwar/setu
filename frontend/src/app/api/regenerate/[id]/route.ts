import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/regenerate/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data);
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to regenerate' },
        { status: response.status }
      );
    }
  } catch (error) {
    console.error('Regenerate error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate' },
      { status: 500 }
    );
  }
}
