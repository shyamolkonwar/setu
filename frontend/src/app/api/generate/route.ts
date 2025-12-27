import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, language = 'en' } = body;

    if (!description || description.trim().length < 20) {
      return NextResponse.json(
        { error: 'Description must be at least 20 characters' },
        { status: 400 }
      );
    }

    // Call backend API to generate website
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, language })
    });

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data, { status: 201 });
    } else {
      return NextResponse.json(
        { error: data.detail || 'Failed to generate website' },
        { status: response.status }
      );
    }

  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: 'Failed to generate website' },
      { status: 500 }
    );
  }
}
