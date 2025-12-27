"""
Authentication Middleware
Verifies Supabase JWTs using JWKS for protected routes.
Supports ES256 (ECC), RS256, and HS256 algorithms.
"""

import os
import requests
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer
from fastapi.security.utils import get_authorization_scheme_param
from pydantic import BaseModel
from jose import jwt, JWTError
from functools import lru_cache

from app.core.config import get_settings


# JWT Bearer token scheme (for Swagger UI)
security = HTTPBearer(auto_error=False)


class AuthUser(BaseModel):
    """Authenticated user from JWT token."""
    id: str
    email: str
    role: str = "authenticated"


@lru_cache(maxsize=1)
def get_jwks():
    """Fetch and cache JWKS from Supabase."""
    settings = get_settings()
    supabase_url = settings.supabase_url
    
    if not supabase_url:
        print("Auth middleware: Supabase URL not configured")
        return None
    
    try:
        project_id = supabase_url.replace("https://", "").split(".")[0]
        jwks_url = f"https://{project_id}.supabase.co/auth/v1/.well-known/jwks.json"
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Auth middleware: Failed to fetch JWKS: {e}")
        return None


def verify_jwt(token: str) -> AuthUser:
    """
    Verify a Supabase JWT token.
    Tries ES256 (ECC), RS256, and HS256 algorithms.
    """
    settings = get_settings()
    errors = []
    
    # Try JWKS verification first (supports ES256/RS256)
    jwks = get_jwks()
    if jwks:
        # Try ES256 first (Supabase's new default with ECC keys)
        for alg in ["ES256", "RS256"]:
            try:
                payload = jwt.decode(
                    token,
                    jwks,
                    algorithms=[alg],
                    audience="authenticated"
                )
                print(f"Auth middleware: Verified token with {alg}")
                return AuthUser(
                    id=payload["sub"],
                    email=payload.get("email", ""),
                    role=payload.get("role", "authenticated")
                )
            except Exception as e:
                errors.append(f"{alg}: {str(e)}")
    
    # Try HS256 with JWT secret as fallback
    jwt_secret = getattr(settings, "supabase_jwt_secret", None) or os.getenv("SUPABASE_JWT_SECRET")
    if jwt_secret:
        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )
            print("Auth middleware: Verified token with HS256")
            return AuthUser(
                id=payload["sub"],
                email=payload.get("email", ""),
                role=payload.get("role", "authenticated")
            )
        except Exception as e:
            errors.append(f"HS256: {str(e)}")
    
    # All methods failed
    error_msg = " | ".join(errors) if errors else "No verification methods available"
    print(f"Auth middleware: All verification failed: {error_msg}")
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Invalid token: {error_msg}"
    )


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> Optional[AuthUser]:
    """Get current user if authenticated, None otherwise."""
    if not authorization:
        return None
        
    scheme, param = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer":
        return None
        
    try:
        return verify_jwt(param)
    except Exception:
        return None


async def require_auth(
    authorization: Optional[str] = Header(None)
) -> AuthUser:
    """Dependency that requires authentication."""
    if not authorization:
        print("Auth middleware: No Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    scheme, param = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer":
        print(f"Auth middleware: Invalid scheme '{scheme}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return verify_jwt(param)


async def get_optional_user(
    authorization: Optional[str] = Header(None)
) -> Optional[AuthUser]:
    """Dependency that attempts to authenticate but doesn't require it."""
    return await get_current_user(authorization)
