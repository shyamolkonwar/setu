"""
Rate Limiter Middleware
Redis-based rate limiting with sliding window algorithm.
"""

import time
import hashlib
from typing import Optional, Callable
from functools import wraps

from fastapi import Request, HTTPException, status
import redis

from app.core.config import get_settings


# Rate limit configurations per endpoint
RATE_LIMITS = {
    # endpoint: (requests, seconds)
    "/api/generate": (5, 60),           # 5 per minute
    "/api/generate/async": (5, 60),     # 5 per minute
    "/api/voice/generate": (3, 60),     # 3 per minute
    "/api/voice/generate/async": (3, 60),
    "/api/edit": (10, 60),              # 10 per minute
    "/api/redesign": (2, 60),           # 2 per minute
    "/api/publish": (5, 60),            # 5 per minute
    "/api/republish": (5, 60),          # 5 per minute
    "default": (30, 60),                # 30 per minute default
}


class RateLimiter:
    """Redis-based rate limiter using sliding window algorithm."""
    
    def __init__(self):
        self._redis: Optional[redis.Redis] = None
    
    @property
    def redis_client(self) -> redis.Redis:
        """Lazy load Redis connection."""
        if self._redis is None:
            settings = get_settings()
            redis_url = settings.redis_url or "redis://localhost:6379/0"
            self._redis = redis.from_url(redis_url, decode_responses=True)
        return self._redis
    
    def _get_client_identifier(self, request: Request, user_id: Optional[str] = None) -> str:
        """Get unique identifier for rate limiting."""
        # Prefer user_id if authenticated
        if user_id:
            return f"user:{user_id}"
        
        # Fall back to IP address
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"
        
        return f"ip:{ip}"
    
    def _get_rate_limit(self, path: str) -> tuple:
        """Get rate limit for a path."""
        # Check for exact match
        for endpoint, limit in RATE_LIMITS.items():
            if endpoint != "default" and path.startswith(endpoint):
                return limit
        return RATE_LIMITS["default"]
    
    def is_rate_limited(
        self, 
        request: Request, 
        user_id: Optional[str] = None
    ) -> tuple[bool, dict]:
        """
        Check if request should be rate limited.
        
        Returns: (is_limited, info_dict)
        """
        try:
            client_id = self._get_client_identifier(request, user_id)
            path = request.url.path
            max_requests, window_seconds = self._get_rate_limit(path)
            
            # Create Redis key
            key = f"ratelimit:{client_id}:{path}"
            
            current_time = int(time.time())
            window_start = current_time - window_seconds
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiry on the key
            pipe.expire(key, window_seconds)
            
            results = pipe.execute()
            request_count = results[1]
            
            # Calculate remaining
            remaining = max(0, max_requests - request_count - 1)
            reset_time = current_time + window_seconds
            
            info = {
                "limit": max_requests,
                "remaining": remaining,
                "reset": reset_time,
                "window": window_seconds
            }
            
            if request_count >= max_requests:
                return True, info
            
            return False, info
            
        except redis.RedisError as e:
            # If Redis is down, allow the request (fail open)
            print(f"Redis error in rate limiter: {e}")
            return False, {"error": "Rate limiter unavailable"}
    
    def check_ip_blocked(self, request: Request) -> bool:
        """Check if IP is blocked."""
        try:
            forwarded = request.headers.get("x-forwarded-for")
            if forwarded:
                ip = forwarded.split(",")[0].strip()
            else:
                ip = request.client.host if request.client else "unknown"
            
            blocked = self.redis_client.get(f"blocked_ip:{ip}")
            return blocked is not None
            
        except redis.RedisError:
            return False
    
    def block_ip(self, ip: str, duration_seconds: int = 3600, reason: str = ""):
        """Block an IP address."""
        try:
            key = f"blocked_ip:{ip}"
            self.redis_client.setex(key, duration_seconds, reason or "blocked")
        except redis.RedisError as e:
            print(f"Failed to block IP: {e}")


# Global instance
rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, call_next):
    """
    FastAPI middleware for rate limiting.
    
    Add to app:
        app.middleware("http")(rate_limit_middleware)
    """
    # Skip rate limiting for certain paths
    skip_paths = ["/", "/docs", "/openapi.json", "/health", "/api/sites/"]
    if any(request.url.path.startswith(p) for p in skip_paths):
        return await call_next(request)
    
    # Check if IP is blocked
    if rate_limiter.check_ip_blocked(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your IP has been temporarily blocked due to abuse"
        )
    
    # Get user_id from auth header if present
    user_id = None
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        # We could decode the JWT here, but for now just hash it
        token_hash = hashlib.md5(auth_header.encode()).hexdigest()[:16]
        user_id = token_hash
    
    # Check rate limit
    is_limited, info = rate_limiter.is_rate_limited(request, user_id)
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "Rate limit exceeded",
                "limit": info.get("limit"),
                "reset_in_seconds": info.get("reset", 0) - int(time.time())
            },
            headers={
                "X-RateLimit-Limit": str(info.get("limit", 0)),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(info.get("reset", 0)),
                "Retry-After": str(info.get("reset", 0) - int(time.time()))
            }
        )
    
    # Process request with rate limit headers
    response = await call_next(request)
    
    # Add rate limit headers to response
    if "error" not in info:
        response.headers["X-RateLimit-Limit"] = str(info.get("limit", 0))
        response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", 0))
        response.headers["X-RateLimit-Reset"] = str(info.get("reset", 0))
    
    return response
