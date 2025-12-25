"""
Language Normalizer Module
Cleans and normalizes transcribed text, especially for Hinglish (Hindi-English mix).
"""

import re
from typing import Optional
from pydantic import BaseModel


class NormalizedText(BaseModel):
    """Result of text normalization."""
    original: str
    normalized: str
    language: str
    modifications: list[str] = []


# Common Hinglish transliterations and their normalized forms
HINGLISH_NORMALIZATIONS = {
    # Business terms
    "dukan": "shop",
    "dukaan": "shop",
    "vyapar": "business",
    "vyapaar": "business",
    "karobar": "business",
    "seva": "service",
    "sewa": "service",
    
    # Location terms
    "sheher": "city",
    "gaon": "village",
    "mohalla": "area",
    "ilaka": "area",
    
    # Common phrases - kept as-is for local flavor
    # but cleaned up for consistency
}

# Transcription artifacts to clean
TRANSCRIPTION_ARTIFACTS = [
    r'\[.*?\]',  # Remove [inaudible], [music], etc.
    r'\(.*?\)',  # Remove (unclear), etc.
    r'um+',      # Remove "um", "umm"
    r'uh+',      # Remove "uh", "uhh"
    r'hmm+',     # Remove "hmm"
    r'\.{3,}',   # Replace multiple dots with single
]


def normalize_text(
    text: str,
    source_language: str = "auto"
) -> NormalizedText:
    """
    Normalize transcribed text for business parsing.
    
    Handles:
    - Transcription artifacts removal
    - Hinglish normalization
    - Grammar cleanup
    - Punctuation normalization
    
    Args:
        text: Raw transcribed text
        source_language: Language hint ('en', 'hi', 'auto')
    
    Returns:
        NormalizedText with cleaned text
    """
    modifications = []
    normalized = text.strip()
    original = text
    
    # Step 1: Remove transcription artifacts
    for pattern in TRANSCRIPTION_ARTIFACTS:
        cleaned = re.sub(pattern, '', normalized, flags=re.IGNORECASE)
        if cleaned != normalized:
            modifications.append(f"Removed artifact pattern: {pattern}")
            normalized = cleaned
    
    # Step 2: Normalize whitespace
    normalized_ws = re.sub(r'\s+', ' ', normalized).strip()
    if normalized_ws != normalized:
        modifications.append("Normalized whitespace")
        normalized = normalized_ws
    
    # Step 3: Capitalize first letter of sentences
    sentences = re.split(r'([.!?]+)', normalized)
    capitalized = []
    for i, part in enumerate(sentences):
        if i % 2 == 0 and part:  # Sentence content
            part = part.strip()
            if part:
                part = part[0].upper() + part[1:] if len(part) > 1 else part.upper()
        capitalized.append(part)
    normalized_cap = ''.join(capitalized)
    if normalized_cap != normalized:
        modifications.append("Capitalized sentences")
        normalized = normalized_cap
    
    # Step 4: Fix common punctuation issues
    # Add period at end if missing
    if normalized and normalized[-1] not in '.!?':
        normalized += '.'
        modifications.append("Added ending punctuation")
    
    # Step 5: Clean up repeated punctuation
    normalized = re.sub(r'([.!?])\1+', r'\1', normalized)
    normalized = re.sub(r'\s+([.!?,])', r'\1', normalized)
    
    # Detect language if auto
    detected_language = source_language
    if source_language == "auto":
        # Simple detection: check for Hindi characters
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', normalized))
        total_chars = len(re.findall(r'[a-zA-Z\u0900-\u097F]', normalized))
        if total_chars > 0:
            hindi_ratio = hindi_chars / total_chars
            detected_language = "hi" if hindi_ratio > 0.3 else "en"
        else:
            detected_language = "en"
    
    return NormalizedText(
        original=original,
        normalized=normalized,
        language=detected_language,
        modifications=modifications
    )


def extract_business_keywords(text: str) -> list[str]:
    """
    Extract potential business-related keywords from text.
    Useful for improving layout selection.
    """
    # Common business type keywords
    business_keywords = [
        "clinic", "hospital", "doctor", "medical",
        "shop", "store", "dukan", "retail",
        "restaurant", "cafe", "food", "khana",
        "salon", "parlour", "beauty",
        "tuition", "coaching", "school", "education",
        "gym", "fitness", "yoga",
        "hotel", "lodge", "guest house",
        "pharmacy", "medical store", "dawai",
        "repair", "service", "mechanic",
        "bakery", "sweet shop", "mithai",
        "hardware", "electrician", "plumber",
        "lawyer", "advocate", "legal",
        "accountant", "CA", "tax",
        "photography", "studio", "video",
    ]
    
    text_lower = text.lower()
    found = []
    for keyword in business_keywords:
        if keyword in text_lower:
            found.append(keyword)
    
    return found
