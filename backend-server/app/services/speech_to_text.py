from functools import lru_cache
from time import perf_counter

import numpy as np

from faster_whisper import WhisperModel

from app.core.config import settings


class SpeechToTextService:

    def __init__(self):

        print("Initializing speech-to-text model...")

        self.model = WhisperModel(
            settings.WHISPER_MODEL,
            device=settings.WHISPER_DEVICE,
            compute_type=settings.WHISPER_COMPUTE_TYPE
        )

        print("Speech-to-text model initialized")


    def transcribe(
        self,
        audio: str | np.ndarray,
        language: str | None = None,
        beam_size: int = 3
    ) -> dict:

        start_time = perf_counter()

        segments, info = self.model.transcribe(
            audio,
            task="transcribe",
            language=language,
            beam_size=beam_size,
            vad_filter=True
        )

        transcript_segments = []

        for segment in segments:

            transcript_segments.append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text.strip()
            })


        full_text = " ".join(
            segment["text"]
            for segment in transcript_segments
        )


        processing_time = perf_counter() - start_time


        return {
            "text": full_text,

            "language": info.language,

            "language_probability": round(
                info.language_probability, 4
            ),

            "duration_seconds": round(
                info.duration, 2
            ),

            "processing_time_seconds": round(
                processing_time, 2
            ),

            "segments": transcript_segments
        }


@lru_cache(maxsize=1)
def get_speech_to_text_service() -> SpeechToTextService:

    return SpeechToTextService()