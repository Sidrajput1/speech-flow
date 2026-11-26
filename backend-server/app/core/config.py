from functools import lru_cache
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings,SettingsConfigDict

class Settings(BaseSettings):

    #basesettings is a class who read ,convert and validate env var automatically. 

    # Application settings
    APP_NAME: str = "SpeechFlow API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: Literal["development", "production"] = "development"
    DEBUG: bool = False

    # Frontend settings
    FRONTEND_URL: str = "http://localhost:3000"

    # Database configuration

    DATABASE_URL: str

    # AI model settings
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: Literal["cpu", "cuda"] = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"

    # configure behaviour of pydantic settings
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Streaming configuration

    STREAM_MIN_AUDIO_SECONDS: float = Field(
        default=3.0,
        gt=0
    )

    STREAM_UPDATE_INTERVAL_SECONDS: float = Field(
        default=2.0,
        gt=0
    )

    STREAM_MAX_DURATION_SECONDS: int = Field(
        default=60,
        ge=5,
        le=120
    )

    STREAM_IDLE_TIMEOUT_SECONDS: int = Field(
        default=30,
        gt=0
    )


# to cache result of functions to avoid repeated computation from the same inputs
# imp - if change in .env file then restart the application . 
@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
