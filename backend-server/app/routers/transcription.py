from typing import Annotated
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Response,
    status
)

from sqlalchemy.orm import Session

from app.db.database import get_db

from app.repositories.transcription import (
    TranscriptionRepository
)

from app.schemas.transcription import (
    TranscriptionCreate,
    TranscriptionUpdate,
    TranscriptionResponse,
    TranscriptionListResponse
)


router = APIRouter(
    prefix="/api/transcriptions",
    tags=["Transcriptions"]
)


DatabaseSession = Annotated[
    Session,
    Depends(get_db)
]


# CREATE
@router.post(
    "",
    response_model=TranscriptionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_transcription(
    data: TranscriptionCreate,
    db: DatabaseSession
):

    repository = TranscriptionRepository(db)

    return repository.create(data)


# READ ALL
@router.get(
    "",
    response_model=TranscriptionListResponse
)
def get_transcriptions(
    db: DatabaseSession,
    limit: int = Query(
        default=20,
        ge=1,
        le=100
    ),
    offset: int = Query(
        default=0,
        ge=0
    )
):

    repository = TranscriptionRepository(db)

    items, total = repository.get_all(
        limit=limit,
        offset=offset
    )

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset
    }


# READ ONE
@router.get(
    "/{transcription_id}",
    response_model=TranscriptionResponse
)
def get_transcription(
    transcription_id: UUID,
    db: DatabaseSession
):

    repository = TranscriptionRepository(db)

    transcription = repository.get_by_id(
        transcription_id
    )

    if transcription is None:

        raise HTTPException(
            status_code=404,
            detail="Transcription not found"
        )

    return transcription


# UPDATE
@router.patch(
    "/{transcription_id}",
    response_model=TranscriptionResponse
)
def update_transcription(
    transcription_id: UUID,
    data: TranscriptionUpdate,
    db: DatabaseSession
):

    repository = TranscriptionRepository(db)

    transcription = repository.get_by_id(
        transcription_id
    )

    if transcription is None:

        raise HTTPException(
            status_code=404,
            detail="Transcription not found"
        )

    return repository.update(
        transcription,
        data
    )


# DELETE
@router.delete(
    "/{transcription_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response
)
def delete_transcription(
    transcription_id: UUID,
    db: DatabaseSession
):

    repository = TranscriptionRepository(db)

    transcription = repository.get_by_id(
        transcription_id
    )

    if transcription is None:

        raise HTTPException(
            status_code=404,
            detail="Transcription not found"
        )

    repository.delete(transcription)

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )