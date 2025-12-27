"""
Publish API Routes
Handles website publishing to Cloudflare Pages.
Requires authentication and integrates with Supabase.
"""

import json
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

from app.services import (
    get_published_site,
    get_site_by_subdomain,
    supabase_service,
    cloudflare_service,
    CREDIT_COSTS
)
from app.services.deploy import (
    publish_website_cloudflare,
    republish_website,
    unpublish_website,
    publish_website_local,
    generate_subdomain,
    publish_website
)
from app.core.auth_middleware import require_auth, AuthUser

router = APIRouter()

# Legacy data storage (for backwards compatibility)
DATA_DIR = Path(__file__).parent.parent.parent / "data"
WEBSITES_FILE = DATA_DIR / "websites.json"


def is_valid_uuid(value: str) -> bool:
    """Check if a string is a valid UUID."""
    try:
        uuid.UUID(str(value))
        return True
    except (ValueError, TypeError):
        return False


def load_websites() -> dict:
    """Load websites from local storage (legacy)."""
    try:
        return json.loads(WEBSITES_FILE.read_text())
    except:
        return {}


class PublishResponse(BaseModel):
    """Response after publishing."""
    id: str
    subdomain: str
    url: str
    published_at: str
    message: str
    ssl_status: str = "active"


@router.post("/publish/{website_id}", response_model=PublishResponse)
async def publish_site(website_id: str, user: AuthUser = Depends(require_auth)):
    """
    Publish a website to Cloudflare Pages.
    
    Requires authentication. Creates a unique subdomain and deploys to Cloudflare.
    Falls back to local hosting if Cloudflare is not configured.
    """
    website = None
    is_uuid = is_valid_uuid(website_id)
    
    # Try to get from Supabase first (only if valid UUID)
    if is_uuid:
        try:
            website = await supabase_service.get_website(website_id, user.id)
        except Exception:
            pass  # Supabase not configured or table doesn't exist
    
    # Fallback to local storage
    if not website:
        websites = load_websites()
        if website_id not in websites:
            raise HTTPException(status_code=404, detail="Website not found")
        website = websites[website_id]
    
    html_content = website.get("html")
    business_json = website.get("business_json") or website.get("business", {})
    business_name = business_json.get("business_name", "my-site")
    
    if not html_content:
        raise HTTPException(status_code=400, detail="Website has no content to publish")
    
    # Check if user has enough credits (skip for legacy sites if Supabase not ready)
    try:
        has_credits = await supabase_service.check_credits(user.id, "publish")
        if not has_credits:
            raise HTTPException(
                status_code=402, 
                detail=f"Insufficient credits. Publishing requires {CREDIT_COSTS['publish']} credits."
            )
    except Exception:
        pass  # Allow publishing if credits check fails (Supabase not configured)
    
    try:
        # Deploy to Cloudflare Pages (or local fallback)
        published = await publish_website_cloudflare(
            website_id=website_id,
            html_content=html_content,
            business_name=business_name,
            user_id=user.id
        )
        
        # Update Supabase only if valid UUID
        if is_uuid:
            try:
                await supabase_service.publish_website(
                    website_id=website_id,
                    owner_id=user.id,
                    subdomain=published.subdomain,
                    live_url=published.url
                )
                
                await supabase_service.create_deployment(
                    website_id=website_id,
                    deployment_id=published.deployment_id,
                    subdomain=published.subdomain,
                    live_url=published.url,
                    deployed_by=user.id
                )
                
                await supabase_service.deduct_credits(user.id, "publish", f"Published website {website_id}")
            except Exception:
                pass  # Supabase operations are optional for legacy sites
        
        return PublishResponse(
            id=website_id,
            subdomain=published.subdomain,
            url=published.url,
            published_at=published.published_at,
            message="Website published successfully! 🎉",
            ssl_status=published.ssl_status
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Publishing failed: {str(e)}")


@router.post("/republish/{website_id}", response_model=PublishResponse)
async def republish_site(website_id: str, user: AuthUser = Depends(require_auth)):
    """
    Republish a website with updated content.
    
    Requires authentication. Keeps the same subdomain but updates the HTML.
    Deploys to Cloudflare Pages if configured.
    """
    website = None
    is_uuid = is_valid_uuid(website_id)
    
    # Try to get from Supabase first (only if valid UUID)
    if is_uuid:
        try:
            website = await supabase_service.get_website(website_id, user.id)
        except Exception:
            pass
    
    # Fallback to local storage
    if not website:
        websites = load_websites()
        if website_id not in websites:
            raise HTTPException(status_code=404, detail="Website not found")
        website = websites[website_id]
    
    html_content = website.get("html")
    
    if not html_content:
        raise HTTPException(status_code=400, detail="Website has no content to publish")
    
    published = get_published_site(website_id)
    if not published:
        raise HTTPException(status_code=404, detail="Website not published yet. Use /publish first.")
    
    try:
        # Create version before republishing (only for UUID websites)
        if is_uuid:
            try:
                await supabase_service.create_website_version(
                    website_id=website_id,
                    html=html_content,
                    business_json=website.get("business_json") or website.get("business"),
                    layout_json=website.get("layout_json") or website.get("layout"),
                    created_by=user.id
                )
            except Exception:
                pass
        
        # Republish with Cloudflare
        updated = await republish_website(website_id, html_content)
        
        if not updated:
            raise HTTPException(status_code=500, detail="Failed to republish")
        
        # Update website in Supabase (only for UUID websites)
        if is_uuid:
            try:
                await supabase_service.update_website(
                    website_id=website_id,
                    owner_id=user.id,
                    updates={
                        "published_at": updated.published_at,
                        "live_url": updated.url
                    }
                )
            except Exception:
                pass
        
        return PublishResponse(
            id=website_id,
            subdomain=updated.subdomain,
            url=updated.url,
            published_at=updated.published_at,
            message="Website updated successfully!",
            ssl_status=updated.ssl_status if hasattr(updated, 'ssl_status') else "active"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Republishing failed: {str(e)}")


@router.delete("/publish/{website_id}")
async def unpublish_site(website_id: str, user: AuthUser = Depends(require_auth)):
    """
    Unpublish a website (take it offline).
    
    Requires authentication. Removes from Cloudflare Pages if configured.
    """
    is_uuid = is_valid_uuid(website_id)
    
    # Verify ownership
    if is_uuid:
        try:
            website = await supabase_service.get_website(website_id, user.id)
        except Exception:
            website = None
    else:
        website = None
    
    if not website:
        websites = load_websites()
        if website_id not in websites:
            raise HTTPException(status_code=404, detail="Website not found")
    
    success = await unpublish_website(website_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Published site not found")
    
    # Update status in Supabase (only for UUID websites)
    if is_uuid:
        try:
            await supabase_service.update_website(
                website_id=website_id,
                owner_id=user.id,
                updates={"status": "draft", "live_url": None, "subdomain": None}
            )
        except Exception:
            pass
    
    return {"message": "Website unpublished successfully", "id": website_id}


@router.get("/publish/{website_id}/status")
async def get_publish_status(website_id: str):
    """Get the publishing status of a website."""
    # Try Supabase deployment first (only if valid UUID)
    if is_valid_uuid(website_id):
        try:
            deployment = await supabase_service.get_deployment(website_id)
            
            if deployment:
                return {
                    "published": True,
                    "subdomain": deployment.get("subdomain"),
                    "url": deployment.get("live_url"),
                    "published_at": deployment.get("created_at"),
                    "ssl_status": deployment.get("ssl_status", "active"),
                    "status": deployment.get("status")
                }
        except Exception:
            pass  # Supabase not configured or table doesn't exist
    
    # Fallback to local registry
    published = get_published_site(website_id)
    
    if published:
        return {
            "published": True,
            "subdomain": published.subdomain,
            "url": published.url,
            "published_at": published.published_at,
            "ssl_status": published.ssl_status if hasattr(published, 'ssl_status') else "n/a"
        }
    
    return {"published": False}

