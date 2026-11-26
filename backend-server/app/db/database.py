from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    sessionmaker
)

from app.core.config import settings


# Database engine and connection pool
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,
    max_overflow=5,
    pool_timeout=10,
    pool_pre_ping=True
)


# Factory for creating database sessions
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False
)


# Base class for SQLAlchemy models
class Base(DeclarativeBase):
    pass


# FastAPI database dependency
def get_db() -> Generator[Session, None, None]:

    db = SessionLocal()

    try:
        yield db

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()