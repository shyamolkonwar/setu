"""
Cloudflare Pages Service
Handles deployment of static websites to Cloudflare Pages.
"""

import httpx
import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel

from app.core.config import get_settings


class DeploymentResult(BaseModel):
    """Result of a Cloudflare Pages deployment."""
    success: bool
    deployment_id: Optional[str] = None
    subdomain: str
    live_url: str
    message: str
    ssl_status: str = "pending"


class CloudflareService:
    """Service for deploying websites to Cloudflare Pages."""
    
    def __init__(self):
        settings = get_settings()
        self.account_id = settings.cloudflare_account_id
        self.api_token = settings.cloudflare_api_token
        self.pages_project = settings.cloudflare_pages_project
        self.base_domain = settings.base_domain
        self.api_base = "https://api.cloudflare.com/client/v4"
        self._client: Optional[httpx.AsyncClient] = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create async HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                headers={
                    "Authorization": f"Bearer {self.api_token}",
                    "Content-Type": "application/json"
                },
                timeout=60.0
            )
        return self._client
    
    def is_configured(self) -> bool:
        """Check if Cloudflare is properly configured."""
        return bool(
            self.account_id and 
            self.api_token and 
            self.pages_project and
            self.account_id != "" and
            self.api_token != ""
        )
    
    def generate_subdomain(self, business_name: str) -> str:
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
    
    async def deploy_to_pages(
        self, 
        website_id: str, 
        html_content: str, 
        subdomain: str,
        user_id: Optional[str] = None
    ) -> DeploymentResult:
        """
        Deploy a website to Cloudflare Pages.
        
        For MVP, this uses direct upload API. In production, consider
        using Cloudflare Pages Direct Upload or Wrangler CLI.
        
        Args:
            website_id: Unique website identifier
            html_content: The HTML content to deploy
            subdomain: The subdomain for the site
            user_id: Owner user ID
        
        Returns:
            DeploymentResult with deployment status and URL
        """
        if not self.is_configured():
            # Fallback to local URL for development
            local_url = f"http://localhost:8000/sites/{subdomain}"
            return DeploymentResult(
                success=True,
                subdomain=subdomain,
                live_url=local_url,
                message="Deployed locally (Cloudflare not configured)",
                ssl_status="n/a"
            )
        
        try:
            # Create deployment using Direct Upload API
            # Reference: https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
            
            # Step 1: Create a new deployment
            create_url = f"{self.api_base}/accounts/{self.account_id}/pages/projects/{self.pages_project}/deployments"
            
            # Prepare files for upload
            # For HTML deployment, we upload index.html
            files = {
                "index.html": html_content.encode('utf-8')
            }
            
            # Create form data with files
            form_data = {}
            for filename, content in files.items():
                form_data[filename] = content
            
            # Make the deployment request
            response = await self.client.post(
                create_url,
                files={"file": ("index.html", html_content, "text/html")},
                headers={"Authorization": f"Bearer {self.api_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                deployment_id = data.get("result", {}).get("id")
                
                # Construct the live URL
                # Default Pages URL format: https://<deployment-id>.<project>.pages.dev
                # With custom domain: https://<subdomain>.<base_domain>
                if self.base_domain and self.base_domain != "setu.local":
                    live_url = f"https://{subdomain}.{self.base_domain}"
                else:
                    project_url = data.get("result", {}).get("url", "")
                    live_url = project_url or f"https://{subdomain}.{self.pages_project}.pages.dev"
                
                return DeploymentResult(
                    success=True,
                    deployment_id=deployment_id,
                    subdomain=subdomain,
                    live_url=live_url,
                    message="Website deployed successfully!",
                    ssl_status="active"  # Cloudflare provides automatic SSL
                )
            else:
                error_msg = response.json().get("errors", [{"message": "Unknown error"}])[0].get("message")
                return DeploymentResult(
                    success=False,
                    subdomain=subdomain,
                    live_url="",
                    message=f"Deployment failed: {error_msg}"
                )
                
        except Exception as e:
            return DeploymentResult(
                success=False,
                subdomain=subdomain,
                live_url="",
                message=f"Deployment error: {str(e)}"
            )
    
    async def delete_deployment(self, subdomain: str) -> bool:
        """
        Delete a deployment from Cloudflare Pages.
        
        Args:
            subdomain: The subdomain to delete
        
        Returns:
            True if successfully deleted
        """
        if not self.is_configured():
            return True  # No-op for local development
        
        try:
            # List deployments and find by subdomain
            list_url = f"{self.api_base}/accounts/{self.account_id}/pages/projects/{self.pages_project}/deployments"
            
            response = await self.client.get(list_url)
            
            if response.status_code == 200:
                deployments = response.json().get("result", [])
                
                # Find deployment matching subdomain
                for deployment in deployments:
                    if subdomain in deployment.get("url", ""):
                        deployment_id = deployment.get("id")
                        
                        # Delete the deployment
                        delete_url = f"{list_url}/{deployment_id}"
                        delete_response = await self.client.delete(delete_url)
                        
                        return delete_response.status_code in [200, 204]
            
            return False
            
        except Exception as e:
            print(f"Error deleting deployment: {e}")
            return False
    
    async def get_deployment_status(self, deployment_id: str) -> dict:
        """
        Get the status of a deployment.
        
        Args:
            deployment_id: The Cloudflare deployment ID
        
        Returns:
            Deployment status information
        """
        if not self.is_configured():
            return {"status": "unknown", "message": "Cloudflare not configured"}
        
        try:
            url = f"{self.api_base}/accounts/{self.account_id}/pages/projects/{self.pages_project}/deployments/{deployment_id}"
            
            response = await self.client.get(url)
            
            if response.status_code == 200:
                data = response.json().get("result", {})
                return {
                    "status": data.get("latest_stage", {}).get("status", "unknown"),
                    "url": data.get("url"),
                    "created_at": data.get("created_on"),
                    "ssl_status": "active" if data.get("url", "").startswith("https") else "pending"
                }
            
            return {"status": "error", "message": "Failed to get deployment status"}
            
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Global instance
cloudflare_service = CloudflareService()
