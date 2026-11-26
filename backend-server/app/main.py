from fastapi import HTTPException
from sqlalchemy import text

from app.db.database import engine
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

from app.routers.websocket import (
    router as websocket_router
)

from app.routers.transcription import (
    router as transcription_router
)

app = FastAPI(
     title="SpeechFlow API",
    description="Real-time multilingual speech-to-text service",
    version="1.0.0"
)

#cors configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL
    ],
    allow_credentials=False,
    allow_methods=[
        "GET",
        "POST",
        "PATCH",
        "DELETE"
    ],
    allow_headers=[
        "Content-Type"
    ]
)

app.include_router(websocket_router)

app.include_router(transcription_router)

@app.get("/")
def root():
    return {
        "message": "Welcome to SpeechFlow API"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "speechflow-backend"
    }

@app.get("/ready")
def readiness_check():

    try:

        with engine.connect() as connection:

            connection.execute(
                text("SELECT 1")
            )

    except Exception as exc:

        raise HTTPException(
            status_code=503,
            detail="Database unavailable"
        ) from exc

    return {
        "status": "ready",
        "database": "connected"
    }