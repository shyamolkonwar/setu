"""
Usage Limits API Route
Returns usage information for the current user.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth_middleware import get_optional_user, require_auth, AuthUser
from app.core.usage_tracker import usage_tracker, FREE_TIER_LIMITS

router = APIRouter()


class UsageResponse(BaseModel):
    """User usage information."""
    daily_generates: int
    daily_generates_limit: int
    daily_voice_generates: int
    daily_voice_generates_limit: int
    daily_edits: int
    daily_edits_limit: int
    daily_redesigns: int
    daily_redesigns_limit: int
    published_sites: int
    published_sites_limit: int
    remaining: dict


@router.get("/usage", response_model=UsageResponse)
async def get_usage(user: AuthUser = Depends(require_auth)):
    """
    Get current usage limits for authenticated user.
    """
    usage = await usage_tracker.get_or_create_usage(user.id)
    
    return UsageResponse(
        daily_generates=usage.daily_generates,
        daily_generates_limit=FREE_TIER_LIMITS["daily_generates"],
        daily_voice_generates=usage.daily_voice_generates,
        daily_voice_generates_limit=FREE_TIER_LIMITS["daily_voice_generates"],
        daily_edits=usage.daily_edits,
        daily_edits_limit=FREE_TIER_LIMITS["daily_edits"],
        daily_redesigns=usage.daily_redesigns,
        daily_redesigns_limit=FREE_TIER_LIMITS["daily_redesigns"],
        published_sites=usage.published_sites,
        published_sites_limit=FREE_TIER_LIMITS["max_published_sites"],
        remaining=usage.get_remaining()
    )


@router.get("/usage/limits")
async def get_limits():
    """
    Get the free tier limits (public endpoint).
    """
    return {
        "free_tier": FREE_TIER_LIMITS,
        "description": "Free tier limits for website generation"
    }
