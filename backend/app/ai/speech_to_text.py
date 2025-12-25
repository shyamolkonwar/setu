"""
Speech-to-Text Module
Converts audio to text using OpenAI Whisper API.
Supports English and Hindi for regional language adoption.
"""

import io
from typing import Optional
from pydantic import BaseModel
from openai import OpenAI


class TranscriptionResult(BaseModel):
    """Result of audio transcription."""
    text: str
    language: str
    duration_seconds: Optional[float] = None


def transcribe_audio(
    audio_data: bytes,
    filename: str,
    language: Optional[str] = None,
    api_key: str = ""
) -> TranscriptionResult:
    """
    Transcribe audio to text using OpenAI Whisper API.
    
    Args:
        audio_data: Raw audio bytes
        filename: Original filename (for format detection)
        language: Optional language hint ('en' for English, 'hi' for Hindi)
        api_key: OpenAI API key
    
    Returns:
        TranscriptionResult with transcribed text and detected language
    
    Supported audio formats:
        - WebM (Chrome, Firefox)
        - MP4/M4A (Safari)
        - WAV (fallback)
        - MP3
    """
    client = OpenAI(api_key=api_key)
    
    # Prepare audio file for API
    audio_file = io.BytesIO(audio_data)
    audio_file.name = filename
    
    # Build transcription parameters
    params = {
        "model": "whisper-1",
        "file": audio_file,
        "response_format": "verbose_json"
    }
    
    # Add language hint if provided
    if language:
        # Map our language codes to Whisper language codes
        language_map = {
            "en": "en",
            "hi": "hi",
            "english": "en",
            "hindi": "hi"
        }
        params["language"] = language_map.get(language.lower(), language)
    
    # Call Whisper API
    response = client.audio.transcriptions.create(**params)
    
    # Extract results
    transcribed_text = response.text.strip()
    detected_language = getattr(response, 'language', language or 'en')
    duration = getattr(response, 'duration', None)
    
    return TranscriptionResult(
        text=transcribed_text,
        language=detected_language,
        duration_seconds=duration
    )


def get_supported_formats() -> list[str]:
    """Return list of supported audio formats."""
    return [
        "audio/webm",
        "audio/mp4",
        "audio/m4a",
        "audio/wav",
        "audio/wave",
        "audio/x-wav",
        "audio/mp3",
        "audio/mpeg",
        "video/webm",  # Some browsers record as video/webm
    ]


def is_supported_format(content_type: str) -> bool:
    """Check if audio format is supported.
    
    Handles content types with codec parameters, e.g., 'audio/webm;codecs=opus'
    """
    # Extract base MIME type (before any semicolon)
    base_type = content_type.lower().split(';')[0].strip()
    return base_type in get_supported_formats()
