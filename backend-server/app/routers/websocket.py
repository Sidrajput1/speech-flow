import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket
from fastapi import WebSocketDisconnect

from app.core.config import settings

from app.services.streaming import (
    StreamingSession
)


router = APIRouter()

logger = logging.getLogger(__name__)


@router.websocket("/ws/transcribe")
async def transcribe_websocket(
    websocket: WebSocket
):

    # CORS middleware does not protect WebSockets.
    origin = websocket.headers.get("origin")

    if origin != settings.FRONTEND_URL:
        await websocket.close(code=1008)
        return

    await websocket.accept()

    session: StreamingSession | None = None

    inference_task: asyncio.Task | None = None

    last_result: dict | None = None


    async def send_partial(
        audio: bytes
    ) -> None:

        nonlocal last_result

        result = await session.transcribe(audio)

        last_result = result

        await websocket.send_json({
            "type": "partial",
            **result
        })


    try:

        await websocket.send_json({
            "type": "connected"
        })


        while True:

            # Collect errors/results from finished tasks.
            if (
                inference_task is not None
                and inference_task.done()
            ):

                await inference_task

                inference_task = None


            message = await asyncio.wait_for(
                websocket.receive(),
                timeout=settings.STREAM_IDLE_TIMEOUT_SECONDS
            )


            if message["type"] == "websocket.disconnect":
                break


            # Handle binary audio messages.
            if message.get("bytes") is not None:

                if session is None:

                    await websocket.send_json({
                        "type": "error",
                        "message": "Start a session first"
                    })

                    continue


                audio_chunk = message["bytes"]

                session.add_audio(audio_chunk)


                if (
                    session.should_transcribe()
                    and inference_task is None
                ):

                    audio_snapshot = session.snapshot()

                    inference_task = asyncio.create_task(
                        send_partial(audio_snapshot)
                    )

                continue


            # Handle JSON control messages.
            raw_text = message.get("text")

            if raw_text is None:
                continue

            payload = json.loads(raw_text)

            if not isinstance(payload, dict):
                raise ValueError(
                    "Expected a JSON object"
                )

            message_type = payload.get("type")


            if message_type == "start":

                if session is not None:

                    await websocket.send_json({
                        "type": "error",
                        "message": "Session already started"
                    })

                    continue


                sample_rate = payload.get(
                    "sample_rate",
                    16000
                )

                allowed_rates = {
                    8000,
                    16000,
                    22050,
                    24000,
                    32000,
                    44100,
                    48000
                }

                if (
                    type(sample_rate) is not int
                    or sample_rate not in allowed_rates
                ):
                    raise ValueError(
                        "Unsupported sample rate"
                    )


                language = payload.get(
                    "language",
                    "auto"
                )

                if language not in ("auto", "hi", "en"):
                    raise ValueError(
                        "Unsupported language option"
                    )

                if language == "auto":
                    language = None


                session = StreamingSession(
                    sample_rate=sample_rate,
                    language=language
                )


                await websocket.send_json({
                    "type": "ready",
                    "sample_rate": sample_rate,
                    "max_duration_seconds":
                        settings.STREAM_MAX_DURATION_SECONDS
                })


            elif message_type == "stop":

                if session is None:

                    await websocket.send_json({
                        "type": "error",
                        "message": "No active session"
                    })

                    continue


                # Wait for pending partial inference.
                if inference_task is not None:

                    await inference_task

                    inference_task = None


                # Reuse last result if all audio
                # has already been processed.
                if (
                    last_result is not None
                    and session.last_processed_bytes
                        == len(session.audio_buffer)
                ):

                    result = last_result

                else:

                    final_audio = session.snapshot()

                    result = await session.transcribe(
                        final_audio
                    )


                await websocket.send_json({
                    "type": "final",
                    **result
                })

                await websocket.close(code=1000)

                return


            else:

                await websocket.send_json({
                    "type": "error",
                    "message": "Unknown message type"
                })


    except WebSocketDisconnect:

        logger.info("WebSocket disconnected")


    except (ValueError, TypeError) as exc:

        try:
            await websocket.send_json({
                "type": "error",
                "message": str(exc)
            })

            await websocket.close(code=1008)

        except (WebSocketDisconnect, RuntimeError, OSError):
            pass


    except asyncio.TimeoutError:

        try:
            await websocket.send_json({
                "type": "error",
                "message": "Recording session timed out"
            })

            await websocket.close(code=1000)

        except (WebSocketDisconnect, RuntimeError, OSError):
            pass


    except Exception:

        logger.exception("Transcription failed")

        try:
            await websocket.send_json({
                "type": "error",
                "message": "Transcription failed"
            })

            await websocket.close(code=1011)

        except (WebSocketDisconnect, RuntimeError, OSError):
            pass


    finally:

        if inference_task is not None:

            if not inference_task.done():
                inference_task.cancel()

            await asyncio.gather(
                inference_task,
                return_exceptions=True
            )

        logger.info("Recording session ended")