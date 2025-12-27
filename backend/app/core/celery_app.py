"""
Celery Application Configuration
Central configuration for async task processing.

Upstash Redis Integration:
- Set REDIS_URL in .env to your Upstash Redis connection string
- Format: rediss://default:PASSWORD@HOST:PORT
- Get this from Upstash Console > Your Database > Details > Endpoint
"""

import os
import ssl
from pathlib import Path
from dotenv import load_dotenv
from celery import Celery

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

# Get Redis URL from environment
# For Upstash: Use the native Redis URL (rediss://...), NOT the REST URL
# This enables Celery to work with Upstash as broker and backend
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Check if using SSL (Upstash uses rediss://)
USE_SSL = REDIS_URL.startswith("rediss://")

# Create Celery app with Upstash Redis
celery_app = Celery(
    "worker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.workers.tasks"]  # Auto-discover tasks
)

# SSL configuration for Upstash (rediss://)
if USE_SSL:
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    celery_app.conf.update(
        # Broker SSL settings
        broker_use_ssl={
            'ssl_cert_reqs': ssl.CERT_NONE,
        },
        # Backend SSL settings  
        redis_backend_use_ssl={
            'ssl_cert_reqs': ssl.CERT_NONE,
        },
    )

# Celery configuration optimized for Upstash
celery_app.conf.update(
    # Serialization (required for Upstash compatibility)
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    
    # Task tracking
    task_track_started=True,
    task_acks_late=True,  # Acknowledge after task completes
    
    # Timeouts
    task_time_limit=600,  # 10 minutes hard limit
    task_soft_time_limit=540,  # 9 minutes soft limit (for cleanup)
    
    # Result expiration
    result_expires=3600,  # 1 hour
    
    # Worker settings (conservative for Upstash free tier)
    worker_prefetch_multiplier=1,  # One task at a time (for AI tasks)
    worker_concurrency=2,  # 2 concurrent workers
    
    # Retry settings
    task_default_retry_delay=30,  # 30 seconds
    task_max_retries=3,
    
    # Connection settings for Upstash
    broker_connection_retry_on_startup=True,
    broker_pool_limit=10,
    
    # Timezone
    timezone="Asia/Kolkata",
    enable_utc=True,
)

# Optional: Configure task routes for different queues (future scaling)
# celery_app.conf.task_routes = {
#     "app.workers.tasks.generate_website_task": {"queue": "ai-heavy"},
#     "app.workers.tasks.speech_to_text_task": {"queue": "ai-heavy"},
#     "app.workers.tasks.redesign_website_task": {"queue": "low-priority"},
# }
