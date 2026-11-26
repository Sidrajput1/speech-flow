import asyncio
import json

from pathlib import Path

import numpy as np
import websockets

from faster_whisper.audio import decode_audio

from app.core.config import settings


WEBSOCKET_URL = (
    "ws://127.0.0.1:8000/ws/transcribe"
)

SAMPLE_RATE = 16000

CHUNK_DURATION = 0.1


async def receive_messages(socket):

    async for message in socket:

        payload = json.loads(message)

        message_type = payload.get("type")

        print(f"\n[{message_type.upper()}]")


        if message_type in ("partial", "final"):

            print("Text:", payload["text"])

            print(
                "Audio duration:",
                payload["duration_seconds"]
            )

            print(
                "Processing time:",
                payload["processing_time_seconds"]
            )

        else:

            print(payload)


        if message_type in ("final", "error"):

            return payload


    raise RuntimeError(
        "Connection closed before final response"
    )


async def send_audio(socket, pcm16):

    samples_per_chunk = int(
        SAMPLE_RATE * CHUNK_DURATION
    )

    for start in range(
        0,
        len(pcm16),
        samples_per_chunk
    ):

        end = start + samples_per_chunk

        chunk = pcm16[start:end]

        await socket.send(
            chunk.tobytes()
        )

        # Simulate live microphone audio.
        await asyncio.sleep(CHUNK_DURATION)


    print("\nSending STOP event...")

    await socket.send(
        json.dumps({
            "type": "stop"
        })
    )


async def main():

    audio_path = Path(
        "recordings/mixed.wav.m4a"
    )

    if not audio_path.is_file():

        raise FileNotFoundError(audio_path)


    print("Decoding audio file...")

    audio = decode_audio(
        str(audio_path),
        sampling_rate=SAMPLE_RATE
    )


    # Convert normalized samples to PCM16.
    audio = np.clip(audio, -1.0, 1.0)

    pcm16 = np.where(
        audio < 0,
        audio * 32768,
        audio * 32767
    ).astype("<i2")


    print(
        "Audio duration:",
        len(pcm16) / SAMPLE_RATE
    )


    async with websockets.connect(
        WEBSOCKET_URL,
        origin=settings.FRONTEND_URL
    ) as socket:


        connected = json.loads(
            await socket.recv()
        )

        print("Connection:", connected)

        if connected.get("type") != "connected":
            raise RuntimeError(
                "Unexpected connection response"
            )


        await socket.send(
            json.dumps({
                "type": "start",
                "sample_rate": SAMPLE_RATE,
                "language": "auto"
            })
        )


        ready = json.loads(
            await socket.recv()
        )

        print("Session:", ready)

        if ready.get("type") != "ready":
            raise RuntimeError(
                f"Session not ready: {ready}"
            )


        receiver = asyncio.create_task(
            receive_messages(socket)
        )

        sender = asyncio.create_task(
            send_audio(socket, pcm16)
        )


        try:

            done, _ = await asyncio.wait(
                {sender, receiver},
                return_when=asyncio.FIRST_COMPLETED
            )

            if receiver in done:

                result = await receiver

            else:

                await sender

                result = await asyncio.wait_for(
                    receiver,
                    timeout=60
                )

            if result["type"] != "final":

                raise RuntimeError(result)


            print("\nFinal transcription received!")


        finally:

            for task in (sender, receiver):

                if not task.done():
                    task.cancel()

            await asyncio.gather(
                sender,
                receiver,
                return_exceptions=True
            )


if __name__ == "__main__":

    asyncio.run(main())