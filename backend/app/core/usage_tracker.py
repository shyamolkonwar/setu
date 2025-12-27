"""
Usage Tracker
Tracks API usage per user with daily/monthly limits.
"""

from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel

from app.services.supabase import supabase_service


# Usage limits for free tier
FREE_TIER_LIMITS = {
    "daily_generates": 3,
    "daily_voice_generates": 3,
    "daily_edits": 10,
    "daily_redesigns": 2,
    "monthly_generates": 50,
    "max_published_sites": 1,
}


class UsageInfo(BaseModel):
    """Usage information for a user."""
    user_id: str
    daily_generates: int = 0
    daily_voice_generates: int = 0
    daily_edits: int = 0
    daily_redesigns: int = 0
    monthly_generates: int = 0
    published_sites: int = 0
    last_reset_date: Optional[str] = None
    
    def can_generate(self) -> bool:
        return self.daily_generates < FREE_TIER_LIMITS["daily_generates"]
    
    def can_voice_generate(self) -> bool:
        return self.daily_voice_generates < FREE_TIER_LIMITS["daily_voice_generates"]
    
    def can_edit(self) -> bool:
        return self.daily_edits < FREE_TIER_LIMITS["daily_edits"]
    
    def can_redesign(self) -> bool:
        return self.daily_redesigns < FREE_TIER_LIMITS["daily_redesigns"]
    
    def can_publish(self) -> bool:
        return self.published_sites < FREE_TIER_LIMITS["max_published_sites"]
    
    def get_remaining(self) -> dict:
        return {
            "generates": FREE_TIER_LIMITS["daily_generates"] - self.daily_generates,
            "voice_generates": FREE_TIER_LIMITS["daily_voice_generates"] - self.daily_voice_generates,
            "edits": FREE_TIER_LIMITS["daily_edits"] - self.daily_edits,
            "redesigns": FREE_TIER_LIMITS["daily_redesigns"] - self.daily_redesigns,
            "published_sites": FREE_TIER_LIMITS["max_published_sites"] - self.published_sites,
        }


class UsageTracker:
    """Tracks and enforces usage limits per user."""
    
    async def get_or_create_usage(self, user_id: str) -> UsageInfo:
        """Get or create usage record for a user."""
        try:
            client = supabase_service.get_client()
            
            # Try to get existing usage record
            response = client.table("usage_limits").select("*").eq("user_id", user_id).execute()
            
            today = date.today().isoformat()
            
            if response.data and len(response.data) > 0:
                record = response.data[0]
                
                # Check if we need to reset daily counts
                last_reset = record.get("last_reset_date")
                if last_reset != today:
                    # Reset daily counts
                    client.table("usage_limits").update({
                        "daily_generates": 0,
                        "daily_voice_generates": 0,
                        "daily_edits": 0,
                        "daily_redesigns": 0,
                        "last_reset_date": today
                    }).eq("user_id", user_id).execute()
                    
                    record["daily_generates"] = 0
                    record["daily_voice_generates"] = 0
                    record["daily_edits"] = 0
                    record["daily_redesigns"] = 0
                
                return UsageInfo(
                    user_id=user_id,
                    daily_generates=record.get("daily_generates", 0),
                    daily_voice_generates=record.get("daily_voice_generates", 0),
                    daily_edits=record.get("daily_edits", 0),
                    daily_redesigns=record.get("daily_redesigns", 0),
                    monthly_generates=record.get("monthly_generates", 0),
                    published_sites=record.get("published_sites", 0),
                    last_reset_date=today
                )
            else:
                # Create new usage record
                client.table("usage_limits").insert({
                    "user_id": user_id,
                    "daily_generates": 0,
                    "daily_voice_generates": 0,
                    "daily_edits": 0,
                    "daily_redesigns": 0,
                    "monthly_generates": 0,
                    "published_sites": 0,
                    "last_reset_date": today
                }).execute()
                
                return UsageInfo(
                    user_id=user_id,
                    last_reset_date=today
                )
                
        except Exception as e:
            print(f"Error getting usage: {e}")
            # Return default usage (allow the request)
            return UsageInfo(user_id=user_id)
    
    async def increment_usage(self, user_id: str, usage_type: str) -> bool:
        """
        Increment usage counter.
        
        usage_type: "generate", "voice_generate", "edit", "redesign", "publish"
        Returns True if successful.
        """
        try:
            client = supabase_service.get_client()
            
            column_map = {
                "generate": "daily_generates",
                "voice_generate": "daily_voice_generates",
                "edit": "daily_edits",
                "redesign": "daily_redesigns",
                "publish": "published_sites",
            }
            
            column = column_map.get(usage_type)
            if not column:
                return False
            
            # Get current value and increment
            response = client.table("usage_limits").select(column).eq("user_id", user_id).execute()
            
            if response.data and len(response.data) > 0:
                current = response.data[0].get(column, 0)
                update_data = {column: current + 1}
                
                # Also increment monthly generates
                if usage_type in ["generate", "voice_generate"]:
                    monthly = response.data[0].get("monthly_generates", 0) if "monthly_generates" in response.data[0] else 0
                    update_data["monthly_generates"] = monthly + 1
                
                client.table("usage_limits").update(update_data).eq("user_id", user_id).execute()
                return True
            
            return False
            
        except Exception as e:
            print(f"Error incrementing usage: {e}")
            return False
    
    async def log_usage(
        self, 
        user_id: Optional[str], 
        ip_address: str, 
        endpoint: str,
        success: bool = True
    ):
        """Log API usage to usage_logs table."""
        try:
            client = supabase_service.get_client()
            
            client.table("usage_logs").insert({
                "user_id": user_id,
                "ip_address": ip_address,
                "endpoint": endpoint,
                "success": success,
                "created_at": datetime.utcnow().isoformat()
            }).execute()
            
        except Exception as e:
            print(f"Error logging usage: {e}")


# Global instance
usage_tracker = UsageTracker()
