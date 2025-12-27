"""
Websites API Routes
CRUD operations for user websites stored in Supabase.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.services import supabase_service
from app.core.auth_middleware import require_auth, AuthUser

router = APIRouter()


class WebsiteResponse(BaseModel):
    """Website data response."""
    id: str
    status: str
    subdomain: Optional[str] = None
    live_url: Optional[str] = None
    business_json: Optional[dict] = None
    language: str = "en"
    source_type: str = "text"
    published_at: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


class WebsiteListResponse(BaseModel):
    """List of websites response."""
    websites: List[WebsiteResponse]
    total: int


class CreditsResponse(BaseModel):
    """User credits response."""
    balance: int
    lifetime_earned: int = 0
    lifetime_spent: int = 0


@router.get("/websites", response_model=WebsiteListResponse)
async def get_user_websites(
    status: Optional[str] = None,
    user: AuthUser = Depends(require_auth)
):
    """
    Get all websites for the authenticated user.
    
    Optionally filter by status (draft, live, archived).
    """
    websites = await supabase_service.get_user_websites(
        owner_id=user.id,
        status=status
    )
    
    return WebsiteListResponse(
        websites=[
            WebsiteResponse(
                id=str(w.get("id")),
                status=w.get("status", "draft"),
                subdomain=w.get("subdomain"),
                live_url=w.get("live_url"),
                business_json=w.get("business_json"),
                language=w.get("language", "en"),
                source_type=w.get("source_type", "text"),
                published_at=w.get("published_at"),
                created_at=w.get("created_at"),
                updated_at=w.get("updated_at")
            )
            for w in websites
        ],
        total=len(websites)
    )


@router.get("/websites/{website_id}", response_model=WebsiteResponse)
async def get_website(website_id: str, user: AuthUser = Depends(require_auth)):
    """Get a specific website by ID."""
    website = await supabase_service.get_website(website_id, user.id)
    
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    
    return WebsiteResponse(
        id=str(website.get("id")),
        status=website.get("status", "draft"),
        subdomain=website.get("subdomain"),
        live_url=website.get("live_url"),
        business_json=website.get("business_json"),
        language=website.get("language", "en"),
        source_type=website.get("source_type", "text"),
        published_at=website.get("published_at"),
        created_at=website.get("created_at"),
        updated_at=website.get("updated_at")
    )


@router.delete("/websites/{website_id}")
async def delete_website(website_id: str, user: AuthUser = Depends(require_auth)):
    """Delete a website (requires ownership)."""
    success = await supabase_service.delete_website(website_id, user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Website not found")
    
    return {"message": "Website deleted successfully", "id": website_id}


@router.get("/websites/{website_id}/versions")
async def get_website_versions(
    website_id: str, 
    user: AuthUser = Depends(require_auth)
):
    """Get version history for a website."""
    # Verify ownership first
    website = await supabase_service.get_website(website_id, user.id)
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    
    versions = await supabase_service.get_website_versions(website_id)
    
    return {
        "website_id": website_id,
        "versions": [
            {
                "version": v.get("version"),
                "created_at": v.get("created_at"),
                "created_by": v.get("created_by")
            }
            for v in versions
        ],
        "total": len(versions)
    }


@router.post("/websites/{website_id}/rollback/{version}")
async def rollback_website(
    website_id: str,
    version: int,
    user: AuthUser = Depends(require_auth)
):
    """
    Rollback a website to a previous version.
    
    Restores the HTML and business data from the specified version.
    """
    # Verify ownership
    website = await supabase_service.get_website(website_id, user.id)
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    
    # Get the version
    version_data = await supabase_service.get_website_version(website_id, version)
    if not version_data:
        raise HTTPException(status_code=404, detail=f"Version {version} not found")
    
    # Update website with version data
    await supabase_service.update_website(
        website_id=website_id,
        owner_id=user.id,
        updates={
            "html": version_data.get("html"),
            "business_json": version_data.get("business_json"),
            "layout_json": version_data.get("layout_json")
        }
    )
    
    return {
        "message": f"Rolled back to version {version}",
        "website_id": website_id,
        "version": version
    }


@router.get("/credits", response_model=CreditsResponse)
async def get_user_credits(user: AuthUser = Depends(require_auth)):
    """Get the authenticated user's credit balance."""
    credits = await supabase_service.get_user_credits(user.id)
    
    return CreditsResponse(
        balance=credits.get("balance", 0),
        lifetime_earned=credits.get("lifetime_earned", 0),
        lifetime_spent=credits.get("lifetime_spent", 0)
    )


@router.get("/credits/costs")
async def get_credit_costs():
    """Get the credit costs for various actions."""
    from app.services import CREDIT_COSTS
    
    return {
        "costs": CREDIT_COSTS,
        "description": {
            "generate": "Generate a new website from text",
            "voice_generate": "Generate a website from voice input",
            "edit": "Edit a section of a website",
            "redesign": "Redesign an existing website from URL",
            "publish": "Publish a website to live URL"
        }
    }
