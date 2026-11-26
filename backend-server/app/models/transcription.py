from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    String,
    Text,
    Float,
    DateTime,
    CheckConstraint,
    Index,
    func
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column
)

from sqlalchemy.dialects.postgresql import (
    UUID as PG_UUID
)

from app.db.database import Base


class Transcription(Base):

    __tablename__ = "transcriptions"

    __table_args__ = (
        CheckConstraint(
            "duration_seconds >= 0",
            name="ck_transcriptions_duration_positive"
        ),
        Index(
            "ix_transcriptions_created_at",
            "created_at",
            "id"
        ),
    )


    id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )


    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )


    content: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )


    language: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )


    duration_seconds: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0
    )


    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )


    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )