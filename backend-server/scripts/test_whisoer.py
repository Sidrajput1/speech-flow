import json

from pathlib import Path
from time import perf_counter

from app.services.speech_to_text import (
    get_speech_to_text_service
)


def main():

    audio_files = [
        "recordings/english.wav.m4a",
        "recordings/hindi.wav.m4a",
        "recordings/mixed.wav.m4a"
    ]


    model_load_start = perf_counter()

    service = get_speech_to_text_service()

    model_load_time = (
        perf_counter() - model_load_start
    )

    print(
        f"Model initialization: "
        f"{model_load_time:.2f} seconds"
    )


    for audio_path in audio_files:

        if not Path(audio_path).is_file():

            print(f"Skipping missing file: {audio_path}")

            continue


        print(f"\nTesting: {audio_path}")

        result = service.transcribe(audio_path)


        print(
            json.dumps(
                result,
                indent=2,
                ensure_ascii=False
            )
        )


        duration = result["duration_seconds"]

        processing_time = result[
            "processing_time_seconds"
        ]


        if duration > 0:

            rtf = processing_time / duration

            print(f"Real-time factor: {rtf:.3f}")


if __name__ == "__main__":

    main()

# audio_path = Path("recordings/mixed.wav.m4a")

# if not audio_path.is_file():
#     raise FileNotFoundError(
#         f"Audio file not found: {audio_path}"
#     )


# # Step 1: Load AI model
# print("Loading Whisper model...")

# load_start = perf_counter()

# model = WhisperModel(
#     "base",
#     device="cpu",
#     compute_type="int8"
# )

# load_time = perf_counter() - load_start

# print(f"Model loaded in {load_time:.2f} seconds")


# # Step 2: Perform transcription
# print("\nTranscribing audio...")

# inference_start = perf_counter()

# segments, info = model.transcribe(
#     str(audio_path),
#     task="transcribe",
#     language=None,
#     beam_size=3,
#     vad_filter=True
# )


# # Step 3: Extract transcribed segments
# transcript_parts = []

# for segment in segments:

#     print(
#         f"[{segment.start:.2f}s -> "
#         f"{segment.end:.2f}s] "
#         f"{segment.text}"
#     )

#     transcript_parts.append(segment.text.strip())


# # Step 4: Calculate inference time
# inference_time = perf_counter() - inference_start

# full_text = " ".join(transcript_parts)


# # Step 5: Display results
# print("\n--- Transcription Result ---")

# print("Detected language:", info.language)

# print(
#     "Language probability:",
#     round(info.language_probability, 4)
# )

# print(
#     f"Audio duration: {info.duration:.2f} seconds"
# )

# print(
#     f"Inference time: {inference_time:.2f} seconds"
# )

# print("\nFull transcript:")

# print(full_text)