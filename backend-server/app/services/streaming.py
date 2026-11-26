import asyncio

from concurrent.futures import ThreadPoolExecutor

from app.core.config import settings

from app.services.audio_processor import (
    AudioProcessor
)

from app.services.speech_to_text import (
    get_speech_to_text_service
)


# Initially allow one model inference at a time.
inference_executor = ThreadPoolExecutor(
    max_workers=1,
    thread_name_prefix="whisper"
)


def transcribe_snapshot(
    audio_bytes: bytes,
    sample_rate: int,
    language: str | None
) -> dict:

    audio = AudioProcessor.prepare_audio(
        audio_bytes,
        source_rate=sample_rate
    )

    service = get_speech_to_text_service()

    return service.transcribe(
        audio,
        language=language,
        beam_size=3
    )


class StreamingSession:

    def __init__(
        self,
        sample_rate: int,
        language: str | None = None
    ):

        self.sample_rate = sample_rate

        self.language = language

        self.audio_buffer = bytearray()

        self.last_processed_bytes = 0


    @property
    def duration_seconds(self) -> float:

        return (
            len(self.audio_buffer)
            / (self.sample_rate * 2)
        )


    @property
    def max_buffer_bytes(self) -> int:

        return (
            self.sample_rate
            * 2
            * settings.STREAM_MAX_DURATION_SECONDS
        )


    def add_audio(
        self,
        chunk: bytes
    ) -> None:

        if len(chunk) % 2 != 0:
            raise ValueError(
                "Invalid PCM16 audio chunk"
            )

        new_size = (
            len(self.audio_buffer)
            + len(chunk)
        )

        if new_size > self.max_buffer_bytes:
            raise ValueError(
                "Maximum recording duration exceeded"
            )

        self.audio_buffer.extend(chunk)


    def should_transcribe(self) -> bool:

        if (
            self.duration_seconds
            < settings.STREAM_MIN_AUDIO_SECONDS
        ):
            return False

        if self.last_processed_bytes == 0:
            return True

        new_bytes = (
            len(self.audio_buffer)
            - self.last_processed_bytes
        )

        new_audio_seconds = (
            new_bytes / (self.sample_rate * 2)
        )

        return (
            new_audio_seconds
            >= settings.STREAM_UPDATE_INTERVAL_SECONDS
        )


    def snapshot(self) -> bytes:

        audio = bytes(self.audio_buffer)

        self.last_processed_bytes = len(audio)

        return audio


    async def transcribe(
        self,
        audio: bytes
    ) -> dict:

        if not audio:

            return {
                "text": "",
                "language": self.language,
                "language_probability": None,
                "duration_seconds": 0.0,
                "processing_time_seconds": 0.0,
                "segments": []
            }

        loop = asyncio.get_running_loop()

        result = await loop.run_in_executor(
            inference_executor,
            transcribe_snapshot,
            audio,
            self.sample_rate,
            self.language
        )

        return result