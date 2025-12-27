"""
R2 Storage Service
Handles file uploads to Cloudflare R2 (S3-compatible storage).
"""

import boto3
from botocore.config import Config
from typing import Optional
from datetime import datetime
import mimetypes
import uuid

from app.core.config import get_settings


class R2Service:
    """Service for uploading files to Cloudflare R2 storage."""
    
    def __init__(self):
        settings = get_settings()
        self.access_key = settings.cloudflare_r2_access_key
        self.secret_key = settings.cloudflare_r2_secret_key
        self.bucket = settings.cloudflare_r2_bucket
        self.endpoint = settings.cloudflare_r2_endpoint
        self._client = None
    
    @property
    def client(self):
        """Get or create S3 client for R2."""
        if self._client is None:
            if not self.is_configured():
                return None
            
            self._client = boto3.client(
                's3',
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                config=Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'}
                )
            )
        return self._client
    
    def is_configured(self) -> bool:
        """Check if R2 is properly configured."""
        return bool(
            self.access_key and 
            self.secret_key and 
            self.bucket and 
            self.endpoint and
            self.access_key != "" and
            self.secret_key != ""
        )
    
    def _generate_key(self, prefix: str, filename: str) -> str:
        """Generate a unique storage key."""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        unique_id = uuid.uuid4().hex[:8]
        return f"{prefix}/{timestamp}/{unique_id}_{filename}"
    
    async def upload_audio(
        self, 
        audio_data: bytes, 
        user_id: str,
        filename: str = "recording.webm"
    ) -> Optional[str]:
        """
        Upload audio file to R2 storage.
        
        Args:
            audio_data: Audio file bytes
            user_id: User ID for organizing storage
            filename: Original filename
        
        Returns:
            Public URL of uploaded file, or None if failed
        """
        if not self.is_configured():
            # For development, return a placeholder
            return None
        
        try:
            key = self._generate_key(f"audio/{user_id}", filename)
            content_type = mimetypes.guess_type(filename)[0] or 'audio/webm'
            
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=audio_data,
                ContentType=content_type
            )
            
            # Generate public URL
            # R2 public access URL format varies based on configuration
            public_url = f"{self.endpoint}/{self.bucket}/{key}"
            
            return public_url
            
        except Exception as e:
            print(f"Error uploading audio to R2: {e}")
            return None
    
    async def upload_asset(
        self, 
        file_data: bytes, 
        website_id: str, 
        filename: str
    ) -> Optional[str]:
        """
        Upload a website asset to R2 storage.
        
        Args:
            file_data: File bytes
            website_id: Website ID for organizing storage
            filename: Original filename
        
        Returns:
            Public URL of uploaded file, or None if failed
        """
        if not self.is_configured():
            return None
        
        try:
            key = self._generate_key(f"assets/{website_id}", filename)
            content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=file_data,
                ContentType=content_type
            )
            
            public_url = f"{self.endpoint}/{self.bucket}/{key}"
            
            return public_url
            
        except Exception as e:
            print(f"Error uploading asset to R2: {e}")
            return None
    
    async def upload_html(
        self, 
        html_content: str, 
        website_id: str
    ) -> Optional[str]:
        """
        Upload HTML content to R2 as a backup/archive.
        
        Args:
            html_content: HTML string content
            website_id: Website ID
        
        Returns:
            Public URL of uploaded file, or None if failed
        """
        if not self.is_configured():
            return None
        
        try:
            key = f"websites/{website_id}/index.html"
            
            self.client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=html_content.encode('utf-8'),
                ContentType='text/html; charset=utf-8'
            )
            
            public_url = f"{self.endpoint}/{self.bucket}/{key}"
            
            return public_url
            
        except Exception as e:
            print(f"Error uploading HTML to R2: {e}")
            return None
    
    async def delete_assets(self, website_id: str) -> bool:
        """
        Delete all assets for a website.
        
        Args:
            website_id: Website ID whose assets to delete
        
        Returns:
            True if successfully deleted
        """
        if not self.is_configured():
            return True
        
        try:
            prefix = f"assets/{website_id}/"
            
            # List all objects with prefix
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix
            )
            
            # Delete each object
            objects_to_delete = response.get('Contents', [])
            
            if objects_to_delete:
                delete_keys = [{'Key': obj['Key']} for obj in objects_to_delete]
                
                self.client.delete_objects(
                    Bucket=self.bucket,
                    Delete={'Objects': delete_keys}
                )
            
            return True
            
        except Exception as e:
            print(f"Error deleting assets from R2: {e}")
            return False
    
    async def get_signed_url(
        self, 
        key: str, 
        expires_in: int = 3600
    ) -> Optional[str]:
        """
        Generate a signed URL for private file access.
        
        Args:
            key: File key in R2
            expires_in: URL expiration time in seconds
        
        Returns:
            Signed URL or None if failed
        """
        if not self.is_configured():
            return None
        
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket, 'Key': key},
                ExpiresIn=expires_in
            )
            return url
            
        except Exception as e:
            print(f"Error generating signed URL: {e}")
            return None


# Global instance
r2_service = R2Service()
