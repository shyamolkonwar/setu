import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
    try {
        // Get the form data from the request
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File | null;
        const language = formData.get('language') as string || 'auto';

        if (!audioFile) {
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        // Create new form data for backend
        const backendFormData = new FormData();
        backendFormData.append('audio', audioFile);
        backendFormData.append('language', language);

        // Call backend transcription API
        const response = await fetch(`${BACKEND_URL}/api/voice/transcribe`, {
            method: 'POST',
            body: backendFormData
        });

        const data = await response.json();

        if (response.ok) {
            return NextResponse.json(data, { status: 200 });
        } else {
            return NextResponse.json(
                { error: data.detail || 'Transcription failed' },
                { status: response.status }
            );
        }

    } catch (error) {
        console.error('Voice transcription error:', error);
        return NextResponse.json(
            { error: 'Failed to process voice recording' },
            { status: 500 }
        );
    }
}
