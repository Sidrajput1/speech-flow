from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.transcription import Transcription

from app.schemas.transcription import (
    TranscriptionCreate,
    TranscriptionUpdate
)


class TranscriptionRepository:

    def __init__(self, db: Session):

        self.db = db


    def create(
        self,
        data: TranscriptionCreate
    ) -> Transcription:

        transcription = Transcription(
            **data.model_dump()
        )

        self.db.add(transcription)

        self.db.commit()

        self.db.refresh(transcription)

        return transcription


    def get_by_id(
        self,
        transcription_id: UUID
    ) -> Transcription | None:

        return self.db.get(
            Transcription,
            transcription_id
        )


    def get_all(
        self,
        limit: int = 20,
        offset: int = 0
    ) -> tuple[list[Transcription], int]:

        statement = (
            select(Transcription)
            .order_by(
                Transcription.created_at.desc(),
                Transcription.id.desc()
            )
            .offset(offset)
            .limit(limit)
        )

        items = list(
            self.db.scalars(statement).all()
        )

        count_statement = (
            select(func.count())
            .select_from(Transcription)
        )

        total = self.db.scalar(
            count_statement
        ) or 0

        return items, total


    def update(
        self,
        transcription: Transcription,
        data: TranscriptionUpdate
    ) -> Transcription:

        updated_data = data.model_dump(
            exclude_unset=True
        )

        for field, value in updated_data.items():

            setattr(
                transcription,
                field,
                value
            )

        self.db.commit()

        self.db.refresh(transcription)

        return transcription


    def delete(
        self,
        transcription: Transcription
    ) -> None:

        self.db.delete(transcription)

        self.db.commit()