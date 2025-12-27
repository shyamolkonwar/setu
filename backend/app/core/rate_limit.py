"""
Upstash Redis Rate Limiting Utility
Serverless rate limiting for API protection and abuse control.
"""

import time
from typing import Tuple, Optional
from upstash_redis import Redis

from app.core.config import get_settings


class UpstashRateLimiter:
    """
    Serverless rate limiter using Upstash Redis.
    
    Features:
    - Distributed rate limiting across all instances
    - Automatic TTL expiration (no cleanup needed)
    - Action-based limits (different limits per action type)
    - Abuse signal tracking
    """
    
    # Rate limit configurations per action type
    RATE_LIMITS = {
        "api": {"limit": 60, "window": 60},           # 60 requests per minute
        "generate": {"limit": 2, "window": 3600},     # 2 per hour
        "voice": {"limit": 5, "window": 3600},        # 5 per hour
        "redesign": {"limit": 1, "window": 86400},    # 1 per day
        "publish": {"limit": 10, "window": 3600},     # 10 per hour
        "edit": {"limit": 20, "window": 3600},        # 20 per hour
    }
    
    def __init__(self):
        settings = get_settings()
        self._redis: Optional[Redis] = None
        self._url = settings.upstash_redis_rest_url
        self._token = settings.upstash_redis_rest_token
    
    @property
    def redis(self) -> Optional[Redis]:
        """Get or create Upstash Redis client."""
        if self._redis is None and self.is_configured():
            self._redis = Redis(
                url=self._url,
                token=self._token,
            )
        return self._redis
    
    def is_configured(self) -> bool:
        """Check if Upstash Redis is properly configured."""
        return bool(
            self._url and 
            self._token and
            self._url != "" and
            self._token != ""
        )
    
    def is_rate_limited(
        self, 
        key: str, 
        limit: int, 
        window_seconds: int
    ) -> Tuple[bool, int, int]:
        """
        Check if a request is rate limited.
        
        Args:
            key: Unique identifier (e.g., "user:{user_id}:generate")
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds
        
        Returns:
            Tuple of (is_limited, current_count, remaining)
        """
        if not self.is_configured():
            # Fail open if not configured (development mode)
            return False, 0, limit
        
        try:
            now = int(time.time())
            window_key = f"ratelimit:{key}:{now // window_seconds}"
            
            # Increment counter
            count = self.redis.incr(window_key)
            
            # Set expiry on first request in window
            if count == 1:
                self.redis.expire(window_key, window_seconds)
            
            is_limited = count > limit
            remaining = max(0, limit - count)
            
            return is_limited, count, remaining
            
        except Exception as e:
            print(f"Upstash rate limit error: {e}")
            # Fail open on error
            return False, 0, limit
    
    def check_action_limit(
        self, 
        user_id: str, 
        action: str
    ) -> Tuple[bool, str, int]:
        """
        Check rate limit for a specific action type.
        
        Args:
            user_id: The user's ID
            action: Action type (generate, voice, redesign, publish, edit)
        
        Returns:
            Tuple of (is_allowed, message, remaining)
        """
        config = self.RATE_LIMITS.get(action, self.RATE_LIMITS["api"])
        limit = config["limit"]
        window = config["window"]
        
        key = f"user:{user_id}:{action}"
        is_limited, count, remaining = self.is_rate_limited(key, limit, window)
        
        if is_limited:
            # Calculate retry time
            window_name = self._format_window(window)
            message = f"Rate limit exceeded for {action}. Try again in {window_name}."
            return False, message, 0
        
        return True, "OK", remaining
    
    def _format_window(self, seconds: int) -> str:
        """Format window seconds to human-readable string."""
        if seconds >= 86400:
            return f"{seconds // 86400} day(s)"
        elif seconds >= 3600:
            return f"{seconds // 3600} hour(s)"
        elif seconds >= 60:
            return f"{seconds // 60} minute(s)"
        return f"{seconds} second(s)"
    
    def track_abuse_signal(
        self, 
        user_id: str, 
        signal: str, 
        ttl_seconds: int = 3600
    ) -> int:
        """
        Track an abuse signal for a user.
        
        Args:
            user_id: The user's ID
            signal: Signal type (e.g., "failed_jobs", "rapid_requests")
            ttl_seconds: Time to live for the counter
        
        Returns:
            Current count of the signal
        """
        if not self.is_configured():
            return 0
        
        try:
            key = f"abuse:{user_id}:{signal}"
            count = self.redis.incr(key)
            
            if count == 1:
                self.redis.expire(key, ttl_seconds)
            
            return count
            
        except Exception as e:
            print(f"Upstash abuse tracking error: {e}")
            return 0
    
    def get_abuse_score(self, user_id: str) -> int:
        """
        Get the abuse score for a user.
        
        Returns:
            Sum of all abuse signals for the user
        """
        if not self.is_configured():
            return 0
        
        try:
            signals = ["failed_jobs", "rapid_requests", "limit_violations"]
            total = 0
            
            for signal in signals:
                key = f"abuse:{user_id}:{signal}"
                count = self.redis.get(key)
                if count:
                    total += int(count)
            
            return total
            
        except Exception as e:
            print(f"Upstash abuse score error: {e}")
            return 0
    
    def is_user_blocked(self, user_id: str, threshold: int = 10) -> bool:
        """
        Check if a user should be temporarily blocked based on abuse score.
        
        Args:
            user_id: The user's ID
            threshold: Abuse score threshold for blocking
        
        Returns:
            True if user should be blocked
        """
        return self.get_abuse_score(user_id) >= threshold


# Global instance
upstash_rate_limiter = UpstashRateLimiter()


def check_rate_limit(user_id: str, action: str) -> Tuple[bool, str, int]:
    """
    Convenience function to check rate limits.
    
    Args:
        user_id: The user's ID
        action: Action type
    
    Returns:
        Tuple of (is_allowed, message, remaining)
    """
    return upstash_rate_limiter.check_action_limit(user_id, action)
