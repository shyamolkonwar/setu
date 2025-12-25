"""
Voice API Routes
Handles voice input transcription and voice-to-website generation.
"""

import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional

from app.ai import (
    transcribe_audio,
    normalize_text,
    parse_business_description,
    select_layout,
    is_supported_format
)
from app.website import build_website
from app.core.config import get_settings
from app.api.routes.generate import save_website

router = APIRouter()


class TranscribeResponse(BaseModel):
    """Response from transcription endpoint."""
    text: str
    normalized_text: str
    language: str
    duration_seconds: Optional[float] = None


class VoiceGenerateResponse(BaseModel):
    """Response from voice-to-website generation."""
    id: str
    transcribed_text: str
    business_name: str
    business_type: str
    location: str


@router.post("/voice/transcribe", response_model=TranscribeResponse)
async def transcribe_voice(
    audio: UploadFile = File(...),
    language: str = Form(default="auto")
):
    """
    Transcribe audio to text.
    
    Supported formats: WebM, MP4, M4A, WAV, MP3
    Supported languages: English (en), Hindi (hi), Auto-detect (auto)
    """
    settings = get_settings()
    
    # Validate file type
    content_type = audio.content_type or ""
    if not is_supported_format(content_type):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {content_type}. Supported: WebM, MP4, M4A, WAV, MP3"
        )
    
    # Read audio data
    try:
        audio_data = await audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio: {str(e)}")
    
    # Check file size (max 25MB for Whisper)
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large. Maximum size is 25MB.")
    
    # Transcribe
    try:
        lang_hint = None if language == "auto" else language
        result = transcribe_audio(
            audio_data=audio_data,
            filename=audio.filename or "audio.webm",
            language=lang_hint,
            api_key=settings.openai_api_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    # Normalize text
    normalized = normalize_text(result.text, result.language)
    
    return TranscribeResponse(
        text=result.text,
        normalized_text=normalized.normalized,
        language=result.language,
        duration_seconds=result.duration_seconds
    )


@router.post("/voice/generate", response_model=VoiceGenerateResponse)
async def voice_to_website(
    audio: UploadFile = File(...),
    language: str = Form(default="auto")
):
    """
    Generate website from voice input.
    
    Pipeline:
    1. Transcribe audio (Whisper)
    2. Normalize text
    3. Parse business description (OpenAI)
    4. Select layout
    5. Build website
    6. Store and return ID
    """
    settings = get_settings()
    
    # Step 1: Transcribe audio
    content_type = audio.content_type or ""
    if not is_supported_format(content_type):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {content_type}"
        )
    
    try:
        audio_data = await audio.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read audio: {str(e)}")
    
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large. Maximum size is 25MB.")
    
    try:
        lang_hint = None if language == "auto" else language
        transcription = transcribe_audio(
            audio_data=audio_data,
            filename=audio.filename or "audio.webm",
            language=lang_hint,
            api_key=settings.openai_api_key
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    
    # Step 2: Normalize text
    normalized = normalize_text(transcription.text, transcription.language)
    
    # Check minimum length
    if len(normalized.normalized) < 20:
        raise HTTPException(
            status_code=400,
            detail="Please provide more details about your business. Speak for at least 5 seconds."
        )
    
    # Step 3-5: Run through existing pipeline
    detected_lang = "hi" if transcription.language == "hi" else "en"
    
    try:
        # Parse business description
        business = parse_business_description(
            normalized.normalized,
            detected_lang,
            settings.openai_api_key
        )
        
        # Select layout
        layout = select_layout(business.business_type, business.tone)
        
        # Build website
        html = build_website(business, layout, detected_lang)
        
        # Generate ID and save
        website_id = f"voice_{int(datetime.now().timestamp())}_{os.urandom(4).hex()}"
        
        website_data = {
            "id": website_id,
            "description": normalized.normalized,
            "original_transcription": transcription.text,
            "input_type": "voice",
            "language": detected_lang,
            "business": business.model_dump(),
            "layout": layout.model_dump(),
            "html": html,
            "audio_duration": transcription.duration_seconds,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        save_website(website_data)
        
        return VoiceGenerateResponse(
            id=website_id,
            transcribed_text=normalized.normalized,
            business_name=business.business_name,
            business_type=business.business_type,
            location=business.location
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Website generation failed: {str(e)}")
