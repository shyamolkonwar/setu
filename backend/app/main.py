"""
FastAPI Backend for AI Website Builder Platform
Setu - AI Website Operator for Local Businesses
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.api.routes import waitlist, generate, publish, sites, voice
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Setu API",
    description="AI Website Builder for Local Businesses - Build professional websites using voice or text",
    version="0.4.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(waitlist.router, prefix="/api", tags=["Waitlist"])
app.include_router(generate.router, prefix="/api", tags=["Generate"])
app.include_router(publish.router, prefix="/api", tags=["Publish"])
app.include_router(sites.router, prefix="/sites", tags=["Sites"])
app.include_router(voice.router, prefix="/api", tags=["Voice"])


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Setu API",
        "version": "0.4.0",
        "description": "AI Website Builder for Local Businesses",
        "docs": "/docs",
        "status": "running",
        "features": ["generate", "preview", "publish", "voice"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "openai_configured": bool(settings.openai_api_key)
    }
