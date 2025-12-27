"""
Generate API Routes
Orchestrates the text-to-website generation pipeline.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.ai import parse_business_description, select_layout
from app.website import build_website
from app.core.config import get_settings
from app.core.rate_limit import check_rate_limit, upstash_rate_limiter
from app.core.auth_middleware import require_auth, AuthUser

router = APIRouter()

# Data storage
DATA_DIR = Path(__file__).parent.parent.parent / "data"
WEBSITES_FILE = DATA_DIR / "websites.json"


class GenerateRequest(BaseModel):
    """Request to generate a website."""
    description: str = Field(..., min_length=20, max_length=2000)
    language: str = Field(default="en", pattern="^(en|hi)$")


class GenerateResponse(BaseModel):
    """Response after website generation."""
    id: str
    business_name: str
    business_type: str
    location: str


def ensure_data_dir():
    """Ensure data directory exists."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not WEBSITES_FILE.exists():
        WEBSITES_FILE.write_text("{}")


def load_websites() -> dict:
    """Load websites from storage."""
    ensure_data_dir()
    try:
        return json.loads(WEBSITES_FILE.read_text())
    except json.JSONDecodeError:
        return {}


def save_website(website_data: dict):
    """Save website to storage."""
    websites = load_websites()
    websites[website_data["id"]] = website_data
    WEBSITES_FILE.write_text(json.dumps(websites, indent=2))


@router.post("/generate", response_model=GenerateResponse)
async def generate_website(request: GenerateRequest):
    """
    Generate a website from text description.
    
    Pipeline:
    1. Parse business description (OpenAI)
    2. Select layout (rules engine)
    3. Build HTML (template engine)
    4. Store and return ID
    """
    settings = get_settings()
    
    try:
        # Step 1: Parse business description
        business = parse_business_description(
            request.description,
            request.language,
            settings.openai_api_key
        )
        
        # Step 2: Select layout
        layout = select_layout(business.business_type, business.tone)
        
        # Step 3: Build website
        html = build_website(business, layout, request.language)
        
        # Step 4: Store website
        website_id = f"site_{int(datetime.now().timestamp())}_{os.urandom(4).hex()}"
        
        website_data = {
            "id": website_id,
            "description": request.description,
            "language": request.language,
            "business": business.model_dump(),
            "layout": layout.model_dump(),
            "html": html,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        save_website(website_data)
        
        return GenerateResponse(
            id=website_id,
            business_name=business.business_name,
            business_type=business.business_type,
            location=business.location
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


class AsyncGenerateResponse(BaseModel):
    """Response for async website generation."""
    task_id: str
    message: str


@router.post("/generate/async", response_model=AsyncGenerateResponse)
async def generate_website_async(
    request: GenerateRequest,
    user: AuthUser = Depends(require_auth)
):
    """
    Generate a website asynchronously.
    
    Returns immediately with a task_id.
    Poll /api/tasks/{task_id} to check status.
    """
    from app.workers.tasks import generate_website_task
    
    # Check rate limit before enqueueing task
    is_allowed, message, remaining = check_rate_limit(user.user_id, "generate")
    if not is_allowed:
        # Track abuse signal
        upstash_rate_limiter.track_abuse_signal(user.user_id, "limit_violations")
        raise HTTPException(
            status_code=429,
            detail=message
        )
    
    # Check if user is blocked due to abuse
    if upstash_rate_limiter.is_user_blocked(user.user_id):
        raise HTTPException(
            status_code=429,
            detail="Too many violations. Please try again later."
        )
    
    # Queue the task
    task = generate_website_task.delay(
        description=request.description,
        language=request.language
    )
    
    return AsyncGenerateResponse(
        task_id=task.id,
        message=f"Website generation started. {remaining} generations remaining this hour."
    )


@router.get("/preview/{website_id}")
async def get_preview(website_id: str):
    """Get website preview by ID."""
    websites = load_websites()
    
    if website_id not in websites:
        raise HTTPException(status_code=404, detail="Website not found")
    
    website = websites[website_id]
    return {
        "id": website_id,
        "html": website["html"],
        "business": website["business"]
    }


@router.post("/regenerate/{website_id}")
async def regenerate_website(website_id: str):
    """Regenerate website with new styling."""
    settings = get_settings()
    websites = load_websites()
    
    if website_id not in websites:
        raise HTTPException(status_code=404, detail="Website not found")
    
    website = websites[website_id]
    
    try:
        # Re-parse with OpenAI for potentially different tagline
        business = parse_business_description(
            website["description"],
            website["language"],
            settings.openai_api_key
        )
        
        # Get layout with slight random variation
        layout = select_layout(business.business_type, business.tone)
        
        # Rebuild HTML
        html = build_website(business, layout, website["language"])
        
        # Update storage
        website["business"] = business.model_dump()
        website["layout"] = layout.model_dump()
        website["html"] = html
        website["updated_at"] = datetime.now().isoformat()
        
        save_website(website)
        
        return {
            "id": website_id,
            "html": html,
            "business": business.model_dump()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {str(e)}")
