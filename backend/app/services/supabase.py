"""
Supabase Service Module
Handles all Supabase database operations with proper error handling.
"""

import os
from typing import Optional, Dict, Any, List
from datetime import datetime
from supabase import create_client, Client
from app.core.config import get_settings


# Credit costs for actions
CREDIT_COSTS = {
    "generate": 10,
    "voice_generate": 15,
    "edit": 2,
    "redesign": 20,
    "publish": 5,
}


class SupabaseService:
    """Service for interacting with Supabase database."""
    
    def __init__(self):
        settings = get_settings()
        self.url = settings.supabase_url
        self.key = settings.supabase_service_key
        self._client: Optional[Client] = None
    
    @property
    def client(self) -> Client:
        """Get or create Supabase client."""
        if not self._client:
            if not self.url or not self.key:
                raise ValueError("Supabase credentials not configured")
            self._client = create_client(self.url, self.key)
        return self._client
    
    def get_client(self) -> Client:
        """Get Supabase client (alias for compatibility)."""
        return self.client
    
    def is_configured(self) -> bool:
        """Check if Supabase is properly configured."""
        return bool(self.url and self.key and 
                   self.url != "https://your-project.supabase.co" and
                   self.key != "your-service-role-key-here")
    
    # ========================================
    # WAITLIST METHODS (Existing)
    # ========================================
    
    async def add_waitlist_entry(
        self,
        contact: str,
        contact_type: str,
        business_description: Optional[str] = None,
        language: str = "en",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Add a new waitlist entry to Supabase."""
        if not self.is_configured():
            raise ValueError("Supabase not configured")
        
        data = {
            "contact": contact,
            "contact_type": contact_type,
            "business_description": business_description,
            "language": language,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = self.client.table("waitlist").insert(data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise Exception("Failed to insert waitlist entry")
    
    async def check_duplicate(self, contact: str) -> bool:
        """Check if contact already exists in waitlist."""
        if not self.is_configured():
            return False
        
        response = self.client.table("waitlist")\
            .select("id")\
            .eq("contact", contact)\
            .execute()
        
        return len(response.data) > 0
    
    async def get_waitlist_count(self) -> int:
        """Get total number of waitlist entries."""
        if not self.is_configured():
            return 0
        
        response = self.client.table("waitlist")\
            .select("id", count="exact")\
            .execute()
        
        return response.count or 0
    
    # ========================================
    # USER METHODS
    # ========================================
    
    async def get_user_by_auth_id(self, auth_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by auth.users ID."""
        if not self.is_configured():
            return None
        
        response = self.client.table("users")\
            .select("*")\
            .eq("auth_id", auth_id)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def create_user_profile(
        self, 
        auth_id: str, 
        email: str, 
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Create a user profile (if trigger didn't create it)."""
        if not self.is_configured():
            raise ValueError("Supabase not configured")
        
        # Check if user already exists
        existing = await self.get_user_by_auth_id(auth_id)
        if existing:
            return existing
        
        data = {
            "auth_id": auth_id,
            "email": email,
            "full_name": metadata.get("full_name") if metadata else None,
            "avatar_url": metadata.get("avatar_url") if metadata else None,
        }
        
        response = self.client.table("users").insert(data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise Exception("Failed to create user profile")
    
    async def update_user_profile(
        self, 
        auth_id: str, 
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Update user profile."""
        if not self.is_configured():
            return None
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        response = self.client.table("users")\
            .update(updates)\
            .eq("auth_id", auth_id)\
            .execute()
        
        if response.data:
            return response.data[0]
        return None
    
    # ========================================
    # WEBSITE METHODS
    # ========================================
    
    async def create_website(
        self, 
        owner_id: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new website in Supabase.
        
        Args:
            owner_id: auth.users.id of the owner
            data: Website data including business_json, html, etc.
        
        Returns:
            Created website record
        """
        if not self.is_configured():
            raise ValueError("Supabase not configured")
        
        website_data = {
            "owner_id": owner_id,
            "status": data.get("status", "draft"),
            "business_json": data.get("business_json"),
            "layout_json": data.get("layout_json"),
            "html": data.get("html"),
            "description": data.get("description"),
            "language": data.get("language", "en"),
            "source_type": data.get("source_type", "text"),
        }
        
        response = self.client.table("websites").insert(website_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise Exception("Failed to create website")
    
    async def get_website(
        self, 
        website_id: str, 
        owner_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get a website by ID, optionally filtered by owner.
        
        Args:
            website_id: Website UUID
            owner_id: Optional owner filter for security
        
        Returns:
            Website record or None
        """
        if not self.is_configured():
            return None
        
        query = self.client.table("websites")\
            .select("*")\
            .eq("id", website_id)
        
        if owner_id:
            query = query.eq("owner_id", owner_id)
        
        response = query.execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def get_user_websites(
        self, 
        owner_id: str, 
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Get all websites for a user.
        
        Args:
            owner_id: Owner's auth.users.id
            status: Optional filter by status
            limit: Maximum number of results
        
        Returns:
            List of website records
        """
        if not self.is_configured():
            return []
        
        query = self.client.table("websites")\
            .select("*")\
            .eq("owner_id", owner_id)\
            .order("created_at", desc=True)\
            .limit(limit)
        
        if status:
            query = query.eq("status", status)
        
        response = query.execute()
        
        return response.data or []
    
    async def update_website(
        self, 
        website_id: str, 
        owner_id: str, 
        updates: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Update a website (with owner verification).
        
        Args:
            website_id: Website UUID
            owner_id: Owner's auth.users.id (for security)
            updates: Fields to update
        
        Returns:
            Updated website or None
        """
        if not self.is_configured():
            return None
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        
        response = self.client.table("websites")\
            .update(updates)\
            .eq("id", website_id)\
            .eq("owner_id", owner_id)\
            .execute()
        
        if response.data:
            return response.data[0]
        return None
    
    async def delete_website(self, website_id: str, owner_id: str) -> bool:
        """Delete a website (with owner verification)."""
        if not self.is_configured():
            return False
        
        response = self.client.table("websites")\
            .delete()\
            .eq("id", website_id)\
            .eq("owner_id", owner_id)\
            .execute()
        
        return len(response.data) > 0 if response.data else False
    
    async def publish_website(
        self, 
        website_id: str, 
        owner_id: str,
        subdomain: str, 
        live_url: str
    ) -> Optional[Dict[str, Any]]:
        """
        Mark a website as published.
        
        Args:
            website_id: Website UUID
            owner_id: Owner's auth.users.id
            subdomain: Assigned subdomain
            live_url: Full live URL
        
        Returns:
            Updated website or None
        """
        updates = {
            "status": "live",
            "subdomain": subdomain,
            "live_url": live_url,
            "published_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        return await self.update_website(website_id, owner_id, updates)
    
    # ========================================
    # WEBSITE VERSIONS METHODS
    # ========================================
    
    async def create_website_version(
        self, 
        website_id: str, 
        html: str,
        business_json: Optional[Dict] = None,
        layout_json: Optional[Dict] = None,
        created_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new version of a website (for history/rollback).
        
        Args:
            website_id: Website UUID
            html: HTML content for this version
            business_json: Optional business JSON
            layout_json: Optional layout JSON
            created_by: User who created this version
        
        Returns:
            Created version record
        """
        if not self.is_configured():
            raise ValueError("Supabase not configured")
        
        # Get next version number
        versions = await self.get_website_versions(website_id, limit=1)
        next_version = (versions[0]["version"] + 1) if versions else 1
        
        version_data = {
            "website_id": website_id,
            "version": next_version,
            "html": html,
            "business_json": business_json,
            "layout_json": layout_json,
            "created_by": created_by
        }
        
        response = self.client.table("website_versions").insert(version_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise Exception("Failed to create website version")
    
    async def get_website_versions(
        self, 
        website_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get version history for a website."""
        if not self.is_configured():
            return []
        
        response = self.client.table("website_versions")\
            .select("*")\
            .eq("website_id", website_id)\
            .order("version", desc=True)\
            .limit(limit)\
            .execute()
        
        return response.data or []
    
    async def get_website_version(
        self, 
        website_id: str, 
        version: int
    ) -> Optional[Dict[str, Any]]:
        """Get a specific version of a website."""
        if not self.is_configured():
            return None
        
        response = self.client.table("website_versions")\
            .select("*")\
            .eq("website_id", website_id)\
            .eq("version", version)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    # ========================================
    # CREDITS METHODS
    # ========================================
    
    async def get_user_credits(self, user_id: str) -> Dict[str, Any]:
        """
        Get user's credit balance.
        
        Args:
            user_id: auth.users.id
        
        Returns:
            Credits record with balance info
        """
        if not self.is_configured():
            return {"balance": 0, "user_id": user_id}
        
        response = self.client.table("credits")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        
        # Return default if no record (shouldn't happen with trigger)
        return {"balance": 0, "user_id": user_id}
    
    async def check_credits(self, user_id: str, action: str) -> bool:
        """
        Check if user has enough credits for an action.
        
        Args:
            user_id: auth.users.id
            action: Action type (generate, voice_generate, edit, etc.)
        
        Returns:
            True if user has enough credits
        """
        credits = await self.get_user_credits(user_id)
        cost = CREDIT_COSTS.get(action, 0)
        
        return credits.get("balance", 0) >= cost
    
    async def deduct_credits(
        self, 
        user_id: str, 
        action: str, 
        description: Optional[str] = None
    ) -> bool:
        """
        Deduct credits for an action.
        
        Args:
            user_id: auth.users.id
            action: Action type
            description: Optional description
        
        Returns:
            True if credits were deducted successfully
        """
        if not self.is_configured():
            return True  # Allow in dev mode
        
        cost = CREDIT_COSTS.get(action, 0)
        if cost == 0:
            return True
        
        try:
            # Use the database function for atomic deduction
            response = self.client.rpc(
                "deduct_credits",
                {
                    "p_user_id": user_id,
                    "p_amount": cost,
                    "p_action": action,
                    "p_description": description or f"Used for {action}"
                }
            ).execute()
            
            return response.data is True
            
        except Exception as e:
            print(f"Error deducting credits: {e}")
            # Fallback to manual update
            credits = await self.get_user_credits(user_id)
            if credits.get("balance", 0) < cost:
                return False
            
            new_balance = credits["balance"] - cost
            
            self.client.table("credits")\
                .update({
                    "balance": new_balance,
                    "lifetime_spent": credits.get("lifetime_spent", 0) + cost,
                    "updated_at": datetime.utcnow().isoformat()
                })\
                .eq("user_id", user_id)\
                .execute()
            
            # Log transaction
            self.client.table("credit_transactions").insert({
                "user_id": user_id,
                "amount": -cost,
                "balance_after": new_balance,
                "action": action,
                "description": description or f"Used for {action}"
            }).execute()
            
            return True
    
    async def add_credits(
        self, 
        user_id: str, 
        amount: int, 
        reason: str = "purchase"
    ) -> bool:
        """
        Add credits to a user's balance.
        
        Args:
            user_id: auth.users.id
            amount: Credits to add
            reason: Reason for adding credits
        
        Returns:
            True if credits were added successfully
        """
        if not self.is_configured():
            return True
        
        credits = await self.get_user_credits(user_id)
        new_balance = credits.get("balance", 0) + amount
        
        self.client.table("credits")\
            .update({
                "balance": new_balance,
                "lifetime_earned": credits.get("lifetime_earned", 0) + amount,
                "last_purchase_at": datetime.utcnow().isoformat() if reason == "purchase" else None,
                "updated_at": datetime.utcnow().isoformat()
            })\
            .eq("user_id", user_id)\
            .execute()
        
        # Log transaction
        self.client.table("credit_transactions").insert({
            "user_id": user_id,
            "amount": amount,
            "balance_after": new_balance,
            "action": reason,
            "description": f"Added {amount} credits ({reason})"
        }).execute()
        
        return True
    
    # ========================================
    # DEPLOYMENT METHODS
    # ========================================
    
    async def create_deployment(
        self, 
        website_id: str,
        deployment_id: Optional[str],
        subdomain: str,
        live_url: str,
        deployed_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Record a Cloudflare deployment."""
        if not self.is_configured():
            raise ValueError("Supabase not configured")
        
        deployment_data = {
            "website_id": website_id,
            "deployment_id": deployment_id,
            "subdomain": subdomain,
            "live_url": live_url,
            "status": "active",
            "ssl_status": "active",
            "deployed_by": deployed_by
        }
        
        response = self.client.table("deployments").insert(deployment_data).execute()
        
        if response.data:
            return response.data[0]
        else:
            raise Exception("Failed to create deployment record")
    
    async def get_deployment(self, website_id: str) -> Optional[Dict[str, Any]]:
        """Get the latest deployment for a website."""
        if not self.is_configured():
            return None
        
        response = self.client.table("deployments")\
            .select("*")\
            .eq("website_id", website_id)\
            .eq("status", "active")\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None


# Global instance
supabase_service = SupabaseService()

