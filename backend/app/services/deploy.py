"""
Deploy Service Module
Handles publishing websites to Cloudflare Pages with local fallback.
"""

import os
import json
import shutil
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
from pydantic import BaseModel

from app.core.config import get_settings


class PublishedSite(BaseModel):
    """Published website information."""
    id: str
    subdomain: str
    url: str
    published_at: str
    html_path: str = ""
    deployment_id: Optional[str] = None
    ssl_status: str = "active"


# Storage paths for local fallback
DATA_DIR = Path(__file__).parent.parent.parent / "data"
PUBLISHED_DIR = DATA_DIR / "published"
SITES_FILE = DATA_DIR / "published_sites.json"


def ensure_dirs():
    """Ensure required directories exist."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    PUBLISHED_DIR.mkdir(parents=True, exist_ok=True)
    if not SITES_FILE.exists():
        SITES_FILE.write_text("{}")


def generate_subdomain(business_name: str) -> str:
    """
    Generate a URL-friendly subdomain from business name.
    
    Args:
        business_name: The business name to convert
    
    Returns:
        Clean subdomain string
    """
    # Convert to lowercase and replace spaces
    subdomain = business_name.lower()
    # Remove special characters
    subdomain = re.sub(r'[^a-z0-9\s-]', '', subdomain)
    # Replace spaces with hyphens
    subdomain = re.sub(r'\s+', '-', subdomain)
    # Remove consecutive hyphens
    subdomain = re.sub(r'-+', '-', subdomain)
    # Trim hyphens from ends
    subdomain = subdomain.strip('-')
    # Limit length
    subdomain = subdomain[:30]
    
    return subdomain or 'my-site'


def load_published_sites() -> dict:
    """Load published sites registry."""
    ensure_dirs()
    try:
        return json.loads(SITES_FILE.read_text())
    except json.JSONDecodeError:
        return {}


def save_published_sites(sites: dict):
    """Save published sites registry."""
    ensure_dirs()
    SITES_FILE.write_text(json.dumps(sites, indent=2))


async def publish_website_cloudflare(
    website_id: str,
    html_content: str,
    business_name: str,
    user_id: Optional[str] = None
) -> PublishedSite:
    """
    Publish a website to Cloudflare Pages.
    
    Attempts Cloudflare deployment first, falls back to local if not configured.
    
    Args:
        website_id: Unique website identifier
        html_content: Generated HTML content
        business_name: Business name for subdomain generation
        user_id: Owner user ID
    
    Returns:
        PublishedSite with URL and metadata
    """
    from app.services.cloudflare_service import cloudflare_service
    
    settings = get_settings()
    subdomain = generate_subdomain(business_name)
    
    # Make subdomain unique
    sites = load_published_sites()
    original_subdomain = subdomain
    counter = 1
    while any(s.get('subdomain') == subdomain for s in sites.values() if s.get('id') != website_id):
        subdomain = f"{original_subdomain}-{counter}"
        counter += 1
    
    # Try Cloudflare deployment
    if cloudflare_service.is_configured():
        result = await cloudflare_service.deploy_to_pages(
            website_id=website_id,
            html_content=html_content,
            subdomain=subdomain,
            user_id=user_id
        )
        
        if result.success:
            published = PublishedSite(
                id=website_id,
                subdomain=result.subdomain,
                url=result.live_url,
                published_at=datetime.now().isoformat(),
                deployment_id=result.deployment_id,
                ssl_status=result.ssl_status
            )
            
            # Save to local registry as backup
            sites[website_id] = published.model_dump()
            save_published_sites(sites)
            
            return published
    
    # Fallback to local deployment
    return publish_website_local(website_id, html_content, subdomain)


def publish_website_local(
    website_id: str,
    html_content: str,
    subdomain: str
) -> PublishedSite:
    """
    Publish a website to local storage (development fallback).
    
    Args:
        website_id: Unique website identifier
        html_content: Generated HTML content
        subdomain: Pre-generated subdomain
    
    Returns:
        PublishedSite with local URL
    """
    ensure_dirs()
    
    # Create site directory
    site_dir = PUBLISHED_DIR / subdomain
    site_dir.mkdir(parents=True, exist_ok=True)
    
    # Write HTML file
    html_path = site_dir / "index.html"
    html_path.write_text(html_content)
    
    # For local development, serve via the API
    api_url = f"http://localhost:8000/sites/{subdomain}"
    
    # Create published site record
    published = PublishedSite(
        id=website_id,
        subdomain=subdomain,
        url=api_url,
        published_at=datetime.now().isoformat(),
        html_path=str(html_path),
        ssl_status="n/a"
    )
    
    # Save to registry
    sites = load_published_sites()
    sites[website_id] = published.model_dump()
    save_published_sites(sites)
    
    return published


def publish_website(
    website_id: str,
    html_content: str,
    business_name: str,
    base_domain: str = "setu.local",
    user_id: Optional[str] = None
) -> PublishedSite:
    """
    Publish a website (sync version for backwards compatibility).
    
    Uses local storage. For Cloudflare, use publish_website_cloudflare.
    
    Args:
        website_id: Unique website identifier
        html_content: Generated HTML content
        business_name: Business name for subdomain generation
        base_domain: Base domain for the site (deprecated, uses config)
        user_id: Optional owner user ID
    
    Returns:
        PublishedSite with URL and metadata
    """
    subdomain = generate_subdomain(business_name)
    
    # Make subdomain unique
    sites = load_published_sites()
    original_subdomain = subdomain
    counter = 1
    while any(s.get('subdomain') == subdomain for s in sites.values() if s.get('id') != website_id):
        subdomain = f"{original_subdomain}-{counter}"
        counter += 1
    
    return publish_website_local(website_id, html_content, subdomain)


def get_published_site(website_id: str) -> Optional[PublishedSite]:
    """Get published site by website ID."""
    sites = load_published_sites()
    if website_id in sites:
        return PublishedSite(**sites[website_id])
    return None


def get_site_by_subdomain(subdomain: str) -> Optional[str]:
    """
    Get HTML content for a published site by subdomain.
    
    Args:
        subdomain: The site subdomain
    
    Returns:
        HTML content or None if not found
    """
    html_path = PUBLISHED_DIR / subdomain / "index.html"
    if html_path.exists():
        return html_path.read_text()
    return None


async def unpublish_website(website_id: str) -> bool:
    """
    Unpublish a website (remove from hosting).
    
    Args:
        website_id: Website to unpublish
    
    Returns:
        True if successfully unpublished
    """
    from app.services.cloudflare_service import cloudflare_service
    
    sites = load_published_sites()
    if website_id not in sites:
        return False
    
    site = sites[website_id]
    subdomain = site.get('subdomain')
    
    # Try to delete from Cloudflare
    if cloudflare_service.is_configured():
        await cloudflare_service.delete_deployment(subdomain)
    
    # Remove local site directory
    site_dir = PUBLISHED_DIR / subdomain
    if site_dir.exists():
        shutil.rmtree(site_dir)
    
    # Remove from registry
    del sites[website_id]
    save_published_sites(sites)
    
    return True


async def republish_website(
    website_id: str,
    html_content: str
) -> Optional[PublishedSite]:
    """
    Republish a website with updated content.
    
    Args:
        website_id: Website to republish
        html_content: New HTML content
    
    Returns:
        Updated PublishedSite or None if not found
    """
    from app.services.cloudflare_service import cloudflare_service
    
    sites = load_published_sites()
    if website_id not in sites:
        return None
    
    site = sites[website_id]
    subdomain = site.get('subdomain')
    
    # Try Cloudflare republish
    if cloudflare_service.is_configured():
        result = await cloudflare_service.deploy_to_pages(
            website_id=website_id,
            html_content=html_content,
            subdomain=subdomain
        )
        
        if result.success:
            site['published_at'] = datetime.now().isoformat()
            site['url'] = result.live_url
            site['deployment_id'] = result.deployment_id
            site['ssl_status'] = result.ssl_status
            sites[website_id] = site
            save_published_sites(sites)
            return PublishedSite(**site)
    
    # Fallback to local update
    html_path = PUBLISHED_DIR / subdomain / "index.html"
    html_path.write_text(html_content)
    
    # Update published timestamp
    site['published_at'] = datetime.now().isoformat()
    sites[website_id] = site
    save_published_sites(sites)
    
    return PublishedSite(**site)

