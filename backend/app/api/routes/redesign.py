"""
Redesign API Routes
Handles website redesign from existing URLs.
"""

import os
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, HttpUrl
from typing import Literal

from app.services.scraper import scrape_website, validate_url, ScrapeError, ScrapedContent
from app.ai.content_extractor import extract_business_info, create_business_profile_from_extraction
from app.ai import select_layout
from app.website import build_website
from app.api.routes.generate import save_website
from app.core.config import get_settings
from app.core.rate_limit import check_rate_limit, upstash_rate_limiter
from app.core.auth_middleware import require_auth, AuthUser

router = APIRouter()


class ScrapeRequest(BaseModel):
    """Request to scrape a website."""
    url: str = Field(..., min_length=5)


class ScrapeResponse(BaseModel):
    """Response with scraped content preview."""
    success: bool
    url: str
    title: str
    description: str
    services: list[str]
    contact: dict
    headings: list[str]


class RedesignRequest(BaseModel):
    """Request to redesign a website."""
    url: str = Field(..., min_length=5)
    style: Literal["modern", "premium", "simple"] = "modern"
    language: Literal["en", "hi"] = "en"


class RedesignResponse(BaseModel):
    """Response after website redesign."""
    id: str
    business_name: str
    business_type: str
    original_url: str
    style: str


# Style configurations
STYLE_CONFIGS = {
    "modern": {
        "tone": "Professional",
        "theme": "light",
        "accent_style": "minimal"
    },
    "premium": {
        "tone": "Professional",
        "theme": "dark",
        "accent_style": "elegant"
    },
    "simple": {
        "tone": "Friendly",
        "theme": "light",
        "accent_style": "clean"
    }
}


@router.post("/redesign/scrape", response_model=ScrapeResponse)
async def scrape_for_redesign(request: ScrapeRequest):
    """
    Scrape a website to preview content before redesign.
    
    Returns structured content that will be used for redesign.
    """
    # Validate URL
    is_valid, result = validate_url(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=result)
    
    url = result
    
    try:
        scraped = await scrape_website(url)
        
        return ScrapeResponse(
            success=True,
            url=scraped.url,
            title=scraped.title,
            description=scraped.description,
            services=scraped.services[:8],
            contact=scraped.contact,
            headings=scraped.headings[:10]
        )
        
    except ScrapeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraping failed: {str(e)}")


@router.post("/redesign/generate", response_model=RedesignResponse)
async def generate_redesign(
    request: RedesignRequest,
    user: AuthUser = Depends(require_auth)
):
    """
    Generate a redesigned website from an existing URL.
    
    Pipeline:
    1. Scrape URL
    2. Extract business info with AI
    3. Apply new style/layout
    4. Generate website
    5. Store and return ID
    """
    # Check rate limit (redesign is 1 per day - most expensive action)
    is_allowed, message, remaining = check_rate_limit(user.user_id, "redesign")
    if not is_allowed:
        upstash_rate_limiter.track_abuse_signal(user.user_id, "limit_violations")
        raise HTTPException(
            status_code=429,
            detail=message
        )
    
    # Check if user is blocked
    if upstash_rate_limiter.is_user_blocked(user.user_id):
        raise HTTPException(
            status_code=429,
            detail="Too many violations. Please try again later."
        )
    
    settings = get_settings()
    
    # Validate URL
    is_valid, result = validate_url(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=result)
    
    url = result
    
    try:
        # Step 1: Scrape
        scraped = await scrape_website(url)
        
        # Step 2: Extract business info
        extracted = extract_business_info(scraped, settings.openai_api_key)
        
        # Step 3: Create business profile with style
        style_config = STYLE_CONFIGS[request.style]
        business = create_business_profile_from_extraction(
            extracted,
            tone=style_config["tone"]
        )
        
        # Step 4: Select layout
        layout = select_layout(business.business_type, business.tone)
        
        # Step 5: Build website
        html = build_website(business, layout, request.language)
        
        # Step 6: Store
        website_id = f"redesign_{int(datetime.now().timestamp())}_{os.urandom(4).hex()}"
        
        website_data = {
            "id": website_id,
            "source_type": "redesign",
            "original_url": url,
            "style": request.style,
            "language": request.language,
            "business": business.model_dump(),
            "layout": layout.model_dump(),
            "html": html,
            "scraped_data": {
                "title": scraped.title,
                "description": scraped.description,
                "services": scraped.services[:10]
            },
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        save_website(website_data)
        
        return RedesignResponse(
            id=website_id,
            business_name=business.business_name,
            business_type=business.business_type,
            original_url=url,
            style=request.style
        )
        
    except ScrapeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redesign failed: {str(e)}")


@router.get("/redesign/styles")
async def get_available_styles():
    """Get available design styles for redesign."""
    return {
        "styles": [
            {
                "id": "modern",
                "name": "Modern",
                "description": "Clean, minimal design with bold typography",
                "colors": ["Teal", "White", "Gray"],
                "best_for": "Tech, Startups, Professional services"
            },
            {
                "id": "premium",
                "name": "Premium",
                "description": "Elegant dark theme with gold accents",
                "colors": ["Dark", "Gold", "Cream"],
                "best_for": "Luxury brands, High-end services"
            },
            {
                "id": "simple",
                "name": "Simple",
                "description": "Traditional, easy-to-read layout",
                "colors": ["Blue", "White", "Light Gray"],
                "best_for": "Local businesses, Traditional industries"
            }
        ]
    }
