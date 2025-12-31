import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

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

    // Get auth token from Supabase session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return NextResponse.json(
        { error: 'Please log in to generate a website', requiresAuth: true },
        { status: 401 }
      );
    }

    // Call backend API with auth token
    const response = await fetch(`${BACKEND_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ description, language })
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Backend returned non-JSON response:', await response.text());
      return NextResponse.json(
        { error: 'Backend service is unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const data = await response.json();

    if (response.ok) {
      return NextResponse.json(data, { status: 201 });
    } else if (response.status === 401) {
      return NextResponse.json(
        { error: 'Please log in to generate a website', requiresAuth: true },
        { status: 401 }
      );
    } else if (response.status === 402) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits.', insufficientCredits: true },
        { status: 402 }
      );
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
