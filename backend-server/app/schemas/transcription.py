from datetime import datetime
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    model_validator
)


class TranscriptionCreate(BaseModel):

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid"
    )

    title: str = Field(
        min_length=1,
        max_length=200
    )

    content: str = Field(
        min_length=1,
        max_length=50000
    )

    language: str | None = Field(
        default=None,
        min_length=1,
        max_length=20
    )

    duration_seconds: float = Field(
        default=0,
        ge=0,
        allow_inf_nan=False
    )


class TranscriptionUpdate(BaseModel):

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid"
    )

    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200
    )

    content: str | None = Field(
        default=None,
        min_length=1,
        max_length=50000
    )

    @model_validator(mode="after")
    def validate_update(self):

        if not self.model_fields_set:

            raise ValueError(
                "At least one field is required"
            )

        for field in self.model_fields_set:

            if getattr(self, field) is None:

                raise ValueError(
                    f"{field} cannot be null"
                )

        return self


class TranscriptionResponse(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )

    id: UUID

    title: str

    content: str

    language: str | None

    duration_seconds: float

    created_at: datetime

    updated_at: datetime


class TranscriptionListResponse(BaseModel):

    items: list[TranscriptionResponse]

    total: int

    limit: int

    offset: int