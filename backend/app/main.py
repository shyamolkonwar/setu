"""
FastAPI Backend for AI Website Builder Platform
Setu - AI Website Operator for Local Businesses
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from app.api.routes import waitlist, generate, publish, sites, voice, edit, redesign, tasks, auth, usage, websites
from app.core.config import get_settings
from app.core.rate_limiter import rate_limit_middleware

settings = get_settings()

app = FastAPI(
    title="Setu API",
    description="AI Website Builder for Local Businesses - Build professional websites using voice or text. Powered by Supabase and Cloudflare.",
    version="1.0.0",
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

# Rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Include routers
app.include_router(waitlist.router, prefix="/api", tags=["Waitlist"])
app.include_router(generate.router, prefix="/api", tags=["Generate"])
app.include_router(publish.router, prefix="/api", tags=["Publish"])
app.include_router(sites.router, prefix="/sites", tags=["Sites"])
app.include_router(voice.router, prefix="/api", tags=["Voice"])
app.include_router(edit.router, prefix="/api", tags=["Edit"])
app.include_router(redesign.router, prefix="/api", tags=["Redesign"])
app.include_router(tasks.router, prefix="/api", tags=["Tasks"])
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(usage.router, prefix="/api", tags=["Usage"])
app.include_router(websites.router, prefix="/api", tags=["Websites"])


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Setu API",
        "version": "1.0.0",
        "description": "AI Website Builder for Local Businesses",
        "docs": "/docs",
        "status": "running",
        "features": ["generate", "preview", "publish", "voice", "edit", "redesign", "async-tasks", "auth", "rate-limiting", "cloudflare-pages", "supabase-storage"]
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "openai_configured": bool(settings.openai_api_key)
    }

