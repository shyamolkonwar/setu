"""
Authentication API Routes
Protected routes that require Supabase JWT.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.auth_middleware import require_auth, get_current_user, AuthUser

router = APIRouter()


class UserResponse(BaseModel):
    """User profile response."""
    id: str
    email: str
    role: str


@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: AuthUser = Depends(require_auth)):
    """
    Get current authenticated user from JWT.
    
    The JWT is verified using Supabase JWKS.
    Frontend gets token from Supabase auth, sends to backend.
    """
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role
    )


@router.get("/auth/verify")
async def verify_token(user: Optional[AuthUser] = Depends(get_current_user)):
    """
    Verify if the provided JWT is valid.
    
    Returns user info if valid, or error if invalid.
    """
    if user is None:
        raise HTTPException(status_code=401, detail="No valid token provided")
    
    return {
        "valid": True,
        "user_id": user.id,
        "email": user.email
    }
